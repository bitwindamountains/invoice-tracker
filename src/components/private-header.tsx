import Link from "next/link";
import { Brand } from "./brand";
import { SignOut } from "./sign-out";

export function PrivateHeader({
  businessName,
  showSettings = true,
  showAppNavigation = true,
}: {
  businessName?: string;
  showSettings?: boolean;
  showAppNavigation?: boolean;
}) {
  return (
    <header className="site-header private-header">
      <Brand />
      <nav aria-label="Account navigation">
        {businessName && (
          <span className="business-context">{businessName}</span>
        )}
        {showAppNavigation && <Link className="header-link" href="/app">Dashboard</Link>}
        {showAppNavigation && <Link className="header-link" href="/app/get-paid">Get Paid</Link>}
        {showAppNavigation && <Link className="header-link" href="/app/reminders">Follow-ups</Link>}
        {showAppNavigation && <Link className="header-link" href="/app/clients">Clients</Link>}
        {showAppNavigation && <Link className="header-link" href="/app/catalog">Catalog</Link>}
        {showAppNavigation && <Link className="header-link" href="/app/invoices">Invoices</Link>}
        {showAppNavigation && <Link className="header-link" href="/app/payments">Payments</Link>}
        {showAppNavigation && <Link className="header-link" href="/app/expenses">Expenses</Link>}
        {showAppNavigation && <Link className="header-link" href="/app/reports">Reports</Link>}
        {showSettings && (
          <Link className="button secondary" href="/app/settings/business">
            Business settings
          </Link>
        )}
        <SignOut />
      </nav>
    </header>
  );
}
