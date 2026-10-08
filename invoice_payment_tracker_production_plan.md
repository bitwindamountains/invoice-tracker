# Invoice + Payment Tracker SaaS — Full Production Build Plan

> Implementation started 2026-09-20. See [specification review](docs/specification-review.md) for reconciled decisions and [implementation status](docs/implementation-status.md) for tested progress. This specification describes the target product; it is not a production-readiness certification.

## 0. Purpose of This Document

This document is a **production-ready implementation specification** intended to be given directly to an AI coding model.

The AI model should treat this document as the primary source of truth for building the application.

The goal is to create a polished, secure, mobile-friendly **Invoice + Payment Tracker SaaS** that freelancers, consultants, small agencies, and small businesses can use to:

- Manage clients
- Create professional invoices
- Track invoice status
- Record full and partial payments
- Generate downloadable PDF invoices and receipts
- Monitor overdue invoices
- Send payment reminders
- Track income and basic expenses
- View business reports
- Install the application as a PWA
- Use the same product on desktop and mobile

The product should prioritize **getting users paid faster**, along with simplicity, reliability, security, and fast workflows.

The product must NOT behave like a generic invoice generator. Its primary differentiator is an intelligent **payment collection workflow** that continues helping the user after an invoice is sent.

---

# 1. Product Vision

Build a lightweight alternative to overly complicated accounting tools.

The app should answer these questions immediately:

- Who owes me money?
- Which invoices need attention today?
- Has the client viewed the invoice?
- Has the client promised a payment date?
- How much is currently unpaid?
- Which invoices are overdue?
- Which clients regularly pay late?
- When should I follow up?
- What payments did I receive this month?
- Which clients generate the most revenue?

The product is **not initially intended to replace full accounting software**.

It is primarily:

> Invoice creation + payment collection + follow-up automation + client payment intelligence.

The product's core promise is:

> **Send the invoice. The system helps you follow through until you get paid.**

---


# 1.1 Core Product Differentiation

The application must be designed around the period **after the invoice is sent**.

Traditional invoicing tools typically optimize:

```text
Create Invoice
→ Send Invoice
→ Mark Paid
```

This product should optimize:

```text
Create Invoice
→ Send Invoice
→ Track Delivery / View
→ Detect Upcoming Due Date
→ Follow Up
→ Track Client Response
→ Record Payment Commitment
→ Handle Partial Payment
→ Follow Up Remaining Balance
→ Confirm Payment
→ Complete Transaction
```

The application should feel more like a **payment collection assistant** than an accounting package.

Primary differentiators:

1. Payment-focused dashboard
2. Invoice activity timeline
3. Automated follow-up sequences
4. Client payment behavior history
5. Payment promise tracking
6. Partial-payment intelligence
7. Manual payment confirmation workflow
8. Deposit and milestone billing
9. Optional deliverable unlock after payment
10. Local-friendly payment instructions while remaining internationally usable

The design and product roadmap must prioritize these features over generic accounting expansion.

---

# 1.2 Product Positioning

Recommended product category:

> Payment Collection SaaS for Freelancers and Small Service Businesses

Do not position the product primarily as:

> Accounting software

Do not position it primarily as:

> Invoice generator

Preferred positioning concepts:

```text
Stop chasing invoices.

Send the invoice. We help you get paid.

From invoice sent to payment received.

Know who owes you, who viewed your invoice,
and who needs a follow-up today.
```

The final brand language may change, but the product architecture must support this positioning.

---

# 2. Target Users

Primary target users:

- Freelancers
- Web developers
- Graphic designers
- Video editors
- Virtual assistants
- Consultants
- Tutors
- Contractors
- Small agencies
- Small service businesses
- Solo entrepreneurs

Initial market focus may include Philippine users, but the architecture must support international use.

---

# 3. Product Type

Build as a:

- Responsive Web Application
- Progressive Web App (PWA)
- Multi-tenant SaaS
- Mobile-first interface
- Desktop-friendly dashboard

Do NOT build separate Android and iOS native applications for the first production release.

---

# 4. Recommended Technology Stack

Use a modern TypeScript-first stack.

## Frontend

- Next.js using the latest stable release
- React
- TypeScript
- Tailwind CSS
- Accessible component library such as shadcn/ui
- React Hook Form
- Zod validation
- TanStack Query when useful for server state
- Charting library for analytics
- PWA support using Web App Manifest + Service Worker

## Backend

Preferred:

- Next.js server actions/API routes for an initially unified application

Alternative if separation becomes necessary:

- NestJS backend
- REST API

Do not introduce microservices for the MVP.

## Database

- PostgreSQL

## ORM

- Prisma ORM

## Authentication

Use a production-ready authentication solution supporting:

- Email/password
- Secure session management
- Password reset
- Email verification
- Optional Google login later

Possible implementation:

- Auth.js or equivalent secure authentication framework

## File Storage

Use S3-compatible object storage for:

- Logos
- Attachments
- Generated PDFs if persisted
- Receipt images if expense uploads are added

Examples:

- AWS S3
- Cloudflare R2
- Supabase Storage

Storage provider must be abstracted behind a service.

## Email

Use a transactional email provider.

Examples:

- Resend
- Postmark
- SendGrid

Email implementation must also be abstracted behind an email service.

## PDF

Generate invoices and receipts server-side.

PDF generation must support:

- Company branding
- Invoice details
- Client details
- Line items
- Tax/discount
- Payment instructions
- Notes
- Currency
- Invoice status
- Payment history where appropriate

## Deployment

Recommended architecture:

- Application: Vercel or equivalent
- PostgreSQL: managed PostgreSQL service
- Object Storage: S3-compatible
- Email provider
- Error monitoring: Sentry or equivalent
- Analytics: privacy-conscious analytics provider

---

# 5. Core Product Principles

The AI developer must follow these principles.

## 5.1 Simple First

Avoid building full bookkeeping/accounting functionality.

Do not initially include:

- Double-entry accounting
- Payroll
- Inventory
- Tax filing automation
- Bank reconciliation
- Complex purchase orders
- Enterprise ERP functionality

## 5.2 Mobile Friendly

Every core workflow must work comfortably on a phone.

## 5.3 Fast Invoice Creation

A user should be able to create and send an invoice in less than two minutes once their business profile and client already exist.

## 5.4 Data Isolation

A tenant must never see another tenant's data.

Every business-owned query must enforce tenant/business ownership.

## 5.5 Auditability

Important changes such as:

- Invoice sent
- Invoice edited
- Payment recorded
- Payment deleted
- Invoice voided

must be traceable through an audit log.

---

# 6. SaaS Account Model

Use the following hierarchy:

```text
User
  ↓
Workspace / Business
  ↓
Clients
  ↓
Invoices
  ↓
Payments
```

A user may eventually own or belong to multiple workspaces.

For the MVP:

- Every newly registered user receives one workspace automatically.
- Architecture must support multiple workspace memberships later.

---

# 7. User Roles

Prepare the system for roles.

## Owner

Can:

- Manage business settings
- Manage clients
- Manage invoices
- Manage payments
- Manage expenses
- View reports
- Manage subscription
- Manage workspace members
- Export data

## Admin

Can:

- Manage clients
- Manage invoices
- Manage payments
- Manage expenses
- View reports

Cannot:

- Delete workspace
- Change ownership
- Manage subscription unless permitted

## Staff

Can:

