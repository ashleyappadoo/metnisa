# Sprint 0 — Foundation

## Goal

Create a production-shaped base that can support the Culture Engine and real commerce without rebuilding the application later.

## Delivered

- GitHub mainline + CI
- Next.js App Router foundation
- Store brand shell
- Studio shell
- Supabase SSR clients
- Next.js 16 Proxy session refresh
- Email/password Studio login action
- RBAC roles: OWNER, ADMIN, CULTURE_REVIEWER, EDITOR, OPS, VIEWER
- RLS-enabled foundation schema
- audit log + application settings
- `/api/health`
- environment readiness screen

## Manual infrastructure dependency

A Supabase project must still be created by the project owner because credentials belong to that account. Apply the migration and add the environment variables to Vercel.

## Definition of done

1. `npm ci` succeeds.
2. lint succeeds.
3. TypeScript succeeds.
4. production build succeeds.
5. `/` renders without external credentials.
6. `/api/health` returns HTTP 200.
7. `/studio` redirects to setup before Supabase configuration.
8. after Supabase setup, unauthenticated Studio traffic redirects to login.
9. an active user with an allowed role can access Studio.

## Next

Sprint 1 — Culture Engine: phrases, sources, cultural reviews, structured OpenAI scoring and approval workflow.
