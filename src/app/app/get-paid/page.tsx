import Link from "next/link";
import { ArrowRight, CircleCheck, Inbox } from "lucide-react";
import { Chip, InvoiceStatus } from "@/components/ui/status-chip";
import { formatMoney } from "@/components/ui/money";
import { ManualReminder } from "@/features/reminders/manual-reminder";
import { requireSession } from "@/lib/session";
import { getPaymentDashboard } from "@/services/payment-intelligence";
import { ensurePersonalWorkspace } from "@/services/workspace";

const tabs = [
  { key: "attention", label: "Needs attention" },
  { key: "overdue", label: "Overdue" },
  { key: "soon", label: "Due soon" },
  { key: "promises", label: "Promises" },
  { key: "partial", label: "Partial" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

export default async function GetPaidPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  const data = await getPaymentDashboard(user.id, workspace.id);
  const requested = (await searchParams).view;
  const view: TabKey = tabs.some((tab) => tab.key === requested) ? (requested as TabKey) : "attention";
  const reasons = new Map(data.attention.map((item) => [item.id, item]));
  const lists: Record<TabKey, typeof data.open> = {
    attention: data.open.filter((invoice) => reasons.has(invoice.id)).sort((a, b) => reasons.get(a.id)!.priority - reasons.get(b.id)!.priority || a.daysFromDue - b.daysFromDue),
    overdue: data.open.filter((invoice) => invoice.daysFromDue < 0 && !invoice.promiseActive),
    soon: data.open.filter((invoice) => invoice.daysFromDue >= 0 && invoice.daysFromDue <= 7),
    promises: data.open.filter((invoice) => invoice.promisedFor),
    partial: data.open.filter((invoice) => invoice.status === "PARTIALLY_PAID"),
  };
  const items = lists[view];
  const outstanding = Object.entries(data.outstanding).map(([currency, value]) => formatMoney(value, currency)).join(" · ") || formatMoney(0, workspace.defaultCurrency);
  const today = new Date(`${data.asOf}T00:00:00Z`);

  return (
    <div className="workspace">
      <main id="main" className="clients-main">
        <div className="page-title-row">
          <div>
            <h1>Invoices that need a next step.</h1>
            <p><strong className="money">{outstanding}</strong> outstanding · {lists.attention.length} {lists.attention.length === 1 ? "invoice needs" : "invoices need"} attention. Active promises pause overdue attention until their date passes.</p>
          </div>
        </div>
        <nav className="segmented" aria-label="Get Paid views">
          {tabs.map((tab) => (
            <Link key={tab.key} href={tab.key === "attention" ? "/app/get-paid" : `/app/get-paid?view=${tab.key}`} aria-current={view === tab.key ? "page" : undefined} className={view === tab.key ? "is-active" : undefined}>
              {tab.label}
              <span className="segmented-count">{lists[tab.key].length}</span>
            </Link>
          ))}
        </nav>
        {items.length === 0 ? (
          <section className="empty-state">
            <div className="panel-icon"><CircleCheck aria-hidden /></div>
            <h2>{view === "attention" ? "You’re caught up." : "Nothing in this view."}</h2>
            <p>{view === "attention" ? "No invoices are overdue, due this week, or waiting for confirmation review." : "Invoices move here automatically as due dates, promises and partial payments change."}</p>
          </section>
        ) : (
          <section className="get-paid-list stagger" key={view}>
            {items.map((invoice) => {
              const reason = reasons.get(invoice.id);
              const tone = !reason ? "neutral" : reason.priority === 0 ? "warning" : reason.priority === 1 ? "danger" : "info";
              const balance = formatMoney(invoice.balanceDue, invoice.currency);
              return (
                <article key={invoice.id} className="collect-card">
                  <div className="collect-main">
                    <div className="collect-head">
                      <h2>{invoice.clientName}</h2>
                      {reason ? <Chip tone={tone} label={reason.reason} pulse={reason.priority === 1} /> : <InvoiceStatus status={invoice.status} dueDate={new Date(`${invoice.dueDate}T00:00:00Z`)} today={today} />}
                      {reason && invoice.status === "PARTIALLY_PAID" && <Chip tone="info" label="Partially paid" />}
                    </div>
                    <p className="collect-meta">
                      <Link href={`/app/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link>
                      <span>Due {invoice.dueDate}</span>
                      {invoice.promisedFor && <span>Promised {invoice.promisedFor}</span>}
                      {invoice.status === "PARTIALLY_PAID" && <span>of {formatMoney(invoice.total, invoice.currency)}</span>}
                    </p>
                  </div>
                  <strong className="collect-amount money">{balance}</strong>
                  <div className="collect-actions">
                    {invoice.pendingConfirmations > 0 ? (
                      <Link className="button primary" href="/app/payments"><Inbox size={16} aria-hidden />Review</Link>
                    ) : (
                      <ManualReminder invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} clientName={invoice.clientName} balance={balance} dueDate={invoice.dueDate} businessName={workspace.name} />
                    )}
                    <Link className="button secondary" href={`/app/invoices/${invoice.id}`}>View invoice<ArrowRight size={15} aria-hidden /></Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
