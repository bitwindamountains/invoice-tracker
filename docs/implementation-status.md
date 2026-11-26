# Implementation status — 2026-11-25

## Where things stand (2026-11-25)

`main` is at `1925394` with CI green. PR #2 (Supabase migration plus the pre-deploy review fixes, `0ee4a02`), #3 and #5 (security patches: Next.js 16.4.6, and an `effect` 3.22.5 override for GHSA-7589-6fvf-x4pw), #4 (public demo) and #6 (demo client IP) are squash-merged. The public demo is live; the real app has not been deployed yet.

**Before the first real deploy:**

- Set production env: `SUPABASE_SECRET_KEY`, `EMAIL_MODE=resend` with `RESEND_API_KEY` and a verified `EMAIL_FROM`, an https `APP_URL`, `REQUIRE_EMAIL_VERIFICATION=true`, `TRUST_PROXY=true`, `ERROR_MONITOR_URL`/`ERROR_MONITOR_TOKEN`. The env validator refuses to start production without them. Also set `DEPLOYMENT_VERSION` to the release id.
- Host near Supabase's `ap-northeast-2` (Seoul); each database round trip from far away costs ~150 ms.
- Turn on leaked-password protection in Supabase Auth (project-wide; ask before changing it).
- Optional: delete the leftover test user `browser-5cd70c29-a1d4-4d33-bc14-b084b00b3e75@example.test` from `invoicetracker."User"`.

**After the first deploy:** check `/api/health/ready`, sign up, and send a password-reset email through Resend.

**Accepted:** Supabase Auth is shared with rentflow (free tier allows two projects), so one login works in both apps and the secret key is project-wide.

## Public demo (2026-11-24, live 2026-11-25)

`DEMO_MODE=true` serves a throwaway "Try the live demo" workspace per visitor with no Supabase or Resend: seeded "Lumen & Line Studio" data, a hashed `demo_session` cookie, 24-hour expiry, at most `DEMO_MAX_ACTIVE` (10) live demos with the oldest evicted, and limits of 3 starts and 10 Start overs per hour per visitor. Startup removes expired demo workspaces (`src/instrumentation.ts`). `tests/e2e/demo.spec.ts` covers start, invoice, send, public link, payment, Start over and sign-out; run it locally (not in CI), see `docs/deployment-render-demo.md`.

