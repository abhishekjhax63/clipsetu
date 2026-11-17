# CLIPSETU — Database Schema

> PostgreSQL on Supabase. All tables use UUID primary keys and `created_at`/`updated_at` timestamps. RLS enabled on all tables.

## Core Tables

### profiles
Extended user profile linked to Supabase auth.users.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | FK → auth.users.id |
| email | text | |
| full_name | text | |
| avatar_url | text | |
| role | text | brand, clipper, admin, super_admin, moderation |
| status | text | active, suspended, pending |
| phone | text | |
| country | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### brand_profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| brand_name | text | |
| company_website | text | |
| business_category | text | |
| gstin | text | |
| logo_url | text | |
| description | text | |
| verification_status | text | not_submitted, pending, under_review, verified, rejected, suspended |
| created_at | timestamptz | |

### creator_profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| username | text | unique |
| display_name | text | |
| bio | text | |
| categories | text[] | |
| kyc_status | text | not_submitted, pending, verified, rejected |
| date_of_birth | date | required for payouts (must be 18+) |
| created_at | timestamptz | |

### social_accounts
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| platform | text | instagram, youtube |
| handle | text | |
| access_token | text | encrypted |
| refresh_token | text | encrypted |
| token_expires_at | timestamptz | |
| follower_count | int | |
| verified | boolean | |

### campaigns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| brand_id | uuid | FK → profiles |
| title | text | |
| description | text | |
| category | text | |
| type | text | video_clipping, ugc, music_promotion, brand_promotion, custom |
| status | text | draft, pending_payment, pending_review, scheduled, active, paused, completed, rejected, cancelled |
| budget | numeric(12,2) | INR |
| remaining_budget | numeric(12,2) | |
| reward_per_1k_views | numeric(10,2) | INR |
| max_reward_per_submission | numeric(10,2) | |
| max_campaign_reward | numeric(12,2) | |
| min_views | int | |
| start_date | timestamptz | |
| end_date | timestamptz | |
| submission_deadline | timestamptz | |
| thumbnail_url | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### campaign_assets
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| campaign_id | uuid | FK → campaigns |
| type | text | video, image, logo, document, reference |
| url | text | |
| filename | text | |
| created_at | timestamptz | |

### campaign_rules
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| campaign_id | uuid | FK → campaigns |
| platforms | text[] | instagram, youtube |
| required_hashtags | text[] | |
| required_mentions | text[] | |
| caption_requirements | text | |
| min_duration | int | seconds |
| max_duration | int | seconds |
| content_restrictions | text | |
| mandatory_branding | text | |
| prohibited_content | text | |
| language | text | |
| disclosure_required | boolean | |
| eligible_categories | text[] | |
| min_followers | int | |
| geographic_restrictions | text[] | |
| age_requirement | int | default 18 |

### campaign_memberships
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| campaign_id | uuid | FK → campaigns |
| creator_id | uuid | FK → profiles |
| status | text | joined, left, banned |
| joined_at | timestamptz | |

### submissions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| campaign_id | uuid | FK → campaigns |
| creator_id | uuid | FK → profiles |
| platform | text | |
| post_url | text | |
| external_post_id | text | |
| caption | text | |
| status | text | submitted, pending_review, processing, approved, rejected, revision_requested, metrics_unavailable, disputed |
| rejection_reason | text | |
| review_notes | text | |
| submitted_at | timestamptz | |
| reviewed_at | timestamptz | |
| reviewer_id | uuid | FK → profiles |

### submission_metrics
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| submission_id | uuid | FK → submissions |
| view_count | int | |
| likes | int | |
| comments | int | |
| shares | int | |
| last_checked | timestamptz | |
| metrics_source | text | api, manual |
| verification_confidence | numeric(3,2) | 0-1 |
| verification_status | text | pending, verified, unavailable, flagged |

### wallet_transactions (double-entry ledger)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| type | text | deposit, reward, withdrawal, refund, adjustment, reversal, platform_fee |
| direction | text | credit, debit |
| amount | numeric(12,2) | INR |
| status | text | pending, completed, failed, reversed |
| idempotency_key | text | unique |
| campaign_id | uuid | nullable FK |
| submission_id | uuid | nullable FK |
| related_payment_ref | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### wallets (materialized balance view)
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid | PK, FK → profiles |
| total_earned | numeric(12,2) | |
| available | numeric(12,2) | |
| pending | numeric(12,2) | |
| under_review | numeric(12,2) | |
| paid | numeric(12,2) | |
| reversed | numeric(12,2) | |
| updated_at | timestamptz | |

### withdrawals
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| amount | numeric(12,2) | |
| status | text | pending, approved, processing, completed, failed, rejected |
| bank_account_id | uuid | FK |
| payout_ref | text | |
| approved_by | uuid | FK → profiles |
| approved_at | timestamptz | |
| created_at | timestamptz | |

### notifications
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| type | text | campaign, submission, reward, payout, security, support |
| title | text | |
| body | text | |
| read | boolean | |
| created_at | timestamptz | |

### support_tickets
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| category | text | |
| priority | text | low, medium, high, urgent |
| status | text | open, in_progress, waiting_user, resolved, closed |
| subject | text | |
| assigned_to | uuid | nullable FK → profiles |
| created_at | timestamptz | |

### audit_logs
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| actor_id | uuid | FK → profiles |
| action | text | |
| entity_type | text | |
| entity_id | uuid | |
| metadata | jsonb | |
| ip_address | text | |
| created_at | timestamptz | |

### cms_content
| Column | Type | Notes |
|--------|------|-------|
| key | text | PK, e.g. `homepage.hero`, `help.categories`, `system.announcement` |
| value | jsonb | content payload, shape-guarded in `src/lib/cms.ts` |
| description | text | admin-facing explanation of the key |
| status | text | `draft` \| `published` |
| updated_by | uuid | nullable FK → profiles |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Admin-managed site content (Phase 7): homepage copy/stats/steps, help-centre
topics and the site-wide announcement. RLS exposes `published` rows to `anon`
and `authenticated`; `draft` rows are staff-only. Every edit is audited with the
previous and new value, and publishing expires the `cms-content` cache tag.

### rate_limits
| Column | Type | Notes |
|--------|------|-------|
| bucket_key | text | PK, e.g. `login:<ip>` or `login:email:<email>` |
| window_start | timestamptz | start of the current fixed window |
| count | int | attempts consumed in the current window |
| updated_at | timestamptz | |

Service-role only (RLS enabled, no policies). Consumed atomically via
`check_rate_limit(key, limit, window_seconds)` (returns `allowed`, `remaining`,
`retry_after`); expired buckets are removed by `prune_rate_limits(seconds)`,
called from the scheduled job. May contain PII (IP/email) — never expose.

> 26 tables total across `supabase/migrations/0001–0007`. Key functions:
> `handle_new_user`, `apply_wallet_transaction`, `wallet_state_effect`,
> `prevent_ledger_mutation`, `current_role`, `is_admin`, `is_adult`,
> `check_rate_limit`, `prune_rate_limits`. Migrations also create the private
> `support-attachments` Storage bucket (`0006_storage.sql`) and the
> `cms_content` content store (`0007_cms.sql`).

## RLS Strategy
- All tables have RLS enabled
- Users can only read/write their own data
- Brands can read submissions to their campaigns
- Admins/super_admins have broader access via service role
- Financial tables are write-protected except via server functions
- `cms_content` published rows are world-readable (anon); drafts are staff-only
- `rate_limits` has no policies: only the service-role client / SECURITY DEFINER functions may touch it
