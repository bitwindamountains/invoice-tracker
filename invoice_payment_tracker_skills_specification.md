# Invoice + Payment Collection SaaS — Skills Specification

> Engineering clarification: [specification review](docs/specification-review.md) records required concurrency, idempotency, currency rounding, immutable history, and tenant-isolation acceptance checks. See [implementation status](docs/implementation-status.md) for verified capabilities.

## 1. Purpose

This document defines the technical, product, UX, security, and engineering skills required to build and maintain the Invoice + Payment Collection SaaS.

It is intended for:
- AI coding agents
- Developers
- Technical reviewers
- QA engineers
- Future maintainers

The system is not a generic invoice generator. It is a payment collection assistant for freelancers and small service businesses.

Core workflow:

```text
Create Invoice
→ Send
→ Track
→ Follow Up
→ Confirm Payment
→ Get Paid
```

---

# 2. Required Engineering Skills

## 2.1 TypeScript

The implementation must use strong TypeScript practices.

Required capabilities:
- Strict typing
- Interfaces and type aliases
- Generic utilities
- Discriminated unions
- Schema-derived types
- Safe narrowing
- Avoidance of `any`
- API contract typing
- Form type safety
- Database model typing

Rules:
- No untyped business logic
- No silent `any`
- No unsafe casting without justification
- Prefer reusable domain types

---

## 2.2 React / Next.js

Required capabilities:
- Server and client component boundaries
- Routing
- Layouts
- Loading states
- Error boundaries
- Forms
- Server actions or API routes
- Streaming when useful
- Metadata
- Authentication-aware layouts
- Responsive rendering

The AI should understand when logic belongs:
- on server
- on client
- in reusable services
- in domain layer

Do not put business logic directly inside UI components.

---

## 2.3 Database Design

Required capabilities:
- PostgreSQL
- Prisma ORM
- Relations
- Unique constraints
- Composite indexes
- Transactions
- Concurrency-safe counters
- Soft deletion
- Audit history
- Multi-tenant isolation
- Data migrations

Critical areas:
- invoice numbering
- partial payments
- payment confirmations
- reminders
- tenant ownership
- historical snapshots

---

## 2.4 Financial Calculation Skills

Financial logic is critical.

Required capabilities:
- Decimal-safe arithmetic
- Currency-aware formatting
- Line item calculation
- Percentage discounts
- Fixed discounts
- Tax
- Partial payment allocation
- Balance calculation
- Payment status transitions
- Aging calculations

Never use JavaScript floating point directly for financial totals.

Use:
- decimal database fields
- decimal arithmetic library

---

# 3. Domain Modeling Skills

The AI must understand the following domain entities:

```text
User
Workspace
WorkspaceMember
BusinessProfile
Client
ProductService
Invoice
InvoiceItem
InvoiceEvent
Payment
PaymentPromise
PaymentConfirmation
InvoiceReminder
Expense
ExpenseCategory
Deliverable
Notification
AuditLog
Subscription
FileAsset
```

The AI should model behavior, not only tables.

Example:

```text
Invoice
  has many InvoiceItems
  has many InvoiceEvents
  has many Payments
  may have PaymentPromise
  may have PaymentConfirmations
```

---

# 4. Multi-Tenant SaaS Skills

Every business-owned record must belong to a workspace.

Required checks:

```text
authenticated user
AND
workspace membership
AND
role permission
AND
resource belongs to workspace
```

Never query resources only by ID.

Bad:

```text
find invoice where id = invoiceId
```

Good:

```text
find invoice where:
id = invoiceId
AND
workspaceId = activeWorkspaceId
```

Cross-tenant access is a security-critical defect.

---

# 5. Authentication and Authorization Skills

Required:
- Registration
- Login
- Logout
- Password reset
- Email verification
- Session handling
- Secure cookies
- Role-based access control
- Reauthentication for destructive actions

Roles:
- Owner
- Admin
- Staff

Authorization must be enforced on the server.

UI hiding is not security.

---

# 6. Security Skills

The implementation must demonstrate competence in:

