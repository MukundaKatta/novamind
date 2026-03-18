-- RPC function for atomic rate limit window increment
create or replace function public.increment_rate_limit(
  p_key text,
  p_window_start timestamptz,
  p_window_size integer,
  p_count integer
)
returns void as $$
begin
  insert into public.rate_limit_windows (key, window_start, window_size_seconds, request_count, token_count)
  values (p_key, p_window_start, p_window_size, p_count, p_count)
  on conflict (key, window_start, window_size_seconds)
  do update set
    request_count = rate_limit_windows.request_count + p_count,
    token_count = rate_limit_windows.token_count + p_count;
end;
$$ language plpgsql security definer;
