# Implementation status — 2026-09-23

## Completed phases

- Phase 1: secure Next.js, Better Auth, PostgreSQL/Prisma, tenant memberships, local services, CI, tests and operational documentation.
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

## Database and API changes

Ten migrations are applied locally. The schema now includes expense categories and exact-decimal expense records alongside the existing identity, workspace, business, client, catalog, invoice, delivery, payment and reminder records.

The Phase 10 routes record and update expenses, manage categories and export reconciled CSV reports. OWNER/ADMIN authorization, exact-origin enforcement, bounded validation, tenant predicates and optimistic versions apply to financial mutations.

## Validation evidence

- 30 unit checks cover validation, invoice calculations, deterministic PDFs, reminder behavior, expense decimals and report date ranges.
- 131 PostgreSQL/HTTP integration checks cover the prior controls plus health probes, hardened response headers, persisted public-route throttling, manifest installability and service-worker exclusions.
- The browser journeys cover registration through payment completion, all working financial modules, manifest registration and a real browser-offline navigation fallback.
- Public responsive and automated accessibility checks remain part of the browser suite.
- Strict TypeScript, lint, production build, Prisma migration state and dependency audit are release checks.
- The local production bundle handled 100 smoke requests at concurrency 10 with zero failures and 171 ms p95 on the tested machine.
- Remote CI has not run.

## Limits and next phase

Phases 1 through 11 work locally. Actual provider email delivery, hosted scheduling, deployed HTTPS install behavior, backups, operational monitoring and independent security review remain unverified. No external email was sent and no public deployment was performed.

Local Phase 12 controls are implemented. Public launch remains gated by configured hosted services and the external evidence listed in the operations runbook.