- XSS prevention
- CSRF protection
- SQL injection prevention
- Session security
- Rate limiting
- Password hashing
- Secure headers
- CSP
- Input validation
- File upload validation
- Signed URLs
- Secret management
- Logging hygiene
- Webhook verification
- Idempotency

Never store secrets in source code.

---

# 7. Invoice Workflow Skills

The AI must correctly implement:

```text
DRAFT
SENT
PARTIALLY_PAID
PAID
VOID
```

Overdue should generally be derived.

Rules:
- Draft can be edited freely
- Sent invoice changes should be deliberate
- Partially paid invoice cannot be casually deleted
- Paid invoice should remain auditable
- Void invoices remain in history
- Reminder jobs stop after paid/void

---

# 8. Invoice Timeline Skills

The product must create events such as:

```text
CREATED
UPDATED
SENT
DELIVERED
VIEWED
REMINDER_SENT
PAYMENT_PROMISED
PAYMENT_CONFIRMATION_SUBMITTED
PAYMENT_RECORDED
PARTIALLY_PAID
PAID
VOIDED
```

The timeline should be append-oriented.

Do not reconstruct important historical events only from current state.

---

# 9. Follow-Up Automation Skills

This is a flagship capability.

The AI must understand:
- due-date based scheduling
- relative reminder timing
- pause rules
- duplicate prevention
- idempotent jobs
- partial-payment-aware content
- payment-promise suppression
- automatic stop after full payment

Example:

```text
3 days before due
→ friendly reminder

on due date
→ due today

3 days overdue
→ professional reminder

7 days overdue
→ second follow-up

14 days overdue
→ firm reminder
```

---

# 10. Client Payment Behavior Skills

The system should calculate:

```text
average days to payment
average days early/late
paid invoice count
outstanding balance
payment frequency
recent payment behavior
```

Only use factual historical data.

Do not infer personality or intent.

---

# 11. Payment Confirmation Skills

For external payments:

Client submits:

```text
Amount
Payment Method
Reference
Payment Date
Receipt
```

Owner reviews:

```text
Confirm
Reject
```

Rules:
- Submission does not automatically become a financial payment
- Confirmation should create/attach a real Payment record
- Audit event must be recorded
- Duplicate confirmation must be prevented where possible

---

# 12. PWA Skills

Required:
- Web App Manifest
- Service Worker
- Installability
- App icons
- Offline fallback
- Cache strategy
- Responsive UX
- Safe handling of sensitive content

Do not cache private API responses indiscriminately.

Offline scope should remain conservative.

---

# 13. Email and Notification Skills

Required:
- Transactional email
- Templates
- Delivery status integration where supported
- Reminder templates
- Email queue
- Failure handling
- Retry logic
- Idempotency

Emails:
- verification
- password reset
- invoice sent
- reminder
- payment receipt
- subscription status

---

# 14. PDF Generation Skills

Invoice and receipt PDFs must:
- match product branding
- be printable
- show correct totals
- support multiple currencies
- use invoice snapshot data
- remain historically stable

Historical invoices must not silently change when client or business profile data changes.

---

# 15. File Storage Skills

Required:
- S3-compatible storage
- secure object keys
- upload validation
- signed access URLs
- access control
- size restrictions
- allowed MIME enforcement

Potential uploads:
- business logo
- payment receipt
- deliverables

---

# 16. Background Job Skills

Required job patterns:
- scheduled reminders
- email sending
- stale token cleanup
- payment promise expiration
- billing synchronization
- export jobs

Jobs must be:
- idempotent
- observable
- retryable
- safe against duplicate execution

---

# 17. API Design Skills

APIs should be:
- predictable
- resource-based
- validated
- authorized
- versionable if needed
- consistent in errors

Example:

```text
/api/clients
/api/invoices
/api/invoices/:id/send
/api/invoices/:id/remind
/api/invoices/:id/payments
/api/payment-confirmations
/api/reports
```

---

# 18. Validation Skills

Use shared schemas where practical.

Validate:
- client fields
- invoice lines
- dates
- email
- payment amounts
- currency
- reminders
- file uploads
- role permissions

