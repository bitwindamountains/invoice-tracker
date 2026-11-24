# Public Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Try the live demo" button that gives each portfolio visitor a private, seeded, 24-hour workspace in the real app, hosted on Render's free plan with no Supabase or Resend keys.

**Architecture:** `DEMO_MODE=true` swaps Supabase Auth for a hashed random-token cookie (`demo_session`) inside `getSession()`, so every existing page and route works unchanged. `POST /api/demo` cleans up expired demos, evicts the oldest past `DEMO_MAX_ACTIVE`, and creates a user and workspace seeded through the real services. Cleanup deletes workspace-scoped tables in an explicit order, because financial relations are `onDelete: Restrict`.

**Tech Stack:** Next.js 16 (read `node_modules/next/dist/docs/` before touching routing or instrumentation), Prisma 7 + `@prisma/adapter-pg`, Postgres, Vitest (pure unit tests), `tsx` + `node:assert` scripts for DB tests (pattern: `tests/integration.ts`), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-24-public-demo-design.md`

## Global Constraints

- Real mode (`DEMO_MODE` unset/`false`) must behave exactly as today. Every existing check passes with demo mode off.
- Code reads the flag only through `isDemoMode()` from `src/lib/env.ts`.
- With `DEMO_MODE=true`: `SUPABASE_SECRET_KEY` and `RESEND_API_KEY` must be absent, `EMAIL_MODE` must be `file`, and production still requires an HTTPS `APP_URL` and `TRUST_PROXY=true`.
- Demo code never constructs a Supabase client.
- Demo lifetime: 24 hours. `DEMO_MAX_ACTIVE` is an integer 1–200, default 10. Demo creation is limited to 3 per hour per client IP.
- The migration is additive and nullable only. It also runs on the real Supabase `invoicetracker` schema.
- Seed data goes through services. Direct writes may only backdate timestamps. All names are fictional and all emails are `@example.com`.
- Copy: CTA "Try the live demo". Banner "Demo workspace · sample data · emails aren't delivered · resets in {N}h", with a "Start over" action. Logo refusal: "Logo uploads are off in the demo".
- DB tests run against local Postgres (`npm run db:local`, the `127.0.0.1:54329` `DATABASE_URL`), never against remote Supabase.

## Review Focus

1. **Expired or evicted cookie on a deep link** (`/app/invoices/x`): the visitor should land on `/` (via `/login` → `/`), not see an error page. Tested in Task 2 (session returns null) and Task 7 (e2e).
2. **Two tabs press "Try the live demo" at the same moment, with the cap full:** both should get in, and the eviction must not delete the demo that was just created. Tested in Task 5.
3. **Seeding fails halfway** (a service throws): no orphan workspace or user rows should be left, and the visitor sees an error, not a broken workspace. Tested in Task 5.
4. **Spoofed `X-Forwarded-For`** in demo mode: a client-set first hop must not reset the 3-an-hour limit. Tested in Task 5.
5. **A newly added workspace-scoped table** silently survives cleanup. Tested in Task 3 (completeness check against the Prisma model list).

---

### Task 1: Demo flag and environment rules

**Files:**
- Modify: `src/lib/env.ts`
- Modify: `src/lib/auth.ts` (`createSupabase`, `createSupabaseAdmin`: guard)
- Modify: `src/proxy.ts` (skip `refreshSession` in demo mode)
- Modify: `.env.example` if present, otherwise the README env list: document `DEMO_MODE=false`, `DEMO_MAX_ACTIVE=10`
- Test: `tests/env.test.ts`

**Interfaces:**
- Produces: `environmentSchema` fields `DEMO_MODE: "true"|"false"` (default `"false"`) and `DEMO_MAX_ACTIVE: number` (coerced, 1–200, default 10). `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` are typed `string | undefined` but required when `DEMO_MODE` is `"false"`. `isDemoMode(): boolean`.

- [ ] **Step 1: Write failing tests in `tests/env.test.ts`**, reusing the file's existing valid-env fixture:
  - `it("keeps Supabase keys required in real mode")`: the fixture minus `SUPABASE_SECRET_KEY` fails.
  - `it("accepts a demo environment with no Supabase or Resend keys")`: `{ NODE_ENV: "production", DATABASE_URL, APP_URL: "https://demo.onrender.com", DEMO_MODE: "true", EMAIL_MODE: "file", EMAIL_FROM: "Demo <noreply@example.com>", TRUST_PROXY: "true" }` succeeds, and `DEMO_MAX_ACTIVE` parses to `10`.
  - `it("refuses provider keys in demo mode")`: the demo env plus `SUPABASE_SECRET_KEY` fails with issue path `["SUPABASE_SECRET_KEY"]`. Plus `EMAIL_MODE: "resend", RESEND_API_KEY: "x".repeat(20)` fails.
  - `it("still requires HTTPS and a trusted proxy for a production demo")`: `APP_URL: "http://…"` fails, and `TRUST_PROXY: "false"` fails.
  - `it("bounds DEMO_MAX_ACTIVE")`: `"0"` and `"201"` fail, and `"25"` gives `25`.
- [ ] **Step 2:** Run `npx vitest run tests/env.test.ts`. Expect FAIL.
- [ ] **Step 3: Implement.** Make the three Supabase fields `.optional()` and enforce them in `superRefine` when `DEMO_MODE !== "true"`. In demo mode, add the refusals and skip only the Resend, verification and error-monitor production rules. Add `export function isDemoMode() { return getEnvironment().DEMO_MODE === "true"; }`. `createSupabase`/`createSupabaseAdmin` throw `new Error("Supabase is not available in demo mode")` when `isDemoMode()` or a key is missing, which also narrows the types. In `proxy`, call `refreshSession` only when `!isDemoMode()`.
- [ ] **Step 4:** Run `npx vitest run tests/env.test.ts && npm run typecheck`. Expect PASS.
- [ ] **Step 5: Commit** `Demo: DEMO_MODE environment rules and Supabase guards`

### Task 2: Schema, migration and demo session

**Files:**
- Modify: `prisma/schema.prisma`: `Workspace.demoExpiresAt DateTime? @db.Timestamptz(3)`, `User.demoTokenHash String? @unique`
- Create: `prisma/migrations/20261124000000_demo_mode/migration.sql`
- Create: `src/lib/demo-session.ts`
- Modify: `src/lib/auth.ts` (`getSession`)
- Create: `tests/demo.ts` (DB test script); `package.json` script `"test:demo": "tsx --env-file=.env tests/demo.ts"`
- Modify: `.github/workflows/ci.yml`: run `npm run test:demo` after migrations, before `test:integration`

**Interfaces:**
- Produces, in `src/lib/demo-session.ts`:
  - `DEMO_COOKIE = "demo_session"`
  - `DEMO_LIFETIME_MS = 86_400_000`
  - `newDemoToken(): { token: string; tokenHash: string }` (32 random bytes, base64url, SHA-256 hex)
  - `hashDemoToken(token: string): string`
  - `findDemoUser(token: string | undefined, now?: Date): Promise<User | null>`, which returns null for a missing or malformed token (`/^[A-Za-z0-9_-]{40,60}$/`), an unknown hash, or an owned workspace whose `demoExpiresAt` is null or `<= now`
  - `demoCookieOptions(expiresAt: Date)`: `{ httpOnly: true, secure: NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt }`

- [ ] **Step 1: Edit the schema, then generate the SQL** with local Postgres running: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > prisma/migrations/20261124000000_demo_mode/migration.sql`. Hand-add `CREATE INDEX "Workspace_demoExpiresAt_idx" ON "Workspace" ("demoExpiresAt") WHERE "demoExpiresAt" IS NOT NULL;`. Run `npm run db:migrate && npm run db:generate`. Expect success.
- [ ] **Step 2: Write `tests/demo.ts`.** Guard it like `tests/integration.ts`: refuse to run unless the `DATABASE_URL` host is `127.0.0.1`/`localhost`. Add the session checks; each creates its own user and workspace directly and deletes them at the end:
  - a valid token with `demoExpiresAt = now + 1h` gives the user
  - the same token with `demoExpiresAt = now - 1s` gives `null`
  - a wrong token, `undefined` and `"short"` give `null`
  - a user with a matching hash whose workspace has `demoExpiresAt = null` (a real workspace) gives `null`
