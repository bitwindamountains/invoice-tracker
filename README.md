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

Open **http://localhost:3000**. Use this exact origin for registration and login; it matches `BETTER_AUTH_URL`. The app and local PostgreSQL bind to loopback only. The local helper downloads PostgreSQL through a development-only npm dependency; Docker is not required. Its data persists in `.local/postgres`. Stop it with Ctrl+C.

`setup:local` creates random local credentials in an ignored `.env` and never overwrites an existing file. If you prefer your own PostgreSQL instance, configure `DATABASE_URL` and skip `db:local`.

## Verify a local account

Register using the application. With `EMAIL_MODE=file`, verification and reset emails are written to **`.local/mail/*.json`**, outside the web root. Open the latest matching file privately and paste its link into your browser. These files contain authentication secrets; do not share them or commit them. There is no public development inbox or verification bypass. No messages are sent externally in local mode.

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

Use managed PostgreSQL, set `BETTER_AUTH_URL` to the exact HTTPS origin, create a strong random `BETTER_AUTH_SECRET`, and configure `EMAIL_MODE=resend`, `RESEND_API_KEY`, and a verified sender in `EMAIL_FROM`. Production deliberately refuses file-mode email or an HTTP auth origin.

Run migrations as a separate release step with `npm run db:migrate`; then `npm run build` and `npm start`. `npm start` binds loopback for a local reverse proxy. Container hosts may use `npx next start --hostname 0.0.0.0` behind their HTTPS ingress. Do not expose the development server or embedded database publicly.

Before launch, complete the original production plan's launch checklist and the remaining gates in [security](docs/security.md). A successful production build is not equivalent to production readiness.

## Project map

- `src/app`: Next.js pages and route handlers
- `src/components`: shared account UI
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
