// ============================================================
// NovaMind Type Definitions
// ============================================================

export type SubscriptionTier = "free" | "pro" | "team" | "enterprise";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing";
export type WorkspaceRole = "admin" | "developer" | "viewer";
export type MessageRole = "system" | "user" | "assistant" | "tool";

export type LLMProvider = "openai" | "anthropic" | "google" | "opensource";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  stripe_customer_id: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  monthly_token_limit: number;
  tokens_used_this_month: number;
  token_reset_at: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  owner_id: string;
  stripe_subscription_id: string | null;
  plan: SubscriptionTier;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by: string | null;
  joined_at: string;
  profile?: Profile;
}

export interface Conversation {
  id: string;
  workspace_id: string | null;
  user_id: string;
  title: string;
  model: string;
  system_prompt: string | null;
  temperature: number;
  top_p: number;
  max_tokens: number;
  stop_sequences: string[];
  parent_conversation_id: string | null;
  forked_at_message_id: string | null;
  total_tokens_used: number;
  total_cost: number;
  is_archived: boolean;
  pinned: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  model: string | null;
  tokens_prompt: number;
  tokens_completion: number;
  tokens_total: number;
  cost: number;
  latency_ms: number | null;
  finish_reason: string | null;
  metadata: Record<string, unknown>;
  parent_message_id: string | null;
  branch_index: number;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  key_hash: string;
  key_prefix: string;
  rate_limit_rpm: number;
  rate_limit_rpd: number;
  rate_limit_tpm: number;
  allowed_models: string[];
  allowed_ips: string[];
  total_requests: number;
  total_tokens: number;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ApiRequestLog {
  id: string;
  api_key_id: string | null;
  user_id: string;
  workspace_id: string | null;
  model: string;
  provider: string;
  tokens_prompt: number;
  tokens_completion: number;
  tokens_total: number;
  cost: number;
  latency_ms: number;
  status_code: number;
  error_message: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface PromptTemplate {
  id: string;
  user_id: string;
  workspace_id: string | null;
  title: string;
  description: string | null;
  content: string;
  variables: PromptVariable[];
  tags: string[];
  category: string | null;
  is_public: boolean;
  version: number;
  parent_id: string | null;
  fork_count: number;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface PromptVariable {
  name: string;
  description: string;
  default_value?: string;
}

export interface SystemPreset {
  id: string;
  user_id: string | null;
  name: string;
  content: string;
  is_global: boolean;
  category: string | null;
  created_at: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: LLMProvider;
  maxTokens: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
  contextWindow: number;
}

export interface ChatCompletionRequest {
  model: string;
  messages: { role: MessageRole; content: string }[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string[];
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  content: string;
  finish_reason: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
}

export interface UsageAnalytics {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  avg_latency: number;
  p50_latency: number;
  p95_latency: number;
  p99_latency: number;
  requests_by_model: { model: string; count: number; tokens: number; cost: number }[];
  daily_usage: { date: string; requests: number; tokens: number; cost: number }[];
  hourly_latency: { hour: string; p50: number; p95: number; p99: number }[];
}

export interface RateLimitInfo {
  remaining_rpm: number;
  remaining_rpd: number;
  remaining_tpm: number;
  reset_at: string;
}

export interface PricingPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  monthlyTokens: number;
  features: string[];
  stripePriceId: string;
}
