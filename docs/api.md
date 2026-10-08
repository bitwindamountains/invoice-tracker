# Foundation API

`/api/auth/*` is handled by Better Auth. Supported client flows use its typed React client: signup, login, verification/resend, reset request, reset password, session lookup and logout. Passwords must contain 12–128 characters. Signup names are trimmed and constrained to 2–100 characters on the server. Email validation, token expiration, credential hashing, and origin/CSRF checks are framework-managed.

`GET /api/workspaces/:workspaceId` requires a verified session cookie and an active database membership. Returns `{ id, name, role }` for the requested workspace; no owner email or auth records are exposed. Anonymous/unverified: 401. Invalid parameters: 400. Missing/nonmember: 404. Unexpected failure: 500 with a request ID, without internal error details. Responses use `private, no-store` and `X-Request-Id`.

`/app` is the server-rendered private workspace page; unauthenticated callers redirect to `/login`. It resolves the personal workspace and validates membership server-side.

`POST /api/onboarding` creates or replaces the authenticated workspace's business profile, invoice defaults, branding, and ordered payment instructions in one serializable transaction. The workspace is derived from the verified session; extra workspace identifiers in the body are ignored. Only OWNER and ADMIN memberships may save. The endpoint rejects cross-origin requests, bodies over 800 KB, invalid URLs/tax/default values, repeated payment-method names, and unverified logo content. Validation: 400. Anonymous: 401. Wrong origin: 403. Oversized: 413.

`GET /api/business/logo` returns the current authenticated workspace's verified PNG, JPEG, or WebP logo. It never accepts a workspace ID and returns 401 or 404 without exposing another tenant's asset. Responses use `nosniff` and private caching.

`GET /api/clients` lists the authenticated workspace's clients, with `search`, `status=active|archived`, and 25-record `page` pagination. `POST /api/clients` creates a client. `GET /api/clients/:clientId` returns a tenant-scoped record; `PATCH` updates it using the required `version`. `POST /api/clients/:clientId/archive` soft archives or restores it using `{ archived, version }`. Mutations require OWNER/ADMIN, exact same origin, bounded JSON, and server validation. Stale versions return 409; inaccessible IDs return 404.

Configured payment instructions are display defaults and remain separate from confirmed payment ledger records.

`GET /api/catalog` lists active or inactive product/service defaults with search and 25-record pagination. `POST /api/catalog` creates an item. `GET/PATCH /api/catalog/:itemId` reads or updates it, and `POST /api/catalog/:itemId/status` archives or restores it. Prices cross the API as validated decimal strings and persist as `Decimal(19,4)`. Mutations use the same verified-session, OWNER/ADMIN, exact-origin, payload-limit, tenant-scope, audit, and optimistic-version controls as clients.

`GET/POST /api/invoices` lists or creates invoice drafts. `GET/PATCH /api/invoices/:invoiceId` reads or edits a draft. The server ignores submitted totals, validates decimal-string inputs, calculates every line and invoice total through the authoritative calculation service, and stores the reconciled result. Automatic numbers allocate transactionally; duplicate manual numbers return 409. Only DRAFT records are editable, and stale versions return 409.

`POST /api/invoices/:invoiceId/send` freezes the draft snapshot, creates an expiring hashed public capability and pending delivery record, generates a deterministic PDF, and sends the email. Provider acceptance records `EMAIL_SENT`; failure remains distinct and never fabricates delivery. `GET /api/invoices/:invoiceId/pdf` is the authenticated owner download. `POST/DELETE /api/invoices/:invoiceId/public-link` rotates or revokes public access.

`GET /i/:token` is the read-only public invoice. `GET /api/public/invoices/:token/pdf` downloads its snapshot PDF. Tokens are validated by hash, expiry and revocation state; responses are noncached and no-indexed. Page access records `PUBLIC_LINK_OPENED` without IP, fingerprint or identity claims.

`POST /api/public/invoices/:token/payment-confirmations` creates an idempotent pending external-payment claim; it does not change the invoice balance. `POST /api/public/invoices/:token/payment-promises` records a promised date. `GET /api/payment-confirmations` provides the tenant-scoped owner inbox, and `POST /api/payment-confirmations/:confirmationId` confirms or rejects a pending claim. Confirmation creates exactly one Payment and atomically updates invoice totals/status. `POST /api/invoices/:invoiceId/payments` records a manual payment. `GET /api/payments/:paymentId/receipt` returns its authenticated PDF receipt.

`PATCH /api/reminder-rules` updates the authenticated workspace's five-stage follow-up sequence. `POST /api/invoices/:invoiceId/reminders` sends a manually composed reminder with the frozen invoice PDF attached. `POST /api/reminders/run` evaluates the sequence in the workspace timezone and sends the latest eligible stage once. OWNER/ADMIN access, exact-origin checks and bounded validated bodies apply. Paid, void, draft, zero-balance, actively promised and pending-confirmation invoices are excluded. Reminder acceptance or failure is recorded in both reminder history and invoice activity.

`GET/POST /api/expenses` lists or records tenant-scoped expenses. `PATCH /api/expenses/:expenseId` applies optimistic updates. `POST /api/expense-categories` and `POST /api/expense-categories/:categoryId/status` create, archive or restore categories without deleting historical expense relationships. Amounts remain exact decimal strings at the boundary and reports never combine currencies.

`GET /api/reports/export` accepts `type=revenue|aging|clients|expenses` with inclusive `from` and `to` dates and returns a private, UTF-8 CSV download. Spreadsheet formula prefixes are escaped. Revenue and client exports use confirmed Payment rows; expenses use Expense rows; aging uses current issued unpaid invoice balances.
