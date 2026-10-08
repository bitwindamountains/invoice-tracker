# Security assumptions and launch gates

Implemented controls include server-side membership/role authorization, verified-email login, framework credential hashing, expiring HttpOnly SameSite cookies, secure cookies in production, persisted auth rate limits, origin checks, reset-driven session revocation, noncached private responses, per-request script CSP nonces, framing denial and referrer suppression. Inline styles remain allowed for framework compatibility; production script eval is disabled.

Auth URL request logging is suppressed in development because verification/reset routes contain bearer tokens. Production ingress, tracing, and error monitoring must also redact query strings and reset-token path segments. Structured application logs accept operational fields only. Better Auth diagnostic logging must be reviewed alongside the chosen hosting log pipeline.

Persisted auth rate limits are defense in depth, not a distributed abuse firewall. Public payment-confirmation and promise routes also use persisted limits keyed by hashed capability and client address. Production refuses to start without trusted-proxy mode; the deployment proxy must replace untrusted forwarding headers before the application reads them. Edge limits and account-targeted abuse controls remain required. Rate-limit cleanup and expired-token/session retention tasks are not implemented yet.

Development `.env`, PostgreSQL data, and local email files are ignored by version control and never served. Windows filesystem ACLs should limit the workspace to its owner; POSIX mode flags alone do not establish Windows ACLs. Use a secrets manager in production and separate application/migration database roles. The embedded PostgreSQL helper is for local development only.

Business-setting mutations enforce exact same-origin requests, verified sessions, OWNER/ADMIN membership, an 800 KB request ceiling, and server validation. Embedded logos are decoded and checked against PNG/JPEG/WebP signatures with a 512 KB decoded limit. Logo responses are authenticated, private, and `nosniff`. Database storage is intentionally limited to small logos; larger uploads still require the planned private object-storage service, signed access, scanning, and retention controls.

Client endpoints derive the workspace from the verified session, scope every record lookup by workspace ID, return 404 across tenant boundaries, and allow mutations only for OWNER/ADMIN. Create/update payloads are limited to 32 KB. Version predicates prevent lost updates, and archive preserves records for recovery and audit history.

Catalog endpoints apply the same tenant, role, origin, size, version, and audit controls. Prices reject exponent notation, negative values, non-numeric values, and more than four decimal places before conversion to the database decimal type.

Invoice endpoints use composite workspace foreign keys in addition to scoped queries. The server derives totals, balance, client snapshots, sort order and invoice numbers; caller-supplied totals are discarded. Draft writes run at serializable isolation, use a workspace-scoped unique number constraint, reject stale versions, and cap request bodies at 128 KB. Issuance requires OWNER/ADMIN membership and an exact version match.

Issuance now freezes the historical snapshot and locks invoice editing. Public links use 256-bit random bearer tokens, persisted only as SHA-256 hashes, with expiry, rotation and revocation. Public and authenticated PDF routes are separate; both disable caching and MIME sniffing, and public responses add no-index controls. Link views store only invoice/time evidence. Provider delivery status is tracked independently and is never inferred from an email open. Production ingress and telemetry must redact public-token paths.

Payment ledger mutations require OWNER/ADMIN and exact same-origin requests. They lock the tenant-scoped invoice in a serializable transaction, round to the invoice currency, reject drafts, void invoices and overpayments, and atomically persist the payment, balance/status, event and audit. Public bearer links may submit confirmations and promises, but confirmations remain nonfinancial until review. Idempotency keys and a unique confirmation-to-payment relation prevent duplicate ledger entries; concurrent approvals are retried and revalidated against the current balance. Receipt downloads require workspace membership.

The service worker has an explicit static-shell allowlist. It bypasses every `/api/` request and public `/i/` capability, stores no authenticated navigation or financial response, and returns the cached offline explanation only when a navigation cannot reach the network. Offline mode offers no financial mutation or stale-data view.

Remaining production gates:

- Configured HTTPS deployment, managed database, verified email sender and actual delivery test.
- Durable auth-email processing, retry/alert behavior and timing-enumeration review.
- Database backup/restore drill, agreed recovery objectives, retention and account deletion policies.
- Least-privilege database grants, independent security review, observability and incident ownership.
- Cross-tenant tests for each new financial table, file and report endpoint as they are implemented.
- Full collection journey, financial correctness/concurrency checks, PWA checks, and manual accessibility review.

Operational procedures and proposed recovery targets are recorded in [operations.md](operations.md).

The dependency audit initially flagged Prisma tooling transitive dependencies. Scoped npm overrides pin `@prisma/config`'s `deepmerge-ts` to 8.0.2 and Prisma's `mysql2` to 3.24.4. The former crosses a major version, so validate Prisma configuration, generation, migrations and build on updates, and remove overrides when upstream resolves them. This application uses PostgreSQL, not MySQL. The lockfile records the reviewed graph.
