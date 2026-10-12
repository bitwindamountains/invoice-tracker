import {
  Activity,
  BarChart3,
  BellRing,
  Boxes,
  FileText,
  HandCoins,
  Inbox,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; badge?: "attention" | "inbox" };

export const primaryNav: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/get-paid", label: "Get Paid", icon: HandCoins, badge: "attention" },
  { href: "/app/invoices", label: "Invoices", icon: FileText },
  { href: "/app/clients", label: "Clients", icon: Users },
  { href: "/app/payments", label: "Payments", icon: Inbox, badge: "inbox" },
  { href: "/app/reminders", label: "Follow-ups", icon: BellRing },
  { href: "/app/reports", label: "Reports", icon: BarChart3 },
];

export const secondaryNav: NavItem[] = [
  { href: "/app/catalog", label: "Catalog", icon: Boxes },
  { href: "/app/expenses", label: "Expenses", icon: ReceiptText },
  { href: "/app/activity", label: "Activity", icon: Activity },
  { href: "/app/settings/business", label: "Business settings", icon: Settings },
];

export const mobileNav: NavItem[] = [
  { href: "/app", label: "Home", icon: LayoutDashboard },
  primaryNav[1],
  primaryNav[2],
  primaryNav[3],
];

export function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`);
}
