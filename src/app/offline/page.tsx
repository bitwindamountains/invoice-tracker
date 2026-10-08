import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Brand } from "@/components/brand";

export default function OfflinePage() {
  return <div className="landing"><header className="site-header"><Brand /></header><main id="main" className="offline-main"><WifiOff size={38} aria-hidden="true"/><span className="eyebrow">CONNECTION PAUSED</span><h1>You&apos;re offline.</h1><p>You can reopen the app, but actions that require fresh financial data are unavailable until your connection returns.</p><Link className="button" href="/app">Try again</Link></main></div>;
}