- [ ] **Step 3:** Run `npm run test:demo`. Expect FAIL (module missing).
- [ ] **Step 4: Implement `src/lib/demo-session.ts`**, and in `getSession` add as the first line: `if (isDemoMode()) { const user = await findDemoUser((await cookies()).get(DEMO_COOKIE)?.value); return user ? { user } : null; }`. Keep `cache()`.
- [ ] **Step 5:** Run `npm run test:demo && npm run typecheck && npm test`. Expect PASS.
- [ ] **Step 6: Commit** `Demo: demoExpiresAt/demoTokenHash columns and demo session lookup`

### Task 3: Demo cleanup

**Files:**
- Create: `src/services/demo-cleanup.ts`
- Modify: `tests/demo.ts`

**Interfaces:**
- Consumes: the Task 2 columns.
- Produces:
  - `DEMO_DELETE_ORDER: readonly Prisma.ModelName[]`: every model with a `workspaceId` field, children before parents
  - `deleteDemoWorkspaces(where: Prisma.WorkspaceWhereInput): Promise<number>`, which always adds `demoExpiresAt: { not: null }` to `where` so a real workspace can never match. Per workspace, in one transaction, it `deleteMany({ where: { workspaceId } })` across `DEMO_DELETE_ORDER`, then deletes the workspace, then its owner user. It returns the number of workspaces deleted.

