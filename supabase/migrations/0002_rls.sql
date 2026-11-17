-- ============================================================================
-- ClipSetu — 0002_rls.sql
-- Row Level Security: helper functions + policies + indexes.
-- Requires 0001_schema.sql (all tables).
-- ----------------------------------------------------------------------------
-- SECURITY MODEL
--   * RLS is the authoritative gate for the anon/authenticated keys.
--   * The Supabase `service_role` key BYPASSES RLS and is server-only. Server
--     code MUST therefore re-check authorization itself — RLS does not protect
--     requests made with the service-role key.
--   * Financial tables (wallet_transactions, wallets, withdrawals,
--     bank_accounts) have NO insert/update/delete policies for normal users.
--     Writes are performed exclusively by the service-role client / ledger RPC.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Helper functions used by policies.
-- Both are SECURITY DEFINER so that reading public.profiles inside a policy on
-- public.profiles itself does not recurse into RLS. search_path is pinned to
-- prevent search_path hijacking.
-- ----------------------------------------------------------------------------

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

comment on function public.current_role() is
  'Returns the RBAC role of the calling user (auth.uid()), or NULL if unauthenticated. SECURITY DEFINER to avoid RLS recursion.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('admin','super_admin','moderation')
       from public.profiles
      where id = auth.uid()),
    false
  );
$$;

comment on function public.is_admin() is
  'True when the caller holds an admin, super_admin, or moderation role. SECURITY DEFINER to avoid RLS recursion.';

-- ----------------------------------------------------------------------------
-- Enable RLS on EVERY table.
-- ----------------------------------------------------------------------------
alter table public.profiles                 enable row level security;
alter table public.wallets                  enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.brand_profiles           enable row level security;
alter table public.creator_profiles         enable row level security;
alter table public.verification_records     enable row level security;
alter table public.social_accounts          enable row level security;
alter table public.campaigns                enable row level security;
alter table public.campaign_assets          enable row level security;
alter table public.campaign_rules           enable row level security;
alter table public.campaign_memberships     enable row level security;
alter table public.submissions              enable row level security;
alter table public.submission_metrics       enable row level security;
alter table public.wallet_transactions      enable row level security;
alter table public.bank_accounts            enable row level security;
alter table public.withdrawals              enable row level security;
alter table public.notifications            enable row level security;
alter table public.support_tickets          enable row level security;
alter table public.ticket_messages          enable row level security;
alter table public.disputes                 enable row level security;
alter table public.appeals                  enable row level security;
alter table public.audit_logs               enable row level security;
alter table public.platform_settings        enable row level security;
alter table public.contact_messages         enable row level security;

-- ============================================================================
-- profiles
-- ============================================================================
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

-- Users may create only their own profile row (the new-user trigger normally
-- does this; this policy covers manual creation from the client).
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- Users may update their own row. Role/status escalation is blocked by the
-- prevent_profile_privilege_escalation trigger in 0003 — RLS alone cannot
-- restrict individual columns.
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- brand_profiles
-- ============================================================================
create policy brand_profiles_owner_all on public.brand_profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy brand_profiles_admin_all on public.brand_profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- creator_profiles
-- ============================================================================
create policy creator_profiles_owner_all on public.creator_profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy creator_profiles_admin_all on public.creator_profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- verification_records
-- ============================================================================
create policy verification_records_owner_select on public.verification_records
  for select to authenticated using (user_id = auth.uid());

create policy verification_records_owner_insert on public.verification_records
  for insert to authenticated with check (user_id = auth.uid());

create policy verification_records_admin_all on public.verification_records
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- social_accounts
-- ============================================================================
create policy social_accounts_owner_all on public.social_accounts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy social_accounts_admin_all on public.social_accounts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- campaigns
-- ============================================================================
-- Public discovery: anyone (including anonymous) may read active/scheduled
-- campaigns. Draft/pending campaigns stay private to the owning brand.
create policy campaigns_public_read on public.campaigns
  for select to anon, authenticated
  using (status in ('active','scheduled'));

create policy campaigns_owner_all on public.campaigns
  for all to authenticated
  using (brand_id = auth.uid())
  with check (brand_id = auth.uid());

create policy campaigns_admin_all on public.campaigns
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- campaign_assets — readable when the parent campaign is readable
-- ============================================================================
create policy campaign_assets_read on public.campaign_assets
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and (c.status in ('active','scheduled')
             or c.brand_id = auth.uid()
             or public.is_admin())
    )
  );

