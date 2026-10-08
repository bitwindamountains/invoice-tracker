# Product Description & Differentiation

> Implementation scope: see [specification review](docs/specification-review.md). Preserve the collection-first positioning; scheduled automation, deposits, milestone billing, and deliverable unlocking follow the core collection MVP. A recorded link opening is evidence of access, not proof that a specific client read the invoice.
## Invoice + Payment Collection PWA for Freelancers and Small Service Businesses

# 1. Product Summary

This application is a **payment collection SaaS**, not just an invoice generator.

It helps freelancers and small service businesses create professional invoices, send them to clients, understand what happens after they are sent, follow up intelligently, track partial payments, and move each invoice toward payment.

The product's central promise is:

> **Send the invoice. We help you get paid.**

The application is built as a Progressive Web App so users can access the same product from desktop, tablet, and mobile without maintaining separate native applications.

---

# 2. The Problem

Creating an invoice is easy.

Getting the invoice paid is often the difficult part.

A typical freelancer currently has to remember:

```text
Did I already send the invoice?

Did the client actually see it?

When is it due?

Should I follow up today?

How many reminders have I sent?

Did the client promise to pay next week?

Did they send a partial payment?

Was that GCash screenshot already confirmed?

How much do they still owe?
```

Many invoicing applications are optimized around bookkeeping and invoice creation.

This product is optimized around:

> **Everything that happens between "invoice sent" and "payment received."**

---

# 3. Who It Is For

Primary users:

- Freelancers
- Web developers
- Designers
- Video editors
- Photographers
- Virtual assistants
- Consultants
- Tutors
- Contractors
- Small agencies
- Small service businesses

It is especially useful for people who:

- Send invoices manually
- Accept bank transfer, GCash, Maya, PayPal, cash, or similar methods
- Frequently need to remind clients
- Receive partial payments
- Work with repeat clients
- Use deposits or milestone billing
- Want a simple tool instead of full accounting software

---

# 4. What It Is NOT

The application should not try to become:

- QuickBooks
- Xero
- ERP software
- Payroll software
- Inventory software
- Full bookkeeping software
- Tax filing software
- Large enterprise CRM

Those products solve different problems.

This product should stay focused on:

```text
Invoice
→ Client
→ Follow-Up
→ Payment
```

---

# 5. Core Differentiator

Traditional invoicing software often follows this flow:

```text
Create Invoice
↓
Send Invoice
↓
Wait
↓
Mark Paid
```

Our product follows:

```text
Create Invoice
↓
Send Invoice
↓
Track Activity
↓
Client Views Invoice
↓
Due Date Approaches
↓
Follow-Up
↓
Client Responds
↓
Payment Promise / Payment Confirmation
↓
Partial Payment
↓
Remaining Balance Follow-Up
↓
Paid
```

The product therefore acts as a:

> **Payment Collection Assistant**

rather than only an invoice database.

---

# 6. Main Product Experience

The ideal user experience is:

```text
I create an invoice.

I send it.

The system tells me the client viewed it.

If the due date approaches, the system knows.

If I need to follow up, it tells me.

If the client promises payment next Friday,
the system remembers.

If the client uploads a payment confirmation,
it appears in my Payment Inbox.

If the client pays only half,
the system tracks the remaining balance.

Once everything is paid,
the invoice is complete.
```

The user should not need spreadsheets, calendar reminders, Messenger notes, email searches, and memory to manage unpaid invoices.

---

# 7. The "Get Paid" Dashboard

The homepage should not primarily show generic financial charts.

The most important area is:

```text
NEEDS ATTENTION
```

Example:

```text
Outstanding
₱184,500

7 invoices need attention
```

Then:

```text
ABC Dental
INV-1042
₱35,000
12 days overdue
Last reminder: 4 days ago

[Follow Up]
```

Another:

```text
Pixel Agency
INV-1051
₱18,500
Due tomorrow

[View]
```

Another:

```text
John Cruz
INV-1055
₱24,000
Viewed 2 hours ago
No payment yet

[View Activity]
```

Instead of telling the user only what happened historically, the dashboard tells them:

> **What should I pay attention to today?**

---

# 8. Invoice Activity Timeline

Every invoice receives a chronological timeline.

Example:

```text
Sep 01 10:14
Invoice created

Sep 01 10:17
Invoice sent

Sep 01 11:42
Client viewed invoice

Sep 03 15:15
Client viewed invoice again

Sep 08
Friendly reminder sent

Sep 10
Invoice became overdue

Sep 12
₱10,000 payment recorded

Remaining:
₱15,000
```

This removes the "black box" feeling after sending an invoice.

The user can clearly see what happened.

---

# 9. Follow-Up Engine

This is one of the main features that makes the product different.

