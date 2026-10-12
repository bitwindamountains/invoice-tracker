import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Building2, FileText, Mail, MapPin, Pencil, Phone } from "lucide-react";
import { ArchiveControl } from "@/features/clients/archive-control";
import { requireSession } from "@/lib/session";
import {
  ClientAccessDenied,
  ClientNotFound,
  getClient,
} from "@/services/clients";
import { getClientPaymentMetrics } from "@/services/payment-intelligence";
import { ensurePersonalWorkspace } from "@/services/workspace";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  if (!workspace.onboardingCompletedAt) redirect("/onboarding");
  let client;
  try {
    client = await getClient(user.id, workspace.id, (await params).clientId);
  } catch (error) {
    if (error instanceof ClientNotFound || error instanceof ClientAccessDenied)
      notFound();
    throw error;
  }
  const address = [
    client.addressLine1,
    client.addressLine2,
    client.city,
    client.provinceState,
    client.postalCode,
    client.country,
  ].filter(Boolean);
  const metrics = await getClientPaymentMetrics(user.id, workspace.id, client.id);
  const amounts = (values: Record<string, string>) => Object.entries(values).map(([currency, value]) => new Intl.NumberFormat("en", { style: "currency", currency }).format(Number(value))).join(" · ") || "—";
  return (
    <div className="workspace">
      <main id="main" className="client-detail-main">
        <Link className="back-link" href="/app/clients">
          ← All clients
        </Link>
        <div className="page-title-row">
          <div>
            <span
              className={`status-badge ${client.archivedAt ? "archived" : "active"}`}
            >
              {client.archivedAt ? "Archived" : "Active"}
            </span>
            <h1>{client.name}</h1>
            {client.company && <p>{client.company}</p>}
          </div>
          <div className="detail-actions">
            <Link
              className="button secondary"
              href={`/app/clients/${client.id}/edit`}
            >
              <Pencil size={17} />
              Edit client
            </Link>
            <ArchiveControl
              clientId={client.id}
              name={client.name}
              version={client.version}
              archived={Boolean(client.archivedAt)}
            />
          </div>
        </div>
        <div className="client-stats">
          <section>
            <span>Outstanding</span>
            <strong>{amounts(metrics.outstanding)}</strong>
            <small>{metrics.invoiceCount} issued invoice{metrics.invoiceCount === 1 ? "" : "s"}</small>
          </section>
          <section>
            <span>Total revenue</span>
            <strong>{amounts(metrics.totalRevenue)}</strong>
            <small>{metrics.paidInvoiceCount} fully paid invoice{metrics.paidInvoiceCount === 1 ? "" : "s"}</small>
          </section>
          <section>
            <span>Average payment time</span>
            <strong>{metrics.averageDaysToPayment === null ? "—" : `${metrics.averageDaysToPayment} days`}</strong>
            <small>{metrics.averageDaysEarlyLate === null ? "No paid history yet" : `${Math.abs(metrics.averageDaysEarlyLate)} days ${metrics.averageDaysEarlyLate > 0 ? "after" : metrics.averageDaysEarlyLate < 0 ? "before" : "on"} due date`}</small>
          </section>
        </div>
        <div className="detail-grid">
          <section className="detail-panel">
            <h2>Contact details</h2>
            <dl>
              <div>
                <dt>
                  <Mail size={17} />
                  Email
                </dt>
                <dd>
                  <a href={`mailto:${client.email}`}>{client.email}</a>
                </dd>
              </div>
              <div>
                <dt>
                  <Phone size={17} />
                  Phone
                </dt>
                <dd>{client.phone ?? "Not provided"}</dd>
              </div>
              <div>
                <dt>
                  <Building2 size={17} />
                  Tax ID
                </dt>
                <dd>{client.taxId ?? "Not provided"}</dd>
              </div>
              <div>
                <dt>
                  <MapPin size={17} />
                  Billing address
                </dt>
                <dd>
                  {address.length
                    ? address.map((part) => (
                        <span key={part!}>
                          {part}
                          <br />
                        </span>
                      ))
                    : "Not provided"}
                </dd>
              </div>
            </dl>
          </section>
          <section className="detail-panel">
            <h2>Private notes</h2>
            <p className={client.notes ? "client-notes" : "muted-copy"}>
              {client.notes ?? "No private notes have been added."}
            </p>
          </section>
        </div>
        <section className="invoice-empty">
          <FileText />
          <div>
            <h2>Invoices</h2>
            <p>Invoices for this client will appear here.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
