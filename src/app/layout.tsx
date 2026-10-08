import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { PwaInstaller } from "@/components/pwa-installer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Invoice Tracker — Follow through to paid",
    template: "%s | Invoice Tracker",
  },
  description: "A focused workspace for invoices, follow-ups, and payments.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Invoice Tracker" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#285d45" };
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await headers(); // Dynamic rendering enables per-request CSP nonces.
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
        <PwaInstaller />
      </body>
    </html>
  );
}
