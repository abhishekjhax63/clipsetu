# CLIPSETU — Implementation Plan

All 10 phases are implemented in code. Integrations that require third-party
credentials (Razorpay, YouTube/Instagram APIs, Resend, payout provider) are
fully wired behind server-only config helpers and surface a clear SETUP
REQUIREMENT instead of pretending to work. No data is ever fabricated.

## Phase 0: Foundation & Architecture ✅
- [x] Next.js 16 + TypeScript + Tailwind v4 setup
- [x] Design system (colors, tokens, fonts)
- [x] Base UI components (Button, Card, Input, Badge, Avatar, Dialog, Tabs, etc.)
- [x] Supabase client setup (browser + server + admin)
- [x] Auth utilities & RBAC helpers
- [x] Homepage with public layout
- [x] Remaining public pages
- [x] Database migrations & RLS

## Phase 1: Public Site & Design System ✅
- [x] Homepage
- [x] How It Works
- [x] For Brands
- [x] For Clippers
- [x] Campaign Discovery
- [x] Pricing
- [x] About, Contact, FAQ
- [x] Legal pages (Terms, Privacy, Cookies, Payments, Guidelines)

## Phase 2: Authentication & User Management ✅
- [x] Supabase Auth integration (email/password)
- [x] Email verification, forgot/reset password
- [x] Login, signup, logout flows
- [x] Role-based onboarding (Brand / Clipper)
- [x] Profile management (account + notification settings)
- [x] Session middleware (proxy.ts)
- [x] Protected routes

## Phase 3: Brand Dashboard ✅
- [x] Brand overview dashboard (real DB-backed stats)
- [x] Campaign creation wizard (validated server-side with Zod)
- [x] Campaign management (edit, pause, resume, end)
- [x] Submission review (approve / reject / request revision)
- [x] Campaign analytics & reports (per-campaign submissions view)
- [x] Wallet & deposits (Razorpay funding with honest SetupNotice when unconfigured)

## Phase 4: Clipper Dashboard ✅
- [x] Creator home with earnings overview
- [x] Campaign discovery with filters
- [x] Campaign details & join flow
- [x] Campaign workspace
- [x] Video submission
- [x] Submission status & appeals
- [x] Earnings & wallet

## Phase 5: Social Integration & Verification ✅
- [x] Instagram Graph API adapter (business accounts; honest `unsupported`
      fallback when view counts are not exposed — never scraped/faked)
- [x] YouTube Data API adapter (public stats, `api_verified`)
- [x] Post URL validation
- [x] Metrics retrieval & scheduled refresh (`/api/jobs/refresh-metrics`, CRON_SECRET)
- [x] Fraud detection (duplicate URLs, abnormal growth heuristics)
- [x] Manual review fallback

## Phase 6: Rewards, Wallet & Payments ✅
- [x] Reward engine (configurable per-1k-views, submission + budget caps)
- [x] Append-only double-entry ledger (`wallet_transactions`; balances via trigger)
- [x] Brand deposits (Razorpay order + signature + webhook verification)
- [x] Creator payouts (interface + approval workflow; provider requires credentials
      — `initiatePayout` returns an honest no-op error until configured)
- [x] Withdrawal requests & approval (KYC/18+ gated, balance-checked)
- [x] Webhook verification & reconciliation (idempotent)
- [x] CSV statements & admin ledger export

## Phase 7: Admin Dashboard ✅
- [x] Admin overview & stats (real aggregates)
- [x] User management (status, role, brand verification, internal notes)
- [x] Campaign moderation (approve / reject / pause / resume / cancel)
- [x] Payment administration (withdrawal approval & payout lifecycle)
- [x] Submission moderation workspace (mirrors the reward rule — credits only
      when metrics are API-verified)
- [x] Platform configuration (platform_settings)
- [x] Site content CMS (cms_content): homepage content, help-centre content and
      system announcements — draft/published, audited, public pages read published
      rows via `use cache` and are revalidated on publish
- [x] Secure bootstrap (BOOTSTRAP_ADMIN_SECRET + ADMIN_EMAILS allowlist + DB role;
      MFA surfaced; never hardcoded; no public admin entry point)

## Phase 8: Notifications & Communication ✅
- [x] In-app notifications
- [x] Transactional emails (Resend; gated by notification_preferences)
- [x] Notification preferences

## Phase 9: Support & Disputes ✅
- [x] Help centre
- [x] Support tickets (user + admin, internal notes hidden server-side)
- [x] Ticket attachments (https links or validated file uploads in private Storage,
      rendered via signed URLs)
- [x] Creator/brand disputes
- [x] Submission appeals
- [x] Admin ticket & dispute controls

## Phase 10: Database & Backend Hardening ✅
- [x] Complete schema with all tables (26 tables)
- [x] RLS policies for all tables
- [x] Indexes & performance tuning
- [x] Error monitoring hook (Sentry-ready)
- [x] Security checklist & audit logging

## Verification
- [x] `npx next typegen && npx tsc --noEmit` — clean
- [x] `npx eslint src` — clean
- [x] `npm run build` — succeeds (68 routes)
