"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";

function StartOver() {
  const { pending } = useFormStatus();
  return (
    <button className="demo-banner-action" disabled={pending}>
      {pending ? "Starting over…" : "Start over"}
    </button>
  );
}

export function DemoBanner({ expiresAt }: { expiresAt: string }) {
  const [hours] = useState(() => Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3_600_000)));
  return (
    <div className="demo-banner" role="status">
      <span suppressHydrationWarning>Demo workspace · sample data · emails aren&apos;t delivered · resets in {hours}h</span>
      <form method="post" action="/api/demo">
        <StartOver />
      </form>
    </div>
  );
}

export function DemoCta() {
  const { pending } = useFormStatus();
  return (
    <>
      <button className="button primary hero-cta" disabled={pending}>
        {pending ? "Starting your demo… (first start can take a minute)" : "Try the live demo"}
      </button>
      <span className="sr-only" role="status">{pending ? "Starting your demo, this can take a minute." : ""}</span>
    </>
  );
}
