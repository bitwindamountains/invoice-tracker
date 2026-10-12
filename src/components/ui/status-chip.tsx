import { Ban, CircleCheck, CircleDashed, CircleDot, Clock3, Hourglass, Send, TriangleAlert, XCircle } from "lucide-react";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "muted";
const icons = { success: CircleCheck, warning: Clock3, danger: TriangleAlert, info: CircleDot, neutral: Send, muted: Ban };

export function Chip({ tone, label, icon, pulse = false }: { tone: Tone; label: string; icon?: React.ReactNode; pulse?: boolean }) {
  const Icon = icons[tone];
  return (
    <span className={`chip chip-${tone}${pulse ? " chip-pulse" : ""}`}>
      {icon ?? <Icon size={13} strokeWidth={2.4} aria-hidden />}
      {label}
    </span>
  );
}

/** Invoice status with due-date awareness: an open invoice past due reads as Overdue, one due within a week as Due soon. */
export function InvoiceStatus({ status, dueDate, today = new Date() }: { status: string; dueDate?: Date; today?: Date }) {
  const open = status === "SENT" || status === "PARTIALLY_PAID";
  if (open && dueDate) {
    const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const days = Math.round((dueDate.getTime() - start) / 86_400_000);
    if (days < 0) return <Chip tone="danger" label="Overdue" pulse />;
    if (days <= 7 && status === "SENT") return <Chip tone="warning" label="Due soon" />;
  }
  switch (status) {
    case "DRAFT": return <Chip tone="neutral" label="Draft" icon={<CircleDashed size={13} strokeWidth={2.4} aria-hidden />} />;
    case "SENT": return <Chip tone="neutral" label="Sent" />;
    case "PARTIALLY_PAID": return <Chip tone="info" label="Partially paid" />;
    case "PAID": return <Chip tone="success" label="Paid" />;
    case "VOID": return <Chip tone="muted" label="Void" />;
    default: return <Chip tone="neutral" label={status.replaceAll("_", " ").toLowerCase()} />;
  }
}

export function ConfirmationStatus({ status }: { status: string }) {
  if (status === "CONFIRMED") return <Chip tone="success" label="Confirmed" />;
  if (status === "REJECTED") return <Chip tone="danger" label="Rejected" icon={<XCircle size={13} strokeWidth={2.4} aria-hidden />} />;
  return <Chip tone="warning" label="Pending" icon={<Hourglass size={13} strokeWidth={2.4} aria-hidden />} />;
}
