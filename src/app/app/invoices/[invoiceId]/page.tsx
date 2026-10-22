import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { ArrowLeft, BellRing, CalendarClock, CircleCheck, CircleX, Copy, Download, Eye, Inbox, Mail, MailX, Pencil, ReceiptText, Send, Wallet } from "lucide-react";
import { InvoiceStatus } from "@/components/ui/status-chip";
import { formatMoney } from "@/components/ui/money";
import { SendControl } from "@/features/invoices/send-control";
import { PublicLinkControl } from "@/features/invoices/public-link-control";
import { RecordPayment } from "@/features/payments/record-payment";
import { ManualReminder } from "@/features/reminders/manual-reminder";
import { requireSession } from "@/lib/session";
import { getInvoice, InvoiceAccessDenied, InvoiceNotFound } from "@/services/invoices";
import { ensurePersonalWorkspace } from "@/services/workspace";

const events: Record<string, { label: string; icon: typeof Mail; tone: string }> = {
  INVOICE_ISSUED: { label: "Invoice issued", icon: Send, tone: "neutral" },
  EMAIL_SENT: { label: "Email accepted for delivery", icon: Mail, tone: "neutral" },
  EMAIL_FAILED: { label: "Email delivery failed", icon: MailX, tone: "danger" },
  PUBLIC_LINK_OPENED: { label: "Invoice link opened", icon: Eye, tone: "info" },
  PAYMENT_CONFIRMATION_SUBMITTED: { label: "Payment confirmation submitted", icon: Inbox, tone: "warning" },
  PAYMENT_CONFIRMATION_REJECTED: { label: "Payment confirmation rejected", icon: CircleX, tone: "danger" },
  PAYMENT_PROMISED: { label: "Payment promised", icon: CalendarClock, tone: "info" },
  PAYMENT_RECORDED: { label: "Partial payment recorded", icon: Wallet, tone: "info" },
  PAYMENT_COMPLETED: { label: "Payment completed", icon: CircleCheck, tone: "success" },
  REMINDER_SENT: { label: "Payment reminder accepted for delivery", icon: BellRing, tone: "neutral" },
  REMINDER_FAILED: { label: "Payment reminder delivery failed", icon: MailX, tone: "danger" },
};
const day = (date: Date) => date.toISOString().slice(0, 10);

