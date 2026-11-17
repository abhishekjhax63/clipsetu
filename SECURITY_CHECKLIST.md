# CLIPSETU — Security Checklist

## Authentication & Session
- [x] Server-side session validation (not frontend-only)
- [x] HTTP-only cookies for session tokens
- [x] Secure password hashing (Supabase Auth — bcrypt)
- [x] Email verification required
- [x] Rate limiting on login/signup (DB-backed fixed window; login also limited per-account)
- [x] CSRF protection on all mutations (Next.js Server Actions validate Origin/Host; no cookie-auth REST mutations)
- [x] MFA for admin accounts (TOTP enrolment + AAL2 step-up gate on the admin surface — `src/app/admin/mfa-gate.tsx`, `mfa-actions.ts`; `src/app/admin/layout.tsx` renders only the gate until a verified factor exists and the session is AAL2)
- [ ] Session timeout & refresh (session refresh is wired; explicit idle-timeout is not)

## Authorization & RBAC
- [x] Role-based access control (brand, clipper, admin, super_admin, moderation)
- [x] No self-granting of privileged roles
- [x] Server-side role checks in Server Actions & Route Handlers
- [x] Admin access gated by email allowlist + DB role
- [x] Admin route hidden from public nav (never linked from the public site)

## Data Security
- [x] RLS enabled on all tables
- [x] Service role key never exposed to client
- [x] Encrypted social access/refresh tokens
- [ ] PII minimization — DTO pattern for API responses
- [x] No secrets in frontend code (only `NEXT_PUBLIC_*` values ship to the client; service-role/Razorpay secrets are server-only)
- [ ] Sensitive data encrypted at rest

## Financial Security
- [x] Double-entry ledger for all wallet transactions
- [x] No direct balance edits — always via ledger entry
- [x] Idempotency keys on payments
- [x] Server-side payment verification (never trust frontend)
- [x] Signed webhook verification
- [x] Immutable ledger entries
- [x] Duplicate webhook protection
- [ ] Budget locking for campaigns
- [x] Reversal rules documented (see comments in `supabase/migrations/0003_functions_triggers.sql`: only `completed → reversed` is allowed, all other fields immutable)

## Input Validation
- [x] Zod schemas for all form inputs
- [x] URL validation for social post submissions (per-platform adapters reject malformed URLs)
- [x] File upload validation (type, size) — MIME allowlist + 5 MB cap + magic-number signature check, stored in a private Supabase Storage bucket with owner-scoped RLS and served via 1-hour signed URLs
- [x] Admin-managed content (`cms_content`) — published rows public-read, drafts staff-only, JSON shape-guarded before render, edits audited with old+new value
- [x] SQL injection prevented (parameterized queries via Supabase)

## Fraud Prevention
- [x] Duplicate submission detection
- [x] Duplicate URL checks
- [x] Suspicious view growth detection
- [x] Abnormal engagement detection
- [x] Manual fraud review process (advisory signals only — `metrics_unavailable` routes to human review; never auto-accuses)
- [x] Audit logs for all privileged actions

## Platform API Compliance
- [x] No scraping of private platform data
- [x] Official APIs & OAuth only
- [x] No fake engagement or view simulation
- [x] Rate-limit handling per platform
- [x] Manual review fallback when metrics unavailable

## Deployment
- [ ] HTTPS only (HSTS is sent by the app; TLS termination is a hosting concern)
- [x] Security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy in `next.config.ts`)
- [x] Sentry error monitoring (dependency-free hook in `src/lib/monitoring.ts`; wired via `src/instrumentation.ts` `onRequestError`; active when `SENTRY_DSN` is set)
- [ ] No debug mode in production
- [ ] Dependency audit (npm audit)
