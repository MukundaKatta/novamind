import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { streamChatCompletion, chatCompletion } from "@/lib/llm/providers";
import { getModelConfig, calculateCost } from "@/lib/llm/models";
import { hashApiKeySecure } from "@/lib/utils/api-keys";
import { RateLimiter, RateLimitError } from "@/lib/llm/rate-limiter";
import { ChatCompletionRequest } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Unified API Gateway endpoint.
 * Supports OpenAI-compatible request format with any model from any provider.
 *
 * Usage:
 *   POST /api/v1/chat/completions
 *   Authorization: Bearer nm_live_xxx
 *   Content-Type: application/json
 *
 *   {
 *     "model": "gpt-4o",
 *     "messages": [{"role": "user", "content": "Hello"}],
 *     "temperature": 0.7,
 *     "stream": true
 *   }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const supabase = createServiceRoleClient();

  try {
    // Extract API key
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: { message: "Missing API key", type: "authentication_error" } },
        { status: 401 }
      );
    }

    const apiKey = authHeader.replace("Bearer ", "");
    const keyHash = await hashApiKeySecure(apiKey);

    // Look up API key
    const { data: keyRecord } = await supabase
      .from("api_keys")
      .select("*, profiles!inner(tokens_used_this_month, monthly_token_limit)")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .single();

    if (!keyRecord) {
      return NextResponse.json(
        { error: { message: "Invalid or inactive API key", type: "authentication_error" } },
        { status: 401 }
      );
    }

    // Check expiration
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: { message: "API key has expired", type: "authentication_error" } },
        { status: 401 }
      );
    }

    // Check IP allowlist
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (keyRecord.allowed_ips.length > 0 && !keyRecord.allowed_ips.includes(clientIp)) {
      return NextResponse.json(
        { error: { message: "IP not allowed", type: "authentication_error" } },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { model, messages, temperature, top_p, max_tokens, stop, stream } = body;

    if (!model || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: { message: "model and messages are required", type: "invalid_request_error" } },
        { status: 400 }
      );
    }

    // Validate model
    const modelConfig = getModelConfig(model);
    if (!modelConfig) {
      return NextResponse.json(
        { error: { message: `Model '${model}' not found`, type: "invalid_request_error" } },
        { status: 400 }
      );
    }

    // Check model allowlist
    if (keyRecord.allowed_models.length > 0 && !keyRecord.allowed_models.includes(model)) {
      return NextResponse.json(
        { error: { message: `Model '${model}' not allowed for this key`, type: "invalid_request_error" } },
        { status: 403 }
      );
    }

    // Check user token limits
    const userProfile = keyRecord.profiles as unknown as { tokens_used_this_month: number; monthly_token_limit: number };
    if (userProfile.tokens_used_this_month >= userProfile.monthly_token_limit) {
      return NextResponse.json(
        { error: { message: "Monthly token limit exceeded", type: "rate_limit_error" } },
        { status: 429 }
      );
    }

    // Rate limiting (sliding window)
    try {
      const rateLimiter = new RateLimiter();
      const rateLimitInfo = await rateLimiter.checkRateLimit(
        keyRecord.id,
        {
          rpm: keyRecord.rate_limit_rpm,
          rpd: keyRecord.rate_limit_rpd,
          tpm: keyRecord.rate_limit_tpm,
        }
      );

      // Add rate limit headers
      const headers: Record<string, string> = {
        "x-ratelimit-remaining-requests": rateLimitInfo.remaining_rpm.toString(),
        "x-ratelimit-remaining-tokens": rateLimitInfo.remaining_tpm.toString(),
        "x-ratelimit-reset": rateLimitInfo.reset_at,
      };
    } catch (error) {
      if (error instanceof RateLimitError) {
        return NextResponse.json(
          { error: { message: error.message, type: "rate_limit_error" } },
          {
            status: 429,
            headers: {
              "Retry-After": Math.ceil((error.resetAt.getTime() - Date.now()) / 1000).toString(),
            },
          }
        );
      }
      throw error;
    }

    const chatRequest: ChatCompletionRequest = {
      model,
      messages,
      temperature: temperature ?? 0.7,
      top_p: top_p ?? 1.0,
      max_tokens: max_tokens ? Math.min(max_tokens, modelConfig.maxTokens) : modelConfig.maxTokens,
      stop,
      stream: stream ?? false,
    };

    // Update API key usage stats
    await supabase
      .from("api_keys")
      .update({
        total_requests: keyRecord.total_requests + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", keyRecord.id);

    if (stream && modelConfig.supportsStreaming) {
      const responseStream = streamChatCompletion(chatRequest);

      return new Response(responseStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      const response = await chatCompletion(chatRequest);
      const cost = calculateCost(model, response.usage.prompt_tokens, response.usage.completion_tokens);

      // Log request
      await supabase.from("api_request_logs").insert({
        api_key_id: keyRecord.id,
        user_id: keyRecord.user_id,
        workspace_id: keyRecord.workspace_id,
        model: response.model,
        provider: modelConfig.provider,
        tokens_prompt: response.usage.prompt_tokens,
        tokens_completion: response.usage.completion_tokens,
        tokens_total: response.usage.total_tokens,
        cost,
        latency_ms: response.latency_ms,
        status_code: 200,
        ip_address: clientIp,
      });

      // Update token count on key
      await supabase
        .from("api_keys")
        .update({ total_tokens: keyRecord.total_tokens + response.usage.total_tokens })
        .eq("id", keyRecord.id);

      // Return in OpenAI-compatible format
      return NextResponse.json({
        id: response.id,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: response.model,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: response.content,
            },
            finish_reason: response.finish_reason,
          },
        ],
        usage: {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
        },
      });
    }
  } catch (error: unknown) {
    console.error("Gateway API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: { message, type: "server_error" } },
      { status: 500 }
    );
  }
}