- [ ] **Step 1: Add tests to `tests/demo.ts`.**
  - `DEMO_DELETE_ORDER completeness`: the set of `Prisma.dmmf.datamodel.models` names that have a field named `workspaceId`, minus `Workspace`, deep-equals `new Set(DEMO_DELETE_ORDER)`.
  - `real workspaces are untouched`: a workspace with `demoExpiresAt: null` survives `deleteDemoWorkspaces({ id: thatId })`, and the call returns `0`.
  - The full "zero rows left" check comes in Task 4, once a seed exists.
- [ ] **Step 2:** Run `npm run test:demo`. Expect FAIL.
- [ ] **Step 3: Implement.** Work out the order from the `Restrict` relations in `prisma/schema.prisma`, for example payments before confirmations before invoices, and expenses before categories.
- [ ] **Step 4:** Run `npm run test:demo`. Expect PASS.
- [ ] **Step 5: Commit** `Demo: ordered cleanup of demo workspaces`

### Task 4: Demo seed

**Files:**
- Create: `src/services/demo-seed.ts`
- Modify: `tests/demo.ts`

**Interfaces:**
- Consumes: the existing services `saveBusinessProfile`, `createClient`, `createCatalogItem`, `createInvoice`, `issueAndSendInvoice`, `getPublicInvoice`, `recordPayment`, `submitPaymentPromise`, `submitPaymentConfirmation`, `ensureReminderRules`, `ensureExpenseCategories` and `createExpense`, plus `hashToken` from `src/services/invoice-issuing.ts`. Read each schema in `src/features/*/schema.ts` for the input shapes.
- Produces: `seedDemoWorkspace(userId: string, workspaceId: string, now?: Date): Promise<void>`.

Content, from the spec:
- Business "Lumen & Line Studio", PHP currency, Asia/Manila, GCash and bank transfer payment instructions, no logo (`logoDataUrl: null`).
- About 6 clients and about 6 catalog items.
- 10 invoices issued over the last 90 days:
  - 2 paid in full
  - 1 partially paid
  - 2 sent with view events
  - 1 with a payment promise
  - 2 overdue
  - 1 with a pending confirmation
  - 1 draft
