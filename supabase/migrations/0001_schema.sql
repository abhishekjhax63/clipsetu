-- ============================================================================
-- ClipSetu — 0001_schema.sql
-- Core schema: extensions + all tables + constraints.
-- Target: Supabase Postgres (PostgreSQL 15+).
-- ----------------------------------------------------------------------------
-- SECURITY / DESIGN NOTES
--   * Row Level Security is enabled in 0002_rls.sql. Schema constraints are a
--     second line of defence — never a substitute for RLS or server-side authz.
--   * All money is numeric(12,2) in INR. Never use float/double for money.
--   * Balances in `wallets` are NEVER written directly by the app: they are
--     maintained exclusively by the ledger trigger in 0003_functions_triggers.sql.
--   * All enum-like columns use CHECK constraints whose value lists MUST stay
--     in sync with src/lib/constants.ts (CAMPAIGN_STATUSES, SUBMISSION_STATUSES,
--     USER_ROLES, VERIFICATION_STATUSES, TXN_TYPES, SOCIAL_PLATFORMS,
--     CAMPAIGN_TYPES).
--   * Tables are created in FK-dependency order; every REFERENCES target is
--     defined earlier in this file.
-- ============================================================================

begin;

-- gen_random_uuid() is provided by pgcrypto on Supabase. Create defensively.
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles — extended user record linked 1:1 with auth.users
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  -- email is nullable: phone-OTP users may have no email in auth.users.
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'clipper'
    check (role in ('brand','clipper','admin','super_admin','moderation')),
  status text not null default 'active'
    check (status in ('active','suspended','pending','restricted')),
  phone text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Application user profile, 1:1 with auth.users. `role` is authoritative for RBAC; it is never self-assignable (guarded by a trigger).';
comment on column public.profiles.role is
  'RBAC role. Only admins/service role may change this; a trigger blocks self-escalation.';
comment on column public.profiles.status is
  'Account status. suspended/restricted must be enforced by the app; only admins may change.';

-- ----------------------------------------------------------------------------
-- wallets — materialized balance, maintained ONLY by the ledger trigger
-- ----------------------------------------------------------------------------
create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_earned numeric(12,2) not null default 0,
  available numeric(12,2) not null default 0,
  pending numeric(12,2) not null default 0,
  under_review numeric(12,2) not null default 0,
  paid numeric(12,2) not null default 0,
  reversed numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.wallets is
  'Materialized wallet balances. NEVER updated directly by application code — maintained solely by public.apply_wallet_transaction() reacting to the immutable ledger.';

-- ----------------------------------------------------------------------------
-- notification_preferences — per-user delivery toggles
-- ----------------------------------------------------------------------------
create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email boolean not null default true,
  in_app boolean not null default true,
  marketing boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- brand_profiles
