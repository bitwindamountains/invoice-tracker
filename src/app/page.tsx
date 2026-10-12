import Link from "next/link";
import { ArrowRight, CalendarClock, CircleCheck, Eye, Send, Wallet } from "lucide-react";
import { Brand } from "@/components/brand";

const story = [
  { icon: Send, label: "Invoice sent", detail: "Mon 9:12 AM" },
  { icon: Eye, label: "Opened by client", detail: "Mon 2:40 PM" },
  { icon: CalendarClock, label: "Promised for Friday", detail: "Reminders paused" },
  { icon: Wallet, label: "₱22,500 received", detail: "Partial payment" },
  { icon: CircleCheck, label: "Paid in full", detail: "Fri 10:05 AM" },
];

export default function Home() {
  return (
    <div className="landing">
      <header className="site-header">
        <Brand />
        <Link className="button secondary" href="/login">
          Sign in <ArrowRight size={16} />
        </Link>
      </header>
      <main id="main" className="landing-main">
        <div className="hero-copy">
          <h1>
            Good work deserves
            <br />
            <span>a paid invoice.</span>
          </h1>
          <p>A calmer way to follow through. Bring your invoices, client commitments, and payment conversations into one focused workspace.</p>
          <Link className="button primary hero-cta" href="/register">
            Create your workspace <ArrowRight size={18} />
          </Link>
          <span className="hero-note">Early development preview · Account setup available</span>
        </div>
        <section className="preview story-card" aria-label="Illustration of the planned collection workflow">
          <div className="story-head">
            <div>
              <strong>INV-1042</strong>
              <span>Harbor &amp; Pine · Brand identity</span>
            </div>
            <span className="story-status" aria-hidden>
              <span className="chip story-chip s1">Sent</span>
              <span className="chip chip-info story-chip s2">Viewed</span>
              <span className="chip chip-info story-chip s3">Promised</span>
              <span className="chip chip-success story-chip s4">Paid</span>
            </span>
          </div>
          <div className="story-amount">
            <span>Balance due</span>
            <strong className="story-figure" aria-hidden>
              <span className="f1">₱45,000.00</span>
              <span className="f2">₱22,500.00</span>
              <span className="f3">₱0.00</span>
            </strong>
            <div className="story-bar"><span /></div>
          </div>
          <ol className="story-timeline">
            {story.map(({ icon: Icon, label, detail }, index) => (
              <li key={label} style={{ "--step": index } as React.CSSProperties}>
                <span className="tl-icon"><Icon size={14} aria-hidden /></span>
                <strong>{label}</strong>
                <small>{detail}</small>
              </li>
            ))}
          </ol>
          <p className="story-caption">Illustrative example. From sent to settled, with every step recorded.</p>
        </section>
      </main>
      <footer className="site-footer">
        <span>Made for independent work.</span>
        <span>Invoice Tracker · Foundation release</span>
      </footer>
    </div>
  );
}
