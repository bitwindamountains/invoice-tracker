@AGENTS.md

## Project notes

- **Stack:** Next.js 16 (Turbopack, `src/proxy.ts` instead of middleware), Prisma 7 with the `@prisma/adapter-pg` driver adapter, Supabase Postgres and Supabase Auth via `@supabase/ssr`. Progress log: `docs/implementation-status.md`.
- **Database:** the shared Supabase project `tfkazskwrarwbjdtlqed` hosts several apps. This app owns only the `invoicetracker` schema and connects as the `invoicetracker` role through the Session pooler (`?schema=invoicetracker` in `DATABASE_URL`). Never touch other schemas (for example `rentflow`) or project-wide Auth settings without asking. Tables have RLS enabled with no policies on purpose: the app connects as the owner and nothing should be reachable through the Data API.
- **Migrations:** Prisma Migrate owns the schema (`npm run db:migrate`). Generate SQL with `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`; `migrate dev` needs a shadow database the role cannot create.
- **Auth:** all Supabase Auth calls run on the server (`src/lib/auth.ts`, `src/app/api/auth/[action]`, `src/app/auth/callback`). Pages use `requireSession()`, API routes use `getApiWorkspace()` or `getSession()`. `SUPABASE_SECRET_KEY` is server-only and must never get a `NEXT_PUBLIC_` prefix.
- **Origins:** compare request origins with `APP_URL` (`hasSameOrigin`), not `request.url`. In development Next reports `localhost` while the browser uses `127.0.0.1:3000`.
- **Checks:** `npm run lint`, `npm run typecheck`, `npm test`; with the dev server running, `npm run test:integration` and `npm run test:e2e`. The latter two need `REQUIRE_EMAIL_VERIFICATION=false` and `SUPABASE_SECRET_KEY`, and delete the Supabase accounts they create.