-- ----------------------------------------------------------------------------
create table public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  brand_name text,
  contact_person text,
  official_email text,
  company_website text,
  business_category text,
  country text,
  gstin text,
  logo_url text,
  description text,
  verification_status text not null default 'not_submitted'
    check (verification_status in ('not_submitted','pending','under_review','verified','rejected','suspended')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.brand_profiles.gstin is
  'India GST identification number. Consider masking in API responses (PII).';

-- ----------------------------------------------------------------------------
-- creator_profiles
-- ----------------------------------------------------------------------------
create table public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  username text unique,
  display_name text,
  bio text,
  profile_picture_url text,
  country text,
  categories text[] not null default '{}',
  preferred_language text,
  -- date_of_birth is required before payouts and must be 18+. Enforced by a CHECK
  -- only when present so onboarding can proceed without it.
  date_of_birth date
    check (date_of_birth is null or date_of_birth <= (current_date - interval '18 years')),
  kyc_status text not null default 'not_submitted'
    check (kyc_status in ('not_submitted','pending','verified','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.creator_profiles.date_of_birth is
  'Nullable during onboarding; required before payouts. CHECK enforces 18+ when present.';

-- ----------------------------------------------------------------------------
-- verification_records — KYC/brand verification submissions & decisions
-- ----------------------------------------------------------------------------
create table public.verification_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text,
  status text,
  document_url text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.verification_records.document_url is
  'Pointer to a private storage object. Never a public URL; access is scoped server-side.';

-- ----------------------------------------------------------------------------
-- social_accounts — OAuth-linked platform connections
-- ----------------------------------------------------------------------------
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('instagram','youtube')),
  handle text,
  external_account_id text,
  -- Tokens are stored ONLY as encrypted text. Encryption/decryption is performed
  -- server-side with a KMS/app key; raw passwords are never collected or stored.
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  follower_count int,
  verified boolean not null default false,
  connected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.social_accounts.access_token_encrypted is
  'AES-or-KMS encrypted OAuth access token. NEVER store plaintext tokens or platform passwords.';
comment on column public.social_accounts.refresh_token_encrypted is
  'AES-or-KMS encrypted OAuth refresh token. NEVER store plaintext.';

-- ----------------------------------------------------------------------------
-- campaigns
-- ----------------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text,
  type text not null
    check (type in ('video_clipping','ugc','music_promotion','brand_promotion','custom')),
  objective text,
  status text not null default 'draft'
    check (status in ('draft','pending_payment','pending_review','scheduled','active','paused','completed','rejected','cancelled')),
  budget numeric(12,2) not null default 0 check (budget >= 0),
  remaining_budget numeric(12,2) not null default 0 check (remaining_budget >= 0),
  funded_amount numeric(12,2) not null default 0 check (funded_amount >= 0),
  reward_per_1k_views numeric(10,2) not null default 0 check (reward_per_1k_views >= 0),
  max_reward_per_submission numeric(10,2) check (max_reward_per_submission is null or max_reward_per_submission >= 0),
  max_campaign_reward numeric(12,2) check (max_campaign_reward is null or max_campaign_reward >= 0),
  min_views int not null default 0 check (min_views >= 0),
  max_submissions_per_creator int,
  max_total_submissions int,
  thumbnail_url text,
  start_date timestamptz,
  end_date timestamptz,
  submission_deadline timestamptz,
  rejection_reason text,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A campaign's submission window cannot extend past its end date.
  constraint campaigns_deadline_before_end
    check (submission_deadline is null or end_date is null or submission_deadline <= end_date)
);

comment on column public.campaigns.remaining_budget is
  'Funds still available to pay rewards. Derived/maintained server-side; never let it go negative.';

-- ----------------------------------------------------------------------------
-- campaign_assets
-- ----------------------------------------------------------------------------
create table public.campaign_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  type text not null check (type in ('video','image','logo','document','reference')),
  url text,
  filename text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- campaign_rules
-- ----------------------------------------------------------------------------
create table public.campaign_rules (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null unique references public.campaigns(id) on delete cascade,
  platforms text[] not null default '{}',
  required_hashtags text[] not null default '{}',
  required_mentions text[] not null default '{}',
  caption_requirements text,
  min_duration_seconds int,
  max_duration_seconds int,
  content_restrictions text,
  mandatory_branding text,
  prohibited_content text,
  language text,
  disclosure_required boolean not null default true,
  eligible_categories text[],
  min_followers int,
  geographic_restrictions text[],
  age_requirement int not null default 18 check (age_requirement >= 18),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.campaign_rules.disclosure_required is
  'When true, creators must include a paid-promotion disclosure. Defaults to true for compliance.';

-- ----------------------------------------------------------------------------
-- campaign_memberships
-- ----------------------------------------------------------------------------
create table public.campaign_memberships (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'joined' check (status in ('joined','left','banned')),
  joined_at timestamptz not null default now(),
  unique (campaign_id, creator_id)
);

-- ----------------------------------------------------------------------------
-- submissions
-- ----------------------------------------------------------------------------
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  membership_id uuid references public.campaign_memberships(id) on delete set null,
  platform text not null check (platform in ('instagram','youtube')),
  post_url text not null,
  external_post_id text,
  caption text,
  status text not null default 'submitted'
    check (status in ('submitted','pending_review','processing','approved','rejected','revision_requested','metrics_unavailable','disputed')),
  rejection_reason text,
  review_notes text,
  reviewer_id uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Duplicate-URL detection: the same post cannot be submitted twice to a campaign.
  unique (campaign_id, post_url)
);

comment on constraint submissions_campaign_id_post_url_key on public.submissions is
  'Enforces duplicate-URL detection within a campaign. Expected by the app to detect re-submissions.';

-- ----------------------------------------------------------------------------
-- submission_metrics
-- ----------------------------------------------------------------------------
create table public.submission_metrics (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  view_count int not null default 0,
  like_count int,
  comment_count int,
  share_count int,
  last_checked_at timestamptz,
  -- `metrics_source` records provenance. Manually entered numbers MUST NEVER be
  -- labelled 'api' — the app is responsible for setting this honestly.
  metrics_source text not null default 'api' check (metrics_source in ('api','manual')),
  verification_confidence numeric(3,2) check (verification_confidence >= 0 and verification_confidence <= 1),
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','unavailable','flagged')),
  raw jsonb,
  created_at timestamptz not null default now()
);

comment on column public.submission_metrics.metrics_source is
  'Provenance of the numbers. Manual entry must be stored as ''manual'', never ''api''.';

-- ----------------------------------------------------------------------------
-- wallet_transactions — append-only double-entry ledger
-- ----------------------------------------------------------------------------
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  -- Legder rows are retained for financial integrity: deleting a user with
  -- ledger history is blocked (RESTRICT) rather than cascading.
  user_id uuid not null references public.profiles(id) on delete restrict,
  campaign_id uuid references public.campaigns(id) on delete set null,
  submission_id uuid references public.submissions(id) on delete set null,
  type text not null
    check (type in ('deposit','reward','withdrawal','refund','adjustment','reversal','platform_fee')),
  direction text not null check (direction in ('credit','debit')),
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending','completed','failed','reversed')),
  idempotency_key text unique,
  related_payment_ref text,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.wallet_transactions is
  'Immutable, append-only ledger. UPDATE is allowed only to transition status to ''reversed''; DELETE is forbidden (see prevent_ledger_mutation).';
comment on column public.wallet_transactions.idempotency_key is
  'Unique key to make payment/ledger writes idempotent (e.g. provider txn id).';
comment on column public.wallet_transactions.amount is
  'Always positive; the sign/semantics come from direction + type, never from the stored amount.';

-- ----------------------------------------------------------------------------
-- bank_accounts — payout destinations (no full account numbers stored)
-- ----------------------------------------------------------------------------
create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_holder_name text,
  -- Only the last 4 digits are stored. Full account numbers live at the payout
  -- provider (RazorpayX/Cashfree) and are referenced via provider_ref.
  account_number_last4 text,
  ifsc text,
  bank_name text,
  provider_ref text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.bank_accounts.account_number_last4 is
  'Only last 4 digits are ever stored here. NEVER store full account numbers in plaintext.';
comment on column public.bank_accounts.provider_ref is
  'Opaque reference to the payout provider''s stored bank account record.';

-- ----------------------------------------------------------------------------
-- withdrawals
-- ----------------------------------------------------------------------------
create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending','approved','processing','completed','failed','rejected')),
  bank_account_id uuid references public.bank_accounts(id) on delete set null,
  payout_ref text,
  failure_reason text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null
    check (type in ('campaign','submission','reward','payout','security','support','system')),
  title text,
  body text,
  link text,
  read boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- support_tickets
-- ----------------------------------------------------------------------------
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  -- Nullable: guests can raise tickets identified only by guest_email.
  user_id uuid references public.profiles(id) on delete set null,
  guest_email text,
  category text,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'open'
    check (status in ('open','in_progress','waiting_user','resolved','closed')),
  subject text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ticket_messages
-- ----------------------------------------------------------------------------
create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text,
  is_internal boolean not null default false,
  attachment_url text,
  created_at timestamptz not null default now()
);