Server validation is mandatory.

---

# 19. UX Engineering Skills

Required:
- empty states
- loading states
- error states
- success feedback
- confirmations
- keyboard navigation
- responsive tables
- mobile cards
- inline validation
- accessible dialogs

Important UX principle:

> The system should reduce the user's cognitive load around unpaid invoices.

---

# 20. Accessibility Skills

Target WCAG 2.1 AA practices.

Required:
- semantic HTML
- labels
- contrast
- focus handling
- keyboard support
- screen-reader friendly alerts
- accessible forms
- accessible modal/dialog behavior

---

# 21. Reporting Skills

Required:
- outstanding balance
- overdue balance
- payments received
- client revenue
- aging
- invoice status distribution
- cash-flow style summary

Reports must reconcile with transactional data.

---

# 22. Testing Skills

## Unit

Test:
- invoice math
- tax
- discount
- balances
- statuses
- reminder rules
- payment promises
- client behavior metrics

## Integration

Test:
- invoice creation
- send flow
- public invoice
- payment confirmation
- reminder dispatch
- payment recording

## E2E

Critical path:

```text
Register
→ Create business
→ Add client
→ Create invoice
→ Send
→ Client views
→ Client promises payment
→ Client submits confirmation
→ Owner confirms
→ Invoice becomes paid
```

---

# 23. QA Skills

The AI/developer should test:
- desktop
- tablet
- mobile
- dark/light if implemented
- poor network
- slow API
- empty account
- large client list
- large invoice history
- incorrect payment data
- expired public token
- duplicate jobs

---

# 24. Performance Skills

Required:
- query optimization
- indexing
- pagination
- avoiding N+1 queries
- server-side filtering
- caching where safe
- deferred expensive work
- chart data aggregation

Targets:
- normal dashboard load under ~2s where practical
- typical API under ~500ms where practical

---

# 25. Observability Skills

Required:
- structured logs
- error monitoring
- request IDs
- workspace IDs in logs
- job monitoring
- failed email tracking
- billing webhook monitoring
- uptime checks

Do not log secrets or sensitive financial details unnecessarily.

---

# 26. DevOps Skills

Required:
- environment separation
- CI/CD
- migrations
- backups
- staging
- production deploy
- rollback awareness
- environment variables
- smoke tests

Environments:

```text
Development
Staging
Production
```

---

# 27. Product Judgment Skills

The AI should understand feature priority.

High priority:
- getting paid
- visibility
- follow-up
- payment confirmation
- partial payment
- simple client workflows

Low priority initially:
- payroll
- tax filing
- inventory
- deep accounting
- complex CRM

Before adding a feature, ask:

> Does this help the user get paid more clearly, quickly, or reliably?

---

# 28. AI Coding Agent Behavior

The agent should work in this cycle:

```text
Inspect
→ Understand
→ Plan
→ Implement
→ Test
→ Review
→ Document
```

Never:
- rewrite entire modules unnecessarily
- skip tests
- ignore existing architecture
- fabricate APIs
- suppress errors
- hard-code temporary secrets
- bypass authorization

---

# 29. Code Quality Standards

Required:
- small focused functions
- clear naming
- reusable services
- domain-centric modules
- minimal duplication
- no giant components
- no business logic in presentation components
- no dead code
- no silent failures

---

# 30. Documentation Skills

Keep updated:
- README
- architecture
- environment variables
- database schema notes
- API notes
- deployment
- security assumptions
- feature limitations

Every major feature should include:
- purpose
- behavior
- validation
- authorization
- tests

---

# 31. Definition of a Skilled Implementation

A production-quality implementation should demonstrate:

```text
Correct financial math
Strong tenant isolation
Predictable invoice state transitions
Reliable reminder automation
Accurate payment history
Responsive UI
Clear action-oriented UX
Secure public invoice links
Safe payment confirmation handling
Strong test coverage
Maintainable architecture
```

---

# 32. Final Skill Priority

The most important engineering skill for this product is not visual design or AI integration.

It is:

> **Building a reliable stateful financial workflow where every invoice can be traced from creation to payment.**