- View clients
- Create invoices
- Record payments

Restricted administrative access.

For initial launch, only Owner may be exposed in UI, but database architecture should support roles.

---

# 8. Authentication

Implement:

- Register
- Login
- Logout
- Email verification
- Forgot password
- Reset password
- Session expiration
- Secure cookies
- Optional "remember me"
- Account lock/rate limiting after repeated failed attempts

Registration fields:

```text
Full Name
Email
Password
Confirm Password
```

After registration:

```text
Create Account
→ Verify Email
→ Create Workspace
→ Business Setup
→ Dashboard
```

---

# 9. Onboarding Flow

On first login, show an onboarding wizard.

## Step 1 — Business Information

Fields:

- Business name
- Owner name
- Business email
- Phone
- Address
- Country
- Default currency
- Time zone

## Step 2 — Branding

Fields:

- Business logo
- Brand color
- Invoice footer
- Optional website

## Step 3 — Invoice Defaults

Fields:

- Default payment terms
- Default notes
- Default tax label
- Default tax rate
- Default invoice prefix
- Starting invoice number

Example:

```text
Prefix: INV-
Starting Number: 1001
Result: INV-1001
```

## Step 4 — Payment Instructions

Allow configurable payment methods.

Examples:

```text
Bank Transfer
GCash
Maya
PayPal
Cash
Check
Other
```

Do not hard-code only Philippine payment methods.

Each payment instruction may contain:

- Payment method name
- Account name
- Account number/reference
- Notes

---

# 10. Dashboard

The dashboard must be **action-oriented**, not primarily accounting-oriented.

The first question it should answer is:

> What money needs my attention today?

## Primary Summary

Display:

- Outstanding Balance
- Overdue Balance
- Due This Week
- Payments Received This Month
- Payment Commitments Due
- Invoices Needing Follow-Up

## Needs Attention

This must be one of the most prominent dashboard sections.

Example:

```text
NEEDS ATTENTION

ABC Dental
INV-1042
₱35,000
12 days overdue
Last reminder: 4 days ago
[Follow Up]

Pixel Agency
INV-1051
₱18,500
Due tomorrow
[View]

John Cruz
INV-1055
₱24,000
Viewed 2 hours ago
No payment yet
[View Activity]
```

Prioritize invoices based on:

- Overdue severity
- Time since last reminder
- Payment promise date
- Partial payment remaining
- Due date proximity
- Whether invoice has been viewed

## Get Paid Today

Create a dedicated action-oriented view:

```text
GET PAID

Total Outstanding
₱184,500

7 invoices need attention

[Review Follow-Ups]
```

Allow the user to review all recommended follow-ups before sending.

Never send bulk reminders without a review/confirmation step unless the user explicitly configured automation.

## Revenue Chart

Show revenue over time as a secondary dashboard component.

Filters:

- Last 7 days
- This month
- Last month
- Last 3 months
- Last 6 months
- This year
- Custom range

## Recent Activity

Examples:

```text
Client viewed INV-1033
Payment received — INV-1032 — ₱8,000
Reminder sent — INV-1029
Payment promised for Sep 25 — INV-1028
Invoice became overdue — INV-1029
```

---

# 11. Client Management

## Client Fields

Required:

- Client name
- Email

Optional:

- Company
- Phone
- Billing address
- Country
- Tax ID
- Currency override
- Notes

## Client Features

- Create client
- Edit client
- Archive client
- Search clients
- Filter clients
- View client profile

Client detail page should display:

```text
Client Information

Outstanding Balance
Lifetime Revenue

Invoices
Payments
Notes
```

Do not hard-delete clients with transaction history by default.

Use archive/soft delete.

---


# 11.1 Client Payment Behavior

The application should calculate useful historical payment behavior for each client.

Metrics may include:

```text
Invoices issued
Invoices paid
Average days to payment
Average days early/late
Current outstanding balance
Average invoice value
Last payment date
```

Example:

```text
ABC Company

14 invoices
Average payment time: 18 days
Average delay: 4 days
Outstanding: ₱24,000

Payment Behavior:
Usually pays 3–7 days late
```

Do not present speculative personality judgments.

Only display behavior derived directly from recorded payment history.

When creating a new invoice, the UI may show a neutral factual note such as:

```text
This client has paid an average of 5 days after the due date
across the last 8 paid invoices.
```

Possible user-controlled suggestions:

```text
Consider requesting a deposit.
Consider shorter payment terms.
Enable automatic reminders.
```

These suggestions should remain optional.

---

# 12. Products / Services Catalog

Allow users to save commonly used billable items.

Fields:

- Name
- Description
- Default price
- Unit
- Taxable yes/no
- Active/inactive

Examples:

```text
Website Development
₱15,000 / project

Maintenance
₱1,500 / month

Consultation
₱750 / hour
```

When creating invoices, users may:

- Select a saved product/service
- Create a custom line item

---

# 13. Invoice System

This is the central module.

## Invoice Fields

Each invoice must contain:

```text
Invoice ID
Workspace ID
Invoice Number
Client ID
Issue Date
Due Date
Currency
Status
Subtotal
Discount
Tax
Total
Amount Paid
Balance Due
Notes
Terms
Payment Instructions
Created At
Updated At
Sent At
Paid At
Voided At
```

## Invoice Statuses

Use explicit state values:

```text
DRAFT
SENT
PARTIALLY_PAID
PAID
VOID
```

Do NOT manually store OVERDUE permanently if it can be derived safely.

An invoice is overdue when:

```text
due_date < today
AND balance_due > 0
AND status IN (SENT, PARTIALLY_PAID)
```

The UI may display OVERDUE as a derived status.

VIEWED is activity evidence, not a financial lifecycle state. Display “Invoice link opened” separately; an access event does not establish the identity of the reader. Evaluate overdue against the workspace's local calendar date.

---

# 14. Invoice Line Items

Each line item contains:

```text
Description
Quantity
Unit Price
Discount
Tax Rate
Line Total
Sort Order
```

Formula:

```text
Base = Quantity × Unit Price

Discount Amount =
Base × Discount Rate
OR
Fixed Discount

Taxable Amount =
Base - Discount Amount

Tax Amount =
Taxable Amount × Tax Rate

Line Total =
Taxable Amount + Tax Amount
```

All financial calculations must occur server-side.

Never trust totals submitted by the frontend.

Use decimal-safe arithmetic.

Do NOT use floating-point arithmetic for money.

---

# 15. Invoice Creation Flow

Recommended workflow:

```text
Invoices
→ New Invoice
→ Select Client
→ Add Items
→ Set Dates
→ Configure Tax/Discount
→ Add Notes
→ Preview
→ Save Draft
→ Send
```

Fields should auto-populate from workspace defaults.

---

# 16. Invoice Numbering

Invoice numbering must be unique per workspace.

Example:

```text
INV-1001
INV-1002
INV-1003
```

Rules:

- Unique within workspace
- Increment automatically
- Never reuse deleted/void invoice numbers
- Concurrency-safe
- User may customize prefix
- User may optionally manually override invoice number if unique

Use database transactions or locking to prevent duplicate invoice numbers.

---

# 17. Invoice Preview

Before sending, provide a full invoice preview.

Desktop:

- Invoice form on left
- Preview on right when practical

Mobile:

- Form
- Preview button

Preview should closely match generated PDF.

---

# 18. Sending Invoices