export default async function InvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  let invoice;
  try {
    invoice = await getInvoice(user.id, workspace.id, (await params).invoiceId);
  } catch (error) {
    if (error instanceof InvoiceNotFound || error instanceof InvoiceAccessDenied) notFound();
    throw error;
  }
  const money = (value: { toString(): string }) => formatMoney(value, invoice.currency);
  const issued = invoice.status !== "DRAFT";
  const total = Number(invoice.total.toString());
  const paidPercent = total > 0 ? Math.min(100, (Number(invoice.amountPaid.toString()) / total) * 100) : 0;
  const when = (date: Date) => date.toLocaleString("en", { timeZone: workspace.timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="workspace">
      <main id="main" className="invoice-preview-main invoice-detail">
        <Link className="back-link" href="/app/invoices" transitionTypes={["nav-back"]}><ArrowLeft size={15} aria-hidden />All invoices</Link>
        <div className="page-title-row">
          <div>
            <div className="detail-status"><InvoiceStatus status={invoice.status} dueDate={invoice.dueDate} /></div>
            <ViewTransition name={`invoice-${invoice.id}`} share="morph" default="none">
              <h1>{invoice.invoiceNumber}</h1>
            </ViewTransition>
            <p>{invoice.clientName} · Due {day(invoice.dueDate)}</p>
          </div>
          <div className="detail-actions">
            {invoice.status === "DRAFT" ? (
              <>
                <Link className="button secondary" href={`/app/invoices/${invoice.id}/edit`}><Pencil size={17} aria-hidden />Edit draft</Link>
                <SendControl invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} businessName={workspace.name} email={invoice.clientEmail} version={invoice.version} />
              </>
            ) : (
              <>
                {invoice.status !== "PAID" && <RecordPayment invoiceId={invoice.id} balance={invoice.balanceDue.toString()} currency={invoice.currency} />}
                {invoice.status !== "PAID" && invoice.status !== "VOID" && (
                  <ManualReminder invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} clientName={invoice.clientName} balance={money(invoice.balanceDue)} dueDate={day(invoice.dueDate)} businessName={workspace.name} />
                )}
                <a className="button secondary" href={`/api/invoices/${invoice.id}/pdf`}><Download size={17} aria-hidden />Download PDF</a>
                <PublicLinkControl invoiceId={invoice.id} />
              </>
            )}
            <Link className="button secondary" href={`/app/invoices/new?from=${invoice.id}`}><Copy size={16} aria-hidden />Duplicate</Link>
          </div>
        </div>

        {issued && (
          <section className="settle-strip" aria-label="Payment progress">
            <div><span>Total</span><strong className="money">{money(invoice.total)}</strong></div>
            <div><span>Paid</span><strong className="money">{money(invoice.amountPaid)}</strong></div>
            <div className={Number(invoice.balanceDue.toString()) > 0 ? "is-due" : "is-settled"}><span>Balance due</span><strong className="money">{money(invoice.balanceDue)}</strong></div>
            <div className="settle-bar" role="progressbar" aria-label="Amount paid" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(paidPercent)}>
              <span style={{ width: `${paidPercent}%` }} />
            </div>
          </section>
        )}
        {invoice.paymentConfirmations.length > 0 && (
          <Link className="inbox-callout" href="/app/payments">
            <span className="inbox-callout-icon"><Inbox size={19} aria-hidden /></span>
            <span><strong>{invoice.paymentConfirmations.length} payment confirmation awaiting review in the Payment Inbox.</strong><small>Balances change only after you confirm.</small></span>
          </Link>
        )}

        <div className="detail-layout">
          <article className="invoice-paper">
            <header>
              <div><h2>{workspace.name}</h2></div>
              <div>
                <strong>{invoice.invoiceNumber}</strong>
                <span>Issued {day(invoice.issueDate)}</span>
                <span>Due {day(invoice.dueDate)}</span>
              </div>
            </header>
            <section className="invoice-parties">
              <div>
                <small>Bill to</small>
                <strong>{invoice.clientName}</strong>
                {invoice.clientCompany && <span>{invoice.clientCompany}</span>}
                <span>{invoice.clientEmail}</span>
                {invoice.clientAddress && <span className="preline">{invoice.clientAddress}</span>}
              </div>
              <div><small>Currency</small><strong>{invoice.currency}</strong></div>
            </section>
            <div className="invoice-items">
              <table>
                <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Discount</th><th>Tax</th><th>Total</th></tr></thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.description}</strong><span>per {item.unit}</span></td>
                      <td data-label="Qty">{item.quantity.toString()}</td>
                      <td data-label="Rate">{money(item.unitPrice)}</td>
                      <td data-label="Discount">{money(item.discountAmount)}</td>
                      <td data-label="Tax">{money(item.taxAmount)}</td>
                      <td data-label="Total">{money(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <section className="invoice-totals">
              <div>
                <span>Subtotal</span><strong>{money(invoice.subtotal)}</strong>
                <span>Discount</span><strong>− {money(invoice.discountTotal)}</strong>
                <span>Tax</span><strong>{money(invoice.taxTotal)}</strong>
                <span className="total-label">Total</span><strong className="total-value">{money(invoice.total)}</strong>
                {issued && (<><span>Paid</span><strong>{money(invoice.amountPaid)}</strong><span>Balance due</span><strong>{money(invoice.balanceDue)}</strong></>)}
              </div>
            </section>
            {(invoice.notes || invoice.terms || invoice.paymentInstructions) && (
              <footer>
                {invoice.notes && <div><strong>Notes</strong><p className="preline">{invoice.notes}</p></div>}
                {invoice.terms && <div><strong>Terms</strong><p className="preline">{invoice.terms}</p></div>}
                {invoice.paymentInstructions && <div><strong>Payment instructions</strong><p className="preline">{invoice.paymentInstructions}</p></div>}
              </footer>
            )}
            <p className="preview-note">
              {invoice.status === "DRAFT" ? "Draft preview · Totals were calculated and stored by the invoice engine." : "Issued invoice · Historical content is rendered from its frozen snapshot."}
            </p>
          </article>

          <aside className="detail-rail">
            {invoice.paymentPromises[0] && (
              <p className="notice promise-notice"><CalendarClock size={16} aria-hidden />Promised payment date: {day(invoice.paymentPromises[0].promisedFor)}</p>
            )}
            {invoice.payments.length > 0 && (
              <section className="activity-panel payment-history">
                <h2>Payment history</h2>
                <ol>
                  {invoice.payments.map((payment) => (
                    <li key={payment.id}>
                      <div><strong>{money(payment.amount)}</strong><span>{day(payment.paidAt)} · {payment.method}{payment.reference ? ` · ${payment.reference}` : ""}</span></div>
                      <a href={`/api/payments/${payment.id}/receipt`}><ReceiptText size={14} aria-hidden />Download receipt</a>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {invoice.reminders.length > 0 && (
              <section className="activity-panel">
                <h2>Reminder history</h2>
                <ol>
                  {invoice.reminders.map((reminder) => (
                    <li key={reminder.id}>
                      <div><strong>{reminder.manual ? "Manual reminder" : reminder.rule?.label}</strong><span>{reminder.tone.toLowerCase()} · {reminder.status.toLowerCase()}</span></div>
                      <time>{when(reminder.createdAt)}</time>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <section className="activity-panel">
              <h2>Invoice timeline</h2>
              {invoice.events.length === 0 ? (
                <p className="empty-copy">Sending, views, promises and payments are recorded here as they happen.</p>
              ) : (
                <ol className="timeline">
                  {invoice.events.map((event) => {
                    const meta = events[event.type] ?? { label: event.type.replaceAll("_", " ").toLowerCase(), icon: ReceiptText, tone: "neutral" };
                    const Icon = meta.icon;
                    return (
                      <li key={event.id} className={`tl-${meta.tone}`}>
                        <span className="tl-icon"><Icon size={14} aria-hidden /></span>
                        <strong>{meta.label}</strong>
                        <time>{when(event.createdAt)}</time>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
