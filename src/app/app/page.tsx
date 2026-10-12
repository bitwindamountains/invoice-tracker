import Link from "next/link";
import { ArrowRight, CalendarClock, CircleCheck, FilePlus2, Inbox, TriangleAlert } from "lucide-react";
import { eventMeta } from "@/components/ui/event-meta";
import { Chip } from "@/components/ui/status-chip";
import { formatMoney, MoneyStack } from "@/components/ui/money";
import { requireSession } from "@/lib/session";
import { getPaymentDashboard } from "@/services/payment-intelligence";
import { ensurePersonalWorkspace } from "@/services/workspace";


function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export default async function Workspace() {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  const dashboard = await getPaymentDashboard(user.id, workspace.id);
  const currency = workspace.defaultCurrency in dashboard.outstanding ? workspace.defaultCurrency : Object.keys(dashboard.outstanding)[0];
  const outstanding = Number(dashboard.outstanding[currency] ?? 0);
  const overdue = Number(dashboard.overdue[currency] ?? 0);
  const dueSoon = Number(dashboard.dueThisWeek[currency] ?? 0);
  const later = Math.max(0, outstanding - overdue - dueSoon);
  const segments = outstanding
    ? [
        { key: "overdue", label: "Overdue", value: overdue },
        { key: "soon", label: "Due in 7 days", value: dueSoon },
        { key: "later", label: "Later", value: later },
      ].filter((segment) => segment.value > 0)
    : [];
  const revenueTotals = dashboard.revenue.map((row) => Object.values(row.values).reduce((sum, value) => sum + Number(value), 0));
  const maxRevenue = Math.max(1, ...revenueTotals);
  const longDate = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${dashboard.asOf}T00:00:00Z`));

  return (
    <div className="workspace">
      <main id="main" className="dashboard-main">
        <div className="page-title-row">
          <div>
            <span className="page-date">{longDate}</span>
            <h1>Here’s what needs attention.</h1>
            <p>Every figure reconciles with confirmed payment and invoice records.</p>
          </div>
          <Link className="button primary" href="/app/invoices/new">
            <FilePlus2 size={17} aria-hidden />
            New invoice
          </Link>
        </div>

        <section className="dash-kpis" aria-label="Payment totals">
          <article className="kpi kpi-lead">
            <span className="kpi-label">Outstanding</span>
            <MoneyStack values={dashboard.outstanding} roll />
            <small>Across {plural(dashboard.counts.open, "open invoice")}</small>
            {segments.length > 0 && (
              <div className="collection-meter" aria-label="Outstanding by due date">
                <div className="meter-track">
                  {segments.map((segment, index) => (
                    <span key={segment.key} className={`meter-seg seg-${segment.key}`} style={{ flexGrow: segment.value, "--i": index } as React.CSSProperties} title={`${segment.label}: ${formatMoney(segment.value, currency)}`} />
                  ))}
                </div>
                <ul className="meter-legend">
                  {segments.map((segment) => (
                    <li key={segment.key}><i className={`seg-${segment.key}`} aria-hidden />{segment.label}<b>{formatMoney(segment.value, currency)}</b></li>
                  ))}
                </ul>
              </div>
            )}
          </article>
          <article className="kpi kpi-danger">
            <span className="kpi-label"><TriangleAlert size={15} aria-hidden />Overdue</span>
            <MoneyStack values={dashboard.overdue} roll />
            <small>{dashboard.counts.overdue ? plural(dashboard.counts.overdue, "invoice") + " past due" : "Nothing past due"}</small>
          </article>
          <article className="kpi">
            <span className="kpi-label"><CalendarClock size={15} aria-hidden />Due in 7 days</span>
            <MoneyStack values={dashboard.dueThisWeek} roll />
            <small>{dashboard.counts.dueThisWeek ? plural(dashboard.counts.dueThisWeek, "invoice") : "No invoices due this week"}</small>
          </article>
          <article className="kpi kpi-success">
            <span className="kpi-label"><CircleCheck size={15} aria-hidden />Paid this month</span>
            <MoneyStack values={dashboard.paidThisMonth} roll />
            <small>Confirmed payments only</small>
          </article>
        </section>

        {dashboard.pendingConfirmations > 0 && (
          <Link className="inbox-callout" href="/app/payments">
            <span className="inbox-callout-icon"><Inbox size={19} aria-hidden /></span>
            <span>
              <strong>{plural(dashboard.pendingConfirmations, "confirmation")} waiting</strong>
              <small>Review before balances change.</small>
            </span>
            <ArrowRight size={18} aria-hidden />
          </Link>
        )}

        <div className="dashboard-grid">
          <section className="dashboard-panel attention-panel">
            <div className="panel-title">
              <div>
                <h2>Act on the next invoice.</h2>
                <p className="panel-sub">{dashboard.attention.length ? `${plural(dashboard.attention.length, "invoice")} need a next step` : "Overdue, due-soon and review items appear here"}</p>
              </div>
              <Link className="panel-link" href="/app/get-paid">View Get Paid <ArrowRight size={15} aria-hidden /></Link>
            </div>
            {dashboard.attention.length === 0 ? (
              <div className="panel-empty"><CircleCheck size={22} aria-hidden /><p>Nothing needs attention today. New invoices you send will show up here as they come due.</p></div>
            ) : (
              <ol className="attention-list stagger">
                {dashboard.attention.slice(0, 6).map((item) => {
                  const tone = item.priority === 0 ? "warning" : item.priority === 1 ? "danger" : "info";
                  return (
                    <li key={item.id}>
                      <Link className="attention-row" href={item.priority === 0 ? "/app/payments" : `/app/invoices/${item.id}`}>
                        <span className="attention-client">
                          <strong>{item.clientName}</strong>
                          <span>{item.invoiceNumber}</span>
                        </span>
                        <Chip tone={tone} label={item.reason} />
                        <b className="money">{formatMoney(item.balanceDue, item.currency)}</b>
                        <ArrowRight className="row-arrow" size={16} aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <div className="dashboard-side">
            <section className="dashboard-panel">
              <h2>Dates clients provided.</h2>
              {dashboard.promises.length === 0 ? (
                <p className="empty-copy">No payment promises yet. When a client picks a date on their invoice link, it lands here and pauses reminders until then.</p>
              ) : (
                <ol className="promise-list">
                  {dashboard.promises.slice(0, 5).map((item) => (
                    <li key={item.invoiceId}>
                      <Link href={`/app/invoices/${item.invoiceId}`}>
                        <span className="promise-date"><b>{item.promisedFor.slice(8)}</b><small>{new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(new Date(`${item.promisedFor}T00:00:00Z`))}</small></span>
                        <span><strong>{item.clientName}</strong><small>{item.invoiceNumber} · {formatMoney(item.balanceDue, item.currency)}</small></span>
                        <Chip tone={item.active ? "info" : "danger"} label={item.active ? "Upcoming" : "Past due"} />
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <section className="dashboard-panel">
              <div className="panel-title">
                <h2>Verified invoice events.</h2>
                <Link className="panel-link" href="/app/activity">All activity <ArrowRight size={15} aria-hidden /></Link>
              </div>
              {dashboard.recentActivity.length === 0 ? (
                <p className="empty-copy">Activity will appear here once you send your first invoice.</p>
              ) : (
                <ol className="timeline">
                  {dashboard.recentActivity.slice(0, 6).map((event) => {
                    const meta = eventMeta(event.type);
                    const Icon = meta.icon;
                    return (
                      <li key={event.id} className={`tl-${meta.tone}`}>
                        <span className="tl-icon"><Icon size={14} aria-hidden /></span>
                        <Link href={`/app/invoices/${event.invoiceId}`}>{meta.label}</Link>
                        <span>{event.invoiceNumber} · {event.clientName}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>

          <section className="dashboard-panel revenue-panel">
            <div className="panel-title">
              <div>
                <h2>Confirmed payments · six months</h2>
                <p className="panel-sub">Cash received, by month</p>
              </div>
              <Link className="panel-link" href="/app/reports">Reports <ArrowRight size={15} aria-hidden /></Link>
            </div>
            <div className="revenue-chart" role="list">
              {dashboard.revenue.map((row, index) => {
                const total = revenueTotals[index];
                const label = Object.entries(row.values).map(([code, value]) => formatMoney(value, code)).join(" · ") || "No payments";
                const month = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(new Date(`${row.month}-01T00:00:00Z`));
                return (
                  <div key={row.month} role="listitem" className={`revenue-col${index === dashboard.revenue.length - 1 ? " is-current" : ""}`} tabIndex={0} aria-label={`${month}: ${label}`}>
                    <span className="revenue-tip" aria-hidden>{label}</span>
                    <div className="revenue-bar-track">
                      <span style={{ height: `${Math.max(total ? 6 : 0, (total / maxRevenue) * 100)}%`, "--i": index } as React.CSSProperties} />
                    </div>
                    <small>{month}</small>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
