-- NovaMind Database Schema
-- Full schema for LLM playground and API gateway

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

------------------------------------------------------------
-- PROFILES
------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  stripe_customer_id text unique,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'pro', 'team', 'enterprise')),
  subscription_status text not null default 'active' check (subscription_status in ('active', 'past_due', 'canceled', 'trialing')),
  monthly_token_limit bigint not null default 100000,
  tokens_used_this_month bigint not null default 0,
  token_reset_at timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

------------------------------------------------------------
-- WORKSPACES (Team workspaces)
------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'team', 'enterprise')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'developer' check (role in ('admin', 'developer', 'viewer')),
  invited_by uuid references public.profiles(id),
  joined_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

------------------------------------------------------------
-- CONVERSATIONS & MESSAGES
------------------------------------------------------------
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New Conversation',
  model text not null default 'gpt-4o',
  system_prompt text,
  temperature numeric(3,2) not null default 0.7 check (temperature >= 0 and temperature <= 2),
  top_p numeric(3,2) not null default 1.0 check (top_p >= 0 and top_p <= 1),
  max_tokens integer not null default 4096,
  stop_sequences text[] default '{}',
  parent_conversation_id uuid references public.conversations(id) on delete set null,
  forked_at_message_id uuid,
  total_tokens_used bigint not null default 0,
  total_cost numeric(10,6) not null default 0,
  is_archived boolean not null default false,
  pinned boolean not null default false,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant', 'tool')),
  content text not null,
  model text,
  tokens_prompt integer default 0,
  tokens_completion integer default 0,
  tokens_total integer default 0,
  cost numeric(10,6) default 0,
  latency_ms integer,
  finish_reason text,
  metadata jsonb default '{}'::jsonb,
  parent_message_id uuid references public.messages(id) on delete set null,
  branch_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_messages_conversation on public.messages(conversation_id, created_at);
create index idx_messages_parent on public.messages(parent_message_id);
create index idx_conversations_user on public.conversations(user_id, updated_at desc);
create index idx_conversations_workspace on public.conversations(workspace_id, updated_at desc);

