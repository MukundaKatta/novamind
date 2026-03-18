import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { streamChatCompletion, chatCompletion } from "@/lib/llm/providers";
import { getModelConfig, calculateCost } from "@/lib/llm/models";
import { ChatCompletionRequest } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      model,
      messages,
      temperature = 0.7,
      top_p = 1.0,
      max_tokens = 4096,
      stop,
      stream = true,
      conversation_id,
    } = body;

    // Validate model
    const modelConfig = getModelConfig(model);
    if (!modelConfig) {
      return NextResponse.json({ error: `Unknown model: ${model}` }, { status: 400 });
    }

    // Check token limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("tokens_used_this_month, monthly_token_limit")
      .eq("id", user.id)
      .single();

    if (profile && profile.tokens_used_this_month >= profile.monthly_token_limit) {
      return NextResponse.json(
        { error: "Monthly token limit exceeded. Upgrade your plan for more tokens." },
        { status: 429 }
      );
    }

    const chatRequest: ChatCompletionRequest = {
      model,
      messages,
      temperature,
      top_p,
      max_tokens: Math.min(max_tokens, modelConfig.maxTokens),
      stop,
      stream,
    };

    if (stream && modelConfig.supportsStreaming) {
      // Return SSE stream
      const responseStream = streamChatCompletion(chatRequest);

      // Log the request (async, non-blocking)
      const serviceClient = createServiceRoleClient();
      const logRequest = async () => {
        // We log after the stream completes - the stream handler sends usage data
      };
      logRequest();

      return new Response(responseStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // Non-streaming response
      const response = await chatCompletion(chatRequest);

      // Log to api_request_logs
      const serviceClient = createServiceRoleClient();
      await serviceClient.from("api_request_logs").insert({
        user_id: user.id,
        model: response.model,
        provider: modelConfig.provider,
        tokens_prompt: response.usage.prompt_tokens,
        tokens_completion: response.usage.completion_tokens,
        tokens_total: response.usage.total_tokens,
        cost: calculateCost(model, response.usage.prompt_tokens, response.usage.completion_tokens),
        latency_ms: response.latency_ms,
        status_code: 200,
      });

      return NextResponse.json(response);
    }
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
