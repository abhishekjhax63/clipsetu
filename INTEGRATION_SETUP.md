# CLIPSETU — Integration Setup

## Supabase

1. Create a Supabase project at https://supabase.com
2. Copy `.env.local.example` to `.env.local`
3. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-only, never expose)

## Authentication

Supabase Auth handles:
- Email/password registration & login
- Email verification
- Password reset
- OAuth (Google, etc.)
- Phone OTP (if configured)

Configure in Supabase Dashboard → Authentication.

## Email (Resend)

1. Sign up at https://resend.com
2. Verify your sending domain
3. Add `RESEND_API_KEY` and `EMAIL_FROM` to `.env.local`

Used for: verification emails, password reset, transactional notifications.

## Payments (Razorpay / Cashfree)

### Deposits (Brand funding)
- Create payment order via Razorpay Orders API
- Server-side webhook verification
- Never trust frontend payment-success callback

### Payouts (Creator withdrawals)
- RazorpayX or Cashfree Payouts
- Requires account approval & KYC
- Bank account verification before first payout

## Social Platform APIs

### Instagram Graph API
- Requires Facebook App with Instagram permissions
- OAuth flow for creator account linking
- Rate limits apply — schedule metric refreshes

### YouTube Data API
- Google Cloud project with YouTube Data API v3
- API key for public video metrics
- OAuth for private/owned video metrics

## Error Monitoring (Sentry)

Already wired — no SDK required:

1. Create a Sentry project and copy its DSN
2. Add `SENTRY_DSN` to `.env.local`
3. Done. `src/instrumentation.ts` forwards every unhandled server error (render,
   route handler, server action, proxy) via `onRequestError` to
   `src/lib/monitoring.ts`, which POSTs to Sentry's envelope endpoint. When the
   DSN is unset the hook is a no-op that only writes a structured console line.

## Database Migrations

Apply the SQL in order against your Supabase project:

1. `0001_schema.sql` — tables
2. `0002_rls.sql` — RLS policies + indexes
3. `0003_functions_triggers.sql` — functions + triggers
4. `0004_seed.sql` — platform settings / reference data
5. `0005_rate_limits.sql` — rate-limit table + `check_rate_limit` / `prune_rate_limits`
6. `0006_storage.sql` — private `support-attachments` Storage bucket + policies (support-ticket file uploads)
7. `0007_cms.sql` — `cms_content` table + RLS + seeded homepage/help/announcement content (admin Content console)

Rate limiting requires `SUPABASE_SERVICE_ROLE_KEY` (it runs through the service
client). Expired buckets are pruned by the scheduled job (`/api/jobs/*`,
`CRON_SECRET`).

Support-ticket attachments use Supabase Storage: the bucket is private, each
object lives under the uploader's user id, and files are rendered through
short-lived signed URLs. Raising the server-action body limit is already done in
`next.config.ts` (`6mb`).

## PWA

Installability needs no configuration: `src/app/manifest.ts`, the generated
icons, and `public/sw.js` ship with the app. The service worker only registers
in production builds. `NEXT_PUBLIC_APP_URL` should be your real HTTPS origin so
the manifest/sitemap URLs are correct.

## Environment Variables

See `.env.local.example` for the complete list.
