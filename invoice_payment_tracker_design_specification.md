# Invoice + Payment Collection SaaS — Design Specification

> Implementation clarification: see [specification review](docs/specification-review.md). Viewed/link-opened and Overdue are activity/due-date indicators displayed alongside the financial lifecycle, not mutually exclusive stored states. Only expose navigation and actions for implemented features.

## 1. Design Goal

The interface should feel:
- calm
- focused
- trustworthy
- professional
- modern
- lightweight

The app should not feel like enterprise accounting software.

The design must help the user answer:

```text
Who owes me?
What needs attention?
What happened to this invoice?
What should I do next?
```

---

# 2. Design Principles

## 2.1 Action Before Analytics

The first screen should prioritize actions over charts.

Priority:

```text
Needs Attention
Get Paid
Outstanding
Overdue
Payment Promises
```

Charts are secondary.

---

## 2.2 Reduce Cognitive Load

Do not overwhelm users with:
- dense accounting tables
- excessive filters
- too many finance terms
- large settings pages
- decorative UI

Prefer:
- clear status
- obvious next action
- concise labels
- progressive disclosure

---

## 2.3 Trust Through Clarity

Financial software must look dependable.

Use:
- strong spacing
- consistent alignment
- clean typography
- restrained color
- predictable controls
- clear timestamps
- visible status history

---

# 3. Visual Style

Overall:
- clean white/light surfaces
- subtle borders
- soft elevation
- minimal gradients
- medium corner radius
- strong typography hierarchy
- clear status chips

Avoid:
- glassmorphism-heavy UI
- neon effects
- excessive animation
- oversized decorative illustrations
- dashboard clutter

---

# 4. Color System

Do not hard-code colors directly in components.

Use semantic tokens.

Example token groups:

```text
background
surface
surface-muted
border
text-primary
text-secondary
text-muted
brand
brand-hover
success
warning
danger
info
```

Status meanings:

```text
Paid → success
Partially Paid → info
Due Soon → warning
Overdue → danger
Draft → neutral
Void → muted
```

Do not rely on color alone.

Each status also needs:
- text
- icon or chip
- accessible label

---

# 5. Typography

Use a modern sans-serif.

Recommended hierarchy:

```text
Display / Hero
Page Title
Section Heading
Card Heading
Body
Small
Caption
```

Suggested behavior:
- strong page titles
- compact dashboard labels
- large monetary amounts
- readable invoice detail text

Money values should use tabular numerals if available.

---

# 6. Spacing System

Use a consistent spacing scale.

Suggested:

```text
4
8
12
16
20
24
32
40
48
64
```

Avoid arbitrary spacing.

Cards:
- compact enough for business use
- never cramped

---

# 7. Border Radius

Suggested:

```text
Small: 6px
Medium: 10px
Large: 14px
```

Buttons:
- medium radius

Cards:
- medium/large radius

Avoid excessively pill-shaped general controls.

---

# 8. Shadows

Use shadows sparingly.

Recommended:
- cards mostly border-based
- floating overlays use subtle shadow
- menus/dialogs stronger than cards

Do not create excessive depth.

---

# 9. Layout

## Desktop

```text
┌─────────────┬─────────────────────────────┐
│ Sidebar     │ Topbar                      │
│             ├─────────────────────────────┤
│             │ Page Content                │
│             │                             │
│             │                             │
└─────────────┴─────────────────────────────┘
```

Sidebar width:
- approximately 240–280px

Content:
- max readable width
- fluid for tables

---

# 10. Main Navigation

Primary:

```text
Dashboard
Get Paid
Clients
Invoices
Payment Inbox
Payments
Reports
```

Secondary:

```text
Products / Services
Expenses
Notifications
Settings
```

The "Get Paid" item should be visually important but not gimmicky.

---

# 11. Mobile Navigation

Preferred:
- bottom navigation for top 4–5 destinations
- drawer for secondary items

Suggested bottom nav:

```text
Home
Get Paid
Invoices
Clients
More
```

Do not copy desktop sidebar directly into mobile.

---

# 12. Topbar

Desktop topbar may contain:
- active workspace
- global search
- notification icon
- profile menu
- quick create button

Quick Create:

```text
+ New
```

Menu:
- Invoice
- Client
- Payment
- Expense

---

# 13. Dashboard Design

## Header

```text
Good morning

Here's what needs attention today.
```

Avoid overly conversational or cheesy copy.

## Main KPI Row

Recommended:

```text
Outstanding
Overdue
Due This Week
Paid This Month
```

Cards should show:
- label
- amount
- small supporting context

Example:

```text
Outstanding

₱184,500

Across 12 invoices
```

