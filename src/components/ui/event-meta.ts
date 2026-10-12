import { BellRing, CalendarClock, CircleCheck, CircleX, Eye, Inbox, Mail, MailX, ReceiptText, Send, Wallet, type LucideIcon } from "lucide-react";

export type EventMeta = { label: string; icon: LucideIcon; tone: "neutral" | "success" | "info" | "warning" | "danger" };
const meta: Record<string, EventMeta> = {
  INVOICE_ISSUED: { label: "Invoice issued", icon: Send, tone: "neutral" },
  EMAIL_SENT: { label: "Invoice email accepted", icon: Mail, tone: "neutral" },
  EMAIL_FAILED: { label: "Email delivery failed", icon: MailX, tone: "danger" },
  PUBLIC_LINK_OPENED: { label: "Invoice viewed", icon: Eye, tone: "info" },
  PAYMENT_CONFIRMATION_SUBMITTED: { label: "Payment confirmation submitted", icon: Inbox, tone: "warning" },
  PAYMENT_CONFIRMATION_REJECTED: { label: "Payment confirmation rejected", icon: CircleX, tone: "danger" },
  PAYMENT_PROMISED: { label: "Payment promised", icon: CalendarClock, tone: "info" },
  PAYMENT_RECORDED: { label: "Partial payment recorded", icon: Wallet, tone: "info" },
  PAYMENT_COMPLETED: { label: "Payment completed", icon: CircleCheck, tone: "success" },
  REMINDER_SENT: { label: "Reminder sent", icon: BellRing, tone: "neutral" },
  REMINDER_FAILED: { label: "Reminder delivery failed", icon: MailX, tone: "danger" },
};
export function eventMeta(type: string): EventMeta {
  return meta[type] ?? { label: type.replaceAll("_", " ").toLowerCase(), icon: ReceiptText, tone: "neutral" };
}
