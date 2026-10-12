import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, Plus, Search, Users } from "lucide-react";
import { requireSession } from "@/lib/session";
import { listClients } from "@/services/clients";
import { ensurePersonalWorkspace } from "@/services/workspace";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function queryHref(search: string, status: string, page: number) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status === "archived") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/app/clients${query ? `?${query}` : ""}`;
}

export default async function ClientsPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  if (!workspace.onboardingCompletedAt) redirect("/onboarding");
  const raw = await searchParams;
  const result = await listClients(user.id, workspace.id, {
    search: typeof raw.search === "string" ? raw.search : "",
    status: raw.status === "archived" ? "archived" : "active",
    page: typeof raw.page === "string" ? raw.page : 1,
  });
  const { items, total, page, pages, query } = result;
  return <div className="workspace">
    <main id="main" className="clients-main">
      <div className="page-title-row"><div><span className="eyebrow">CLIENT DIRECTORY</span><h1>Clients</h1><p>Keep billing details and client history in one place.</p></div><Link className="button primary" href="/app/clients/new"><Plus size={17}/>New client</Link></div>
      <form className="client-filters" method="get">
        <label className="search-field"><span className="sr-only">Search clients</span><Search size={17}/><input name="search" defaultValue={query.search} placeholder="Search name, company, email or phone" maxLength={100}/></label>
        <label><span className="sr-only">Client status</span><select name="status" defaultValue={query.status}><option value="active">Active clients</option><option value="archived">Archived clients</option></select></label>
        <button className="button secondary" type="submit">Apply</button>
        {(query.search || query.status === "archived") && <Link className="filter-clear" href="/app/clients">Clear</Link>}
      </form>
      <div className="list-summary"><span>{total} {query.status} {total === 1 ? "client" : "clients"}</span>{pages > 1 && <span>Page {page} of {pages}</span>}</div>
      {items.length ? <>
        <div className="client-table-wrap"><table className="client-table"><thead><tr><th>Client</th><th>Contact</th><th>Currency</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{items.map((client) => <tr key={client.id}><td><strong>{client.name}</strong>{client.company && <span>{client.company}</span>}</td><td><a href={`mailto:${client.email}`}>{client.email}</a>{client.phone && <span>{client.phone}</span>}</td><td>{client.currency ?? workspace.defaultCurrency}</td><td><span className={`status-badge ${client.archivedAt ? "archived" : "active"}`}>{client.archivedAt ? "Archived" : "Active"}</span></td><td><Link className="row-link" href={`/app/clients/${client.id}`}>View</Link></td></tr>)}</tbody></table></div>
        <div className="client-cards">{items.map((client) => <article className="client-card" key={client.id}><div><strong>{client.name}</strong><span className={`status-badge ${client.archivedAt ? "archived" : "active"}`}>{client.archivedAt ? "Archived" : "Active"}</span></div>{client.company && <p>{client.company}</p>}<a href={`mailto:${client.email}`}>{client.email}</a><small>{client.currency ?? workspace.defaultCurrency}</small><Link className="button secondary full" href={`/app/clients/${client.id}`}>View client</Link></article>)}</div>
      </> : <section className="empty-state"><div className="panel-icon">{query.status === "archived" ? <Archive/> : <Users/>}</div><h2>{query.search ? "No matching clients" : query.status === "archived" ? "No archived clients" : "Add your first client"}</h2><p>{query.search ? "Try a different search or clear the filters." : query.status === "archived" ? "Clients you archive will stay available here." : "Create a client once, then reuse their billing details on every invoice."}</p>{query.search ? <Link className="button secondary" href={queryHref("", query.status, 1)}>Clear search</Link> : query.status === "active" && <Link className="button primary" href="/app/clients/new"><Plus size={17}/>Create client</Link>}</section>}
      {pages > 1 && <nav className="pagination" aria-label="Client pages"><Link aria-disabled={page <= 1} className={`button secondary ${page <= 1 ? "disabled" : ""}`} href={page <= 1 ? queryHref(query.search, query.status, 1) : queryHref(query.search, query.status, page - 1)}>Previous</Link><span>Page {page} of {pages}</span><Link aria-disabled={page >= pages} className={`button secondary ${page >= pages ? "disabled" : ""}`} href={page >= pages ? queryHref(query.search, query.status, pages) : queryHref(query.search, query.status, page + 1)}>Next</Link></nav>}
    </main>
  </div>;
}