- About 8 expenses.
- `issueAndSendInvoice` returns no token, so for promise and confirmation calls use `regeneratePublicLink` to get a URL, take the token from it, and pass `hashToken(token)`.
- After each service call, backdate timestamps only (see the spec, section 5), relative to `now`.

- [ ] **Step 1: Add the `seed + cleanup` test to `tests/demo.ts`.** Create a demo user and workspace (`demoExpiresAt = now + 24h`), run `seedDemoWorkspace`, then assert:
  - `onboardingCompletedAt` is set
  - invoice statuses include `DRAFT`, `SENT`, `PARTIALLY_PAID` and `PAID`
  - at least 2 non-draft invoices have `dueDate < today` and `balanceDue > 0`
  - at least 2 invoices have a `PUBLIC_LINK_OPENED` event
  - exactly 1 confirmation is `PENDING`
  - at least 1 `PaymentPromise` exists
  - every invoice has `total.equals(amountPaid.plus(balanceDue))`
  - no invoice `issueDate` falls in the future
  
  Then run `deleteDemoWorkspaces({ id })` and assert `count({ where: { workspaceId: id } })` is `0` for every model in `DEMO_DELETE_ORDER`, and that the user is gone.
- [ ] **Step 2:** Run `npm run test:demo`. Expect FAIL.
- [ ] **Step 3: Implement `seedDemoWorkspace`.**
- [ ] **Step 4:** Run `npm run test:demo`. Expect PASS.
- [ ] **Step 5: Commit** `Demo: seed a realistic workspace through the real services`

### Task 5: Creating demos and demo restrictions

**Files:**
- Create: `src/services/demo.ts`
- Create: `src/app/api/demo/route.ts`
- Modify: `src/lib/rate-limit.ts` (`clientAddress`)
- Modify: `src/app/api/auth/[action]/route.ts` (demo branch at the top)
- Modify: `src/app/api/onboarding/route.ts` (refuse a logo in demo mode)
- Modify: `src/app/(auth)/layout.tsx` and `src/app/auth/callback/route.ts`: `redirect("/")` when `isDemoMode()`
- Create: `tests/demo-routes.test.ts`
- Modify: `tests/demo.ts`

**Interfaces:**
- Consumes: `newDemoToken`, `DEMO_COOKIE`, `DEMO_LIFETIME_MS`, `demoCookieOptions`, `findDemoUser`, `deleteDemoWorkspaces` and `seedDemoWorkspace`.
- Produces:
  - `createDemo(options?: { replacingUserId?: string; now?: Date }): Promise<{ token: string; expiresAt: Date }>`, which runs these steps in order:
    1. Delete the `replacingUserId` demo, if any.
    2. Delete demos with `demoExpiresAt < now`.
    3. If the active count is at least `DEMO_MAX_ACTIVE`, delete the oldest by `createdAt` until it is `max - 1`.
    4. Create the user (`name: "Demo Visitor"`, `email: demo-${id}@demo.invalid`, `emailVerified: true`, `demoTokenHash`) and the workspace (`demoExpiresAt = now + DEMO_LIFETIME_MS`, OWNER membership).
    5. Seed. On any seed error, `deleteDemoWorkspaces({ id })` and rethrow.
  - `deleteDemoForUser(userId: string): Promise<void>`.
  - `POST /api/demo` returns 404 when not in demo mode and 403 on a foreign origin. A visitor with a valid demo session is treated as a replacement and skips the rate limit. Otherwise it applies `takeRateLimit(request, "demo", "", 3, 3600)` and returns 429 with `Retry-After`. Then it calls `createDemo` and sets the cookie. It replies with `303` to `/app` for form posts and JSON `{ ok: true }` when `Accept: application/json`. On failure: 500 `{ error: "The demo could not be started. Please try again." }`.

