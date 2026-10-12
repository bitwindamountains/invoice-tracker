import Link from "next/link";
import { Activity } from "lucide-react";
import { eventMeta } from "@/components/ui/event-meta";
import { requireSession } from "@/lib/session";
import { getWorkspaceActivity } from "@/services/payment-intelligence";
import { ensurePersonalWorkspace } from "@/services/workspace";

export const metadata = { title: "Activity" };
const filters = [["all", "Everything"], ["payments", "Payments"], ["delivery", "Sending & reminders"], ["views", "Views"]] as const;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ page?: string; type?: string }> }) {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  const raw = await searchParams;
  const feed = await getWorkspaceActivity(user.id, workspace.id, raw.page, raw.type);
  const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: workspace.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const today = dayKey(new Date());
  const yesterdayDate = new Date(`${today}T00:00:00Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  const groups = new Map<string, typeof feed.events>();
  for (const event of feed.events) {
    const key = dayKey(event.createdAt);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  const heading = (key: string) => key === today ? "Today" : key === yesterday ? "Yesterday" : new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
  const link = (type: string, page: number) => { const params = new URLSearchParams(); if (type !== "all") params.set("type", type); if (page > 1) params.set("page", String(page)); return `/app/activity${params.size ? `?${params}` : ""}`; };
  return (
    <div className="workspace">
      <main id="main" className="clients-main activity-main">
        <div className="page-title-row">
          <div>
            <h1>Activity</h1>
            <p>Every send, view, promise and payment across your invoices, as it was recorded.</p>
          </div>
        </div>
        <nav className="segmented" aria-label="Filter activity">
          {filters.map(([value, label]) => <Link key={value} href={link(value, 1)} aria-current={feed.type === value ? "page" : undefined} className={feed.type === value ? "is-active" : undefined}>{label}</Link>)}
        </nav>
        {feed.events.length === 0 ? (
          <section className="empty-state">
            <div className="panel-icon"><Activity aria-hidden /></div>
            <h2>No activity yet</h2>
            <p>Send an invoice and its delivery, views and payments will be logged here.</p>
            <Link className="button primary" href="/app/invoices/new">Create invoice</Link>
          </section>
        ) : (
          [...groups].map(([key, events]) => (
            <section key={key} className="activity-day">
              <h2>{heading(key)}</h2>
              <ol className="timeline feed stagger">
                {events.map((event) => {
                  const meta = eventMeta(event.type);
                  const Icon = meta.icon;
                  return (
                    <li key={event.id} className={`tl-${meta.tone}`}>
                      <span className="tl-icon"><Icon size={14} aria-hidden /></span>
                      <span className="feed-line">
                        <strong>{meta.label}</strong>
                        <span><Link href={`/app/invoices/${event.invoiceId}`}>{event.invoiceNumber}</Link> · {event.clientName}</span>
                      </span>
                      <time dateTime={event.createdAt.toISOString()}>{event.createdAt.toLocaleTimeString("en", { timeZone: workspace.timezone, hour: "numeric", minute: "2-digit" })}</time>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))
        )}
        {feed.pages > 1 && (
          <nav className="pagination" aria-label="Activity pages">
            <Link className={`button secondary ${feed.page <= 1 ? "disabled" : ""}`} href={link(feed.type, Math.max(1, feed.page - 1))}>Newer</Link>
            <span>Page {feed.page} of {feed.pages}</span>
            <Link className={`button secondary ${feed.page >= feed.pages ? "disabled" : ""}`} href={link(feed.type, Math.min(feed.pages, feed.page + 1))}>Older</Link>
          </nav>
        )}
      </main>
    </div>
  );
}