User clicks:

```text
Send Invoice
```

Modal:

```text
To:
Client email

Subject:
Invoice INV-1004 from My Business

Message:
Customizable message
```

Actions:

```text
Send
Cancel
```

System should:

1. Validate invoice
2. Create immutable snapshot needed for sending
3. Generate invoice PDF
4. Send email
5. Record sent timestamp
6. Write audit event

---

# 19. Public Invoice Page

Every sent invoice should optionally have a secure public link.

Example:

```text
https://app.example.com/i/<secure-token>
```

Requirements:

- Random high-entropy token
- Token must not expose internal sequential database IDs
- Link may be revoked/regenerated
- Public page is read-only

Display:

- Business
- Client
- Invoice
- Amount
- Due date
- Payment status
- Payment instructions
- Download PDF

Later:

- Pay Now

---


# 19.1 Invoice Activity Timeline

Every invoice should have an activity timeline.

Example:

```text
Sep 01 10:14
Invoice created

Sep 01 10:17
Invoice sent

Sep 01 11:42
Invoice viewed

Sep 03 15:15
Invoice viewed again

Sep 08
Friendly reminder sent

Sep 10
Invoice became overdue

Sep 12
₱10,000 payment recorded

Remaining balance: ₱15,000
```

Track events including:

- Created
- Updated
- Sent
- Email delivered when supported
- Public invoice viewed
- Reminder sent
- Payment commitment submitted
- Payment confirmation submitted
- Payment recorded
- Partial payment recorded
- Paid
- Voided

Avoid invasive tracking.

Do not attempt fingerprinting or unrelated client analytics.

---

# 19.2 Invoice View Tracking

When the public invoice page is opened, record a privacy-conscious view event.

Store:

```text
invoiceId
viewedAt
coarse event metadata if needed
```

Do not store unnecessary identifying data.

The owner UI may show:

```text
Sent
Delivered
Viewed
Paid
```

Only show "Delivered" when the email provider actually confirms delivery.

Only show "Viewed" when the invoice page or tracked invoice link was accessed.

Never fabricate email-open certainty.

---

# 20. Payment Tracking

Users must be able to record payments manually.

## Payment Fields

```text
Payment ID
Invoice ID
Workspace ID
Amount
Payment Date
Payment Method
Reference Number
Notes
Created By
Created At
```

Payment methods:

```text
Cash
Bank Transfer
GCash
Maya
PayPal
Card
Check
Other
```

Users may define custom payment methods later.

---

# 21. Partial Payments

Support partial payment from day one.

Example:

```text
Invoice Total:    ₱20,000
Payment 1:         ₱5,000
Payment 2:         ₱8,000

Paid:             ₱13,000
Balance:           ₱7,000
```

Status becomes:

```text
PARTIALLY_PAID
```

Once balance reaches zero:

```text
PAID
```

Prevent payment amount from exceeding remaining balance unless overpayments are deliberately implemented later.

---


# 21.1 Payment Commitment

On a public invoice page, optionally allow the client to choose:

```text
I will pay on...
```

Client selects a date.

Store:

```text
invoiceId
promisedPaymentDate
submittedAt
optionalMessage
status
```

Possible statuses:

```text
ACTIVE
FULFILLED
MISSED
CANCELED
```

When an active payment promise exists:

- Pause unnecessary automated reminders before the promised date.
- Show the promise prominently to the invoice owner.
- Resume follow-up only after the promised date if payment is still outstanding.

Example owner view:

```text
Payment promised:
September 25

Remaining:
₱15,000
```

---

# 21.2 Client Payment Confirmation

For payments made externally through bank transfer, GCash, Maya, cash deposit, or similar methods, allow the client to submit:

```text
I've already paid
```

Fields:

```text
Amount
Payment Method
Reference Number
Payment Date
Optional Receipt Upload
Optional Message
```

The submission creates a pending payment confirmation.

Owner sees:

```text
PAYMENT INBOX

ABC Dental
₱15,000
GCash
Reference: XXXXX
Receipt uploaded

[Confirm Payment]
[Reject]
```

A client-submitted confirmation must NOT automatically mark an invoice paid unless a trusted payment gateway confirms the transaction.

---

# 22. Payment Receipt

After payment is recorded:

Allow:

```text
Download Receipt
Email Receipt
```

Receipt should include:

- Receipt number
- Business details
- Client
- Invoice number
- Payment date
- Payment method
- Reference
- Amount
- Remaining balance

---

# 23. Payment Follow-Up Engine

This is a flagship feature.

The system must support structured follow-up sequences instead of only one-off reminders.

## Manual Follow-Up

From invoice:

```text
Follow Up
```

Allow user to choose:

```text
Friendly
Professional
Firm
Custom
```

## Automatic Follow-Up Sequence

Example:

```text
3 days before due
Friendly heads-up

On due date
Due today reminder

3 days overdue
Professional reminder

7 days overdue
Second follow-up

14 days overdue
Firm follow-up
```

Users must be able to enable/disable individual stages.

## Smart Rules

Support logic such as:

```text
IF invoice has never been viewed
→ resend invoice / delivery-focused message

IF invoice has been viewed but unpaid
→ payment reminder

IF active payment promise exists
→ pause follow-up until promised date passes

IF invoice is partially paid
→ mention remaining balance only

IF invoice is paid
→ stop all reminders immediately

IF invoice is void
→ stop all reminders
```

## Tone Progression

Users may configure:

```text
Friendly
→ Friendly
→ Professional
→ Firm
```

Message templates must be editable.

## AI-Assisted Message Drafting — Optional Later

AI may help rewrite reminders:

```text
Friendlier
Shorter
More professional
More firm
```

AI must never send a message automatically without the user's configured automation or explicit confirmation.

Prevent excessive or duplicate reminders.

Store complete reminder/follow-up history.

---


# 23.1 Deposit Billing

Support invoices or payment schedules that require an upfront deposit.

Example:

```text
Project Total: ₱50,000

Deposit Required:
50%

Deposit:
₱25,000

Remaining:
₱25,000
```

The MVP may implement deposit billing as either:

- a dedicated deposit invoice
- or a payment schedule tied to one project/invoice

Choose the simpler architecture while preserving a path to milestone billing.

---

# 23.2 Milestone Billing

Post-MVP but architecturally planned.

Example:

```text
Website Project
₱60,000

1. Deposit
₱20,000
PAID

2. Design Approval
₱20,000
DUE

3. Launch
₱20,000
LOCKED
```

Each milestone should support:

- Amount
- Due trigger/date
- Status
- Invoice generation
- Payment tracking

---

# 23.3 Deliverables Linked to Payment

Post-MVP optional differentiator.

Allow selected project files or links to be attached to an invoice.

Possible rule:

```text
Unlock deliverable after invoice is fully paid.
```

Example:

```text
website-final.zip
brand-assets.zip

Status:
Locked until payment
```

Requirements:

- User chooses whether a deliverable is gated.
- Deliverables must never be publicly guessable.
- Access must use secure expiring URLs or authenticated links.
- Owner may manually unlock at any time.
- This feature must never hold legally required documents hostage.

---

# 24. Expenses Module

Keep expenses simple.

Fields:

```text
Date
Category
Vendor
Description
Amount
Payment Method
Receipt Attachment
Notes
```

Default categories:

```text
Software
Utilities
Transportation
Marketing
Office
Equipment
Professional Services
Other
```