Instead of only supporting:

```text
Send Reminder
```

the product supports a follow-up sequence.

Example:

```text
3 days before due date
Friendly reminder

On due date
Due today reminder

3 days overdue
Professional follow-up

7 days overdue
Second follow-up

14 days overdue
Firm follow-up
```

Users can:

- Enable or disable each stage
- Edit message templates
- Choose reminder tone
- Send manually
- Automate later
- Review the history

---

# 10. Smart Follow-Up Rules

The product should understand context.

Examples:

```text
IF invoice was never viewed
→ resend invoice

IF invoice was viewed but unpaid
→ payment reminder

IF client promised payment on Friday
→ pause reminders until Friday passes

IF invoice is partially paid
→ follow up only for remaining amount

IF invoice is fully paid
→ stop reminders

IF invoice is void
→ stop reminders
```

This makes the app feel intelligent even without relying heavily on AI.

---

# 11. Client Payment Behavior

The system learns from recorded payment history.

Example:

```text
ABC Company

Invoices:
14

Average payment time:
18 days

Average delay:
4 days

Outstanding:
₱24,000
```

The product may display:

```text
This client has paid an average of
5 days after the due date across
the last 8 paid invoices.
```

This helps the freelancer make better decisions about:

- Deposit requirements
- Payment terms
- Reminder schedules
- Project risk

The system should only use factual historical data.

It should not label clients with subjective or insulting classifications.

---

# 12. Payment Promise

Clients can click:

```text
I will pay on...
```

and select a date.

Example:

```text
Payment promised:
September 25
```

The owner's dashboard shows the commitment.

The system pauses unnecessary reminders until the promised date passes.

If the invoice remains unpaid afterward, it returns to the follow-up queue.

This reduces unnecessary back-and-forth.

---

# 13. Payment Inbox

For bank transfers, GCash, Maya, and other external payments, clients can submit:

```text
I've already paid.
```

They provide:

```text
Amount
Payment Method
Reference Number
Payment Date
Optional Receipt
```

The freelancer receives:

```text
PAYMENT INBOX

ABC Dental
₱15,000
GCash
Reference: XXXXX

[Confirm]
[Reject]
```

This is different from automatically trusting screenshots or manually searching chat conversations.

It centralizes payment confirmations.

---

# 14. Partial Payments

Partial payments are treated as a normal workflow.

Example:

```text
Invoice:
₱20,000

Payment 1:
₱5,000

Payment 2:
₱8,000

Paid:
₱13,000

Remaining:
₱7,000
```

The system should continue follow-up only for:

```text
₱7,000
```

not the original amount.

---

# 15. Deposits

Many freelancers do not want to begin work without an upfront payment.

The product should support:

```text
Project:
Website Development

Total:
₱50,000

Deposit:
50%

Pay now:
₱25,000
```

This is especially useful for:

- Developers
- Designers
- Photographers
- Agencies
- Contractors

---

# 16. Milestone Billing

Later, a project may have:

```text
Website Project
₱60,000

Deposit
₱20,000
PAID

Design Approval
₱20,000
DUE

Launch
₱20,000
LOCKED
```

This matches project-based freelance work better than a simple one-invoice model.

---

# 17. Deliverable Unlock

An optional later feature allows the freelancer to connect deliverables to payment.

Example:

```text
Invoice:
₱15,000

Deliverables:

website-final.zip
brand-assets.zip

Status:
Locked until payment
```

After payment:

```text
Payment confirmed

Files unlocked
```

This is useful for:

- Developers
- Designers
- Photographers
- Writers
- Editors

The owner must always retain manual control.

---

# 18. Philippines-Friendly Without Being Philippines-Only

The app should work globally but feel especially convenient for Philippine freelancers.

Payment instruction examples:

```text
GCash
Maya
BPI
BDO
UnionBank
GoTyme
Cash
Bank Transfer
PayPal
Wise
```

For GCash or Maya:

```text
Account Name:
Juan Dela Cruz

Number:
09XX XXX XXXX

[Copy]

[Show QR]
```

However, payment methods must be configurable.

The product should never be architected so that Philippine payment methods are mandatory.

---

# 19. Why PWA Is a Good Fit

The product is ideal for a Progressive Web App.

A freelancer may:

- Create invoices on a laptop
- Check payment status on a phone
- Confirm a payment while outside
- Receive a notification about an overdue invoice
- Open the same account on a tablet

A PWA allows this with one product codebase.

Benefits:

- Installable
- Mobile-friendly
- Desktop-friendly
- No app-store requirement for MVP
- Fast updates
- One codebase
- Lower development overhead

---

# 20. AI Should Be Supportive, Not the Product

The product should not be marketed as:

