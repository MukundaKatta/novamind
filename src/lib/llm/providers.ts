import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatCompletionRequest, ChatCompletionResponse, LLMProvider } from "@/types";
import { getModelConfig, calculateCost, getProviderForModel } from "./models";

// ============================================================
// Provider Clients
// ============================================================

function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function getGoogleClient(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
}

function getOpenSourceClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || "dummy",
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  });
}

// ============================================================
// Non-streaming completion
// ============================================================

export async function chatCompletion(
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const provider = getProviderForModel(request.model);
  if (!provider) throw new Error(`Unknown model: ${request.model}`);

  const startTime = Date.now();

  switch (provider) {
    case "openai":
      return openaiCompletion(request, startTime);
    case "anthropic":
      return anthropicCompletion(request, startTime);
    case "google":
      return googleCompletion(request, startTime);
    case "opensource":
      return openSourceCompletion(request, startTime);
  }
}

async function openaiCompletion(
  request: ChatCompletionRequest,
  startTime: number
): Promise<ChatCompletionResponse> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: request.model,
    messages: request.messages.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    })),
    temperature: request.temperature,
    top_p: request.top_p,
    max_tokens: request.max_tokens,
    stop: request.stop?.length ? request.stop : undefined,
  });

  const latency = Date.now() - startTime;
  const usage = response.usage!;

  return {
    id: response.id,
    model: response.model,
    content: response.choices[0]?.message?.content || "",
    finish_reason: response.choices[0]?.finish_reason || "stop",
    usage: {
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
    },
    latency_ms: latency,
  };
}

async function anthropicCompletion(
  request: ChatCompletionRequest,
  startTime: number
): Promise<ChatCompletionResponse> {
  const client = getAnthropicClient();

  const systemMsg = request.messages.find((m) => m.role === "system");
  const nonSystemMessages = request.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const response = await client.messages.create({
    model: request.model,
    max_tokens: request.max_tokens || 4096,
    system: systemMsg?.content,
    messages: nonSystemMessages,
    temperature: request.temperature,
    top_p: request.top_p,
    stop_sequences: request.stop?.length ? request.stop : undefined,
  });

  const latency = Date.now() - startTime;

  return {
    id: response.id,
    model: response.model,
    content: response.content[0]?.type === "text" ? response.content[0].text : "",
    finish_reason: response.stop_reason || "end_turn",
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    },
    latency_ms: latency,
  };
}

async function googleCompletion(
  request: ChatCompletionRequest,
  startTime: number
): Promise<ChatCompletionResponse> {
  const client = getGoogleClient();
  const model = client.getGenerativeModel({ model: request.model });

  const systemInstruction = request.messages.find((m) => m.role === "system")?.content;
  const history = request.messages
    .filter((m) => m.role !== "system")
    .slice(0, -1)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const lastMessage = request.messages[request.messages.length - 1];

  const chat = model.startChat({
    history,
    generationConfig: {
      temperature: request.temperature,
      topP: request.top_p,
      maxOutputTokens: request.max_tokens,
      stopSequences: request.stop,
    },
    ...(systemInstruction ? { systemInstruction } : {}),
  });

  const result = await chat.sendMessage(lastMessage.content);
  const response = result.response;
  const latency = Date.now() - startTime;

  const promptTokens = response.usageMetadata?.promptTokenCount || 0;
  const completionTokens = response.usageMetadata?.candidatesTokenCount || 0;

  return {
    id: `google-${Date.now()}`,
    model: request.model,
    content: response.text(),
    finish_reason: response.candidates?.[0]?.finishReason || "STOP",
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
    latency_ms: latency,
  };
}