create policy campaign_assets_write on public.campaign_assets
  for all to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and (c.brand_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and (c.brand_id = auth.uid() or public.is_admin())
    )
  );

-- ============================================================================
-- campaign_rules — same visibility rules as assets
-- ============================================================================
create policy campaign_rules_read on public.campaign_rules
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and (c.status in ('active','scheduled')
             or c.brand_id = auth.uid()
             or public.is_admin())
    )
  );

create policy campaign_rules_write on public.campaign_rules
  for all to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and (c.brand_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and (c.brand_id = auth.uid() or public.is_admin())
    )
  );

-- ============================================================================
-- campaign_memberships
-- ============================================================================
create policy campaign_memberships_creator_select on public.campaign_memberships
  for select to authenticated using (creator_id = auth.uid());

create policy campaign_memberships_creator_insert on public.campaign_memberships
  for insert to authenticated with check (creator_id = auth.uid());

-- Brand owners can see who joined their campaigns.
create policy campaign_memberships_brand_select on public.campaign_memberships
  for select to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.brand_id = auth.uid()
    )
  );

create policy campaign_memberships_admin_all on public.campaign_memberships
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- submissions
-- ============================================================================
create policy submissions_creator_select on public.submissions
  for select to authenticated using (creator_id = auth.uid());

create policy submissions_creator_insert on public.submissions
  for insert to authenticated with check (creator_id = auth.uid());

-- "Limited" creator update: a creator may edit their own submission but may NOT
-- move it into brand-only decision states (approved/rejected). This blocks
-- self-approval at the policy layer.
create policy submissions_creator_update on public.submissions
  for update to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid() and status in ('submitted','disputed','metrics_unavailable'));

-- Brand owner of the campaign can read and review submissions.
create policy submissions_brand_select on public.submissions
  for select to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.brand_id = auth.uid()
    )
  );

create policy submissions_brand_update on public.submissions
  for update to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.brand_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.brand_id = auth.uid()
    )
  );

create policy submissions_admin_all on public.submissions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- submission_metrics — read-only for users; writes via service role ONLY.
-- No INSERT/UPDATE/DELETE policies exist, so only the service_role (which
-- bypasses RLS) can write metrics.
-- ============================================================================
create policy submission_metrics_creator_select on public.submission_metrics
  for select to authenticated
  using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.creator_id = auth.uid()
    )
  );

create policy submission_metrics_brand_select on public.submission_metrics
  for select to authenticated
  using (
    exists (
      select 1 from public.submissions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = submission_id and c.brand_id = auth.uid()
    )
  );

create policy submission_metrics_admin_select on public.submission_metrics
  for select to authenticated using (public.is_admin());

-- ============================================================================
-- wallet_transactions — ledger. Read-only for the owner; writes via service
-- role / ledger RPC only. No INSERT/UPDATE/DELETE policy is defined, and a
-- trigger forbids DELETE for everyone (including the service role).
-- ============================================================================
create policy wallet_transactions_select_own on public.wallet_transactions
  for select to authenticated using (user_id = auth.uid());

create policy wallet_transactions_admin_select on public.wallet_transactions
  for select to authenticated using (public.is_admin());

-- ============================================================================
-- wallets — read-only for the owner; balances maintained by the ledger trigger.
-- ============================================================================
create policy wallets_select_own on public.wallets
  for select to authenticated using (user_id = auth.uid());

create policy wallets_admin_select on public.wallets
  for select to authenticated using (public.is_admin());

-- ============================================================================
-- bank_accounts — read-only for the owner; writes via service role only.
-- ============================================================================
create policy bank_accounts_select_own on public.bank_accounts
  for select to authenticated using (user_id = auth.uid());

create policy bank_accounts_admin_all on public.bank_accounts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- withdrawals — read-only for the owner; created/processed via service role.
-- ============================================================================
create policy withdrawals_select_own on public.withdrawals
  for select to authenticated using (user_id = auth.uid());

create policy withdrawals_admin_all on public.withdrawals
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- notifications
-- ============================================================================
create policy notifications_owner_all on public.notifications
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_admin_all on public.notifications
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- notification_preferences
-- ============================================================================
create policy notification_preferences_owner_all on public.notification_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notification_preferences_admin_all on public.notification_preferences
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- support_tickets
-- ============================================================================
create policy support_tickets_owner_select on public.support_tickets
  for select to authenticated using (user_id = auth.uid());