- [ ] **Step 1: Write `tests/demo-routes.test.ts`** (pure Vitest, with a filesystem scan):
  - `it("classifies every write route")`: glob `src/app/api/**/route.ts` and keep files whose source matches `/export async function (POST|PATCH|DELETE)/`. The set of their paths relative to `src/app/api` must equal the keys of a literal `classification` table in the test. Every key maps to `"allowed"`, except `auth/[action]/route.ts` and `onboarding/route.ts`, which map to `"restricted"`. `demo/route.ts` maps to `"allowed"`.
  - `it("uses the last forwarded hop in demo mode")`: with the env stubbed to demo mode, `TRUST_PROXY=true`, and `x-forwarded-for: "6.6.6.6, 1.2.3.4"`, the exported `clientAddress` returns `"1.2.3.4"`. In real mode it returns `"6.6.6.6"`, which is today's behaviour. (Export `clientAddress` for this.)
- [ ] **Step 2: Add to `tests/demo.ts`**, with `DEMO_MODE=true` and `DEMO_MAX_ACTIVE=2` set in `process.env` for these checks:
  - **Eviction:** create 3 demos one after another. Exactly 2 are active, the first is gone, and the newest exists.
  - **Concurrent:** two simultaneous `createDemo()` calls (`Promise.all`) both resolve, and both returned tokens resolve via `findDemoUser`.
  - **Replace:** `createDemo({ replacingUserId })` removes the old demo, and the old token resolves to `null`.
  - **Seed failure:** stub `seedDemoWorkspace` to throw via an injectable parameter `createDemo(options, seed = seedDemoWorkspace)`. The call rejects, and no workspace with `demoExpiresAt` set was left beyond the ones that existed before.