> AI invoice software

AI is optional assistance.

Useful examples:

```text
Rewrite reminder to sound friendlier.

Make this follow-up more professional.

Shorten this payment reminder.

Generate a firm but polite follow-up.
```

Another possible feature:

```text
Summarize:
You have ₱83,000 overdue across 4 clients.
Two clients promised payment this week.
```

Core workflows must still work without AI.

---

# 21. Competitive Strategy

Do not attempt to win by having:

- More accounting reports
- More tax features
- More bookkeeping features
- More enterprise settings
- More menu items

Instead win by being exceptionally good at:

```text
Knowing what happened to an invoice.

Knowing who needs a follow-up.

Making follow-up less awkward.

Tracking client commitments.

Handling manual payment confirmations.

Managing partial payments.

Helping the user reach "Paid."
```

---

# 22. Product Philosophy

Every new feature should be evaluated using this question:

> Does this make it easier for a freelancer to get paid?

If the answer is no, it probably should not be prioritized.

Priority framework:

```text
1. Payment collection
2. Invoice clarity
3. Client communication
4. Payment visibility
5. Workflow simplicity
6. Reporting
7. Accounting extras
```

---

# 23. Key Screens

The main navigation should emphasize:

```text
Dashboard

Get Paid

Clients

Invoices

Payment Inbox

Payments

Reports

Settings
```

Secondary modules may include:

```text
Products / Services
Expenses
Notifications
```

---

# 24. Core MVP

The MVP should prove the central idea.

Required:

```text
Authentication

Business setup

Clients

Invoices

PDF invoices

Invoice email

Public invoice link

Invoice view tracking

Invoice activity timeline

Partial payments

Payment promise

Payment confirmation

Payment Inbox

Manual follow-up

Follow-up sequences

Client payment behavior

Needs Attention dashboard

Get Paid screen

PWA installation
```

This is more important than initially building:

```text
Advanced accounting

Payroll

Tax automation

Inventory

Complex CRM

Large analytics suite
```

---

# 25. Product Story

The product story can be explained simply:

> Freelancers usually have no problem making an invoice. The annoying part is what happens afterward: waiting, checking messages, wondering whether the client saw it, remembering when to follow up, dealing with partial payments, and tracking who promised to pay when. This product is designed around that entire workflow.

---

# 26. Example User Story

A web developer completes a project.

They create:

```text
INV-1042
₱30,000
Due September 30
```

They send it.

The timeline shows:

```text
Sent
Viewed
```

September 27:

```text
Friendly reminder sent
```

September 30:

```text
Due today
```

The client clicks:

```text
I will pay October 2
```

The system pauses reminders.

October 2:

The client sends:

```text
₱15,000
GCash
```

and uploads a payment confirmation.

The freelancer confirms it.

Invoice becomes:

```text
PARTIALLY PAID

Paid:
₱15,000

Remaining:
₱15,000
```

The follow-up engine now refers only to the remaining balance.

The client pays the rest.

Invoice becomes:

```text
PAID
```

Receipt is generated.

The whole history remains in one timeline.

That workflow is the product.

---

# 27. Potential Taglines

Possible positioning lines:

```text
Stop chasing invoices.

Send the invoice. We'll help you get paid.

From invoice sent to payment received.

Know who owes you — and what to do next.

Invoicing that doesn't stop at Send.

Get paid without keeping reminders in your head.

Your payment follow-up assistant.
```

Final brand language can be tested with users.

---

# 28. What Makes the Product Defensible

No individual feature is impossible for competitors to copy.

The differentiation comes from combining the entire workflow around one job:

> **Help the freelancer collect money.**

The product should become better over time through:

- Payment-history data
- Better follow-up timing
- Better templates
- Better client payment behavior insights
- Better deposit/milestone workflows
- Better local payment support
- Better UX around unpaid invoices

The goal is not to possess one gimmick.

The goal is to make the complete payment-collection experience significantly better than generic invoicing software.

---

# 29. North Star Metric

Recommended product activation event:

```text
User sends first real invoice.
```

Recommended long-term North Star candidate:

```text
Value of invoices successfully moved to PAID
through active workspaces.
```

Supporting metrics:

```text
Invoices sent

Invoices viewed

Follow-ups sent

Payment promises created

Payment confirmations received

Time from invoice sent → paid

Percentage paid by due date

Monthly active workspaces
```

---

# 30. Final Product Identity

The product is:

> **A freelancer-first invoice and payment collection PWA that helps users create invoices, see what happens after sending them, follow up intelligently, handle manual and partial payments, and know exactly which money needs attention.**

It is not trying to become the biggest accounting system.

It is trying to become the best tool for one very specific moment:

> **You finished the work. Now get paid.**
