import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { PwaInstaller } from "@/components/pwa-installer";
import { Toaster } from "@/components/toaster";
import "./globals.css";
import "./system.css";

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
export const viewport: Viewport = { themeColor: "#16140f" };
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await headers(); // Dynamic rendering enables per-request CSP nonces.
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
        <Toaster />
        <PwaInstaller />
      </body>
    </html>
  );
}