---

# 14. Needs Attention Section

This should dominate the dashboard.

Example card:

```text
ABC Dental

INV-1042
₱35,000

12 days overdue

Last reminder:
4 days ago

[Follow Up]
[View]
```

Priority indicators:
- overdue
- due soon
- payment promise missed
- partial payment balance

Do not overload each card.

---

# 15. Get Paid Screen

Purpose:
- action queue
- unpaid money only

Header:

```text
Get Paid

₱184,500 outstanding
7 invoices need attention
```

Tabs:

```text
Needs Attention
Due Soon
Overdue
Promises
Partial
```

Invoice action rows/cards should show:
- client
- invoice number
- amount due
- due date
- status
- last action
- primary CTA

---

# 16. Invoice List

Desktop columns:

```text
Invoice
Client
Issue Date
Due Date
Total
Balance
Status
Actions
```

Filters:
- search
- status
- client
- date range

Primary CTA:

```text
New Invoice
```

On mobile:
- card list
- no wide horizontal table unless unavoidable

---

# 17. Invoice Detail Screen

Recommended structure:

```text
Header
Summary
Actions
Timeline
Invoice Preview
Payments
Follow-Ups
```

Header:

```text
INV-1042
ABC Dental

₱35,000
Overdue
```

Actions:
- Follow Up
- Record Payment
- Download PDF
- More

---

# 18. Invoice Timeline Design

Vertical timeline.

Example:

```text
● Invoice sent
  Sep 1, 10:17 AM

● Client viewed invoice
  Sep 1, 11:42 AM

● Reminder sent
  Sep 8, 9:00 AM

● Partial payment received
  ₱10,000
  Sep 12, 4:10 PM
```

Use icons by event type.

Avoid:
- giant cards for every event
- excessive color

---

# 19. Invoice Creation Design

Desktop:
- form left
- live preview right if space allows

Mobile:
- form first
- preview button

Sections:

```text
Client
Invoice Details
Items
Tax / Discount
Payment Instructions
Notes
```

Bottom action bar:
- Save Draft
- Preview
- Send

---

# 20. Line Item Design

Table fields:

```text
Description
Qty
Rate
Discount
Tax
Amount
```

Mobile:
- expandable item cards

Always show:
- subtotal
- discount
- tax
- total

---

# 21. Public Invoice Page

This page represents the freelancer's brand.

Structure:

```text
Business Logo
Business Name

INVOICE

Client
Invoice number
Issue date
Due date

Items

Total
Paid
Balance Due

Payment Methods

[I've Paid]
[I Will Pay On...]

Download PDF
```

Must be:
- simple
- fast
- trustworthy
- mobile-first

No unnecessary app navigation.

---

# 22. Payment Promise UI

Public invoice action:

```text
I Will Pay On...
```

Dialog:
- date picker
- optional note

Confirmation:

```text
Payment date saved.

The business has been notified.
```

Owner side:
- visible badge

```text
Promised: Sep 25
```

---

# 23. Payment Confirmation UI

Client form:

```text
Amount
Payment Method
Reference Number
Payment Date
Receipt Upload
Message
```

CTA:

```text
Submit Payment Confirmation
```

Owner Payment Inbox card:

```text
ABC Dental
INV-1042

₱15,000
GCash
Ref: 123456

[Confirm]
[Reject]
```

---

# 24. Payment Inbox

Use inbox-like structure.

Tabs:

```text
Pending
Confirmed
Rejected
```

Each row:
- client
- invoice
- amount
- method
- submitted time
- receipt indicator
- actions

Primary workflow:
- review
- confirm
- optionally edit confirmed payment details before final save

---

# 25. Clients Screen

Client list:
- name
- company
- outstanding balance
- invoice count
- average payment timing
- status

Client detail:

```text
Client Overview
Payment Behavior
Outstanding Invoices
Payment History
Timeline / Notes
```

---

# 26. Client Payment Behavior UI

Do not gamify aggressively.

Good:

```text
Average payment time
18 days

Average timing
4 days after due date

Paid invoices
12 / 14
```

Avoid:
- "bad payer"
- "risky client"
- arbitrary scores

Use factual wording.

---

# 27. Reports

Reports should be clean and secondary.

Sections:
- revenue
- aging
- client revenue
- payments
- outstanding

Charts:
- one chart per clear question
- no dashboard decoration charts

Always accompany charts with numeric summaries.

---

# 28. Settings

Settings should be grouped.

```text
Business
Invoice Defaults
Payment Methods
Branding
Follow-Up Rules
Team
Subscription
Security
Data & Export
```

Each section should be its own page or clear panel.

Avoid a giant settings form.

