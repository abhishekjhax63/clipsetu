-- ============================================================================
-- ClipSetu — 0003_functions_triggers.sql
-- Helper functions, the new-user provisioning trigger, wallet-ledger balance
-- maintenance, updated_at triggers, and immutability / privilege guards.
-- Requires 0001_schema.sql.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- updated_at maintenance
-- ----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.handle_updated_at() is
  'BEFORE UPDATE trigger: stamps updated_at = now() on every row update.';

create trigger trg_profiles_updated_at                 before update on public.profiles                 for each row execute function public.handle_updated_at();
create trigger trg_brand_profiles_updated_at           before update on public.brand_profiles           for each row execute function public.handle_updated_at();
create trigger trg_creator_profiles_updated_at         before update on public.creator_profiles         for each row execute function public.handle_updated_at();
create trigger trg_verification_records_updated_at     before update on public.verification_records     for each row execute function public.handle_updated_at();
create trigger trg_social_accounts_updated_at          before update on public.social_accounts          for each row execute function public.handle_updated_at();
create trigger trg_campaigns_updated_at                before update on public.campaigns                for each row execute function public.handle_updated_at();
create trigger trg_campaign_rules_updated_at           before update on public.campaign_rules           for each row execute function public.handle_updated_at();
create trigger trg_submissions_updated_at              before update on public.submissions              for each row execute function public.handle_updated_at();
create trigger trg_wallets_updated_at                  before update on public.wallets                  for each row execute function public.handle_updated_at();
create trigger trg_bank_accounts_updated_at            before update on public.bank_accounts            for each row execute function public.handle_updated_at();
create trigger trg_withdrawals_updated_at              before update on public.withdrawals              for each row execute function public.handle_updated_at();
create trigger trg_notification_preferences_updated_at before update on public.notification_preferences for each row execute function public.handle_updated_at();
create trigger trg_support_tickets_updated_at          before update on public.support_tickets          for each row execute function public.handle_updated_at();
create trigger trg_disputes_updated_at                 before update on public.disputes                 for each row execute function public.handle_updated_at();
create trigger trg_appeals_updated_at                  before update on public.appeals                  for each row execute function public.handle_updated_at();
create trigger trg_platform_settings_updated_at        before update on public.platform_settings        for each row execute function public.handle_updated_at();

