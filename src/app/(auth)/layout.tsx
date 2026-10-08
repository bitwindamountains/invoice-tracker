import { Brand } from "@/components/brand";
import { Check } from "lucide-react";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <Brand />
        <div>
          <span className="eyebrow">FOLLOW THROUGH TO PAID</span>
          <h2>
            You do the work.
            <br />
            Keep the next step clear.
          </h2>
          <p>
            One place for the space between sending an invoice and getting paid.
          </p>
          <ul>
            <li>
              <Check size={18} />
              Clear invoices
            </li>
            <li>
              <Check size={18} />
              Thoughtful follow-ups
            </li>
            <li>
              <Check size={18} />
              Confident payment tracking
            </li>
          </ul>
        </div>
        <span className="aside-foot">
          Designed for freelancers & small businesses.
        </span>
      </aside>
      <main id="main" className="auth-main">
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
