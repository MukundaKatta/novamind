import { ModelConfig, LLMProvider } from "@/types";

export const AVAILABLE_MODELS: ModelConfig[] = [
  // OpenAI
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    maxTokens: 16384,
    inputCostPer1k: 0.0025,
    outputCostPer1k: 0.01,
    supportsStreaming: true,
    supportsVision: true,
    contextWindow: 128000,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    maxTokens: 16384,
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
    supportsStreaming: true,
    supportsVision: true,
    contextWindow: 128000,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    maxTokens: 4096,
    inputCostPer1k: 0.01,
    outputCostPer1k: 0.03,
    supportsStreaming: true,
    supportsVision: true,
    contextWindow: 128000,
  },
  {
    id: "o1-preview",
    name: "o1 Preview",
    provider: "openai",
    maxTokens: 32768,
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.06,
    supportsStreaming: false,
    supportsVision: false,
    contextWindow: 128000,
  },
  // Anthropic
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    maxTokens: 8192,
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    supportsStreaming: true,
    supportsVision: true,
    contextWindow: 200000,
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    maxTokens: 8192,
    inputCostPer1k: 0.001,
    outputCostPer1k: 0.005,
    supportsStreaming: true,
    supportsVision: true,
    contextWindow: 200000,
  },
  {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    provider: "anthropic",
    maxTokens: 8192,
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.075,
    supportsStreaming: true,
    supportsVision: true,
    contextWindow: 200000,
  },
  // Google
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "google",
    maxTokens: 8192,
    inputCostPer1k: 0.000075,
    outputCostPer1k: 0.0003,
    supportsStreaming: true,
    supportsVision: true,
    contextWindow: 1048576,
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "google",
    maxTokens: 8192,
    inputCostPer1k: 0.00125,
    outputCostPer1k: 0.005,
    supportsStreaming: true,
    supportsVision: true,
    contextWindow: 2097152,
  },
  // Open Source (via OpenAI-compatible API)
  {
    id: "meta-llama/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B",
    provider: "opensource",
    maxTokens: 4096,
    inputCostPer1k: 0.0008,
    outputCostPer1k: 0.0008,
    supportsStreaming: true,
    supportsVision: false,
    contextWindow: 131072,
  },
  {
    id: "mistralai/mixtral-8x7b-instruct",
    name: "Mixtral 8x7B",
    provider: "opensource",
    maxTokens: 4096,
    inputCostPer1k: 0.0006,
    outputCostPer1k: 0.0006,
    supportsStreaming: true,
    supportsVision: false,
    contextWindow: 32768,
  },
];

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === modelId);
}

export function getProviderForModel(modelId: string): LLMProvider | undefined {
  return getModelConfig(modelId)?.provider;
}

export function calculateCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): number {
  const model = getModelConfig(modelId);
  if (!model) return 0;
  return (
    (promptTokens / 1000) * model.inputCostPer1k +
    (completionTokens / 1000) * model.outputCostPer1k
  );
}

export function getModelsByProvider(provider: LLMProvider): ModelConfig[] {
  return AVAILABLE_MODELS.filter((m) => m.provider === provider);
}

export const PROVIDER_LABELS: Record<LLMProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  opensource: "Open Source",
};

export const PROVIDER_COLORS: Record<LLMProvider, string> = {
  openai: "#10a37f",
  anthropic: "#d4a574",
  google: "#4285f4",
  opensource: "#ff6b35",
};
