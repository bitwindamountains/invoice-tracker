import Link from "next/link";
import { redirect } from "next/navigation";
import { PrivateHeader } from "@/components/private-header";
import { ConfirmationActions } from "@/features/payments/confirmation-actions";
import { requireSession } from "@/lib/session";
import { listConfirmations } from "@/services/payments";
import { ensurePersonalWorkspace } from "@/services/workspace";
function money(value: { toString(): string }, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(Number(value.toString()));
}
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  if (!workspace.onboardingCompletedAt) redirect("/onboarding");
  const requested = (await searchParams).status;
  const status =
    requested === "CONFIRMED" || requested === "REJECTED"
      ? requested
      : "PENDING";
  const items = await listConfirmations(user.id, workspace.id, { status });
  return (
    <div className="workspace">
      <PrivateHeader businessName={workspace.name} />
      <main id="main" className="clients-main">
        <div className="page-title-row">
          <div>
            <span className="eyebrow">PAYMENT INBOX</span>
            <h1>Review client confirmations.</h1>
            <p>Submissions do not affect balances until you confirm them.</p>
          </div>
        </div>
        <nav className="inbox-tabs" aria-label="Payment confirmation status">
          <Link href="/app/payments">Pending</Link>
          <Link href="/app/payments?status=CONFIRMED">Confirmed</Link>
          <Link href="/app/payments?status=REJECTED">Rejected</Link>
        </nav>
        {items.length === 0 ? (
          <section className="empty-state">
            <h2>Your payment inbox is clear.</h2>
            <p>No {status.toLowerCase()} confirmations.</p>
          </section>
        ) : (
          <section className="confirmation-list">
            {items.map((item) => (
              <article className="confirmation-card" key={item.id}>
                <div>
                  <span
                    className={`status-badge ${item.status === "PENDING" ? "archived" : "active"}`}
                  >
                    {item.status}
                  </span>
                  <h2>{item.invoice.clientName}</h2>
                  <Link href={`/app/invoices/${item.invoiceId}`}>
                    {item.invoice.invoiceNumber}
                  </Link>
                </div>
                <dl>
                  <div>
                    <dt>Amount</dt>
                    <dd>{money(item.amount, item.invoice.currency)}</dd>
                  </div>
                  <div>
                    <dt>Method</dt>
                    <dd>{item.method}</dd>
                  </div>
                  <div>
                    <dt>Reference</dt>
                    <dd>{item.reference ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Payment date</dt>
                    <dd>{item.paidAt.toISOString().slice(0, 10)}</dd>
                  </div>
                </dl>
                {item.status === "PENDING" && (
                  <ConfirmationActions id={item.id} />
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
