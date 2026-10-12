"use client";
import { toast } from "@/components/toaster";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, RotateCcw } from "lucide-react";

export function ArchiveControl({ clientId, name, version, archived }: { clientId: string; name: string; version: number; archived: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function changeStatus() {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/clients/${clientId}/archive`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived: !archived, version }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setError(result.error ?? "Client status could not be changed."); return; }
      setConfirming(false); toast(archived ? "Client restored." : "Client archived."); router.refresh();
    } catch { setError("We couldn’t connect. Try again."); }
    finally { setPending(false); }
  }
  if (!confirming) return <button type="button" className="button secondary" onClick={() => setConfirming(true)}>{archived ? <RotateCcw size={17}/> : <Archive size={17}/>} {archived ? "Restore client" : "Archive client"}</button>;
  return <div className="archive-confirm" role="group" aria-label={`${archived ? "Restore" : "Archive"} client confirmation`}><p><strong>{archived ? `Restore ${name}?` : `Archive ${name}?`}</strong><br/>{archived ? "The client will return to your active list." : "The client stays in your records and can be restored later."}</p>{error && <p className="field-error" role="alert">{error}</p>}<div><button type="button" className="button secondary" onClick={() => setConfirming(false)} disabled={pending}>Cancel</button><button type="button" className={archived ? "button primary" : "button danger-button"} onClick={changeStatus} disabled={pending}>{pending ? "Saving…" : archived ? "Restore client" : "Archive client"}</button></div></div>;
}
