import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  MessageSquare,
  Wallet,
} from "lucide-react";
import { Brand } from "@/components/brand";

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
          <span className="eyebrow">
            <span className="tiny-dot" /> LESS CHASING. MORE CLARITY.
          </span>
          <h1>
            Good work deserves
            <br />
            <span>a paid invoice.</span>
          </h1>
          <p>
            A calmer way to follow through. Bring your invoices, client
            commitments, and payment conversations into one focused workspace.
          </p>
          <Link className="button primary" href="/register">
            Create your workspace <ArrowRight size={18} />
          </Link>
          <span className="hero-note">
            Early development preview · Account setup available
          </span>
        </div>
        <section
          className="preview"
          aria-label="Illustration of the planned collection workflow"
        >
          <div className="preview-top">
            <span>
              <span className="tiny-dot" /> YOUR COLLECTION WORKSPACE
            </span>
            <span className="badge">Preview</span>
          </div>
          <h2>From sent to settled.</h2>
          <p>Know what happened. Know what comes next.</p>
          <div className="journey">
            <div>
              <span className="journey-icon">
                <FileText size={21} />
              </span>
              <section>
                <h3>Send with confidence</h3>
                <p>A clear invoice. Everything in one place.</p>
              </section>
              <Check size={18} />
            </div>
            <div>
              <span className="journey-icon">
                <MessageSquare size={21} />
              </span>
              <section>
                <h3>Follow up thoughtfully</h3>
                <p>Remember promises, without the sticky notes.</p>
              </section>
              <Check size={18} />
            </div>
            <div>
              <span className="journey-icon">
                <Wallet size={21} />
              </span>
              <section>
                <h3>See every payment</h3>
                <p>Partial payments. Full visibility.</p>
              </section>
              <Check size={18} />
            </div>
          </div>
          <div className="preview-footer">
            Built around the path to payment <ArrowUp />
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <span>Made for independent work.</span>
        <span>Invoice Tracker · Foundation release</span>
      </footer>
    </div>
  );
}
function ArrowUp() {
  return <ArrowRight size={18} />;
}
