import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CircleDollarSign,
  Clock3,
  FilePlus2,
  Inbox,
} from "lucide-react";
import { PrivateHeader } from "@/components/private-header";
import { requireSession } from "@/lib/session";
import { getPaymentDashboard } from "@/services/payment-intelligence";
import { ensurePersonalWorkspace } from "@/services/workspace";

function money(values: Record<string, string>) {
  const entries = Object.entries(values);
  if (!entries.length) return <strong>—</strong>;
  return (
    <>
      {entries.map(([currency, value]) => (
        <strong key={currency}>
          {new Intl.NumberFormat("en", {
            style: "currency",
            currency,
            minimumFractionDigits: currency === "JPY" ? 0 : 2,
          }).format(Number(value))}
        </strong>
      ))}
    </>
  );
}
const activityLabels: Record<string, string> = {
  PAYMENT_COMPLETED: "Payment completed",
  PAYMENT_RECORDED: "Partial payment recorded",
  PAYMENT_CONFIRMATION_SUBMITTED: "Payment confirmation submitted",
  PAYMENT_PROMISED: "Payment promised",
  PUBLIC_LINK_OPENED: "Invoice viewed",
  EMAIL_SENT: "Invoice email accepted",
  INVOICE_ISSUED: "Invoice issued",
};
export default async function Workspace() {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  if (!workspace.onboardingCompletedAt) redirect("/onboarding");
  const dashboard = await getPaymentDashboard(user.id, workspace.id);
  const maxRevenue = Math.max(
    1,
    ...dashboard.revenue.flatMap((row) =>
      Object.values(row.values).map(Number),
    ),
  );
  return (
    <div className="workspace">
      <PrivateHeader businessName={workspace.name} />
      <main id="main" className="dashboard-main">
        <div className="page-title-row">
          <div>
            <span className="eyebrow">PAYMENT OVERVIEW · {dashboard.asOf}</span>
            <h1>Here’s what needs attention.</h1>
            <p>
              Every figure reconciles with confirmed payment and invoice
              records.
            </p>
          </div>
          <Link className="button primary" href="/app/invoices/new">
            <FilePlus2 size={17} />
            New invoice
          </Link>
        </div>
        <section className="dashboard-stats" aria-label="Payment totals">
          <article>
            <CircleDollarSign />
            <span>Outstanding</span>
            {money(dashboard.outstanding)}
          </article>
          <article>
            <Clock3 />
            <span>Overdue</span>
            {money(dashboard.overdue)}
          </article>
          <article>
            <span>Due in 7 days</span>
            {money(dashboard.dueThisWeek)}
          </article>
          <article>
            <span>Paid this month</span>
            {money(dashboard.paidThisMonth)}
          </article>
        </section>
        <div className="dashboard-grid">
          <section className="dashboard-panel attention-panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">NEEDS ATTENTION</span>
                <h2>Act on the next invoice.</h2>
              </div>
              <Link href="/app/get-paid">
                View Get Paid <ArrowRight size={15} />
              </Link>
            </div>
            {dashboard.attention.length === 0 ? (
              <p className="empty-copy">Nothing needs attention today.</p>
            ) : (
              <ol>
                {dashboard.attention.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.clientName}</strong>
                      <Link href={`/app/invoices/${item.id}`}>
                        {item.invoiceNumber}
                      </Link>
                      <span>{item.reason}</span>
                    </div>
                    <b>
                      {new Intl.NumberFormat("en", {
                        style: "currency",
                        currency: item.currency,
                      }).format(Number(item.balanceDue))}
                    </b>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className="dashboard-panel">
            <span className="eyebrow">PAYMENT PROMISES</span>
            <h2>Dates clients provided.</h2>
            {dashboard.promises.length === 0 ? (
              <p className="empty-copy">No payment promises yet.</p>
            ) : (
              <ol className="compact-list">
                {dashboard.promises.slice(0, 5).map((item) => (
                  <li key={item.invoiceId}>
                    <Link href={`/app/invoices/${item.invoiceId}`}>
                      {item.promisedFor} · {item.clientName}
                    </Link>
                    <span>{item.active ? "Upcoming" : "Past due"}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className="dashboard-panel">
            <span className="eyebrow">RECENT ACTIVITY</span>
            <h2>Verified invoice events.</h2>
            {dashboard.recentActivity.length === 0 ? (
              <p className="empty-copy">Activity will appear here.</p>
            ) : (
              <ol className="compact-list">
                {dashboard.recentActivity.slice(0, 7).map((event) => (
                  <li key={event.id}>
                    <Link href={`/app/invoices/${event.invoiceId}`}>
                      {activityLabels[event.type] ??
                        event.type.replaceAll("_", " ").toLowerCase()}
                    </Link>
                    <span>
                      {event.invoiceNumber} · {event.clientName}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className="dashboard-panel revenue-panel">
            <span className="eyebrow">REVENUE TREND</span>
            <h2>Confirmed payments · six months</h2>
            <div className="revenue-chart">
              {dashboard.revenue.map((row) => {
                const total = Object.values(row.values).reduce(
                  (sum, value) => sum + Number(value),
                  0,
                );
                return (
                  <div key={row.month}>
                    <div className="revenue-bar-track">
                      <span
                        style={{
                          height: `${Math.max(total ? 8 : 0, (total / maxRevenue) * 100)}%`,
                        }}
                      />
                    </div>
                    <small>{row.month.slice(5)}</small>
                    <span>
                      {Object.entries(row.values)
                        .map(([currency, value]) => `${currency} ${value}`)
                        .join(" · ") || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        {dashboard.pendingConfirmations > 0 && (
          <Link className="inbox-callout" href="/app/payments">
            <Inbox />
            <span>
              <strong>
                {dashboard.pendingConfirmations} confirmation
                {dashboard.pendingConfirmations === 1 ? "" : "s"} waiting
              </strong>
              <small>Review before balances change.</small>
            </span>
            <ArrowRight />
          </Link>
        )}
      </main>
    </div>
  );
}
