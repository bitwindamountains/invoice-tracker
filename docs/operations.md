# Production operations runbook

## Deployment checks

The production environment validator requires HTTPS, Resend delivery, a trusted proxy, a unique authentication secret, and an error-monitor endpoint/token. The ingress must replace `Forwarded` and `X-Forwarded-*` headers rather than append untrusted client values. Set `DEPLOYMENT_VERSION` to the immutable release identifier.

Apply migrations as a separate release step with a database role allowed to change schema. Run the application with a role limited to the tables and sequences it uses. Check `/api/health/live` for process health and `/api/health/ready` for database readiness. Neither endpoint returns secrets or database details.

Configure the uptime monitor against readiness from at least two regions. Alert on sustained non-200 responses, elevated 5xx rates, `server_request_error`, `error_monitor_delivery_failed`, `email_delivery_failed`, and repeated reminder failures. The error-monitor payload contains only route templates, methods, error digests, release identifiers, and timestamps.

## Backup and restore

Run `npm run db:backup -- <private-directory>` using PostgreSQL's matching `pg_dump` binary. The script creates a custom-format archive without ownership or ACL statements and never places credentials in command arguments. Store archives in encrypted private storage with provider-side immutability and lifecycle retention.

Run `npm run db:backup:verify -- <archive.dump>` after every backup. This checks archive readability and table data presence. At least monthly, restore the archive into an isolated empty database with `pg_restore`, run migrations, compare core table counts and sample invoice/payment totals, then destroy the isolated environment. A list-only verification is not a restore drill.

Before launch, assign owners and targets for recovery point and recovery time. A practical initial proposal is daily full backups plus provider continuous recovery, RPO at most 24 hours, RTO at most 4 hours, 35-day rolling retention, and quarterly retained snapshots. These values require business approval and a completed restore rehearsal.

## Performance and release verification

With a production build running, execute `npm run test:performance`. Defaults are 100 requests, concurrency 10, zero errors, and p95 under 750 ms across the login page and liveness endpoint. Tune `PERF_REQUESTS`, `PERF_CONCURRENCY`, and `PERF_P95_MS` only for an agreed environment. This smoke check does not replace database-sized load testing.

Every release runs lint, strict TypeScript, unit tests, PostgreSQL/HTTP integration tests, Playwright accessibility and full-journey tests, a production build, performance smoke, migration status, and the high-severity dependency audit.

## Incident handling

For suspected public-link exposure, revoke or rotate the affected invoice capability and redact capability paths from ingress and observability storage. For payment-integrity concerns, disable write traffic, preserve logs, and reconcile append-only Payment rows against invoice balances before reopening writes. Never repair financial history with direct deletion; use a reviewed migration or an explicit reversal feature.

External launch still requires verified sender delivery, managed HTTPS behavior, backup restore evidence, uptime/error-monitor alerts reaching their owners, legal review, privacy/retention decisions, and an independent security review.