async function openSourceCompletion(
  request: ChatCompletionRequest,
  startTime: number
): Promise<ChatCompletionResponse> {
  const client = getOpenSourceClient();
  const response = await client.chat.completions.create({
    model: request.model,
    messages: request.messages.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    })),
    temperature: request.temperature,
    top_p: request.top_p,
    max_tokens: request.max_tokens,
    stop: request.stop?.length ? request.stop : undefined,
  });

  const latency = Date.now() - startTime;
  const usage = response.usage!;

  return {
    id: response.id,
    model: response.model,
    content: response.choices[0]?.message?.content || "",
    finish_reason: response.choices[0]?.finish_reason || "stop",
    usage: {
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
    },
    latency_ms: latency,
  };
}

// ============================================================
// Streaming completion (returns ReadableStream for SSE)
// ============================================================

export function streamChatCompletion(
  request: ChatCompletionRequest
): ReadableStream<Uint8Array> {
  const provider = getProviderForModel(request.model);
  if (!provider) throw new Error(`Unknown model: ${request.model}`);

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const startTime = Date.now();
      let totalContent = "";
      let promptTokens = 0;
      let completionTokens = 0;

      try {
        switch (provider) {
          case "openai":
          case "opensource": {
            const client = provider === "openai" ? getOpenAIClient() : getOpenSourceClient();
            const stream = await client.chat.completions.create({
              model: request.model,
              messages: request.messages.map((m) => ({
                role: m.role as "system" | "user" | "assistant",
                content: m.content,
              })),
              temperature: request.temperature,
              top_p: request.top_p,
              max_tokens: request.max_tokens,
              stop: request.stop?.length ? request.stop : undefined,
              stream: true,
              stream_options: { include_usage: true },
            });

            for await (const chunk of stream) {
              const delta = chunk.choices[0]?.delta?.content;
              if (delta) {
                totalContent += delta;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "content", content: delta })}\n\n`)
                );
              }
              if (chunk.usage) {
                promptTokens = chunk.usage.prompt_tokens;
                completionTokens = chunk.usage.completion_tokens;
              }
            }
            break;
          }

          case "anthropic": {
            const client = getAnthropicClient();
            const systemMsg = request.messages.find((m) => m.role === "system");
            const nonSystemMessages = request.messages
              .filter((m) => m.role !== "system")
              .map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              }));

            const stream = client.messages.stream({
              model: request.model,
              max_tokens: request.max_tokens || 4096,
              system: systemMsg?.content,
              messages: nonSystemMessages,
              temperature: request.temperature,
              top_p: request.top_p,
              stop_sequences: request.stop?.length ? request.stop : undefined,
            });

            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                const text = event.delta.text;
                totalContent += text;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "content", content: text })}\n\n`)
                );
              }
            }

            const finalMessage = await stream.finalMessage();
            promptTokens = finalMessage.usage.input_tokens;
            completionTokens = finalMessage.usage.output_tokens;
            break;
          }

          case "google": {
            const genAI = getGoogleClient();
            const model = genAI.getGenerativeModel({ model: request.model });

            const systemInstruction = request.messages.find((m) => m.role === "system")?.content;
            const history = request.messages
              .filter((m) => m.role !== "system")
              .slice(0, -1)
              .map((m) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
              }));
            const lastMessage = request.messages[request.messages.length - 1];

            const chat = model.startChat({
              history,
              generationConfig: {
                temperature: request.temperature,
                topP: request.top_p,
                maxOutputTokens: request.max_tokens,
                stopSequences: request.stop,
              },
              ...(systemInstruction ? { systemInstruction } : {}),
            });

            const result = await chat.sendMessageStream(lastMessage.content);

            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) {
                totalContent += text;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "content", content: text })}\n\n`)
                );
              }
            }

            const response = await result.response;
            promptTokens = response.usageMetadata?.promptTokenCount || 0;
            completionTokens = response.usageMetadata?.candidatesTokenCount || 0;
            break;
          }
        }

        const latency = Date.now() - startTime;
        const totalTokens = promptTokens + completionTokens;
        const cost = calculateCost(request.model, promptTokens, completionTokens);

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              usage: {
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_tokens: totalTokens,
              },
              cost,
              latency_ms: latency,
              content: totalContent,
            })}\n\n`
          )
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: message })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });
}