------------------------------------------------------------
-- API KEYS
------------------------------------------------------------
create table public.api_keys (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  rate_limit_rpm integer not null default 60,
  rate_limit_rpd integer not null default 1000,
  rate_limit_tpm bigint not null default 100000,
  allowed_models text[] default '{}',
  allowed_ips text[] default '{}',
  total_requests bigint not null default 0,
  total_tokens bigint not null default 0,
  last_used_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_api_keys_user on public.api_keys(user_id);
create index idx_api_keys_hash on public.api_keys(key_hash);

------------------------------------------------------------
-- API REQUEST LOG (for analytics)
------------------------------------------------------------
create table public.api_request_logs (
  id uuid primary key default uuid_generate_v4(),
  api_key_id uuid references public.api_keys(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  model text not null,
  provider text not null,
  tokens_prompt integer not null default 0,
  tokens_completion integer not null default 0,
  tokens_total integer not null default 0,
  cost numeric(10,6) not null default 0,
  latency_ms integer not null default 0,
  status_code integer not null default 200,
  error_message text,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index idx_api_logs_user_date on public.api_request_logs(user_id, created_at desc);
create index idx_api_logs_key_date on public.api_request_logs(api_key_id, created_at desc);
create index idx_api_logs_workspace on public.api_request_logs(workspace_id, created_at desc);

------------------------------------------------------------
-- PROMPT LIBRARY
------------------------------------------------------------
create table public.prompt_templates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  content text not null,
  variables jsonb default '[]'::jsonb,
  tags text[] default '{}',
  category text,
  is_public boolean not null default false,
  version integer not null default 1,
  parent_id uuid references public.prompt_templates(id) on delete set null,
  fork_count integer not null default 0,
  use_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_prompts_user on public.prompt_templates(user_id, updated_at desc);
create index idx_prompts_public on public.prompt_templates(is_public, use_count desc) where is_public = true;
create index idx_prompts_tags on public.prompt_templates using gin(tags);

------------------------------------------------------------
-- RATE LIMIT TRACKING (sliding window)
------------------------------------------------------------
create table public.rate_limit_windows (
  id uuid primary key default uuid_generate_v4(),
  key text not null,
  window_start timestamptz not null,
  window_size_seconds integer not null,
  request_count integer not null default 1,
  token_count bigint not null default 0,
  created_at timestamptz not null default now(),
  unique(key, window_start, window_size_seconds)
);

create index idx_rate_limits_key on public.rate_limit_windows(key, window_start desc);

-- Auto-cleanup old rate limit windows
create or replace function cleanup_rate_limit_windows() returns void as $$
begin
  delete from public.rate_limit_windows where window_start < now() - interval '1 day';
end;
$$ language plpgsql security definer;

------------------------------------------------------------
-- SYSTEM PROMPT PRESETS
------------------------------------------------------------
create table public.system_presets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  content text not null,
  is_global boolean not null default false,
  category text,
  created_at timestamptz not null default now()
);

------------------------------------------------------------
-- FUNCTIONS & TRIGGERS
------------------------------------------------------------

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );

  -- Create a personal workspace
  insert into public.workspaces (name, slug, owner_id)
  values (
    'Personal',
    'personal-' || substr(new.id::text, 1, 8),
    new.id
  );

  -- Add user as admin of their personal workspace
  insert into public.workspace_members (workspace_id, user_id, role)
  select w.id, new.id, 'admin'
  from public.workspaces w where w.owner_id = new.id limit 1;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Update timestamps
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();
create trigger update_workspaces_updated_at before update on public.workspaces
  for each row execute function public.update_updated_at();
create trigger update_conversations_updated_at before update on public.conversations
  for each row execute function public.update_updated_at();
create trigger update_prompts_updated_at before update on public.prompt_templates
  for each row execute function public.update_updated_at();

-- Update conversation token counts when messages are inserted
create or replace function public.update_conversation_tokens()
returns trigger as $$
begin
  update public.conversations
  set total_tokens_used = total_tokens_used + coalesce(new.tokens_total, 0),
      total_cost = total_cost + coalesce(new.cost, 0)
  where id = new.conversation_id;

  -- Update user's monthly token usage
  update public.profiles
  set tokens_used_this_month = tokens_used_this_month + coalesce(new.tokens_total, 0)
  from public.conversations c
  where c.id = new.conversation_id and public.profiles.id = c.user_id;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_message_created
  after insert on public.messages
  for each row execute function public.update_conversation_tokens();

-- Monthly token reset function
create or replace function public.reset_monthly_tokens()
returns void as $$
begin
  update public.profiles
  set tokens_used_this_month = 0,
      token_reset_at = date_trunc('month', now()) + interval '1 month'
  where token_reset_at <= now();
end;
$$ language plpgsql security definer;

------------------------------------------------------------
-- RLS POLICIES
------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.api_keys enable row level security;
alter table public.api_request_logs enable row level security;
alter table public.prompt_templates enable row level security;
alter table public.rate_limit_windows enable row level security;
alter table public.system_presets enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Profiles: workspace members can view each other
create policy "Workspace members can view profiles" on public.profiles
  for select using (
    id in (
      select wm.user_id from public.workspace_members wm
      where wm.workspace_id in (
        select wm2.workspace_id from public.workspace_members wm2 where wm2.user_id = auth.uid()
      )
    )
  );

-- Workspaces: members can view
create policy "Members can view workspaces" on public.workspaces
  for select using (
    id in (select workspace_id from public.workspace_members where user_id = auth.uid())
  );
create policy "Owners can update workspaces" on public.workspaces
  for update using (owner_id = auth.uid());
create policy "Users can create workspaces" on public.workspaces
  for insert with check (owner_id = auth.uid());
create policy "Owners can delete workspaces" on public.workspaces
  for delete using (owner_id = auth.uid());

-- Workspace members
create policy "Members can view membership" on public.workspace_members
  for select using (
    workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
  );
create policy "Admins can manage members" on public.workspace_members
  for all using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Conversations: user owns or workspace member
create policy "Users can manage own conversations" on public.conversations
  for all using (user_id = auth.uid());
create policy "Workspace members can view conversations" on public.conversations
  for select using (
    workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
  );

-- Messages: user owns the conversation
create policy "Users can manage messages in own conversations" on public.messages
  for all using (
    conversation_id in (select id from public.conversations where user_id = auth.uid())
  );
create policy "Workspace members can view messages" on public.messages
  for select using (
    conversation_id in (
      select c.id from public.conversations c
      join public.workspace_members wm on wm.workspace_id = c.workspace_id
      where wm.user_id = auth.uid()
    )
  );

-- API Keys: owner only
create policy "Users can manage own API keys" on public.api_keys
  for all using (user_id = auth.uid());

-- API Request Logs: owner or workspace admin
create policy "Users can view own logs" on public.api_request_logs
  for select using (user_id = auth.uid());
create policy "Workspace admins can view logs" on public.api_request_logs
  for select using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('admin', 'developer')
    )
  );

-- Prompt Templates: owner, workspace, or public
create policy "Users can manage own prompts" on public.prompt_templates
  for all using (user_id = auth.uid());
create policy "Anyone can view public prompts" on public.prompt_templates
  for select using (is_public = true);
create policy "Workspace members can view workspace prompts" on public.prompt_templates
  for select using (
    workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
  );

-- Rate limit windows: service role only (managed by edge functions)
create policy "Service role manages rate limits" on public.rate_limit_windows
  for all using (true);

-- System presets: global or owned
create policy "Users can view presets" on public.system_presets
  for select using (is_global = true or user_id = auth.uid());
create policy "Users can manage own presets" on public.system_presets
  for all using (user_id = auth.uid());

------------------------------------------------------------
-- SEED DATA: Global system presets
------------------------------------------------------------
insert into public.system_presets (name, content, is_global, category) values
  ('Default Assistant', 'You are a helpful AI assistant.', true, 'general'),
  ('Code Expert', 'You are an expert software engineer. Write clean, well-documented code. Explain your reasoning step by step. Use best practices and modern patterns.', true, 'coding'),
  ('Creative Writer', 'You are a creative writing assistant. Help users craft compelling stories, poems, and prose. Focus on vivid imagery, strong characters, and engaging narrative structure.', true, 'creative'),
  ('Data Analyst', 'You are a data analysis expert. Help users understand datasets, write SQL queries, create visualizations, and derive actionable insights. Be precise with numbers and methodology.', true, 'data'),
  ('Technical Reviewer', 'You are a senior technical reviewer. Analyze code, architecture decisions, and technical documents. Provide constructive feedback focusing on correctness, performance, security, and maintainability.', true, 'coding'),
  ('Socratic Tutor', 'You are a Socratic tutor. Instead of giving direct answers, guide the student through questions that help them discover the answer themselves. Adapt your questions to their level of understanding.', true, 'education');