Users should be able to create custom categories.

---

# 25. Reports

## Revenue Summary

Display:

- Total invoiced
- Total received
- Outstanding
- Overdue
- Expenses
- Net cash flow estimate

Formula:

```text
Net Cash Flow =
Payments Received - Recorded Expenses
```

Clearly label this as cash-flow style reporting, not formal profit accounting.

## Invoice Aging

Buckets:

```text
Current
1–30 Days Overdue
31–60 Days
61–90 Days
90+ Days
```

## Client Revenue

Show revenue grouped by client.

## Payment Method Breakdown

Show:

```text
Bank
GCash
Cash
Card
etc.
```

## Export

Allow:

- CSV
- PDF when appropriate

---

# 26. Search

Global search may search:

- Invoice number
- Client
- Email
- Payment reference

Example:

```text
Search "ABC"

ABC Company
INV-1042 — ABC Company
INV-1048 — ABC Company
```

---

# 27. Filters

Invoice filters:

```text
Status
Client
Issue Date
Due Date
Amount
Currency
```

Payment filters:

```text
Client
Invoice
Payment Method
Date Range
```

Expense filters:

```text
Category
Date
Vendor
```

---

# 28. Notifications

In-app notifications:

- Invoice overdue
- Payment recorded
- Reminder sent
- Subscription issue
- Export completed

Optional browser notifications for PWA users.

Users must explicitly grant browser notification permission.

Never request notification permission immediately on first page load.

---

# 29. Progressive Web App Requirements

The application must be installable.

Include:

- Web App Manifest
- App icons
- Theme metadata
- Service Worker
- Install support
- Responsive layouts
- Offline fallback page

## Offline Support

Do NOT attempt full offline accounting synchronization in MVP.

Allow safe cached access to:

- Application shell
- Previously viewed non-sensitive UI resources where appropriate

Do not cache sensitive invoice/client API responses indiscriminately.

If offline:

```text
You are currently offline.
Some features are unavailable.
```

---

# 30. Subscription / SaaS Billing

Design subscription infrastructure even if billing is enabled later.

Plans example:

## Free

- 3 clients
- 5 invoices/month
- Basic PDF
- Manual payment tracking

## Starter

Example:

```text
₱199/month
```

- 50 clients
- Unlimited invoices
- Expense tracking
- Reports
- Custom branding
- Reminder emails

## Pro

Example:

```text
₱499/month
```

- Unlimited clients
- Unlimited invoices
- Advanced reports
- Team members
- Automated reminders
- Data export
- Priority support

Pricing must be configurable rather than scattered through frontend code.

---

# 31. Subscription Data Model

Store:

```text
Workspace
Plan
Subscription Status
Provider Customer ID
Provider Subscription ID
Billing Period Start
Billing Period End
Trial End
Cancel At Period End
```

Subscription statuses:

```text
TRIALING
ACTIVE
PAST_DUE
CANCELED
INCOMPLETE
```

Use payment provider webhooks as authoritative billing events.

Never trust client-side billing status.

---

# 32. Possible Payment Providers

Architecture should allow integration with:

- Stripe
- PayMongo
- Maya
- Other payment gateways

Use an adapter/service interface.

Example:

```text
BillingProvider

createCustomer()
createCheckoutSession()
cancelSubscription()
handleWebhook()
getSubscription()
```

This makes provider replacement easier.

---

# 33. Database Design

Recommended entities.

```text
User
Workspace
WorkspaceMember
BusinessProfile
Client
ProductService
Invoice
InvoiceItem
Payment
Expense
ExpenseCategory
PaymentInstruction
InvoiceReminder
InvoiceEvent
PaymentPromise
PaymentConfirmation
Deliverable
Notification
AuditLog
Subscription
FileAsset
ApiKey
```

---

# 34. Suggested Database Schema

## User

```text
id
name
email
emailVerifiedAt
passwordHash
createdAt
updatedAt
```

## Workspace

```text
id
name
slug
ownerId
defaultCurrency
timezone
invoicePrefix
nextInvoiceNumber
createdAt
updatedAt
```

## WorkspaceMember

```text
id
workspaceId
userId
role
createdAt
```

Unique:

```text
workspaceId + userId
```

## BusinessProfile

```text
id
workspaceId
legalName
displayName
email
phone
website
addressLine1
addressLine2
city
provinceState
postalCode
country
taxId
logoAssetId
brandColor
defaultTaxLabel
defaultTaxRate
defaultPaymentTermsDays
defaultNotes
invoiceFooter
createdAt
updatedAt
```

## Client

```text
id
workspaceId
name
company
email
phone
billingAddress
country
taxId
currency
notes
archivedAt
createdAt
updatedAt
```

## ProductService

```text
id
workspaceId
name
description
unit
price
taxable
active
createdAt
updatedAt
```

## Invoice

```text
id
workspaceId
clientId
invoiceNumber
issueDate
dueDate
currency
status
subtotal
discountTotal
taxTotal
total
amountPaid
balanceDue
notes
terms
sentAt
viewedAt
paidAt
voidedAt
publicTokenHash
createdBy
createdAt
updatedAt
```

Unique:

```text
workspaceId + invoiceNumber
```

## InvoiceItem

```text
id
invoiceId
description
quantity
unitPrice
discountType
discountValue
taxRate
subtotal
discountAmount
taxAmount
lineTotal
sortOrder
createdAt
```

## Payment

```text
id
workspaceId
invoiceId
amount
paymentDate
paymentMethod
referenceNumber
notes
createdBy
createdAt
updatedAt
deletedAt
```

## Expense

```text
id
workspaceId
categoryId
expenseDate
vendor
description
amount
paymentMethod
receiptAssetId
notes
createdBy
createdAt
updatedAt
deletedAt
```

## ExpenseCategory

```text
id
workspaceId
name
createdAt
```

## InvoiceReminder

```text
id
workspaceId
invoiceId
type
scheduledFor
sentAt
status
createdAt
```


## InvoiceEvent

```text
id
workspaceId
invoiceId
type
metadataJson
createdAt
```

Possible types:

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

## PaymentPromise

```text
id
workspaceId
invoiceId
promisedPaymentDate
message
status
createdAt
updatedAt
```

## PaymentConfirmation

```text
id
workspaceId
invoiceId
amount
paymentMethod
referenceNumber
paymentDate
receiptAssetId
message
status
reviewedBy
reviewedAt
createdAt
```

Statuses:

```text
PENDING
CONFIRMED
REJECTED
```

## Deliverable

```text
id
workspaceId
invoiceId
name
assetId
externalUrl
unlockRule
unlockedAt
createdAt
```

## AuditLog

```text
id
workspaceId
userId
entityType
entityId
action
metadataJson
ipAddress
userAgent
createdAt
```

## Notification

```text
id
userId
workspaceId
type
title
message
readAt
createdAt
```

## Subscription

```text
id
workspaceId
provider
providerCustomerId
providerSubscriptionId
plan
status
periodStart
periodEnd
trialEndsAt
cancelAtPeriodEnd
createdAt
updatedAt
```

---

# 35. Money Storage

Use decimal database types.

Example:

```text
DECIMAL(19,4)
```

Application money calculations should use a decimal library.

Never use binary floating point for totals.

Every financial record must explicitly store currency.

---

# 36. Currency Support

Initial supported examples:

