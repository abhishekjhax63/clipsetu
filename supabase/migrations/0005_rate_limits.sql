-- ============================================================================
-- ClipSetu — 0005_rate_limits.sql
-- Fixed-window rate limiting for abuse-prone endpoints (login, signup,
-- password reset). Backed by Postgres so the limit is shared across every
-- server instance (serverless functions have no shared memory).
-- ----------------------------------------------------------------------------
-- SECURITY NOTES
--   * rate_limits has RLS enabled and NO policies: only the service-role client
--     (or the SECURITY DEFINER function below) can read or write it.
--   * Keys are opaque strings built server-side, e.g. "login:1.2.3.4". They may
--     contain an email or IP — treat the table as PII and never expose it.
-- ============================================================================

begin;

create table public.rate_limits (
  bucket_key   text primary key,
  window_start timestamptz not null default now(),
  count        integer not null default 0,
  updated_at   timestamptz not null default now()
);

comment on table public.rate_limits is
  'Fixed-window rate-limit counters keyed by bucket (e.g. "login:<ip>"). Service-role only; may contain PII (email/IP).';

alter table public.rate_limits enable row level security;

-- ----------------------------------------------------------------------------
-- check_rate_limit — atomically consume one unit from a bucket.
-- Returns whether the caller is allowed, the remaining allowance, and (when
-- blocked) the seconds until the window resets. The row is locked FOR UPDATE so
-- concurrent requests cannot both slip past the limit.
-- ----------------------------------------------------------------------------
create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer,
  out allowed boolean,
  out remaining integer,
  out retry_after integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now          timestamptz := now();
  v_window_start timestamptz;
  v_count        integer;
begin
  insert into public.rate_limits (bucket_key, window_start, count)
  values (p_key, v_now, 0)
  on conflict (bucket_key) do nothing;

  select rl.window_start, rl.count
    into v_window_start, v_count
    from public.rate_limits rl
   where rl.bucket_key = p_key
     for update;

  -- Window elapsed → start a fresh window.
  if v_window_start <= v_now - make_interval(secs => p_window_seconds) then
    v_window_start := v_now;
    v_count := 0;
  end if;

  if v_count >= p_limit then
    allowed     := false;
    remaining   := 0;
    retry_after := greatest(
      1,
      ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - v_now)))::integer
    );
  else
    v_count     := v_count + 1;
    allowed     := true;
    remaining   := greatest(0, p_limit - v_count);
    retry_after := 0;
  end if;

  update public.rate_limits
     set window_start = v_window_start,
         count        = v_count,
         updated_at   = v_now
   where bucket_key = p_key;

  return;
end;
$$;

comment on function public.check_rate_limit(text, integer, integer) is
  'Atomically consumes one unit from a fixed-window bucket. Returns (allowed, remaining, retry_after seconds). SERVICE ROLE ONLY.';

-- ----------------------------------------------------------------------------
-- prune_rate_limits — drop buckets whose window has long expired.
-- Safe to call from the scheduled job; bounded work per call.
-- ----------------------------------------------------------------------------
create or replace function public.prune_rate_limits(p_older_than_seconds integer default 86400)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limits
   where window_start <= now() - make_interval(secs => p_older_than_seconds);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function public.prune_rate_limits(integer) is
  'Deletes rate-limit buckets older than the given age (default 24h). Returns the number of rows removed.';

-- Only the service role may execute these. Revoke from the public API roles.
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.prune_rate_limits(integer) from public, anon, authenticated;

commit;
