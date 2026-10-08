"use client";
import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstaller() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPromptEvent); };
    const installed = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installed);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", installed); };
  }, []);
  if (!prompt || dismissed) return null;
  async function install() { await prompt!.prompt(); const choice = await prompt!.userChoice; if (choice.outcome === "accepted") setPrompt(null); else setDismissed(true); }
  return <aside className="install-prompt" aria-label="Install Invoice Tracker"><div><strong>Install Invoice Tracker</strong><span>Open your collection workspace like an app.</span></div><button className="button" onClick={install}>Install</button><button className="text-button" onClick={() => setDismissed(true)} aria-label="Dismiss install prompt">Not now</button></aside>;
}
