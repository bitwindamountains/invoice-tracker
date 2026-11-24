"use client";
import { useState } from "react";

// Posts to /api/demo with fetch so pending and errors show in place; without JS the plain form POST still works.
function DemoForm({ idle, pendingLabel, className }: { idle: string; pendingLabel: string; className: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function start(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/demo", { method: "POST", headers: { Accept: "application/json" } });
      // Full navigation on purpose: the new demo cookie must reach the server render.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (response.ok) return window.location.assign("/app");
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(response.status === 429 ? "You've started several demos recently. Please try again in a little while." : body?.error || "The demo could not be started. Please try again.");
    } catch {
      setError("The demo could not be started. Please try again.");
    }
    setPending(false);
  }
  const alert = error && <p role="alert" className="demo-error">{error}</p>;
  return (
    <form method="post" action="/api/demo" onSubmit={start}>
      <button className={className} disabled={pending}>{pending ? pendingLabel : idle}</button>
      <span className="sr-only" role="status">{pending ? "Starting your demo, this can take a minute." : ""}</span>
      {alert}
    </form>
  );
}

export function DemoBanner({ expiresAt }: { expiresAt: string }) {
  const [hours] = useState(() => Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3_600_000)));
  return (
    <div className="demo-banner" role="status">
      <span suppressHydrationWarning>Demo workspace · sample data · emails aren&apos;t delivered · resets in {hours}h</span>
      <DemoForm idle="Start over" pendingLabel="Starting over… (can take a minute)" className="demo-banner-action" />
    </div>
  );
}

export function DemoCta() {
  return <DemoForm idle="Try the live demo" pendingLabel="Starting your demo… (first start can take a minute)" className="button primary hero-cta" />;
}
