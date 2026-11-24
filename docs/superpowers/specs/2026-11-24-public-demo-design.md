# Public demo ("Try the demo") — design

Date: 2026-11-24 · Status: draft for approval

## Intent

Portfolio visitors should be able to open a link, press one button and use the real invoice tracker for a few minutes without creating an account. They should come away thinking "this is a real, finished product". The app is not deployed yet, so this demo is the first public deployment.

It copies the pattern already live in RentFlow (`rental manager/render.demo.yaml`, `docs/deployment-render-demo.md`): Render free plan, a throwaway database, and a **Try the demo** button that gives each visitor a private seeded workspace deleted after 24 hours.

## Goals

- One click from the landing page to a populated workspace: a dashboard with money owed, overdue and paid; invoices in draft, sent, viewed, partially paid, overdue and paid states; clients, catalog, reminders, payments, a pending payment confirmation, expenses and reports.
- Visitors can do the real things: create, edit and send an invoice, open its public client link, record a payment, review a confirmation, run follow-ups, export reports and download PDFs.
- Each visitor's workspace is private and disappears after 24 hours.
- No secrets on the demo host, and no connection to the shared Supabase project.

## Non-goals

- A read-only or shared demo (approach B, rejected).
- Real email delivery. Emails are written to the instance's ephemeral disk and never leave the server.
- Real sign-up on the demo host.
- Changes to how the real app authenticates.

## Anti-goals (failure even if it "works")

- The demo host holds `SUPABASE_SECRET_KEY`, or any Supabase key, or writes to `auth.users`.
- A visitor can make the server send email to a real address.
- One visitor can see another visitor's workspace.
- Demo mode can be switched on in a real deployment by accident (it bypasses Supabase Auth).
- Seeded data breaks financial invariants (totals, balances, statuses) because it was inserted around the services.

## Constraints

- Login is Supabase Auth on project `tfkazskwrarwbjdtlqed`, which is shared with rentflow. `auth.users` and the secret key are project-wide, so the demo must not use them.
- Next.js 16 runs `next build`/`next start` with `NODE_ENV=production`, so the production checks in `src/lib/env.ts` (Resend, error monitor, required verification) apply on the demo host unless demo mode relaxes them.
- Financial records reference `Workspace` with `onDelete: Restrict` (expenses, invoices, payments, reminders and others), so a demo cannot be removed with one cascading delete. There are no delete-blocking triggers.
- There is no background job runner in this app.
- Render free plan: 512 MB RAM, sleeps after about 15 minutes idle, and the free Postgres is deleted after 30 days.
- Migrations must stay additive. They also run against the real Supabase `invoicetracker` schema.

## Approaches considered

| | Approach | Trade-off | Outcome |
|---|---|---|---|
| A | RentFlow-style private demo workspaces on Render, with a demo-only session cookie and no Supabase | About a day of work (session path, seed, cleanup, restrictions, tests). Shows the product working. | **Chosen** |
| B | TindaBot-style single shared read-only workspace | Simpler, but visitors can't create, send or get paid, and that's the story to show | Rejected |
| C | Demo accounts in real Supabase Auth | Needs the project-wide secret key on a public free host and pollutes shared `auth.users` | Rejected |

## Design

### 1. Demo mode flag and environment

