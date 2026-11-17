# ClipSetu — Supabase Database

This directory contains the PostgreSQL schema, Row Level Security policies, functions/triggers, and default settings for ClipSetu, plus instructions for applying them.

```
supabase/
├── migrations/
│   ├── 0001_schema.sql              # extensions, tables, constraints
│   ├── 0002_rls.sql                 # helper functions, RLS policies, indexes
│   ├── 0003_functions_triggers.sql  # new-user provisioning, wallet ledger, guards
│   ├── 0004_seed.sql                # idempotent platform_settings defaults
│   ├── 0005_rate_limits.sql         # rate-limit table + check_rate_limit/prune_rate_limits
│   ├── 0006_storage.sql             # private support-attachments Storage bucket + policies
│   └── 0007_cms.sql                 # cms_content store + RLS + default site content
└── README.md
```

## Prerequisites

- A Supabase project (PostgreSQL 15+).
- For CLI use: Node.js, and the Supabase CLI installed (`npm i -g supabase` or via `brew install supabase/tap/supabase`).
- A logged-in Supabase CLI (`supabase login`).

## Applying the migrations

The migrations are designed to run **strictly in order**: `0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0007`. Each file is wrapped in a single `begin; … commit;` transaction, so a failure rolls the whole file back.

### Option A — Supabase CLI (recommended)

```bash
# From the repository root (this folder must be ./supabase)
supabase link --project-ref <your-project-ref>
supabase db push
```

`supabase db push` applies every file in `supabase/migrations/` that has not yet been applied, in filename order.

### Option B — Dashboard SQL editor

1. Open your project → **SQL Editor**.
2. Paste and run each file **in order**: `0001_schema.sql`, `0002_rls.sql`, `0003_functions_triggers.sql`, `0004_seed.sql`, `0005_rate_limits.sql`, `0006_storage.sql`, `0007_cms.sql`.
3. Do not skip or reorder files — later files depend on tables/functions created earlier.

> Note: `0001` references the `auth.users` table and `0003` installs a trigger on it. These migrations are therefore **Supabase-only** and will not run against a vanilla PostgreSQL instance without the `auth` schema.

## Creating the first Super Admin (securely)

Roles are stored in `public.profiles.role` and are the **authoritative** source of RBAC. The `ADMIN_EMAILS` environment variable is a convenience/allowlist only — **an email allowlist alone must never grant admin**, and it must always be combined with (or overridden by) the DB role.

To create the very first admin:

1. Create the user normally through **Supabase Dashboard → Authentication → Users** (Invite user / Add user), and confirm the account.
2. The `handle_new_user` trigger will have created the `profiles` row with the default `clipper` role.
3. Promote that user with a **one-off SQL statement** in the SQL Editor:

   ```sql
   update public.profiles
      set role = 'super_admin'
    where email = '<admin-email>';
   ```

   This works because the statement runs in a direct/admin SQL session with no `auth.uid()`, which the `prevent_profile_privilege_escalation` trigger explicitly permits. Regular authenticated users can **never** change their own `role` or `status`.

4. Verify:

   ```sql
   select id, email, role, status from public.profiles where email = '<admin-email>';
   ```

Use the same pattern to grant `admin` or `moderation` roles to other staff. Never expose role changes through a client-callable endpoint that trusts user input.

## Security notes

- **RLS is authoritative for the `anon` and `authenticated` keys.** Every table has RLS enabled (see `0002_rls.sql`).
- **Server-side code MUST also re-check authorization.** The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely, so any request made with it is *not* protected by these policies. Always validate the caller's session/role in Server Actions and Route Handlers before performing privileged work.
- **`SUPABASE_SERVICE_ROLE_KEY` is server-only.** Never send it to the browser, never prefix it with `NEXT_PUBLIC_`, and never import it into client components.
- **Financial integrity:**
  - `wallet_transactions` is an append-only ledger. `DELETE` is blocked for every role, and a `completed` row may only transition its `status` to `reversed`.
  - `wallets` balances are maintained **solely** by the `apply_wallet_transaction` trigger; application code must never edit them directly.
  - Normal users have **no** INSERT/UPDATE/DELETE policies on `wallet_transactions`, `wallets`, `withdrawals`, `bank_accounts`, or `submission_metrics`; those writes go through the service-role client / server logic.
  - `bank_accounts` stores only the **last 4 digits** and a provider reference — full account numbers live at the payout provider.
  - `social_accounts` stores OAuth tokens only in `*_encrypted` columns; encryption/decryption happens server-side and platform passwords are never collected.
- **Auditability:** `audit_logs` is append-only and readable by admins only; inserts are made via the service-role client.

## Environment

Server-side database access requires (see `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>            # safe for the browser
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>        # SERVER-ONLY, never exposed
ADMIN_EMAILS=admin@example.com                      # allowlist convenience only
```

## Default settings seeded

`0004_seed.sql` inserts (idempotently, never overwriting existing values):

| key | value | meaning |
|-----|-------|---------|
| `platform_fee_percent` | `10` | Platform fee (%) |
| `min_withdrawal_inr` | `100` | Minimum withdrawal (INR) |
| `supported_platforms` | `["instagram","youtube"]` | Supported submission platforms |
| `currency` | `"INR"` | Settlement currency |

## Storage buckets

`0006_storage.sql` creates the **private** `support-attachments` bucket (5 MB
limit; PNG, JPEG, WebP, GIF, PDF). Objects are written under `<user-id>/…` and
reads are limited to the owner and staff; links are rendered as 1-hour signed
URLs.

## Default content seeded

`0007_cms.sql` inserts (idempotently, never overwriting admin edits):

| key | surface |
|-----|---------|
| `homepage.hero` | Homepage badge, headline, sub-copy and CTAs |
| `homepage.stats` | Homepage statistic tiles |
| `homepage.how_it_works` | Homepage "How ClipSetu works" steps |
| `help.categories` | Help-centre topic cards |
| `system.announcement` | Site-wide banner (disabled by default) |

Edit these at `/admin/content`. Published values are readable by the `anon`
role; drafts stay staff-only.