- [ ] **Step 3:** Run `npx vitest run tests/demo-routes.test.ts && npm run test:demo`. Expect FAIL.
- [ ] **Step 4: Implement.** In demo mode, the auth route answers `sign-out` with `deleteDemoForUser` (when there's a session), clears `demo_session`, and returns `{ ok: true }`. Every other action returns 404, and this happens before any Supabase client is built. The onboarding route returns 400 `{ error: "Logo uploads are off in the demo" }` when `isDemoMode()` and the parsed body's `logoDataUrl` is non-null. In `clientAddress`, when `isDemoMode()`, take the last comma-separated hop.
- [ ] **Step 5:** Run `npx vitest run tests/demo-routes.test.ts && npm run test:demo && npm test && npm run typecheck && npm run lint`. Expect PASS.
- [ ] **Step 6: Commit** `Demo: POST /api/demo with eviction, and demo-mode route restrictions`

### Task 6: Demo UI

**Files:**
- Modify: `src/app/page.tsx` (CTA, hidden auth links, hero note)
- Create: `src/components/demo-banner.tsx` (client component: hours left plus a Start over form)
- Modify: the app shell layout that renders `AppShell` (`src/app/app/layout.tsx`): render `DemoBanner` when `isDemoMode()`, passing `expiresAt` from the session user's workspace
- Modify: `src/components/sign-out.tsx`: in demo mode go to `/`. Pass a `demo` prop from the server parent; don't read env on the client.

**Interfaces:**
- Consumes: `POST /api/demo`.
- Produces: `<DemoBanner expiresAt={string /* ISO */} />`.

- [ ] **Step 1: Implement.** The landing CTA is a `<form method="post" action="/api/demo">` with a submit button reading "Try the live demo". It shows a pending label, "Starting your demo… (first start can take a minute)", once submitted, using `useFormStatus` or a small client wrapper. In demo mode, the Sign in and Create workspace links are hidden and the hero note reads "Live demo with sample data · resets after 24 hours". The banner is a slim strip using the existing tokens, with `role="status"`. Its text is "Demo workspace · sample data · emails aren't delivered · resets in {N}h", where N is `Math.max(1, Math.ceil(ms / 3_600_000))`. "Start over" is a form POST to `/api/demo`. Real mode renders exactly as before.
- [ ] **Step 2: Verify by eye.** Run the dev server in demo mode against local Postgres. Check the landing page, the button, the banner on `/app` at 375px and desktop widths, and Start over. Sign out should lead to `/`. With demo mode off, the landing page should be unchanged.
- [ ] **Step 3:** Run `npm run lint && npm run typecheck`. Expect PASS.
- [ ] **Step 4: Commit** `Demo: landing CTA, demo banner and Start over`

### Task 7: Startup cleanup, hosting, docs and e2e

**Files:**
- Modify: `src/instrumentation.ts`: add `export async function register()` that, when `process.env.NEXT_RUNTIME === "nodejs"` and `isDemoMode()`, dynamically imports `@/services/demo-cleanup` and calls `deleteDemoWorkspaces({ demoExpiresAt: { lt: new Date() } })`. Catch errors and log them with `logEvent("demo_cleanup_failed")`. It must never block startup.
- Modify: `package.json`: `"start:demo": "next start --hostname 0.0.0.0 --port ${PORT:-3000}"`. Check this works under npm on Linux (Render). If shell expansion fails, use a tiny `scripts/start-demo.mjs` instead.
- Create: `render.demo.yaml` (per spec section 9: free Postgres 17 `invoice-tracker-demo-db` and free Node web service `invoice-tracker-demo`, both Singapore; build `npm ci && npm run build`; start `npm run db:migrate && npm run start:demo`; health check `/api/health/ready`; `NODE_VERSION` matching `engines`; env `DEMO_MODE=true`, `DEMO_MAX_ACTIVE=10`, `EMAIL_MODE=file`, `EMAIL_FROM`, `APP_URL`, `TRUST_PROXY=true`, `DATABASE_URL` from the database). Add RentFlow's style of header comment warning never to use a real DB or provider keys.
- Create: `docs/deployment-render-demo.md` (deploy steps, the manual dashboard fallback, a post-deploy check list, caveats: cold start, the 30-day DB expiry, emails on disk only, the possible OOM on `next build` at 512 MB)
- Modify: `README.md` (a demo section, link placeholder), `CLAUDE.md` (a "Demo mode" note: the `isDemoMode()` rule, classify new write routes in `tests/demo-routes.test.ts`, add new workspace tables to `DEMO_DELETE_ORDER`), `docs/implementation-status.md`
- Create: `tests/e2e/demo.spec.ts`. Modify `playwright.config.ts` so `demo.spec.ts` runs only when `DEMO_MODE=true` and `foundation.spec.ts` only when it isn't (`testIgnore` keyed on env).

- [ ] **Step 1: Write `tests/e2e/demo.spec.ts`.** The journey:
  1. On `/`, click "Try the live demo"; expect the URL to be `/app` and the banner to show "Demo workspace".
  2. The dashboard shows a non-zero outstanding amount.
  3. Create a new invoice for a seeded client and send it.
  4. Open its public link in a new page; the invoice number is visible.
  5. Record a full payment; the status shows Paid.
  6. Save `demo_session`, sign out, and expect the URL to be `/`.
  7. Restore the saved cookie, `goto("/app")`, and expect it to end on `/`, because the old demo was deleted.
- [ ] **Step 2: Run it.** Start the dev server with `DEMO_MODE=true`, no Supabase or Resend keys, and local Postgres, then run `npx playwright test tests/e2e/demo.spec.ts`. Expect PASS. Fix the app, not the test, unless the test's selector is wrong.
- [ ] **Step 3: Check startup cleanup.** Insert an expired demo through `tests/demo.ts` helpers, or write it by hand, then restart the server. The rows should be gone.
- [ ] **Step 4: Run the full checks with demo mode off:** `npm run lint && npm run typecheck && npm test && npm run test:demo`, then with the dev server running, `npm run test:integration && npm run test:e2e`. Expect PASS.
- [ ] **Step 5: Check the build with demo env** (`DEMO_MODE=true`, no Supabase vars): `npm run build`. Expect success. This proves the build doesn't need Supabase keys.
- [ ] **Step 6: Commit** `Demo: startup cleanup, Render blueprint, docs and e2e journey`

The deploy itself happens after merge. It is the owner's action in the Render dashboard, following `docs/deployment-render-demo.md`.