```text
PHP
USD
EUR
GBP
AUD
CAD
SGD
JPY
```

Do not hard-code formatting.

Use international currency formatting.

Example:

```text
PHP → ₱12,500.00
USD → $1,250.00
```

Do not automatically convert currencies in MVP.

---

# 37. Date and Time Handling

Store timestamps in UTC.

Store workspace time zone.

Render date/time using the workspace time zone.

Invoice issue/due dates should use date-only values where appropriate to avoid timezone errors.

---

# 38. API Design

Use predictable resource-based endpoints.

Example:

```text
/api/auth/*
/api/workspaces
/api/workspaces/:workspaceId
/api/clients
/api/clients/:id
/api/products
/api/products/:id
/api/invoices
/api/invoices/:id
/api/invoices/:id/send
/api/invoices/:id/void
/api/invoices/:id/remind
/api/invoices/:id/pdf
/api/invoices/:id/payments
/api/payments/:id
/api/expenses
/api/expenses/:id
/api/reports/revenue
/api/reports/aging
/api/reports/clients
/api/settings/business
/api/settings/invoice
/api/settings/payments
/api/subscription
/api/webhooks/billing
```

If using server actions, maintain equivalent service-layer boundaries.

---

# 39. Service Layer

Business logic must not live directly inside UI components.

Create services such as:

```text
AuthService
WorkspaceService
ClientService
InvoiceService
InvoiceCalculationService
PaymentService
ExpenseService
ReportService
PdfService
EmailService
ReminderService
StorageService
BillingService
AuditService
NotificationService
```

---

# 40. Invoice Calculation Service

Create a single authoritative calculation module.

Input:

```text
items
invoice discount
tax configuration
payments
```

Output:

```text
subtotal
discount
tax
total
amountPaid
balanceDue
```

Both API validation and tests must use this module.

Do not duplicate financial formulas across components.

---

# 41. Authorization

Every protected request must check:

```text
authenticated user
AND
workspace membership
AND
required role
```

Never authorize merely because:

```text
resourceId exists
```

Verify:

```text
resource.workspaceId == activeWorkspaceId
```

This applies to:

- Clients
- Invoices
- Payments
- Expenses
- Files
- Reports
- Settings

---

# 42. Security Requirements

Implement:

- Password hashing using Argon2id or secure equivalent
- CSRF protection where required
- Secure HttpOnly cookies
- SameSite cookie policy
- HTTPS production only
- Rate limiting
- Input validation
- Server-side authorization
- SQL injection prevention through ORM
- XSS-safe rendering
- Output encoding
- Secure headers
- Content Security Policy
- File upload validation
- MIME validation
- File size limits
- Signed/private storage URLs
- Audit logs
- Secret management through environment variables
- No secrets committed to repository

---

# 43. File Upload Security

Allowed images:

```text
JPEG
PNG
WebP
```

Optional receipts:

```text
PDF
JPEG
PNG
WebP
```

Validate:

- File extension
- MIME
- Actual file content where possible
- Maximum size

Do not trust browser-provided MIME values alone.

Generate random object keys.

---

# 44. Data Privacy

Provide:

- Privacy Policy
- Terms of Service
- Data deletion workflow
- Account deletion
- Export personal/business data
- Retention policy

For Philippine deployment, design with the principles of the Philippine Data Privacy Act in mind.

Do not claim automatic legal compliance merely because these controls exist.

---

# 45. Account Deletion

When user requests account deletion:

1. Confirm ownership
2. Require recent authentication
3. Warn about consequences
4. Schedule deletion or perform according to retention policy
5. Cancel subscription if necessary
6. Delete/anonymize data according to policy
7. Write final audit record where legally/technically appropriate

---

# 46. Backups

Production database must use automated backups.

Recommended:

- Daily automated backup
- Point-in-time recovery if supported
- Document recovery procedure
- Periodic restore testing

Object storage should use versioning/lifecycle policy where practical.

---

# 47. Error Handling

Never expose raw stack traces in production.

API errors should have structure:

```json
{
  "error": {
    "code": "INVOICE_NOT_FOUND",
    "message": "Invoice could not be found."
  }
}
```

Log internal details separately.

---

# 48. Logging

Use structured logging.

Include:

- Request ID
- User ID when available
- Workspace ID
- Action
- Result
- Duration

Never log:

- Passwords
- Authentication tokens
- Full payment credentials
- Sensitive secrets

---

# 49. Observability

Production should include:

- Error monitoring
- Uptime monitoring
- API latency metrics
- Database performance monitoring
- Failed email monitoring
- Billing webhook monitoring

---

# 50. UI Layout

Desktop navigation:

```text
Dashboard
Get Paid
Clients
Invoices
Payment Inbox
Payments
Expenses
Reports
Products / Services
Notifications
Settings
```

Settings:

```text
Business
Invoice Settings
Payment Methods
Branding
Team
Subscription
Security
Data & Export
```

Mobile navigation should use:

- Bottom navigation for primary pages
OR
- Compact drawer/navigation

Avoid clutter.

---

# 51. Design Language

Design should be:

- Clean
- Minimal
- Professional
- Modern
- Trustworthy
- High contrast
- Accessible

Avoid excessive gradients and decorative effects.

Recommended page container:

```text
Sidebar
Topbar

Page Header
Primary Action

Summary / Filters

Main Content
```

---

# 52. Accessibility

Target WCAG 2.1 AA practices.

Include:

- Semantic HTML
- Keyboard navigation
- Visible focus states
- Proper labels
- ARIA only where necessary
- Color contrast
- Screen-reader-friendly dialogs
- Error announcements
- Form validation messages

---

# 53. Responsive Breakpoints

Test at minimum:

```text
360px mobile
390px mobile
768px tablet
1024px laptop
1440px desktop
```

Avoid horizontal scrolling except intentional data-table behavior.

---

# 54. Tables

Invoices table:

```text
Invoice #
Client
Issue Date
Due Date
Total
Balance
Status
Actions
```

Mobile cards may replace wide tables.

---

# 55. Empty States

Every module needs an intentional empty state.

Example:

```text
No invoices yet.

Create your first invoice and start tracking payments.

[Create Invoice]
```

---

# 56. Loading States

Use:

- Skeleton loading
- Disabled submit buttons during mutation
- Clear save indicators

Avoid blocking the entire app unnecessarily.

---

# 57. Toasts

Examples:

```text
Invoice saved.
Invoice sent successfully.
Payment recorded.
Client updated.
```

Errors:

```text
Invoice could not be sent.
Please try again.
```

---

# 58. Confirmation Dialogs

Require confirmation for:

- Void invoice
- Delete payment
- Archive client
- Delete expense
- Remove team member
- Delete workspace

Use specific wording.

Bad:

```text
Are you sure?
```

Better:

```text
Void invoice INV-1042?

This invoice will remain in your records but can no longer accept payments.
```

---

# 59. Email Templates

Required:

## Verify Email

## Password Reset

## Invoice Sent

Subject example:

```text
Invoice INV-1042 from {{businessName}}
```

## Payment Reminder

```text
Payment reminder: Invoice INV-1042
```

## Payment Receipt

```text
Payment received for INV-1042
```

## Subscription Notifications

Emails must be responsive and branded conservatively.

---

# 60. PDF Invoice Layout

Structure:

