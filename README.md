# Met Nisa

**Moris in you.**

Met Nisa is a production-oriented Mauritian cultural-wear platform: a public storefront plus a private operating system for culture curation, Drops, deterministic artwork generation, POD synchronization and commerce automation.

## Sprint 0 — Foundation

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4 brand shell
- Public Store foundation
- Private Met Nisa Studio shell
- Supabase SSR Auth baseline
- PostgreSQL RBAC + RLS migration
- Health endpoint
- GitHub Actions CI
- Vercel-ready environment model

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` for the Store and `/studio` for Studio.

## Required to unlock Studio

Create a Supabase project, run `supabase/migrations/202609010001_foundation.sql`, then configure:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Create the first user in Supabase Auth and promote that profile to owner:

```sql
update public.profiles
set role = 'OWNER'
where email = 'YOUR_EMAIL';
```

Until Supabase is configured, `/studio` safely redirects to `/studio/setup` rather than crashing the deployment.

## Quality gates

```bash
npm run lint
npm run typecheck
npm run build
```

## Architecture rule

Supabase is the Met Nisa source of truth. External providers such as Printify are adapters/projections, never the canonical business database.
