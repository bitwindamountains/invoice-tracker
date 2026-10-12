import Link from "next/link";
import { ViewTransition } from "react";
import { ArrowRight, FilePlus2, FileText, Search } from "lucide-react";
import { InvoiceStatus } from "@/components/ui/status-chip";
import { formatMoney } from "@/components/ui/money";
import { requireSession } from "@/lib/session";
import { listInvoices } from "@/services/invoices";
import { ensurePersonalWorkspace } from "@/services/workspace";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const statuses = [
  ["all", "All"],
  ["DRAFT", "Draft"],
  ["SENT", "Sent"],
  ["PARTIALLY_PAID", "Partially paid"],
  ["PAID", "Paid"],
  ["VOID", "Void"],
] as const;
function href(search: string, status: string, page: number) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status !== "all") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  return `/app/invoices${params.size ? `?${params}` : ""}`;
}
const day = (date: Date) => date.toISOString().slice(0, 10);

export default async function InvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  const raw = await searchParams;
  const status = typeof raw.status === "string" && statuses.some(([value]) => value === raw.status) ? raw.status : "all";
  const { items, total, page, pages, query } = await listInvoices(user.id, workspace.id, { search: typeof raw.search === "string" ? raw.search : "", status, page: typeof raw.page === "string" ? raw.page : 1 });
  const filtered = Boolean(query.search || query.status !== "all");
  return (
    <div className="workspace">
      <main id="main" className="clients-main">
        <div className="page-title-row">
          <div>
            <h1>Invoices</h1>
            <p>Create accurate drafts with verified server-side totals.</p>
          </div>
          <Link className="button primary" href="/app/invoices/new"><FilePlus2 size={17} aria-hidden />New invoice</Link>
        </div>
        <nav className="segmented" aria-label="Filter by status">
          {statuses.map(([value, label]) => (
            <Link key={value} href={href(query.search, value, 1)} aria-current={query.status === value ? "page" : undefined} className={query.status === value ? "is-active" : undefined}>{label}</Link>
          ))}
        </nav>
        <form className="client-filters" method="get">
          <label className="search-field">
            <span className="sr-only">Search invoices</span>
            <Search size={17} aria-hidden />
            <input name="search" defaultValue={query.search} placeholder="Search invoice number or client" />
          </label>
          {query.status !== "all" && <input type="hidden" name="status" value={query.status} />}
          <button className="button secondary">Search</button>
          {filtered && <Link className="filter-clear" href="/app/invoices">Clear</Link>}
        </form>
        <div className="list-summary">
          <span>{total} {total === 1 ? "invoice" : "invoices"}</span>
          {pages > 1 && <span>Page {page} of {pages}</span>}
        </div>
        {items.length ? (
          <>
            <div className="client-table-wrap">
              <table className="client-table invoice-table">
                <thead>
                  <tr><th>Invoice</th><th>Client</th><th>Due</th><th className="num">Total</th><th className="num">Balance</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody className="stagger">
                  {items.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <ViewTransition name={`invoice-${invoice.id}`} share="morph" default="none">
                          <strong className="invoice-number">{invoice.invoiceNumber}</strong>
                        </ViewTransition>
                        <span>Issued {day(invoice.issueDate)}</span>
                      </td>
                      <td><strong>{invoice.clientName}</strong><span>{invoice.clientEmail}</span></td>
                      <td>{day(invoice.dueDate)}</td>
                      <td className="num"><strong>{formatMoney(invoice.total, invoice.currency)}</strong></td>
                      <td className="num">{invoice.status === "DRAFT" || invoice.status === "VOID" ? <span>—</span> : <strong className={Number(invoice.balanceDue) > 0 ? undefined : "settled"}>{formatMoney(invoice.balanceDue, invoice.currency)}</strong>}</td>
                      <td><InvoiceStatus status={invoice.status} dueDate={invoice.dueDate} /></td>
                      <td><Link className="row-link" href={`/app/invoices/${invoice.id}`} aria-label={`View ${invoice.invoiceNumber}`}>View<ArrowRight size={14} aria-hidden /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="client-cards stagger">
              {items.map((invoice) => (
                <Link className="client-card invoice-card" key={invoice.id} href={`/app/invoices/${invoice.id}`}>
                  <div><strong>{invoice.invoiceNumber}</strong><InvoiceStatus status={invoice.status} dueDate={invoice.dueDate} /></div>
                  <p>{invoice.clientName}</p>
                  <div className="invoice-card-foot">
                    <strong className="catalog-price">{formatMoney(invoice.status === "DRAFT" || invoice.status === "VOID" ? invoice.total : invoice.balanceDue, invoice.currency)}</strong>
                    <small>Due {day(invoice.dueDate)}</small>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <section className="empty-state">
            <div className="panel-icon"><FileText aria-hidden /></div>
            <h2>{filtered ? "No matching invoices" : "Create your first invoice"}</h2>
            <p>{filtered ? "Try another search or clear the filters." : "Build a draft with client details, line items, discounts, and tax."}</p>
            <Link className="button primary" href="/app/invoices/new">Create invoice</Link>
          </section>
        )}
        {pages > 1 && (
          <nav className="pagination" aria-label="Invoice pages">
            <Link className={`button secondary ${page <= 1 ? "disabled" : ""}`} href={href(query.search, query.status, Math.max(1, page - 1))}>Previous</Link>
            <span>Page {page} of {pages}</span>
            <Link className={`button secondary ${page >= pages ? "disabled" : ""}`} href={href(query.search, query.status, Math.min(pages, page + 1))}>Next</Link>
          </nav>
        )}
      </main>
    </div>
  );
}
