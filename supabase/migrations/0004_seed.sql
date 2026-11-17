-- ============================================================================
-- ClipSetu — 0004_seed.sql
-- Idempotent seed of platform_settings defaults ONLY.
-- No fake campaigns, users, brands, or submissions are seeded here.
-- Requires 0001_schema.sql.
-- ----------------------------------------------------------------------------
-- `on conflict (key) do nothing` keeps this safe to re-run and ensures it never
-- overwrites values that an admin has already tuned at runtime.
-- Defaults mirror src/lib/constants.ts: PLATFORM_FEE_PERCENT = 10,
-- MIN_WITHDRAWAL_INR = 100, SOCIAL_PLATFORMS = instagram | youtube.
-- ============================================================================

begin;

insert into public.platform_settings (key, value, description, is_sensitive)
values
  (
    'platform_fee_percent',
    '10'::jsonb,
    'Platform fee percentage applied to creator rewards (INR marketplace). Default 10%.',
    false
  ),
  (
    'min_withdrawal_inr',
    '100'::jsonb,
    'Minimum wallet balance (INR) required to request a withdrawal. Default 100.',
    false
  ),
  (
    'supported_platforms',
    '["instagram","youtube"]'::jsonb,
    'Social platforms supported for campaign submissions.',
    false
  ),
  (
    'currency',
    '"INR"'::jsonb,
    'Primary settlement currency for the marketplace.',
    false
  )
on conflict (key) do nothing;

commit;
