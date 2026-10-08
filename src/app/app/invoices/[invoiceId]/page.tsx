import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download, Pencil } from "lucide-react";
import { PrivateHeader } from "@/components/private-header";
import { SendControl } from "@/features/invoices/send-control";
import { PublicLinkControl } from "@/features/invoices/public-link-control";
import { RecordPayment } from "@/features/payments/record-payment";
import { ManualReminder } from "@/features/reminders/manual-reminder";
import { requireSession } from "@/lib/session";
import {
  getInvoice,
  InvoiceAccessDenied,
  InvoiceNotFound,
} from "@/services/invoices";
import { ensurePersonalWorkspace } from "@/services/workspace";
function money(value: { toString(): string }, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(Number(value.toString()));
}
const labels: Record<string, string> = {
  INVOICE_ISSUED: "Invoice issued",
  EMAIL_SENT: "Email accepted for delivery",
  EMAIL_FAILED: "Email delivery failed",
  PUBLIC_LINK_OPENED: "Invoice link opened",
  PAYMENT_CONFIRMATION_SUBMITTED: "Payment confirmation submitted",
  PAYMENT_CONFIRMATION_REJECTED: "Payment confirmation rejected",
  PAYMENT_PROMISED: "Payment promised",
  PAYMENT_RECORDED: "Partial payment recorded",
  PAYMENT_COMPLETED: "Payment completed",
  REMINDER_SENT: "Payment reminder accepted for delivery",
  REMINDER_FAILED: "Payment reminder delivery failed",
};
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  if (!workspace.onboardingCompletedAt) redirect("/onboarding");
  let invoice;
  try {
    invoice = await getInvoice(user.id, workspace.id, (await params).invoiceId);
  } catch (error) {
    if (
      error instanceof InvoiceNotFound ||
      error instanceof InvoiceAccessDenied
    )
      notFound();
    throw error;
  }
  return (
    <div className="workspace">
      <PrivateHeader businessName={workspace.name} />
      <main id="main" className="invoice-preview-main">
        <Link className="back-link" href="/app/invoices">
          ← All invoices
        </Link>
        <div className="page-title-row">
          <div>
            <span
              className={`status-badge ${invoice.status === "DRAFT" ? "archived" : "active"}`}
            >
              {invoice.status}
            </span>
            <h1>{invoice.invoiceNumber}</h1>
            <p>
              {invoice.clientName} · Due{" "}
              {invoice.dueDate.toISOString().slice(0, 10)}
            </p>
          </div>
          <div className="detail-actions">
            {invoice.status === "DRAFT" ? (
              <>
                <Link
                  className="button secondary"
                  href={`/app/invoices/${invoice.id}/edit`}
                >
                  <Pencil size={17} />
                  Edit draft
                </Link>
                <SendControl
                  invoiceId={invoice.id}
                  invoiceNumber={invoice.invoiceNumber}
                  businessName={workspace.name}
                  email={invoice.clientEmail}
                  version={invoice.version}
                />
              </>
            ) : (
              <>
                {invoice.status !== "PAID" && (
                  <RecordPayment
                    invoiceId={invoice.id}
                    balance={invoice.balanceDue.toString()}
                    currency={invoice.currency}
                  />
                )}
                {invoice.status !== "PAID" && invoice.status !== "VOID" && (
                  <ManualReminder invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} clientName={invoice.clientName} balance={money(invoice.balanceDue, invoice.currency)} dueDate={invoice.dueDate.toISOString().slice(0,10)} businessName={workspace.name}/>
                )}
                <a
                  className="button secondary"
                  href={`/api/invoices/${invoice.id}/pdf`}
                >
                  <Download size={17} />
                  Download PDF
                </a>
                <PublicLinkControl invoiceId={invoice.id} />
              </>
            )}
          </div>
        </div>
        <article className="invoice-paper">
          <header>
            <div>
              <span className="eyebrow">INVOICE</span>
              <h2>{workspace.name}</h2>
            </div>
            <div>
              <strong>{invoice.invoiceNumber}</strong>
              <span>Issued {invoice.issueDate.toISOString().slice(0, 10)}</span>
              <span>Due {invoice.dueDate.toISOString().slice(0, 10)}</span>
            </div>
          </header>
          <section className="invoice-parties">
            <div>
              <small>BILL TO</small>
              <strong>{invoice.clientName}</strong>
              {invoice.clientCompany && <span>{invoice.clientCompany}</span>}
              <span>{invoice.clientEmail}</span>
              {invoice.clientAddress && (
                <span className="preline">{invoice.clientAddress}</span>
              )}
            </div>
            <div>
              <small>CURRENCY</small>
              <strong>{invoice.currency}</strong>
            </div>
          </section>
          <div className="invoice-items">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Discount</th>
                  <th>Tax</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.description}</strong>
                      <span>per {item.unit}</span>
                    </td>
                    <td>{item.quantity.toString()}</td>
                    <td>{money(item.unitPrice, invoice.currency)}</td>
                    <td>{money(item.discountAmount, invoice.currency)}</td>
                    <td>{money(item.taxAmount, invoice.currency)}</td>
                    <td>{money(item.lineTotal, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <section className="invoice-totals">
            <div>
              <span>Subtotal</span>
              <strong>{money(invoice.subtotal, invoice.currency)}</strong>
              <span>Discount</span>
              <strong>
                − {money(invoice.discountTotal, invoice.currency)}
              </strong>
              <span>Tax</span>
              <strong>{money(invoice.taxTotal, invoice.currency)}</strong>
              <span className="total-label">Total</span>
              <strong className="total-value">
                {money(invoice.total, invoice.currency)}
              </strong>
              {invoice.status !== "DRAFT" && (
                <>
                  <span>Paid</span>
                  <strong>{money(invoice.amountPaid, invoice.currency)}</strong>
                  <span>Balance due</span>
                  <strong>{money(invoice.balanceDue, invoice.currency)}</strong>
                </>
              )}
            </div>
          </section>
          {(invoice.notes || invoice.terms || invoice.paymentInstructions) && (
            <footer>
              {invoice.notes && (
                <div>
                  <strong>Notes</strong>
                  <p className="preline">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <strong>Terms</strong>
                  <p className="preline">{invoice.terms}</p>
                </div>
              )}
              {invoice.paymentInstructions && (
                <div>
                  <strong>Payment instructions</strong>
                  <p className="preline">{invoice.paymentInstructions}</p>
                </div>
              )}
            </footer>
          )}
        </article>
        {invoice.payments.length > 0 && (
          <section className="activity-panel payment-history">
            <span className="eyebrow">PAYMENTS</span>
            <h2>Payment history</h2>
            <ol>
              {invoice.payments.map((payment) => (
                <li key={payment.id}>
                  <div><strong>{money(payment.amount, invoice.currency)}</strong><span>{payment.method}{payment.reference ? ` · ${payment.reference}` : ""}</span></div>
                  <a href={`/api/payments/${payment.id}/receipt`}>Download receipt</a>
                </li>
              ))}
            </ol>
          </section>
        )}
        {invoice.reminders.length > 0 && <section className="activity-panel"><span className="eyebrow">FOLLOW-UPS</span><h2>Reminder history</h2><ol>{invoice.reminders.map(reminder=><li key={reminder.id}><div><strong>{reminder.manual ? "Manual reminder" : reminder.rule?.label}</strong><span>{reminder.tone.toLowerCase()} · {reminder.status.toLowerCase()}</span></div><time>{reminder.createdAt.toLocaleString("en",{timeZone:workspace.timezone})}</time></li>)}</ol></section>}
        {invoice.paymentPromises[0] && (
          <p className="notice">Promised payment date: {invoice.paymentPromises[0].promisedFor.toISOString().slice(0,10)}</p>
        )}
        {invoice.paymentConfirmations.length > 0 && (
          <p className="notice">{invoice.paymentConfirmations.length} payment confirmation awaiting review in the Payment Inbox.</p>
        )}
        {invoice.events.length > 0 && (
          <section className="activity-panel">
            <span className="eyebrow">ACTIVITY</span>
            <h2>Invoice timeline</h2>
            <ol>
              {invoice.events.map((event) => (
                <li key={event.id}>
                  <strong>
                    {labels[event.type] ??
                      event.type.replaceAll("_", " ").toLowerCase()}
                  </strong>
                  <time>
                    {event.createdAt.toLocaleString("en", {
                      timeZone: workspace.timezone,
                    })}
                  </time>
                </li>
              ))}
            </ol>
          </section>
        )}
        <p className="preview-note">
          {invoice.status === "DRAFT"
            ? "Draft preview · Totals were calculated and stored by the invoice engine."
            : "Issued invoice · Historical content is rendered from its frozen snapshot."}
        </p>
      </main>
    </div>
  );
}