comment on column public.ticket_messages.is_internal is
  'Internal support notes are never shown to end users; the app must filter these out.';

-- ----------------------------------------------------------------------------
-- disputes
-- ----------------------------------------------------------------------------
create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  raised_by uuid not null references public.profiles(id) on delete cascade,
  against_user uuid references public.profiles(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  submission_id uuid references public.submissions(id) on delete set null,
  type text not null check (type in ('submission','payment','campaign','account')),
  status text not null default 'open' check (status in ('open','in_review','resolved','rejected')),
  subject text,
  description text,
  resolution text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- appeals — creator challenges a rejected submission
-- ----------------------------------------------------------------------------
create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  status text not null default 'open' check (status in ('open','accepted','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  decision_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- audit_logs — append-only privileged-action trail
-- ----------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Append-only audit trail. Only admins may read; inserts happen via the service-role client only. No UPDATE/DELETE policies exist.';

-- ----------------------------------------------------------------------------
-- platform_settings — key/value runtime configuration
-- ----------------------------------------------------------------------------
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  is_sensitive boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on column public.platform_settings.is_sensitive is
  'Sensitive settings (secrets/limits) are only readable by admins via RLS.';

-- ----------------------------------------------------------------------------
-- contact_messages — public contact form submissions
-- ----------------------------------------------------------------------------
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  subject text,
  message text,
  status text not null default 'new' check (status in ('new','read','replied','closed')),
  created_at timestamptz not null default now()
);

comment on table public.contact_messages is
  'Written by anonymous visitors via an INSERT-only RLS policy; readable by admins only.';

commit;