- **Live:** https://invoice-tracker-demo.onrender.com, Render web service `invoice-tracker-demo` (free, Singapore), auto-deploys from `main`. Checked live: health ready, seeded workspace, Start over, sign-out, and per-visitor rate-limit keys.
- **Database:** Render allows one free Postgres per workspace and `rentflow-demo-db` already uses it, so the demo runs in a separate `invoice_tracker_demo` database inside that instance (rentflow's own database untouched). It shares 1 GB and the instance's expiry, **2026-12-23**: recreate both then.
- **Client IP:** Render's `X-Forwarded-For` ends in proxy hops, so demo mode keys rate limits on `True-Client-IP` from Render's Cloudflare edge (verified live: matches the visitor, spoofed values overwritten).
- **Open:** `/favicon.ico` returns 404 (harmless).

## 2026-10-13: Supabase database and Supabase Auth

- **Database:** runs on the shared Supabase project `tfkazskwrarwbjdtlqed` in its own `invoicetracker` schema, owned by a dedicated `invoicetracker` login (search path and 30 s statement timeout set on the role), following the same pattern as the `rentflow` schema. Every table has row-level security enabled with no policies, so the Data API cannot reach it; the app connects as the owner through the Session pooler. `src/lib/db.ts` passes `?schema=` from `DATABASE_URL` to the Prisma pg adapter, which otherwise ignores it.
- **Auth:** Better Auth is replaced by Supabase Auth via `@supabase/ssr`. All auth calls run on the server (`/api/auth/[action]`, `/auth/callback`), so the CSP stays `connect-src 'self'`. Session cookies are HttpOnly. The proxy refreshes sessions. Verified Supabase users are mirrored into the app's `User` table on first request (race-safe), since workspaces reference it. Better Auth's `Session`, `Account` and `Verification` tables were dropped (migration `20261013000000_supabase_auth`).
- **Email verification:** `REQUIRE_EMAIL_VERIFICATION=false` creates confirmed accounts at sign-up for development; production refuses it. The app sends auth emails itself through `EMAIL_MODE`, with `token_hash` links from the admin API (so `SUPABASE_SECRET_KEY` is always required): Supabase's PKCE links only worked in the requesting browser, and its email templates are shared across the project.
- **Pre-deploy review fixes (2026-10-22):** session cookies are `Secure` in production and capped at seven days (`@supabase/ssr` otherwise writes 400 days); sign-out ends only the current session; a stale `User` row holding a re-registered email is released instead of crashing every request; `getSession()` is cached per render.
- **Fixes:** same-origin checks compare against `APP_URL` (Next reports `localhost` in development even when the browser uses `127.0.0.1`); the local embedded Postgres data moved to `~/.invoice-tracker/postgres` so database writes no longer trigger dev-server reloads.
- **Configuration:** `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` are replaced by `APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` and `REQUIRE_EMAIL_VERIFICATION`. CI expects the secret key as a GitHub secret and the URL and publishable key as repository variables.

The earlier open items are resolved: the app's own `token_hash` emails need neither Supabase redirect URLs nor custom Supabase SMTP, and the CI secret and variables are set.

## Completed phases

- Phase 1: secure Next.js, Better Auth (since replaced by Supabase Auth), PostgreSQL/Prisma, tenant memberships, local services, CI, tests and operational documentation.
- Phase 2: business onboarding, branding, invoice defaults and payment instructions.
- Phase 3: tenant-scoped client profiles, search, pagination, archive/restore and audit history.
- Phase 4: reusable product/service catalog with exact decimal prices and lifecycle controls.
- Phase 5: authoritative invoice calculation, transactional numbering, draft editing and immutable tenant relationships.
- Phase 6: frozen issue snapshots, deterministic PDFs, email attachments, delivery evidence, hashed public capabilities and invoice activity.
- Phase 7: append-only payments, partial/paid transitions, payment confirmations, promise capture, inbox review and PDF receipts.
- Phase 8: currency-separated payment intelligence, Get Paid queue, revenue history and client payment metrics.
- Phase 9: manual reminders, five editable sequence stages, tones and templates, workspace-timezone eligibility, promise and pending-confirmation suppression, partial-balance values, idempotent dispatch, PDF attachments, reminder history and invoice events.
- Phase 10: categorized expense records, optimistic corrections, category lifecycle controls, cash revenue, expense, net cash, aging and client revenue reports, plus safe CSV exports.
- Phase 11: standalone web app manifest, complete icon set, browser install prompt, responsive offline page and a conservative service worker that excludes financial and capability-bearing responses from caching.
- Phase 12 local hardening: authorization invariants, persisted public submission limits, expanded CSP/cross-origin headers, centralized redacted error reporting, health probes, backup verification tooling, performance smoke testing, CI enforcement and an operations runbook.

- Interface pass: shared app shell (sidebar, sticky top bar, mobile tab bar with a More sheet), ⌘K command palette searching invoices, clients and pages, quick-create menu, toast feedback, due-aware status chips, a Get Paid queue with tabs and inline follow-ups, invoice payment-progress strip and timeline rail, invoice duplication, a workspace Activity feed, a client-facing pay panel on public invoices, and route view transitions. All motion has a reduced-motion path.

## Database and API changes

Eleven migrations are applied on Supabase (the eleventh drops Better Auth's tables). The schema now includes expense categories and exact-decimal expense records alongside the existing identity, workspace, business, client, catalog, invoice, delivery, payment and reminder records.

The Phase 10 routes record and update expenses, manage categories and export reconciled CSV reports. OWNER/ADMIN authorization, exact-origin enforcement, bounded validation, tenant predicates and optimistic versions apply to financial mutations.

## Validation evidence

- 44 unit checks cover validation, invoice calculations, deterministic PDFs, reminder behavior, expense decimals, report date ranges, the deployment environment and demo-mode routes; `npm run test:demo` adds 16 demo database checks (local database only).
- PostgreSQL/HTTP integration checks cover the prior controls plus Supabase sessions (cookie flags and lifetime, local sign-out, cross-device reset links, stale-email release), health probes, hardened response headers, persisted public-route throttling, manifest installability and service-worker exclusions.
- The browser journeys cover registration through payment completion, all working financial modules, manifest registration and a real browser-offline navigation fallback.
- Public responsive and automated accessibility checks remain part of the browser suite.
- Strict TypeScript, lint, production build, Prisma migration state and dependency audit are release checks.
- The local production bundle handled 100 smoke requests at concurrency 10 with zero failures and 171 ms p95 on the tested machine.
- GitHub Actions CI (lint, typecheck, unit, integration and browser suites against a local Postgres service) passes on `main`.

## Limits and next phase

Phases 1 through 11 work locally. Actual provider email delivery, hosted scheduling, deployed HTTPS install behavior, backups, operational monitoring and independent security review remain unverified. No external email was sent and no public deployment was performed.

Local Phase 12 controls are implemented. Public launch remains gated by configured hosted services and the external evidence listed in the operations runbook.
