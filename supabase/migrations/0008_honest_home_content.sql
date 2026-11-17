-- ============================================================================
-- ClipSetu — 0008_honest_home_content.sql
-- Corrective content migration.
--
-- 0007_cms.sql seeded `homepage.stats` with invented adoption metrics
-- ("12K+ Creators", "340+ Campaigns", "₹2.1Cr Paid out", "48M+ Verified views")
-- and a hero subtitle that is no longer used. Because 0007 inserts with
-- `on conflict (key) do nothing`, environments where it already ran still show
-- those fabricated numbers.
--
-- This migration replaces the fabricated figures with truthful platform facts
-- and refreshes the hero sub-copy. It is guarded so it NEVER overwrites content
-- an admin has already edited: each update only fires while the row still holds
-- the exact old payload.
-- ============================================================================

begin;

update public.cms_content
set
  value = $json$[
    { "label": "Platform fee", "value": "10%" },
    { "label": "Min withdrawal", "value": "₹100" },
    { "label": "Payout basis", "value": "Verified views" },
    { "label": "Settlement", "value": "INR" }
  ]$json$::jsonb,
  description = 'Homepage stat tiles (4). Platform facts by default — never invented adoption metrics.',
  updated_at = now()
where key = 'homepage.stats'
  and value = $old$[
      { "label": "Creators", "value": "12K+" },
      { "label": "Campaigns", "value": "340+" },
      { "label": "Paid out", "value": "₹2.1Cr" },
      { "label": "Verified views", "value": "48M+" }
    ]$old$::jsonb;

update public.cms_content
set
  value = jsonb_set(
    value,
    '{subtitle}',
    to_jsonb(
      'Turn your creativity into opportunity. Discover campaigns, publish clips and earn rewards for verified performance.'::text
    )
  ),
  updated_at = now()
where key = 'homepage.hero'
  and value->>'subtitle' =
    'ClipSetu connects brands with creators. Launch campaigns, submit reels & shorts, and get paid for every verified view.';

commit;
