# CLIPSETU — Progress

## Current Phase: Phase 10 complete — all phases (0–10) implemented

Every phase is now implemented end-to-end (frontend + server actions + DB
persistence). Integrations that need third-party credentials are wired behind
server-only config helpers and show a clear SETUP REQUIREMENT instead of
pretending to work. No data is fabricated anywhere.

## Completed

### Phase 0: Foundation
- ✅ Next.js 16 + TypeScript + Tailwind v4 project setup
- ✅ Design system (mint/lime green palette, fintech aesthetic)
- ✅ Base UI components: Button, Card, Input, Textarea, Label, Badge, Avatar, Dialog, Tabs, Separator, Skeleton, Sonner (toast)
- ✅ Supabase client setup (browser, server, admin) + `isSupabaseConfigured()` guard
- ✅ Auth utilities & RBAC helpers (`getCurrentUser`, `requireAuth`, `requireRole`, `isAdmin`)
- ✅ Public layout (header + footer)
- ✅ Homepage (hero, how-it-works, brands/creators, CTA)
- ✅ Architecture documentation

### Phase 1: Public Site
- ✅ how-it-works, for-brands, for-clippers, campaigns (clearly-labelled demo data), pricing, faq
- ✅ about, contact (with real DB-backed form), help
- ✅ Legal: terms, privacy, cookies, payments
- ✅ Guidelines: creator, brand, community
- ✅ `LegalLayout` with DRAFT / pending-legal-review notice
- ✅ Installable PWA: `manifest.ts`, service worker (`public/sw.js`, network-first + `/offline` fallback), generated 192/512 + favicon/apple icons, offline page, `ServiceWorkerRegister` (production only)
- ✅ SEO: `robots.ts` (public allowed, app/admin/api disallowed) + dynamic `sitemap.ts` (static marketing routes + public campaigns)

### Phase 2: Authentication & User Management
- ✅ Supabase Auth: signup (role selector), login, logout, forgot/reset password
- ✅ Session refresh + auth gate via `src/proxy.ts` (Next 16 middleware→proxy rename)
- ✅ Protected route prefixes: /dashboard, /onboarding, /admin, /settings, /notifications
- ✅ Role-based onboarding: Brand & Clipper forms (Zod + useActionState), 18+ check
- ✅ `/unauthorized` page for role mismatches
- ✅ Role-aware `/dashboard` overview with real DB-backed stats
- ✅ Account & notification settings
- ✅ Rate limiting / abuse protection: DB-backed fixed-window limiter (`rate_limits` + `check_rate_limit`) applied to login (per-IP + per-account), signup (per-IP) and password reset (per-IP); expired buckets pruned by the scheduled job
- ✅ Login redirect bug fixed (the `redirect("/dashboard")` now runs outside the try/catch so the NEXT_REDIRECT signal is not swallowed)

### Phase 3: Brand Dashboard
- ✅ Real DB-backed overview (campaign counts, spend, verified views)
- ✅ Campaign creation wizard with server-side Zod validation
- ✅ Campaign management: detail, edit, pause/resume/end, submissions review
- ✅ Campaign funding page (Razorpay; honest SetupNotice when unconfigured)

### Phase 4: Clipper Dashboard
- ✅ Creator home with wallet/earnings overview
- ✅ Campaign discovery with filters, join flow, campaign workspace
- ✅ Video submission + submission status + appeals
- ✅ Wallet page

### Phase 5: Social Integration & View Verification
- ✅ YouTube Data API v3 adapter (`api_verified`), Instagram Graph adapter (business-only, honest `unsupported` fallback)
- ✅ Post URL validation, `refreshSubmissionMetrics`, `refreshStaleMetrics`
- ✅ Cron/job route `/api/jobs/refresh-metrics` (Bearer CRON_SECRET, fails closed with 503)
- ✅ Fraud heuristics (duplicate URLs, abnormal growth) — audit-only, never accuses
- ✅ Manual review fallback (`metrics_unavailable`)

### Phase 6: Rewards, Wallet & Payments
- ✅ Ledger-backed wallet: `wallet_transactions` append-only; balances via `apply_wallet_transaction` trigger + pure `wallet_state_effect`
- ✅ `prevent_ledger_mutation` blocks DELETE; only completed→reversed allowed
- ✅ Reward engine (`eligibleViews/1000 × rewardPer1k`, submission/budget caps, platform fee)
- ✅ Razorpay: order creation, `verifyPaymentSignature`, `verifyWebhookSignature` (timing-safe), idempotent webhook reconciliation
- ✅ Withdrawals: KYC/18+/minimum/balance gated, approval workflow, honest no-op `initiatePayout` until a payout provider is configured
- ✅ CSV wallet statement + admin ledger export

### Phase 7: Admin Dashboard
- ✅ Secure access: staff DB role AND `ADMIN_EMAILS` allowlist, MFA state surfaced; no public admin link/login
- ✅ Overview with real aggregates + recent privileged activity
- ✅ Users (status, role, brand verification, internal notes), Campaign moderation, Payments (withdrawal/payout lifecycle)
- ✅ Submission moderation (credits reward only when metrics are API-verified)
- ✅ Platform settings, `/api/admin/bootstrap` one-time super-admin bootstrap (BOOTSTRAP_ADMIN_SECRET + allowlist)
- ✅ Admin content CMS (`/admin/content`): DB-backed homepage copy/stats/steps, help-centre topics and a site-wide system announcement; draft/published states, old+new values audited, public pages read published content via `use cache` + the `cms-content` tag (invalidated on publish)

### Phase 8: Notifications
- ✅ In-app notifications + read state
- ✅ Transactional email via Resend (gated by `notification_preferences`)
- ✅ Notification preferences settings

### Phase 9: Support & Disputes
- ✅ Support tickets (create, reply, admin assign/status/reply with internal notes)
- ✅ Disputes (create, reply, assign, resolve)
- ✅ Submission appeals
- ✅ Internal notes filtered server-side; attachments are either https links or validated file uploads (private Supabase Storage bucket `support-attachments`, MIME allowlist + 5 MB cap + magic-number signature check, rendered via 1-hour signed URLs)

### Phase 10: Database & Backend Hardening
- ✅ 26-table schema `supabase/migrations/0001–0007` validated on PostgreSQL 17
- ✅ RLS on every table; financial tables have no end-user write policies
- ✅ Private Supabase Storage bucket (`0006_storage.sql`) for support attachments; published CMS content readable by anon, drafts staff-only (`0007_cms.sql`)
- ✅ Indexes & performance tuning; SECURITY DEFINER helpers
- ✅ Audit logging; error-monitoring hook (Sentry-ready)
- ✅ Error monitoring wired through `src/instrumentation.ts` (`onRequestError`) → `src/lib/monitoring.ts` (forwards to Sentry when `SENTRY_DSN` is set, otherwise logs a structured line; never throws)
- ✅ Security headers in `next.config.ts`: CSP, HSTS (2y, preload), X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy; the service worker gets its own `no-store` rule + tight CSP

## Verification
- ✅ `npx next typegen && npx tsc --noEmit` clean
- ✅ `npx eslint src` clean
- ✅ `npm run build` succeeds — 77 routes

## Notes
- All work is mobile-first
- Financial data uses INR; balances never written directly (ledger trigger only)
- No fake data in production — demo data must be labelled
- External integrations require credentials; show setup requirements instead of pretending to work
- Admin is never linked from the public site; access is server-side role + email allowlist + DB role