```text
[Logo]

BUSINESS NAME

INVOICE

Invoice #: INV-1042
Issue Date:
Due Date:

Bill To:
Client Name
Company
Address
Email

------------------------------------------------
Description     Qty     Rate      Tax     Amount
------------------------------------------------

Subtotal
Discount
Tax
TOTAL
Paid
BALANCE DUE

Payment Instructions

Notes

Terms

Footer
```

PDF must be deterministic and printable.

---

# 61. Invoice Snapshots

Once an invoice is sent, historical accuracy matters.

Do not rely only on mutable client/business fields when generating old invoice PDFs.

Store sufficient invoice snapshot information or versioned data such as:

```text
business name at issue time
business address
client name
client address
tax details
payment instructions
```

Editing a client later must not silently alter previously issued historical invoices.

---

# 62. Audit Log Events

Track events:

```text
USER_LOGIN
CLIENT_CREATED
CLIENT_UPDATED
CLIENT_ARCHIVED
INVOICE_CREATED
INVOICE_UPDATED
INVOICE_SENT
INVOICE_VIEWED
INVOICE_VOIDED
PAYMENT_CREATED
PAYMENT_UPDATED
PAYMENT_DELETED
EXPENSE_CREATED
EXPENSE_UPDATED
EXPENSE_DELETED
SETTINGS_CHANGED
SUBSCRIPTION_CHANGED
DATA_EXPORTED
```

---

# 63. Background Jobs

Use a background job system for:

- Sending emails
- Automatic reminders
- PDF generation if slow
- Scheduled invoice checks
- Exports
- Cleanup jobs

Do not make the user wait for long-running operations if they can safely be queued.

Potential technologies:

- Managed queue
- Redis-backed queue
- Scheduled platform jobs

---

# 64. Scheduled Jobs

Run periodic tasks:

## Daily

- Detect upcoming invoice reminders
- Send due reminders
- Send overdue reminders
- Update notification state
- Clean expired tokens

## Periodic

- Cleanup abandoned file uploads
- Verify billing synchronization
- Generate operational metrics

Scheduled jobs must be idempotent.

---

# 65. Idempotency

Important actions should support idempotency.

Especially:

- Billing webhooks
- Payment gateway callbacks
- Email reminder jobs
- Invoice sending
- Payment creation from integrations

Prevent duplicate processing.

---

# 66. Testing Strategy

Required test layers:

## Unit Tests

Test:

- Invoice math
- Tax calculation
- Discounts
- Partial payments
- Currency handling
- Due date calculations
- Permissions
- Invoice numbering

## Integration Tests

Test:

- Create client
- Create invoice
- Add items
- Record payment
- Generate report
- Send invoice
- Reminder processing

## End-to-End Tests

Use Playwright or equivalent.

Critical E2E paths:

```text
Register
→ Complete onboarding
→ Add client
→ Create invoice
→ Send invoice
→ Record partial payment
→ Record remaining payment
→ Invoice becomes paid
```

---

# 67. Critical Financial Test Cases

## Case 1

```text
Quantity: 2
Rate: ₱500

Expected:
₱1,000
```

## Case 2

```text
Subtotal: ₱1,000
Discount: 10%

Expected:
₱900 before tax
```

## Case 3

```text
Taxable: ₱1,000
Tax: 12%

Expected tax:
₱120
```

## Case 4

```text
Invoice: ₱10,000
Payment: ₱4,000

Balance:
₱6,000

Status:
PARTIALLY_PAID
```

## Case 5

```text
Invoice: ₱10,000
Payments total: ₱10,000

Balance:
₱0

Status:
PAID
```

---

# 68. Authorization Test Cases

Must test:

```text
User A cannot access User B's client.
User A cannot access User B's invoice.
User A cannot modify User B's payment.
User A cannot download User B's private file.
Staff cannot modify subscription.
Archived workspace membership does not authorize access.
```

Treat cross-tenant access failures as security-critical.

---

# 69. Performance Targets

Aim for:

```text
Dashboard initial response:
< 2 seconds under normal conditions

Typical API:
< 500ms target where practical

Invoice list:
Paginated

Client list:
Paginated

Reports:
Indexed queries
```

Do not load entire transaction history into the browser.

---

# 70. Pagination

Use server-side pagination.

Default:

```text
25 records
```

Options:

```text
25
50
100
```

Prefer cursor pagination for high-volume datasets where appropriate.

---

# 71. Database Indexes

At minimum consider indexes for:

```text
workspaceId
workspaceId + createdAt
workspaceId + status
workspaceId + clientId
workspaceId + invoiceNumber
invoiceId
dueDate
paymentDate
expenseDate
email
publicTokenHash
```

Review execution plans for report queries.

---

# 72. Soft Deletion

Use soft deletion where historical transactions matter.

Examples:

- Clients
- Payments
- Expenses

Invoices should generally be voided rather than deleted once sent.

Draft invoices may be deletable.

---

# 73. Invoice Lifecycle Rules

## Draft

Can be edited freely.

## Sent

Can be edited only with clear user warning.

Prefer preserving historical snapshot.

## Partially Paid

Cannot be casually deleted.

## Paid

Cannot be deleted.

Can be voided/refunded only when such workflows are implemented.

## Void

Read-only financial record.

---

# 74. Analytics

Track product analytics without storing sensitive invoice contents.

Useful events:

```text
signup_completed
onboarding_completed
client_created
invoice_created
invoice_sent
payment_recorded
expense_created
report_viewed
pwa_installed
subscription_started
subscription_canceled
```

Avoid sending:

- Client names
- Invoice descriptions
- Emails
- Payment references

to analytics services.

---

# 75. Feature Flags

Create a simple feature flag mechanism.

Potential flags:

```text
team_members
automatic_reminders
online_payments
recurring_invoices
multi_currency
expense_receipts
ai_features
```

---

# 76. Future Features — Do Not Build in MVP Unless Core Is Complete

## Recurring Invoices

Example:

```text
Website Maintenance
₱2,000
Every Month
```

## Estimates / Quotations

Convert estimate to invoice.

## Online Payments

Client pays from invoice page.

## Client Portal

Clients view:

- Invoices
- Payments
- Receipts

## Team Members

Workspace invitations.

## Multi-Business Support

User switches workspaces.

## Bank Import

Import transactions.

## API

Developer API.

## Webhooks

Events:

```text
invoice.created
invoice.sent
invoice.paid
payment.created
```

## Multi-Language

Internationalization.

---

# 77. Possible AI Features — Later Only

Do NOT make AI necessary for core invoicing.

Potential optional features:

- Generate professional invoice descriptions
- Categorize expenses
- Draft reminder messages
- Summarize monthly financial activity
- Detect unusual unpaid invoice patterns

Every AI-generated output must be reviewable before sending externally.

---

# 78. Repository Structure

Suggested:

```text
src/
  app/
  components/
  features/
    auth/
    dashboard/
    clients/
    products/
    invoices/
    payments/
    expenses/
    reports/
    settings/
    subscription/
  lib/
    auth/
    db/
    email/
    pdf/
    storage/
    billing/
    validation/
    money/
  services/
  repositories/
  jobs/
  types/
  hooks/
  styles/
  tests/

prisma/
  schema.prisma
  migrations/
  seed.ts

public/
  icons/
  manifest.webmanifest

docs/
  architecture.md
  api.md
  security.md
```

---

# 79. Environment Variables

Example:

