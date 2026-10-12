import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Invoice Tracker — Follow through to paid",
    short_name: "Invoice Tracker",
    description: "Create invoices, follow up, and track payments in one focused workspace.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f7f5ef",
    theme_color: "#16140f",
    orientation: "any",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Get Paid", short_name: "Get Paid", url: "/app/get-paid" },
      { name: "New invoice", short_name: "New invoice", url: "/app/invoices/new" },
    ],
  };
}
