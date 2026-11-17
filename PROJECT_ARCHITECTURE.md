# CLIPSETU — Project Architecture

## Overview

ClipSetu is a production-grade, India-first creator clipping marketplace where brands launch campaigns and creators earn from verified views.

- **Brand**: CLIPSETU
- **Tagline**: Create. Clip. Publish. Earn.
- **Market**: India-first, architecture ready for international expansion

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript (strict), Tailwind CSS v4 |
| Components | Custom shadcn-style UI, Radix UI primitives, Lucide icons |
| Animation | Framer Motion (restrained) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (email/password, OAuth, OTP) |
| Storage | Supabase Storage |
| Security | Supabase Row Level Security (RLS) |
| Validation | Zod |
| Forms | React Hook Form + @hookform/resolvers |
| Data fetching | TanStack Query (client), Server Actions (server) |
| Email | Resend (transactional) |
| Payments | Razorpay / Cashfree (India) |
| Error monitoring | Sentry |

## Application Architecture

```
clipsetu/
├── src/
│   ├── app/                    # App Router pages & route handlers
│   │   ├── (public)/           # Public site (homepage, how-it-works, etc.)
│   │   ├── (auth)/             # Login, signup, onboarding
│   │   ├── (brand)/            # Brand dashboard
│   │   ├── (clipper)/          # Creator dashboard
│   │   ├── (admin)/            # Admin dashboard
│   │   └── api/                # Route handlers (webhooks, etc.)
│   ├── components/
│   │   ├── ui/                 # Base UI primitives
│   │   ├── layout/             # Site header, footer, nav
│   │   └── features/           # Feature-specific components
│   ├── lib/
│   │   ├── supabase/           # Supabase clients
│   │   ├── auth.ts             # Auth helpers, RBAC
│   │   ├── db/                 # Data access layer
│   │   ├── utils.ts            # Utilities
│   │   └── constants.ts        # App constants
│   └── types/                  # TypeScript types
├── supabase/                   # Database migrations & RLS policies
└── docs/                       # Architecture & planning docs
```

## Key Architectural Decisions

1. **Server-first**: Server Components for data fetching, Server Actions for mutations. Client Components only for interactivity.
2. **RLS-enforced**: All data access goes through Supabase RLS policies. No direct DB access without authorization.
3. **Ledger-based finance**: Double-entry ledger for all wallet transactions. No direct balance edits.
4. **Verification-first**: Views are verified via official platform APIs. Never trust frontend data.
5. **Mobile-first**: PWA-ready, bottom nav for creators, responsive side nav on desktop.
6. **No admin on public site**: Admin access via server-side role check + email allowlist + DB role.

## User Roles

| Role | Description |
|------|-------------|
| brand | Creates campaigns, reviews submissions |
| clipper | Joins campaigns, submits clips, earns |
| admin | Moderates campaigns, users, payouts |
| super_admin | Full platform control, config |
| moderation | Support & content moderation |