```text
DATABASE_URL=
AUTH_SECRET=

APP_URL=

EMAIL_PROVIDER_API_KEY=
EMAIL_FROM=

STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=

BILLING_SECRET_KEY=
BILLING_WEBHOOK_SECRET=

SENTRY_DSN=
```

Provide:

```text
.env.example
```

Never include real secrets.

---

# 80. Seed Data

Create development seed data:

```text
Demo User

Demo Workspace

3 Clients

5 Products/Services

10 Invoices

Invoice states:
- Draft
- Sent
- Partially Paid
- Paid
- Overdue

Payments

Expenses
```

This helps AI/developers test UI quickly.

---

# 81. Local Development

README must include:

```text
Prerequisites
Environment setup
Database setup
Migration
Seed
Run development server
Run tests
Build production
```

Target workflow:

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run seed
npm run dev
```

Commands may vary based on final implementation.

---

# 82. CI/CD

Configure continuous integration.

On pull request:

```text
Install
Lint
Typecheck
Unit tests
Integration tests
Build
```

Main branch:

```text
Deploy staging
Run migrations safely
Run smoke tests
Deploy production
```

Never automatically run destructive migrations without review.

---

# 83. Migration Rules

Database migrations must:

- Be version controlled
- Be reversible when practical
- Avoid destructive schema changes without migration strategy
- Preserve invoice/payment records
- Be tested against realistic data

---

# 84. Production Environments

Use:

```text
Development
Staging
Production
```

Never test billing webhooks or migrations for the first time against production.

---

# 85. SEO / Public Marketing Site

Create public pages:

```text
/
Pricing
Features
FAQ
Login
Register
Privacy
Terms
```

Authenticated application:

```text
/app/*
```

Public invoice:

```text
/i/:token
```

Marketing pages should have metadata and Open Graph tags.

Do not expose private app content to search indexing.

---

# 86. Landing Page Structure

Suggested:

```text
Hero
Benefits
How It Works
Features
Invoice Preview
Pricing
FAQ
CTA
Footer
```

Hero concept:

```text
Simple invoicing.
Clear payment tracking.

Create professional invoices, track what clients owe,
and know exactly when you get paid.

[Start Free]
```

---

# 87. MVP Definition

The first production-capable MVP must prove the product's core differentiator:

> **Send an invoice, understand what happened to it, follow up intelligently, and track the path to payment.**

## Required

- Authentication
- Email verification
- Password reset
- Business onboarding
- Business settings
- Clients
- Client payment-history metrics
- Products/services
- Invoice creation
- Invoice editing
- Invoice PDF
- Invoice email sending
- Public invoice page
- Invoice view tracking
- Invoice activity timeline
- Manual payment tracking
- Partial payments
- Client payment commitment
- Client-submitted payment confirmation
- Payment Inbox
- Payment receipts
- Manual follow-up
- Configurable follow-up sequence
- Smart reminder suppression after payment promise/payment
- Action-oriented Dashboard
- Get Paid screen
- Basic reports
- PWA installation
- Responsive UI
- Audit logs
- Secure authorization
- Tests
- Deployment
- Backup configuration
- Error monitoring

## Secondary / Can Follow Immediately After MVP

- Expenses
- Subscription billing
- Deposit billing
- Automated follow-up scheduling
- Team members
- Recurring invoices
- Estimates
- Online payments
- Client portal
- Milestone billing
- Deliverable unlock
- AI-assisted reminder drafting

---

# 88. Development Phases

## Phase 1 — Foundation

Build:

- Project initialization
- TypeScript configuration
- UI system
- Database
- Prisma
- Authentication
- Workspace model
- Authorization middleware
- Logging
- Validation
- Environment configuration

Acceptance:

```text
User can register, verify email, login, logout.
Every user owns a workspace.
Cross-workspace access is blocked.
```

---

## Phase 2 — Business Onboarding

> Status (2026-09-20): implemented locally with transactional persistence, server validation, editable settings, responsive browser coverage, and authorization tests. Hosted production services and launch gates remain outstanding.

Build:

- Business setup
- Branding
- Currency
- Invoice defaults
- Payment instructions

Acceptance:

```text
New user completes onboarding and reaches dashboard.
```

---

## Phase 3 — Clients

> Status (2026-09-20): implemented locally with role-checked tenant isolation, create/edit/profile/search/pagination, reversible archive, optimistic concurrency, audit coverage, and responsive desktop/mobile browser acceptance. Public deployment and launch gates remain outstanding.

Build:

- Client list
- Create
- Edit
- Archive
- Client profile
- Search

Acceptance:

```text
User can manage clients from desktop and mobile.
```

---

## Phase 4 — Products / Services

> Status (2026-09-21): implemented locally with exact decimal prices, units, tax defaults, tenant/role enforcement, create/edit/search/pagination, reversible archive, concurrency checks, audits, and responsive browser acceptance. Public deployment and launch gates remain outstanding.

Build:

- Product/service list
- Create
- Edit
- Archive

Acceptance:

```text
Saved items can later be inserted into invoices.
```

---

## Phase 5 — Invoice Engine

> Status (2026-09-21): implemented locally with authoritative decimal calculations, documented currency rounding, reconciled stored lines/totals, serializable number allocation, database uniqueness/composite tenant constraints, draft create/edit/search/preview, concurrency tests, audits, and responsive browser acceptance. Sending and issued snapshots remain Phase 6.

Build:

- Invoice model
- Invoice items
- Calculation service
- Number generation
- Draft invoices
- Edit invoices
- Preview
- Status handling

Acceptance:

```text
Invoice totals are calculated accurately.
Duplicate invoice numbers cannot occur.
```

---

## Phase 6 — PDF + Send + Activity Tracking — completed locally

> Status (2026-09-21): implemented locally with immutable issue snapshots, deterministic inspected PDFs, PDF email attachments, delivery attempt records, hashed expiring public capabilities, public read/PDF routes, rotation/revocation, and truthful activity events. Hosted provider webhooks and public deployment gates remain outstanding.

Build:

- PDF generation
- Email service
- Public invoice token
- Public invoice page
- Send invoice workflow
- Invoice activity timeline
- Public invoice view event
- Delivery event integration when provider supports it

Acceptance:

```text
Client receives invoice email.
PDF matches invoice.
Public link works securely.
Invoice owner can see sent/viewed activity truthfully.
```

---

## Phase 7 — Payments + Payment Inbox — completed locally

Build:

- Record payment
- Partial payments
- Balance updates
- Receipt generation
- Payment history
- Payment promise
- Client-submitted payment confirmation
- Payment Inbox
- Confirm/reject payment confirmation

Acceptance:

```text
Invoice automatically changes between
SENT → PARTIALLY_PAID → PAID.

A client can submit an external-payment confirmation
without automatically changing the financial record.

The owner can review and confirm it.
```

---

## Phase 8 — Payment Intelligence Dashboard — completed locally

Build:

- Outstanding balance
- Overdue balance
- Needs Attention queue
- Get Paid screen
- Payment promise queue
- Client payment behavior metrics
- Recent activity
- Revenue chart

Acceptance:

```text
Dashboard values match database records.

User can immediately identify which invoices
need attention and why.
```

---


## Phase 9 — Follow-Up Engine

Build:

- Manual follow-up
- Reminder templates
- Tone selection
- Follow-up history
- Configurable follow-up sequence
- Smart reminder conditions
- Payment-promise suppression
- Partial-payment-aware reminders

Acceptance:

```text
User can configure and send a follow-up sequence.

Paid, void, or actively promised invoices
do not receive incorrect automated reminders.

Every reminder is recorded in invoice activity.
```

---

## Phase 10 — Expenses + Reports

Build:

- Expense management
- Expense categories
- Revenue report
- Aging report
- Client revenue report
- CSV export

Acceptance:

```text
Reports reconcile with invoice/payment data.
```

---

## Phase 11 — PWA

Build:

- Manifest
- Icons
- Service worker
- Install UX
- Offline page
- Safe caching

Acceptance:

```text
Application is installable on supported browsers.
Core online behavior remains correct after installation.
```

---

## Phase 12 — Production Hardening

> Status (2026-09-23): locally implemented and verified with authorization invariants, persisted public submission throttling, CSP and cross-origin headers, redacted error-monitor integration, health probes, backup/restore tooling, performance smoke, accessibility checks and the full end-to-end suite. Hosted HTTPS, managed backup restore, alert delivery and independent review remain launch gates.

Perform:

- Authorization review
- Rate limiting
- CSP
- Dependency audit
- Error monitoring
- Structured logs
- Backups
- Performance testing
- Accessibility testing
- E2E testing

---

## Phase 13 — SaaS Billing

Only after the core product is stable.

Build:

- Plans
- Checkout
- Subscription portal
- Webhooks
- Feature limits
- Plan enforcement

---

# 89. AI Coding Model Instructions

The coding AI must follow these rules.

## Rule 1

Do not attempt the entire application in one giant generation.

Implement phase by phase.

## Rule 2

Before each phase:

1. Inspect existing repository
2. Read schema
3. Read relevant services
4. Identify dependencies
5. Produce implementation plan
6. Implement
7. Test
8. Fix failures
9. Update documentation

## Rule 3

Never replace working modules unnecessarily.

Prefer incremental modifications.

## Rule 4

Do not fabricate APIs from libraries.

Check installed package APIs and existing code patterns.

## Rule 5

All new TypeScript must pass strict type checking.

Do not use:

```text
any
```

unless unavoidable and documented.

## Rule 6

Every mutation must validate server-side input.

Frontend validation is not sufficient.

## Rule 7

Every workspace resource query must include workspace authorization.

## Rule 8

Every financial calculation must be tested.

## Rule 9

Run tests after meaningful changes.

## Rule 10

Do not mark a phase complete until acceptance criteria pass.

---

# 90. AI Implementation Workflow

For every task, the AI should use:

```text
UNDERSTAND
↓
INSPECT
↓
PLAN
↓
IMPLEMENT
↓
TEST
↓
REVIEW
↓
DOCUMENT
```

At the end of a phase, output:

```text
Completed:
- ...

Database changes:
- ...

API changes:
- ...

UI changes:
- ...

Tests added:
- ...

Known limitations:
- ...

Next phase:
- ...
```

---

# 91. Definition of Done

A feature is complete only when:

- UI exists
- Server implementation exists
- Validation exists
- Authorization exists
- Loading state exists
- Error state exists
- Empty state exists where applicable
- Mobile layout works
- Tests pass
- Accessibility is reasonable
- No TypeScript errors
- No obvious security issue
- Documentation is updated

---

# 92. MVP User Journey

The following journey must work perfectly.

```text
Visitor
↓
Register
↓
Verify Email
↓
Business Setup
↓
Dashboard
↓
Add Client
↓
Create Invoice
↓
Preview Invoice
↓
Send Invoice
↓
Invoice Activity Shows Sent
↓
Client Opens Invoice
↓
Activity Shows Viewed
↓
Client Promises Payment OR Submits Payment Confirmation
↓
Owner Reviews Payment Inbox
↓
Owner Records/Confirms Partial or Full Payment
↓
Remaining Balance Updates
↓
Follow-Up Engine Adjusts Automatically
↓
Receipt Generated
↓
Dashboard / Get Paid Queue Updates
```

---

# 93. Example Scenario

Business:

```text
Clint Web Solutions
```

Client:

```text
ABC Dental Clinic
```

Invoice:

```text
INV-1001

Business Website Development
1 × ₱20,000

Hosting
1 × ₱2,000

Subtotal: ₱22,000
Total:    ₱22,000
```

Payment 1:

```text
GCash
₱10,000

Balance:
₱12,000
```

Status:

```text
PARTIALLY_PAID
```

Payment 2:

```text
Bank Transfer
₱12,000

Balance:
₱0
```

Status:

```text
PAID
```

Receipt generated.

Dashboard:

```text
Revenue:
+ ₱22,000

Outstanding:
- ₱22,000
```

---

# 94. Launch Checklist

Before production launch verify:

## Product

- Registration works
- Login works
- Password reset works
- Invoice creation works
- PDF works
- Email works
- Payment tracking works
- Reports reconcile
- PWA installs

## Security

- Tenant isolation tested
- Rate limits enabled
- Secure cookies enabled
- CSP enabled
- File restrictions enabled
- Secrets protected
- HTTPS active

## Reliability

- Database backup active
- Error tracking active
- Uptime monitor active
- Email failures monitored

## Legal

- Terms available
- Privacy policy available
- Account deletion available

## UX

- Mobile tested
- Empty states tested
- Error states tested
- Loading states tested
- Accessibility checked

---

# 95. Post-Launch Priorities

After the MVP has real users, prioritize based on actual behavior.

Likely candidates:

```text
1. Automatic payment reminders
2. Recurring invoices
3. Estimates / quotations
4. Client portal
5. Online payments
6. Team members
7. Better exports
8. Multi-business accounts
9. API integrations
10. AI assistance
```

Do NOT build them merely because they are listed.

Use user demand and usage analytics.

---

# 96. Product Success Metrics

Track:

```text
Signup → onboarding completion rate

Users creating first client

Users creating first invoice

Users sending first invoice

Invoices per active user

Payments recorded

Monthly active workspaces

Trial → paid conversion

Subscription churn

Average revenue per workspace
```

The most important activation milestone should be approximately:

```text
User sends first real invoice.
```

---

# 97. Non-Goals for Initial Release

Do not turn the MVP into:

- Full ERP
- Full accounting suite
- Payroll platform
- Inventory platform
- Banking platform
- Tax filing system
- CRM suite
- Project management suite

Focus:

> Create invoice → send → observe → follow up → confirm payment → get paid.

---

# 98. Final Product Requirement

The final product should feel simple enough that a freelancer can understand it without documentation.

The core product should immediately communicate:

```text
How much am I still owed?

Which invoices need attention today?

Has the client seen the invoice?

Did the client promise a payment date?

What should I follow up on next?
```

Every feature added should support one of these goals:

```text
Create
Send
Observe
Follow Up
Confirm
Get Paid
```

Do not dilute the product by expanding into unrelated accounting functionality before the payment-collection workflow is excellent.

---

# 99. Final Instruction to the Coding AI

Build this application as if it will hold real business and financial records.

Prioritize:

```text
Correctness
Security
Data isolation
Financial accuracy
Reliability
Usability
Maintainability
```

over unnecessary complexity or visual gimmicks.

Never sacrifice financial correctness for faster implementation.

Do not continue adding features until the current phase passes its tests and acceptance criteria.

Start with **Phase 1 — Foundation** and proceed sequentially.
