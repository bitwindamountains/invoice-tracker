import Link from "next/link";
import { redirect } from "next/navigation";
import { PrivateHeader } from "@/components/private-header";
import { requireSession } from "@/lib/session";
import { getPaymentDashboard } from "@/services/payment-intelligence";
import { ensurePersonalWorkspace } from "@/services/workspace";
export default async function GetPaidPage() {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  if (!workspace.onboardingCompletedAt) redirect("/onboarding");
  const data = await getPaymentDashboard(user.id, workspace.id);
  return (
    <div className="workspace">
      <PrivateHeader businessName={workspace.name} />
      <main id="main" className="clients-main">
        <Link className="back-link" href="/app">
          ← Dashboard
        </Link>
        <div className="page-title-row">
          <div>
            <span className="eyebrow">GET PAID</span>
            <h1>Invoices that need a next step.</h1>
            <p>
              Active promises suppress overdue attention until their promised
              date passes.
            </p>
          </div>
        </div>
        {data.attention.length === 0 ? (
          <section className="empty-state">
            <h2>You’re caught up.</h2>
            <p>
              No invoices are overdue, due this week, or waiting for
              confirmation review.
            </p>
          </section>
        ) : (
          <section className="get-paid-list">
            {data.attention.map((item) => (
              <article key={item.id}>
                <div>
                  <span className="status-badge archived">{item.reason}</span>
                  <h2>{item.clientName}</h2>
                  <Link href={`/app/invoices/${item.id}`}>
                    {item.invoiceNumber}
                  </Link>
                </div>
                <strong>
                  {new Intl.NumberFormat("en", {
                    style: "currency",
                    currency: item.currency,
                  }).format(Number(item.balanceDue))}
                </strong>
                <Link
                  className="button secondary"
                  href={
                    item.reason.includes("confirmation")
                      ? "/app/payments"
                      : `/app/invoices/${item.id}`
                  }
                >
                  {item.reason.includes("confirmation")
                    ? "Review"
                    : "View invoice"}
                </Link>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
