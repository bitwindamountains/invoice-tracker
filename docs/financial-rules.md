# Invoice financial rules

Phase 5 uses one server-side calculation service. Inputs and API money values are decimal strings; binary floating-point values are rejected and never used for calculations or persistence.

- PHP, USD, EUR, GBP, AUD, CAD and SGD use two minor-unit digits. JPY uses zero.
- Round half-up at the line level: base (`quantity × unit price`), discount, and tax each round to the currency minor unit.
- Apply discounts before tax. Percentage discounts are 0–100%; fixed discounts are nonnegative and cannot exceed the rounded line base.
- Tax is 0–100% of the rounded post-discount amount. A line total is taxable amount plus tax.
- Invoice subtotal, discount, tax and total are exact sums of the stored rounded line amounts. Balance initially equals total; confirmed payments reduce it atomically and cannot exceed it.
- Every invoice stores its currency. Totals in different currencies are never combined.
- Drafts copy client and line-item defaults. Sending freezes the complete business, client, line, tax and payment-instruction snapshot.
- Automatic invoice numbers are allocated in the invoice transaction by incrementing the workspace sequence. Failed transactions do not consume a number. Issued numbers are never reused. A unique workspace/number constraint is the final concurrency guard.