create policy support_tickets_owner_insert on public.support_tickets
  for insert to authenticated with check (user_id = auth.uid());

-- Assignees and admins get full access.
create policy support_tickets_staff_all on public.support_tickets
  for all to authenticated
  using (assigned_to = auth.uid() or public.is_admin())
  with check (assigned_to = auth.uid() or public.is_admin());

-- ============================================================================
-- ticket_messages
-- ============================================================================
create policy ticket_messages_participant_select on public.ticket_messages
  for select to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
        and (t.user_id = auth.uid() or t.assigned_to = auth.uid())
    )
    or public.is_admin()
  );

create policy ticket_messages_owner_insert on public.ticket_messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
        and (t.user_id = auth.uid() or t.assigned_to = auth.uid())
    )
  );

create policy ticket_messages_admin_all on public.ticket_messages
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- disputes
-- ============================================================================
create policy disputes_owner_select on public.disputes
  for select to authenticated using (raised_by = auth.uid());

create policy disputes_owner_insert on public.disputes
  for insert to authenticated with check (raised_by = auth.uid());

create policy disputes_staff_all on public.disputes
  for all to authenticated
  using (assigned_to = auth.uid() or public.is_admin())
  with check (assigned_to = auth.uid() or public.is_admin());

-- ============================================================================
-- appeals
-- ============================================================================
create policy appeals_creator_select on public.appeals
  for select to authenticated using (creator_id = auth.uid());

create policy appeals_creator_insert on public.appeals
  for insert to authenticated with check (creator_id = auth.uid());

create policy appeals_staff_all on public.appeals
  for all to authenticated
  using (reviewed_by = auth.uid() or public.is_admin())
  with check (reviewed_by = auth.uid() or public.is_admin());

-- ============================================================================
-- audit_logs — append-only. Only admins can read; inserts via service role.
-- No INSERT/UPDATE/DELETE policies are defined for end users.
-- ============================================================================
create policy audit_logs_admin_select on public.audit_logs
  for select to authenticated using (public.is_admin());

-- ============================================================================
-- platform_settings
-- ============================================================================
-- Non-sensitive keys are readable by any authenticated user; sensitive keys
-- only by admins. The app is expected to expose only non-sensitive values
-- publicly (server-side filtering).
create policy platform_settings_read on public.platform_settings
  for select to authenticated
  using (is_sensitive = false or public.is_admin());

create policy platform_settings_admin_write on public.platform_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- contact_messages — anonymous INSERT only; readable by admins.
-- ============================================================================
create policy contact_messages_anon_insert on public.contact_messages
  for insert to anon, authenticated
  with check (
    length(btrim(coalesce(name, ''))) > 0
    and length(btrim(coalesce(email, ''))) > 0
    and length(btrim(coalesce(message, ''))) > 0
  );

create policy contact_messages_admin_select on public.contact_messages
  for select to authenticated using (public.is_admin());

-- ============================================================================
-- Indexes for hot query paths.
-- ============================================================================
create index if not exists idx_campaigns_status_category_end_date
  on public.campaigns (status, category, end_date);
create index if not exists idx_campaigns_brand_id
  on public.campaigns (brand_id);
create index if not exists idx_submissions_campaign_id
  on public.submissions (campaign_id);
create index if not exists idx_submissions_creator_id
  on public.submissions (creator_id);
create index if not exists idx_submissions_post_url
  on public.submissions (post_url);
create index if not exists idx_campaign_memberships_campaign_creator
  on public.campaign_memberships (campaign_id, creator_id);
create index if not exists idx_wallet_transactions_user_created
  on public.wallet_transactions (user_id, created_at);
-- The unique constraint on idempotency_key already creates a unique index;
-- this explicit index is kept for clarity/discoverability.
create index if not exists idx_wallet_transactions_idempotency_key
  on public.wallet_transactions (idempotency_key);
create index if not exists idx_submission_metrics_submission_id
  on public.submission_metrics (submission_id);
create index if not exists idx_notifications_user_read
  on public.notifications (user_id, read);
create index if not exists idx_audit_logs_entity
  on public.audit_logs (entity_type, entity_id);

commit;