- New env `DEMO_MODE` (`"true"|"false"`, default `false`) and `DEMO_MAX_ACTIVE` (integer 1–200, default 10).
- When `DEMO_MODE=true`:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` become optional, and **`SUPABASE_SECRET_KEY` and `RESEND_API_KEY` must be absent** (validation error otherwise).
  - `EMAIL_MODE` must be `file`.
  - The production-only rules for Resend, required verification and the error monitor are skipped. HTTPS `APP_URL` and `TRUST_PROXY=true` are still required in production.
- When `DEMO_MODE=false`, nothing changes. A helper `isDemoMode()` in `src/lib/env.ts` is the only way code checks the flag.
- Because the Supabase values become optional in the parsed type, `createSupabase()`, `createSupabaseAdmin()` and `src/proxy.ts` each get a guard that throws if they are called in demo mode or without the keys. Demo code paths never reach them.

### 2. Data model (one additive migration)

- `Workspace.demoExpiresAt DateTime? @db.Timestamptz(3)`, with a partial index where it is not null. Non-null means "demo workspace".
- `User.demoTokenHash String? @unique`: the SHA-256 of the visitor's session token.

The real app never sets either column.

### 3. Demo session

- Cookie `demo_session`: 32 random bytes, base64url. Attributes: `httpOnly`, `secure` in production, `sameSite: lax`, `path: /`, and `maxAge` set to the time left until expiry. Only the hash is stored.
- `getSession()` in `src/lib/auth.ts`: when `isDemoMode()`, it reads the cookie, hashes it, and finds the user whose `demoTokenHash` matches and whose owned workspace has `demoExpiresAt > now`. It returns `{ user }` in the same shape as today, or `null`. **It never calls Supabase in demo mode**, and real mode is unchanged. `requireSession()`, `getApiWorkspace()` and all 53 callers keep working.
- `src/proxy.ts` needs no change: it refreshes only when `sb-` cookies exist. Demo mode will skip the refresh explicitly anyway, so the proxy never builds a Supabase client without keys.

### 4. Creating a demo: `POST /api/demo`

- Returns 404 unless `isDemoMode()`. Then, in order: `hasSameOrigin`, `takeRateLimit(request, "demo", ip, 3, 3600)` (3 an hour per client IP; *builder's call:* in demo mode the IP is the **last** `X-Forwarded-For` hop, the one Render's proxy appends, because the first is client-controlled; the real app's rule is unchanged), clean up expired demos (section 6), and, if `DEMO_MAX_ACTIVE` unexpired demos still exist, **delete the oldest ones** (by `createdAt`) until there is room (owner's decision, 2026-11-24). A new visitor always gets in. An evicted visitor's next request finds no session and lands back on the landing page.
- Creates a user (`name: "Demo Visitor"`, email `demo-<id>@demo.invalid`, `emailVerified: true`, `demoTokenHash`) and a workspace with `demoExpiresAt = now + 24h`, then runs the seed. The cookie is set and the response redirects to `/app`.
- If seeding fails, the half-built demo is deleted with the same cleanup routine before returning 500.

### 5. Seed: `src/services/demo-seed.ts`

- Goes **through the existing services** (`saveBusinessProfile`/onboarding, `createClient`, catalog, `createInvoice`, `issueAndSendInvoice`, `recordPayment`, `submitPaymentPromise`, `submitPaymentConfirmation`, `ensureReminderRules`, `createExpense`) so totals, statuses, events and audit logs are exactly what the app itself produces. After each service call, direct writes may **backdate timestamps only** (`issueDate`, `dueDate`, `sentAt`, `issuedAt`, `paidAt`, `reviewedAt`, promise/confirmation/event/delivery/audit `createdAt`) so ageing looks real. Amounts, statuses and balances are never written directly. *(Builder's call, confirmed in review: services stamp "now", so without this the old invoices would show payments made today.)*
- `InvoiceStatus` has only `DRAFT | SENT | PARTIALLY_PAID | PAID | VOID`. "Viewed" comes from `PUBLIC_LINK_OPENED` events and "overdue" from a past `dueDate`. The seed creates view events through `getPublicInvoice` and sets past due dates, and the seed test checks those derived states rather than enum values.
- Business: a fictional PHP-currency studio, "Lumen & Line Studio", Asia/Manila, with GCash and bank transfer payment instructions and no logo.
- Content: about 6 clients (fictional companies, `@example.com` emails), about 6 catalog items, and about 10 invoices spread over the last 90 days:
  - 2 paid in full
  - 1 partially paid
  - 2 sent and viewed
  - 1 with a payment promise
  - 2 overdue
  - 1 with a pending client payment confirmation
  - 1 draft
- About 8 expenses. All dates are relative to "now" so every demo looks current.
- A unit test asserts the seeded workspace has each invoice status and consistent balances (`total = amountPaid + balanceDue`).

### 6. Cleanup: `src/services/demo-cleanup.ts`

- `deleteDemoWorkspaces(where)` deletes, inside one transaction per workspace, every workspace-scoped table in an explicit `DEMO_DELETE_ORDER` (children before parents, honouring the `Restrict` relations), then the workspace, then its demo user.
- Runs (a) at the start of every `POST /api/demo` for workspaces with `demoExpiresAt < now`, (b) for the visitor's own demo on **sign-out and Start over**, which deletes it, kills the token and frees its slot, and (c) once at server start via a new `register()` in `src/instrumentation.ts` (guarded by `NEXT_RUNTIME === "nodejs"`) when `isDemoMode()`.
- *Builder's call:* Start over, done by a visitor who holds a valid demo, replaces that demo and doesn't count against the rate limit. There is no job runner, and an expired demo stops working at once anyway because the session check compares `demoExpiresAt`.
- A test reads the Prisma model list, asserts that every model with a `workspaceId` field is in `DEMO_DELETE_ORDER`, and checks that cleaning up a seeded demo leaves zero rows for that workspace. A new table then fails the suite until it's added.

### 7. What demo visitors cannot do

| Route | Demo behaviour | Why |
|---|---|---|
| `POST /api/auth/[action]` (register, login, reset, resend) | 404, except `sign-out`, which gets a demo branch: delete the visitor's demo and clear `demo_session` (no Supabase client) | No real accounts on the demo host |
| `GET /auth/callback`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Redirect to `/` | Same |
| `POST /api/onboarding` (business profile) | Allowed, but a **logo upload is refused** (400 "Logo uploads are off in the demo") | No file storage from strangers |
| Everything else (invoices, send, reminders, payments, confirmations, catalog, clients, expenses, reports, public token routes) | Allowed | Emails go to the ephemeral disk only, and all data is the visitor's own made-up workspace |

A test lists every route file under `src/app/api` that exports `POST`/`PATCH`/`DELETE` and asserts each is classified as allowed or restricted in a table in the test, so a new write route fails until it's classified (same rule as RentFlow).

### 8. UI

- Landing page (`src/app/page.tsx`): in demo mode, the primary CTA becomes **Try the live demo** (a form POST to `/api/demo`, with a pending state, since a cold Render start can take about a minute), and the Sign in / Create workspace links are hidden. The hero note changes to say it's a demo with sample data that resets after 24 hours. Real mode is unchanged.
- App shell: a slim, persistent banner in demo mode: "Demo workspace · sample data · emails aren't delivered · resets in Xh", plus "Start over", which creates a fresh demo. It uses the existing tokens and components, no new design language.
- Sign out in demo returns to the landing page.

### 9. Hosting: `render.demo.yaml` + `docs/deployment-render-demo.md`

- Render free Postgres 17 (`invoice-tracker-demo-db`, Singapore) and a free Node web service (`invoice-tracker-demo`, Singapore). One service, because Next serves both the pages and the API, so there's no rewrite layer as in RentFlow.
- Build: `npm ci && npm run build`. Start: `npm run db:migrate && npm run start:demo`, where the new script `start:demo` is `next start --hostname 0.0.0.0 --port ${PORT:-3000}` (the existing `start` binds 127.0.0.1). Health check: `/api/health/ready`.
- Env: `DEMO_MODE=true`, `DEMO_MAX_ACTIVE=10`, `EMAIL_MODE=file`, `EMAIL_FROM`, `APP_URL=https://<service>.onrender.com`, `TRUST_PROXY=true`, `DATABASE_URL` from the database. No Supabase or Resend values. The file has a header comment like RentFlow's: never point it at a real database or add provider keys.
- The guide covers deploy steps (including the manual dashboard route if the Blueprint asks for a card, as happened with TindaBot), post-deploy checks, and caveats: cold start, the 30-day database expiry, and emails only on disk.
- The portfolio link goes in the README once the demo is live.

### 10. Proof

- Unit: env rules (demo refuses a secret key or Resend, real mode unchanged), demo session lookup (valid, expired, wrong token), seed invariants, cleanup completeness, write-route classification.
- E2E (Playwright, local Postgres, `DEMO_MODE=true` dev server): landing → Try the live demo → dashboard shows seeded money → create and send an invoice → open its public link → record a payment → sign out → the old cookie no longer works.
- Existing `lint`, `typecheck`, `test`, `test:integration` and `test:e2e` pass with demo mode off.
- After deploy: run the guide's check list against the live URL.

## Left to the builder

- Exact seed names, amounts and copy, within the brief above.
- Banner styling within the existing design system.
- How the e2e suite toggles demo mode (a separate Playwright project or config is fine).
- Whether cleanup at start runs in `instrumentation.ts` or in the start script.
