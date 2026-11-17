-- ============================================================================
-- ClipSetu — 0007_cms.sql
-- Admin-managed site content (Phase 7: Platform configuration).
-- ----------------------------------------------------------------------------
-- Backs the admin "Content" console: homepage copy, help-centre topics and the
-- site-wide system announcement. Public pages read the PUBLISHED value through
-- the anon key (RLS enforced); drafts are visible to staff only.
--
-- Content is keyed and stored as JSONB so a single table serves every editable
-- surface without schema churn. Values are validated in application code
-- (src/lib/cms.ts) and fall back to the built-in defaults when a key is absent,
-- so the public site never renders an empty page.
--
-- The seed below mirrors the previous hardcoded copy exactly, and
-- `on conflict (key) do nothing` keeps it safe to re-run and never clobbers
-- content an admin has already edited.
-- Requires 0001_schema.sql and 0002_rls.sql (public.is_admin()).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- cms_content — keyed JSONB content store with a draft/published status.
-- ----------------------------------------------------------------------------
create table public.cms_content (
  key text primary key,
  value jsonb not null,
  description text,
  status text not null default 'published'
    check (status in ('draft', 'published')),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.cms_content is
  'Admin-managed site content (homepage, help centre, announcements). Public pages read published rows.';
comment on column public.cms_content.status is
  'draft rows are visible only to staff; published rows are readable by anon.';

alter table public.cms_content enable row level security;

-- Published content is world-readable; staff can additionally read drafts.
create policy cms_content_read on public.cms_content
  for select to anon, authenticated
  using (status = 'published' or public.is_admin());

create policy cms_content_admin_write on public.cms_content
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_cms_content_status
  on public.cms_content (status);

-- ----------------------------------------------------------------------------
-- Default content — mirrors the previously hardcoded copy.
-- ----------------------------------------------------------------------------
insert into public.cms_content (key, value, description, status)
values
  (
    'homepage.hero',
    $json${
      "badge": "🇮🇳 India-first creator marketplace",
      "title": "Create. Clip. Publish.",
      "titleAccent": "Earn.",
      "subtitle": "Turn your creativity into opportunity. Discover campaigns, publish clips and earn rewards for verified performance.",
      "primaryCtaLabel": "Start earning",
      "primaryCtaHref": "/signup",
      "secondaryCtaLabel": "See how it works",
      "secondaryCtaHref": "/how-it-works"
    }$json$::jsonb,
    'Homepage hero: badge, headline, sub-copy and the two call-to-action buttons.',
    'published'
  ),
  (
    'homepage.stats',
    $json$[
      { "label": "Platform fee", "value": "10%" },
      { "label": "Min withdrawal", "value": "₹100" },
      { "label": "Payout basis", "value": "Verified views" },
      { "label": "Settlement", "value": "INR" }
    ]$json$::jsonb,
    'Homepage stat tiles (4). Platform facts by default — never invented adoption metrics.',
    'published'
  ),
  (
    'homepage.how_it_works',
    $json$[
      {
        "step": "01",
        "title": "Discover a campaign",
        "desc": "Browse active campaigns from brands across India. Filter by platform, category and reward."
      },
      {
        "step": "02",
        "title": "Create and publish your clip",
        "desc": "Download source materials, create your reel or short, and publish it on Instagram or YouTube."
      },
      {
        "step": "03",
        "title": "Submit your post",
        "desc": "Paste your published post URL. We validate it and pull verified metrics through official APIs."
      },
      {
        "step": "04",
        "title": "Earn based on verified performance",
        "desc": "Rewards are calculated from eligible verified views and released to your wallet automatically."
      }
    ]$json$::jsonb,
    'Homepage "How ClipSetu works" steps. Icons are assigned by position in code.',
    'published'
  ),
  (
    'help.categories',
    $json$[
      {
        "icon": "rocket",
        "title": "Getting Started",
        "desc": "Create an account, choose your role and set up your profile.",
        "articles": [
          "How do I create a ClipSetu account?",
          "Should I sign up as a creator or a brand?",
          "How do I complete my profile?",
          "What are the eligibility requirements?"
        ]
      },
      {
        "icon": "users",
        "title": "For Creators",
        "desc": "Find campaigns, download source material, submit clips and track results.",
        "articles": [
          "How do I join a campaign?",
          "How do I submit a published post URL?",
          "Why was my submission rejected?",
          "How are verified views calculated?",
          "What is the minimum follower requirement?"
        ]
      },
      {
        "icon": "badge-check",
        "title": "For Brands",
        "desc": "Launch campaigns, fund budgets, review submissions and read analytics.",
        "articles": [
          "How do I create and fund a campaign?",
          "How do I set reward rules and budgets?",
          "How do I review creator submissions?",
          "What happens to unused campaign budget?"
        ]
      },
      {
        "icon": "wallet",
        "title": "Payments & Payouts",
        "desc": "Understand rewards, the platform fee, withdrawals and timelines.",
        "articles": [
          "What is the minimum withdrawal amount?",
          "What platform fee does ClipSetu charge?",
          "How long do withdrawals take?",
          "Why is my payout on hold?",
          "Which payment provider is used for payouts?"
        ]
      },
      {
        "icon": "lock",
        "title": "Account & Security",
        "desc": "Protect your account, manage login and resolve access issues.",
        "articles": [
          "How do I reset my password?",
          "How do I enable two-factor authentication?",
          "How do I report a suspicious login?",
          "How do I delete my account?"
        ]
      },
      {
        "icon": "scroll-text",
        "title": "Verification & KYC",
        "desc": "Verify your identity and stay compliant before withdrawing earnings.",
        "articles": [
          "Why do I need KYC to withdraw?",
          "What documents are accepted for KYC?",
          "How long does verification take?",
          "Why was my verification rejected?"
        ]
      }
    ]$json$::jsonb,
    'Help-centre topic cards. Supported icon keys: rocket, users, badge-check, wallet, lock, scroll-text.',
    'published'
  ),
  (
    'system.announcement',
    $json${
      "enabled": false,
      "tone": "info",
      "message": "",
      "href": null,
      "linkLabel": null
    }$json$::jsonb,
    'Site-wide announcement banner. Set enabled=true to show it to every visitor.',
    'published'
  )
on conflict (key) do nothing;

commit;
