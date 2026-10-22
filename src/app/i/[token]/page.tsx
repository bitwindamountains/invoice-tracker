import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { Brand } from "@/components/brand";
import { getPublicInvoice } from "@/services/invoice-issuing";
import { InvoiceNotFound } from "@/services/invoices";
import { PublicPaymentActions } from "@/features/payments/public-payment-actions";
import { InvoiceStatus } from "@/components/ui/status-chip";
export const dynamic = "force-dynamic";
function money(value: string, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(Number(value));
}
export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const token = (await params).token;
  let invoice;
  try {
    invoice = await getPublicInvoice(token);
  } catch (error) {
    if (error instanceof InvoiceNotFound) notFound();
    throw error;
  }
  const snapshot = invoice.snapshot;
  return (
    <div className="public-invoice-shell">
      <header className="site-header">
        <Brand />
        <span className="secure-caption">
          <ExternalLink size={14} />
          Secure invoice link
        </span>
      </header>
      <main id="main" className="public-invoice-main">
        <div className="public-layout">
        <aside className="pay-panel" aria-label="Payment summary">
          <div className="pay-panel-head">
            <InvoiceStatus status={invoice.status} dueDate={new Date(`${snapshot.dueDate}T00:00:00Z`)} />
            <span>{snapshot.invoiceNumber}</span>
          </div>
          <h1 className="sr-only">{snapshot.invoiceNumber}</h1>
          <p className="pay-from">From {snapshot.business.name} · Due {snapshot.dueDate}</p>
          <span className="pay-label">{invoice.status === "PAID" ? "Paid in full" : "Balance due"}</span>
          <strong className="pay-amount money">{money(invoice.balanceDue.toString(), snapshot.currency)}</strong>
          {invoice.status === "PARTIALLY_PAID" && <p className="pay-note">of {money(snapshot.total, snapshot.currency)} total · partial payment received</p>}
          {snapshot.paymentInstructions && invoice.status !== "PAID" && (
            <div className="pay-instructions">
              <strong>How to pay</strong>
              <p className="preline">{snapshot.paymentInstructions}</p>
            </div>
          )}
          <a className="button secondary full" href={`/api/public/invoices/${token}/pdf`}>
            <Download size={17} />
            Download PDF
          </a>
          {invoice.status !== "PAID" && (
            <PublicPaymentActions token={token} balance={invoice.balanceDue.toString()} currency={snapshot.currency} />
          )}
        </aside>
        <article className="invoice-paper">
          <header>
            <div>
              <h2>{snapshot.business.name}</h2>
              <span>{snapshot.business.address}</span>
            </div>
            <div>
              <strong>{snapshot.invoiceNumber}</strong>
              <span>Issued {snapshot.issueDate}</span>
              <span>Due {snapshot.dueDate}</span>
            </div>
          </header>
          <section className="invoice-parties">
            <div>
              <small>Bill to</small>
              <strong>{snapshot.client.name}</strong>
              {snapshot.client.company && (
                <span>{snapshot.client.company}</span>
              )}
              <span>{snapshot.client.email}</span>
              {snapshot.client.address && (
                <span className="preline">{snapshot.client.address}</span>
              )}
            </div>
            <div>
              <small>Balance due</small>
              <strong>
                {money(invoice.balanceDue.toString(), snapshot.currency)}
              </strong>
            </div>
          </section>
          <div className="invoice-items">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Tax</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.lines.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <strong>{item.description}</strong>
                      <span>per {item.unit}</span>
                    </td>
                    <td data-label="Qty">{item.quantity}</td>
                    <td data-label="Rate">{money(item.unitPrice, snapshot.currency)}</td>
                    <td data-label="Tax">{money(item.taxAmount, snapshot.currency)}</td>
                    <td data-label="Total">{money(item.lineTotal, snapshot.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <section className="invoice-totals">
            <div>
              <span>Subtotal</span>
              <strong>{money(snapshot.subtotal, snapshot.currency)}</strong>
              <span>Discount</span>
              <strong>
                − {money(snapshot.discountTotal, snapshot.currency)}
              </strong>
              <span>Tax</span>
              <strong>{money(snapshot.taxTotal, snapshot.currency)}</strong>
              <span className="total-label">Total</span>
              <strong className="total-value">
                {money(snapshot.total, snapshot.currency)}
              </strong>
            </div>
          </section>
          {snapshot.paymentInstructions && (
            <footer>
              <div>
                <strong>Payment instructions</strong>
                <p className="preline">{snapshot.paymentInstructions}</p>
              </div>
            </footer>
          )}
        </article>
        </div>
        <p className="public-trust">
          This read-only page records that the secure link was opened. It does
          not identify who opened it.
        </p>
      </main>
    </div>
  );
}
