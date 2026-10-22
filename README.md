# Invoice Tracker

A collection-first SaaS for freelancers and small service businesses. Development has completed the local acceptance scope through **Phase 8: Payment Intelligence Dashboard**. This is not yet a complete invoicing product or a public production deployment.

Implemented: the account and business foundation, clients, catalog, decimal-safe invoice drafts, immutable issue snapshots, deterministic PDF attachments, local/Resend delivery, secure public invoice links, append-only payment history, partial/paid transitions, client payment confirmations and promises, owner review, PDF receipts, reconciled payment dashboards, needs-attention queues, and factual client payment metrics. Mutations are role checked, tenant scoped, audited, and protected against stale or concurrent writes. See [financial rules](docs/financial-rules.md), [review decisions](docs/specification-review.md), and [implementation status](docs/implementation-status.md).

## Local setup

Use Node.js 22.12+ (Node 24 recommended) and npm. On Windows PowerShell, use `npm.cmd` / `npx.cmd` if script execution policy blocks `npm` / `npx`.

```sh
npm ci
npm run setup:local
npm run db:generate
npm run db:local
```

Leave the database terminal running. In another terminal:

```sh
npm run db:migrate
npm run dev
```

Open **http://127.0.0.1:3000** (it matches `APP_URL`). The app and local PostgreSQL bind to loopback only. The local helper downloads PostgreSQL through a development-only npm dependency; Docker is not required. Its data persists in `~/.invoice-tracker/postgres`, outside the project so database writes don't trigger dev-server reloads. Stop it with Ctrl+C.

`setup:local` creates random local credentials in an ignored `.env` and never overwrites an existing file. If you prefer your own PostgreSQL instance, configure `DATABASE_URL` and skip `db:local`.

## Accounts (Supabase Auth)

Sign-up, sign-in, email verification and password reset use Supabase Auth. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and the server-only `SUPABASE_SECRET_KEY` to your project's values. The app sends the verification and reset emails itself through `EMAIL_MODE`, with links to `APP_URL/auth/callback` built from the admin API, so they work on any device and don't depend on the Supabase project's shared email templates. The app mirrors each verified user into its own `User` table, which workspaces reference. Session cookies last seven days and are renewed while the user is active.

For development you can skip email verification with `REQUIRE_EMAIL_VERIFICATION=false`: sign-up then creates an already-confirmed account and signs it in. Production refuses this setting. The integration and browser tests require it, and delete the Supabase accounts they create; CI reads the key from the `SUPABASE_SECRET_KEY` secret and the URL and publishable key from repository variables.

Invoice and reminder emails are still sent by the app. With `EMAIL_MODE=file` they are written to **`.local/mail/*.json`** instead of being delivered.

No demo users or financial seed records are created. Automated tests create unique disposable accounts and remove those accounts after execution.

## Checks

With the database and development server running:

```sh
npm run lint
npm run typecheck
npm test
npm run test:integration
npx playwright install chromium
npm run test:e2e
npm run build
npm audit
```

The integration suite exercises real HTTP routes and PostgreSQL. Browser tests cover the account, onboarding, business settings, and client-management journey, responsive public layouts, mobile client cards, and automated accessibility checks. `.github/workflows/ci.yml` runs these checks against a PostgreSQL service.

## Production configuration

Use managed PostgreSQL, set `APP_URL` to the exact HTTPS origin (and add its `/auth/callback` to Supabase's redirect URLs), set the Supabase URL and publishable key, and configure `EMAIL_MODE=resend`, `RESEND_API_KEY`, and a verified sender in `EMAIL_FROM`. Production deliberately refuses file-mode email or an HTTP auth origin.

Run migrations as a separate release step with `npm run db:migrate`; then `npm run build` and `npm start`. `npm start` binds loopback for a local reverse proxy. Container hosts may use `npx next start --hostname 0.0.0.0` behind their HTTPS ingress. Do not expose the development server or embedded database publicly.

Before launch, complete the original production plan's launch checklist and the remaining gates in [security](docs/security.md). A successful production build is not equivalent to production readiness.

## Project map

- `src/app`: Next.js pages and route handlers
- `src/components`: app shell (navigation, command palette), toasts, status chips, money formatting and shared account UI
- `src/app/system.css`: design tokens, motion and component styles layered over `globals.css`
- `src/lib`: auth, environment, database, email, session, logging
- `src/features/onboarding`: business setup schema, loader, types, and wizard UI
- `src/features/clients`: client validation, form, and archive controls
- `src/features/catalog`: product/service validation, forms, and status controls
- `src/features/invoices`: invoice validation, editor, and line-item types
- `src/services`: workspace authorization and transactional business-profile persistence
- `prisma`: schema and versioned migration
- `tests`: environment, integration and browser checks
- `docs`: review, architecture, API, security and progress

The four original specifications remain at the repository root with clarification links. Financial modules start only after their phase-specific requirements and tests are in place.