-- wallet_transactions.updated_at is normally driven by the ledger trigger; this
-- keeps it correct even for the allowed completed -> reversed transition.
create trigger trg_wallet_transactions_updated_at      before update on public.wallet_transactions      for each row execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- handle_new_user — provision app-side rows when an auth user is created.
-- SECURITY DEFINER with a pinned empty search_path so it cannot be hijacked.
-- Role is taken from user metadata but validated to brand|clipper only; any
-- other value (including '' or 'admin') falls back to 'clipper'. Privileged
-- roles can therefore NEVER be self-assigned at signup.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_full_name text;
begin
  v_full_name := new.raw_user_meta_data->>'full_name';

  v_role := coalesce(new.raw_user_meta_data->>'role', 'clipper');
  if v_role not in ('brand','clipper') then
    v_role := 'clipper';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, v_full_name, v_role)
  on conflict (id) do nothing;

  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  if v_role = 'brand' then
    insert into public.brand_profiles (user_id, brand_name, official_email, verification_status)
    values (new.id, coalesce(v_full_name, 'New Brand'), new.email, 'not_submitted')
    on conflict (user_id) do nothing;
  else
    insert into public.creator_profiles (user_id, username, display_name, kyc_status)
    values (
      new.id,
      'user_' || substr(replace(new.id::text, '-', ''), 1, 12),
      coalesce(v_full_name, 'New Creator'),
      'not_submitted'
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT on auth.users: creates profiles + wallets + notification_preferences and a minimal brand/creator profile. Role metadata is validated to brand|clipper only.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- wallet_state_effect — pure function returning the wallet delta implied by
-- *being in* a given ledger state. The ledger trigger applies the difference
-- between the new and old states, which makes the update idempotent.
--
-- MAPPING (type, direction, status) -> wallet bucket:
--   deposit    credit completed            -> available   (+amount)   [brand funding]
--   reward     credit pending              -> pending     (+amount)   [earn under review]
--   reward     credit completed            -> available   (+amount), total_earned (+amount), pending delta cancels on transition
--   withdrawal any    pending/approved/processing/completed -> available (-amount) [funds held]
--   withdrawal any    completed            -> paid        (+amount)   [money paid out]
--   refund     credit completed            -> available   (+amount)
--   adjustment credit completed            -> available   (+amount)
--   reversal   any    completed/reversed   -> reversed    (+amount)
--   platform_fee *     completed           -> reported only (NO wallet bucket change)
--   under_review is currently unused (reserved for manual-review holds).
-- ----------------------------------------------------------------------------
create or replace function public.wallet_state_effect(
  p_type text,
  p_direction text,
  p_amount numeric,
  p_status text,
  out d_available numeric,
  out d_pending numeric,
  out d_paid numeric,
  out d_reversed numeric,
  out d_total_earned numeric
)
language sql
immutable
set search_path = ''
as $$
  select
    case
      when p_status = 'completed' and p_type in ('deposit','reward','refund','adjustment')
        then case when p_direction = 'credit' then p_amount else -p_amount end
      when p_type = 'withdrawal' and p_status in ('pending','approved','processing','completed')
        then -p_amount
      else 0
    end,
    case
      when p_status = 'pending' and p_type = 'reward'
        then case when p_direction = 'credit' then p_amount else -p_amount end
      else 0
    end,
    case
      when p_status = 'completed' and p_type = 'withdrawal' then p_amount
      else 0
    end,
    case
      when p_type = 'reversal' and p_status in ('completed','reversed') then p_amount
      else 0
    end,
    case
      when p_status = 'completed' and p_type = 'reward'
        then case when p_direction = 'credit' then p_amount else -p_amount end
      else 0
    end;
$$;

comment on function public.wallet_state_effect(text, text, numeric, text) is
  'Pure wallet-delta function for a ledger state. Used by apply_wallet_transaction to compute (new - old) deltas idempotently.';

-- ----------------------------------------------------------------------------
-- apply_wallet_transaction — maintain wallets from the ledger.
-- Fires on INSERT and on any UPDATE that includes the status column. Applies
-- (effect(new) - effect(old)) so repeated / replayed transitions are safe and
-- never double-count. Raises if available would go negative.
-- ----------------------------------------------------------------------------
create or replace function public.apply_wallet_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n_available numeric := 0;
  n_pending   numeric := 0;
  n_paid      numeric := 0;
  n_reversed  numeric := 0;
  n_earned    numeric := 0;
  o_available numeric := 0;
  o_pending   numeric := 0;
  o_paid      numeric := 0;
  o_reversed  numeric := 0;
  o_earned    numeric := 0;
begin
  select d_available, d_pending, d_paid, d_reversed, d_total_earned
    into n_available, n_pending, n_paid, n_reversed, n_earned
    from public.wallet_state_effect(new.type, new.direction, new.amount, new.status);

  if tg_op = 'UPDATE' then
    select d_available, d_pending, d_paid, d_reversed, d_total_earned
      into o_available, o_pending, o_paid, o_reversed, o_earned
      from public.wallet_state_effect(old.type, old.direction, old.amount, old.status);
  end if;

  insert into public.wallets (user_id)
  values (new.user_id)
  on conflict (user_id) do nothing;

  update public.wallets
     set available    = available    + (n_available - o_available),
         pending      = pending      + (n_pending   - o_pending),
         paid         = paid         + (n_paid      - o_paid),
         reversed     = reversed     + (n_reversed  - o_reversed),
         total_earned = total_earned + (n_earned    - o_earned),
         updated_at   = now()
   where user_id = new.user_id;

  if (select w.available from public.wallets w where w.user_id = new.user_id) < 0 then
    raise exception 'Wallet available balance would become negative for user %', new.user_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.apply_wallet_transaction() is
  'AFTER INSERT OR UPDATE OF status on wallet_transactions: adjusts wallets by (effect(new) - effect(old)). Idempotent and overdraft-safe.';

create trigger trg_apply_wallet_transaction
  after insert or update of status on public.wallet_transactions
  for each row execute function public.apply_wallet_transaction();

-- ----------------------------------------------------------------------------
-- prevent_ledger_mutation — append-only enforcement for the ledger.
-- Blocks ALL deletes (for every role, including service_role). For UPDATEs of a
-- row already in status='completed', the ONLY permitted change is status ->
-- 'reversed' with every other field unchanged. Rows in other statuses (pending,
-- failed, reversed) may still be updated by the service role.
-- ----------------------------------------------------------------------------
create or replace function public.prevent_ledger_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'wallet_transactions is append-only: DELETE is not permitted'
      using errcode = 'insufficient_privilege';
  end if;

  -- tg_op = 'UPDATE'
  if old.status = 'completed' then
    if new.status = 'reversed'
       and new.user_id = old.user_id
       and new.type = old.type
       and new.direction = old.direction
       and new.amount = old.amount
       and new.campaign_id is not distinct from old.campaign_id
       and new.submission_id is not distinct from old.submission_id
       and new.idempotency_key is not distinct from old.idempotency_key
       and new.related_payment_ref is not distinct from old.related_payment_ref
    then
      return new;
    end if;

    raise exception 'wallet_transactions rows with status=completed are immutable except a status change to ''reversed'''
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

comment on function public.prevent_ledger_mutation() is
  'BEFORE UPDATE OR DELETE on wallet_transactions: forbids deletes entirely; on completed rows permits only status -> reversed.';

create trigger trg_prevent_ledger_mutation
  before update or delete on public.wallet_transactions
  for each row execute function public.prevent_ledger_mutation();

-- ----------------------------------------------------------------------------
-- is_adult — convenience helper mirroring the creator_profiles CHECK.
-- ----------------------------------------------------------------------------
create or replace function public.is_adult(p_dob date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_dob is not null and p_dob <= (current_date - interval '18 years');
$$;

comment on function public.is_adult(date) is
  'True when the given date of birth is on/before the 18-years-ago cutoff. STABLE (depends on current_date).';

-- ----------------------------------------------------------------------------
-- prevent_profile_privilege_escalation — RLS permits users to UPDATE their own
-- profiles row, but it cannot restrict individual columns. This trigger blocks
-- non-admins from changing `role` or `status` on their own row, preventing
-- self-escalation to admin. Service-role / direct SQL (no auth.uid()) is allowed
-- so the documented one-off super-admin promotion still works.
-- ----------------------------------------------------------------------------
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No end-user auth context => service role or a direct SQL session: allow.
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role or new.status is distinct from old.status then
    raise exception 'Only admins may change profile role or status'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

comment on function public.prevent_profile_privilege_escalation() is
  'BEFORE UPDATE on profiles: blocks non-admin users from changing their own role/status (no self-granting of privileged roles).';

create trigger trg_prevent_profile_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();

commit;