---

# 29. Follow-Up Rule Builder

Example:

```text
[✓] 3 days before due
Tone: Friendly

[✓] On due date
Tone: Professional

[✓] 3 days overdue
Tone: Professional

[✓] 7 days overdue
Tone: Firm
```

Actions:
- Add Rule
- Edit Template
- Preview
- Save

Show safeguards:

```text
Reminders stop automatically when invoice is paid.
```

---

# 30. Reminder Composer

Structure:

```text
To
Subject
Message

Tone:
Friendly / Professional / Firm

[Preview]
[Send]
```

Optional AI actions later:
- Friendlier
- Shorter
- More formal
- More firm

---

# 31. Empty States

Examples:

## No Invoices

```text
No invoices yet

Create your first invoice and start tracking payments.

[Create Invoice]
```

## No Payment Confirmations

```text
Your payment inbox is clear.

Client payment confirmations will appear here.
```

## No Follow-Ups Needed

```text
You're caught up.

No invoices need follow-up right now.
```

---

# 32. Loading States

Use:
- skeleton cards
- skeleton table rows
- disabled submit state
- spinner only for small scoped actions

Avoid full-screen blocking loaders unless necessary.

---

# 33. Error States

Errors should:
- explain what failed
- preserve user input
- show retry when appropriate

Example:

```text
Invoice could not be sent.

Your draft was saved.
Try again.
```

---

# 34. Toasts

Good:

```text
Invoice sent.
Payment confirmed.
Follow-up scheduled.
Client updated.
```

Avoid long paragraphs in toasts.

---

# 35. Confirmation Dialogs

Use explicit action names.

Example:

```text
Void INV-1042?

This invoice will remain in your records and can no longer accept payments.

[Cancel]
[Void Invoice]
```

---

# 36. Status Chips

Standard statuses:

```text
Draft
Sent
Viewed
Partially Paid
Paid
Overdue
Void
```

Payment confirmation:
- Pending
- Confirmed
- Rejected

Promise:
- Active
- Fulfilled
- Missed

Use consistent wording everywhere.

---

# 37. Button Hierarchy

Primary:
- main page action

Secondary:
- common supporting action

Tertiary:
- subtle action

Destructive:
- explicit danger styling

Do not place multiple primary buttons together unless unavoidable.

---

# 38. Forms

Form rules:
- labels always visible
- placeholders are examples, not labels
- inline validation
- field descriptions only when useful
- group related fields
- preserve entered values after errors

---

# 39. Tables

Desktop:
- sticky headers where useful
- row hover
- sortable columns
- compact density
- visible pagination

Mobile:
- cards
- stacked metadata
- clear CTA

---

# 40. Search

Global search placeholder:

```text
Search clients, invoices, references...
```

Results grouped by type.

Keyboard shortcut may be added later.

---

# 41. Responsive Design

Test widths:

```text
360
390
768
1024
1280
1440
```

Important:
- no accidental horizontal scrolling
- CTAs remain reachable
- invoice forms usable on phone
- tables adapt

---

# 42. PWA Design

Installed PWA should:
- feel app-like
- preserve navigation
- support standalone display mode
- have proper app icon
- include safe offline state

Offline page:

```text
You're offline.

You can reopen the app, but actions that require fresh financial data are unavailable until connection returns.
```

---

# 43. Notifications

In-app notification examples:

```text
ABC Dental viewed INV-1042.

Payment promise received for Sep 25.

Payment confirmation submitted.

INV-1042 is now overdue.
```

Keep concise.

---

# 44. Dark Mode

Optional.

If implemented:
- use semantic tokens
- maintain contrast
- do not invert invoice PDF
- public invoice can remain light for document familiarity

Do not prioritize dark mode over core UX.

---

# 45. Motion

Use subtle motion only:
- dialog transition
- dropdown
- accordion
- status update
- toast

Avoid:
- bouncing cards
- parallax
- decorative animation
- slow route transitions

---

# 46. Accessibility

Required:
- keyboard support
- visible focus
- semantic headings
- form labels
- button names
- accessible dialogs
- aria-live for important async feedback
- color contrast

---

# 47. Design Tokens

Suggested CSS variable structure:

```text
--background
--foreground
--card
--card-foreground
--popover
--popover-foreground
--primary
--primary-foreground
--secondary
--secondary-foreground
--muted
--muted-foreground
--border
--input
--ring
--success
--warning
--danger
--info
```

---

# 48. Component Library

Core reusable components:

```text
AppShell
Sidebar
MobileNav
Topbar
PageHeader
StatCard
StatusBadge
DataTable
FilterBar
EmptyState
Timeline
TimelineItem
InvoiceCard
ClientCard
PaymentConfirmationCard
ReminderCard
MoneyDisplay
DateDisplay
CurrencyInput
ClientSelect
InvoiceItemEditor
ConfirmDialog
Drawer
Modal
Toast
Skeleton
FileUploader
DatePicker
SearchCommand
```

---

# 49. Screen Inventory

Public:
- Landing
- Pricing
- Login
- Register
- Verify Email
- Forgot Password
- Reset Password
- Public Invoice

Authenticated:
- Onboarding
- Dashboard
- Get Paid
- Clients
- Client Detail
- Invoices
- Invoice Create
- Invoice Detail
- Payment Inbox
- Payments
- Products / Services
- Expenses
- Reports
- Notifications
- Settings

---

# 50. Dashboard Wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│ Good morning                         + New Invoice           │
│ Here's what needs attention today.                          │
├──────────────────────────────────────────────────────────────┤
│ Outstanding │ Overdue │ Due This Week │ Paid This Month     │
├──────────────────────────────────────────────────────────────┤
│ NEEDS ATTENTION                                             │
│                                                              │
│ ABC Dental      INV-1042        ₱35,000      12 days overdue│
│ Last reminder: 4 days ago                   [Follow Up]     │
│                                                              │
│ Pixel Agency    INV-1051        ₱18,500      Due tomorrow   │
│                                               [View]         │
├──────────────────────────────────────────────────────────────┤
│ Payment Promises              │ Recent Activity             │
│ Sep 25 — ABC Dental           │ Client viewed INV-1042      │
│ Sep 27 — John Cruz            │ ₱8,000 payment confirmed    │
├──────────────────────────────────────────────────────────────┤
│ Revenue Trend                                                │
└──────────────────────────────────────────────────────────────┘
```

---

# 51. Mobile Dashboard Wireframe

```text
Good morning

Outstanding
₱184,500

Overdue
₱65,000

Needs Attention

[ABC Dental]
₱35,000
12 days overdue
[Follow Up]

[Pixel Agency]
₱18,500
Due tomorrow
[View]

Bottom Nav:
Home | Get Paid | Invoices | Clients | More
```

---

# 52. Invoice Detail Wireframe

```text
INV-1042
ABC Dental

₱35,000
OVERDUE

[Follow Up] [Record Payment] [More]

Overview
----------------
Issue: Sep 1
Due: Sep 10
Paid: ₱10,000
Balance: ₱25,000

Timeline
----------------
● Sent
● Viewed
● Reminder sent
● Partial payment

Invoice
----------------
[Document preview]

Payments
----------------
₱10,000 — Sep 12 — GCash
```

---

# 53. Public Invoice Wireframe

```text
[Logo]

Clint Web Solutions

INVOICE INV-1042

Bill To
ABC Dental

Due Sep 30

Website Development     ₱30,000

Total                   ₱30,000
Paid                    ₱15,000
Balance                  ₱15,000

Payment Methods

GCash
09XX XXX XXXX
[Copy] [QR]

[I've Paid]
[I Will Pay On...]

[Download PDF]
```

---

# 54. Payment Inbox Wireframe

```text
Payment Inbox

Pending | Confirmed | Rejected

ABC Dental
INV-1042

₱15,000
GCash
Ref: 82388291

Receipt attached

[View Receipt]

[Reject] [Confirm Payment]
```

---

# 55. Follow-Up Composer Wireframe

```text
Follow Up INV-1042

To
client@example.com

Tone
[ Friendly ▼ ]

Subject
Payment reminder for INV-1042

Message
----------------------------------
Hi ...
----------------------------------

[Preview]

[Cancel] [Send Follow-Up]
```

---

# 56. Design Acceptance Criteria

A screen is complete only when:

- desktop layout works
- mobile layout works
- loading state exists
- empty state exists
- error state exists
- keyboard navigation works
- labels are accessible
- actions are visually prioritized
- no layout overflow
- financial values are formatted correctly
- status wording is consistent

---

# 57. UX Acceptance Criteria

The user should be able to:

```text
Create invoice in under 2 minutes

Identify overdue invoices in under 5 seconds

See whether invoice was viewed in under 5 seconds

Send a follow-up in under 20 seconds

Record a payment in under 20 seconds

Review a payment confirmation in under 20 seconds
```

These are UX goals, not hard performance guarantees.

---

# 58. Final Design Direction

The system should feel like:

> A focused payment operations workspace for freelancers.

Not:

> A miniature ERP.

The best design outcome is when the user opens the app and immediately understands:

```text
Who owes me?
What needs attention?
What happened?
What should I do next?
```
