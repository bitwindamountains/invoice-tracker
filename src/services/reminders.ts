import { Prisma } from "@/generated/prisma/client";
import { invoiceSnapshotSchema } from "@/features/invoices/snapshot";
import { manualReminderSchema, reminderRulesSchema } from "@/features/reminders/schema";
import { getDatabase } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { generateInvoicePdf } from "@/services/invoice-pdf";
import { InvoiceAccessDenied, InvoiceNotFound } from "@/services/invoices";

const defaults = [
  [-3, "Before due", "FRIENDLY", "A friendly reminder for {invoice_number}"],
  [0, "Due today", "FRIENDLY", "{invoice_number} is due today"],
  [3, "3 days overdue", "PROFESSIONAL", "Payment reminder for {invoice_number}"],
  [7, "7 days overdue", "PROFESSIONAL", "Follow-up on {invoice_number}"],
  [14, "14 days overdue", "FIRM", "Action requested: {invoice_number}"],
] as const;
const defaultMessage = "Hi {client_name},\n\nThis is a reminder that {invoice_number} has a remaining balance of {balance}, due {due_date}. Please let us know when payment has been arranged.\n\nThank you,\n{business_name}";

function today(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)!.value;
  return new Date(`${part("year")}-${part("month")}-${part("day")}T00:00:00.000Z`);
}
function addDays(date: Date, days: number) { const result = new Date(date); result.setUTCDate(result.getUTCDate() + days); return result; }
function money(value: { toString(): string }, currency: string) { const digits = currency === "JPY" ? 0 : 2; return `${currency} ${new Intl.NumberFormat("en", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value.toString()))}`; }
function render(template: string, invoice: { invoiceNumber: string; clientName: string; balanceDue: { toString(): string }; currency: string; dueDate: Date }, businessName: string) {
  return template.replaceAll("{invoice_number}", invoice.invoiceNumber).replaceAll("{client_name}", invoice.clientName).replaceAll("{balance}", money(invoice.balanceDue, invoice.currency)).replaceAll("{due_date}", invoice.dueDate.toISOString().slice(0, 10)).replaceAll("{business_name}", businessName);
}
async function requireManager(tx: Prisma.TransactionClient, workspaceId: string, userId: string) {
  if (!await tx.workspaceMember.count({ where: { workspaceId, userId, role: { in: ["OWNER", "ADMIN"] } } })) throw new InvoiceAccessDenied();
}
export async function ensureReminderRules(workspaceId: string) {
  const db = getDatabase();
  await db.reminderRule.createMany({ data: defaults.map(([offsetDays, label, tone, subject]) => ({ workspaceId, offsetDays, label, tone, subject, message: defaultMessage })), skipDuplicates: true });
  return db.reminderRule.findMany({ where: { workspaceId }, orderBy: { offsetDays: "asc" } });
}
export async function getReminderCenter(userId: string, workspaceId: string) {
  const db = getDatabase();
  if (!await db.workspaceMember.count({ where: { workspaceId, userId } })) throw new InvoiceAccessDenied();
  const rules = await ensureReminderRules(workspaceId);
  const history = await db.invoiceReminder.findMany({ where: { workspaceId }, include: { invoice: { select: { invoiceNumber: true, clientName: true } }, rule: { select: { label: true } } }, orderBy: { createdAt: "desc" }, take: 30 });
  return { rules, history };
}
export async function updateReminderRules(userId: string, workspaceId: string, raw: unknown) {
  const { rules } = reminderRulesSchema.parse(raw); await ensureReminderRules(workspaceId);
  return getDatabase().$transaction(async tx => { await requireManager(tx, workspaceId, userId); for (const rule of rules) { const changed = await tx.reminderRule.updateMany({ where: { id: rule.id, workspaceId }, data: { enabled: rule.enabled, tone: rule.tone, subject: rule.subject, message: rule.message } }); if (!changed.count) throw new InvoiceNotFound(); } await tx.auditLog.create({ data: { workspaceId, actorId: userId, action: "REMINDER_RULES_UPDATED" } }); });
}
async function deliver(reminderId: string, workspaceId: string, invoiceId: string, snapshotValue: Prisma.JsonValue, invoiceNumber: string, to: string, subject: string, message: string, actorId: string) {
  try {
    const snapshot = invoiceSnapshotSchema.parse(snapshotValue); const pdf = await generateInvoicePdf(snapshot);
    await sendEmail({ to, subject, text: message, attachments: [{ filename: `${invoiceNumber}.pdf`, content: Buffer.from(pdf).toString("base64") }] });
    await getDatabase().$transaction([getDatabase().invoiceReminder.update({ where: { id: reminderId }, data: { status: "SENT", attemptedAt: new Date(), sentAt: new Date() } }), getDatabase().invoiceEvent.create({ data: { workspaceId, invoiceId, type: "REMINDER_SENT", metadata: { reminderId, recipient: to } } }), getDatabase().auditLog.create({ data: { workspaceId, actorId, action: "REMINDER_SENT" } })]); return true;
  } catch { await getDatabase().$transaction([getDatabase().invoiceReminder.update({ where: { id: reminderId }, data: { status: "FAILED", attemptedAt: new Date(), errorCode: "DELIVERY_FAILED" } }), getDatabase().invoiceEvent.create({ data: { workspaceId, invoiceId, type: "REMINDER_FAILED", metadata: { reminderId } } })]); return false; }
}
export async function sendManualReminder(userId: string, workspaceId: string, invoiceId: string, raw: unknown) {
  const input = manualReminderSchema.parse(raw); const db = getDatabase();
  const prepared = await db.$transaction(async tx => { await requireManager(tx, workspaceId, userId); const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, workspaceId, status: { in: ["SENT", "PARTIALLY_PAID"] }, balanceDue: { gt: 0 }, issueSnapshot: { not: Prisma.DbNull } } }); if (!invoice) throw new InvoiceNotFound(); const reminder = await tx.invoiceReminder.create({ data: { workspaceId, invoiceId, recipient: invoice.clientEmail, subject: input.subject, message: input.message, tone: input.tone, manual: true, createdBy: userId } }); return { reminder, invoice }; });
  const delivered = await deliver(prepared.reminder.id, workspaceId, invoiceId, prepared.invoice.issueSnapshot!, prepared.invoice.invoiceNumber, prepared.invoice.clientEmail, input.subject, input.message, userId); return { delivered };
}
export async function runEligibleReminders(userId: string, workspaceId: string, now = new Date()) {
  const db = getDatabase(); await db.$transaction(tx => requireManager(tx, workspaceId, userId)); const rules = (await ensureReminderRules(workspaceId)).filter(rule => rule.enabled); const workspace = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { name: true, timezone: true } }); const day = today(now, workspace.timezone);
  const invoices = await db.invoice.findMany({ where: { workspaceId, status: { in: ["SENT", "PARTIALLY_PAID"] }, balanceDue: { gt: 0 }, issueSnapshot: { not: Prisma.DbNull } }, include: { paymentPromises: { orderBy: { createdAt: "desc" }, take: 1 }, paymentConfirmations: { where: { status: "PENDING" }, take: 1 }, reminders: { where: { manual: false, status: { in: ["PENDING", "SENT"] } }, include: { rule: true } } } });
  let sent = 0, suppressed = 0, failed = 0;
  for (const invoice of invoices) {
    if (invoice.paymentPromises[0]?.promisedFor && invoice.paymentPromises[0].promisedFor >= day || invoice.paymentConfirmations.length) { suppressed++; continue; }
    const age = Math.floor((day.getTime() - invoice.dueDate.getTime()) / 86400000); const previous = Math.max(-Infinity, ...invoice.reminders.map(item => item.rule?.offsetDays ?? -Infinity)); const rule = [...rules].filter(item => item.offsetDays <= age && item.offsetDays > previous).sort((a,b) => b.offsetDays-a.offsetDays)[0]; if (!rule) continue;
    const scheduledDate = addDays(invoice.dueDate, rule.offsetDays); const subject = render(rule.subject, invoice, workspace.name); const message = render(rule.message, invoice, workspace.name);
    try {
      const reminder = await db.$transaction(async tx => {
        const current = await tx.invoice.findFirst({ where: { id: invoice.id, workspaceId, status: { in: ["SENT", "PARTIALLY_PAID"] }, balanceDue: { gt: 0 }, paymentPromises: { none: { promisedFor: { gte: day } } }, paymentConfirmations: { none: { status: "PENDING" } } }, select: { id: true } });
        if (!current) return null;
        return tx.invoiceReminder.create({ data: { workspaceId, invoiceId: invoice.id, ruleId: rule.id, scheduledDate, recipient: invoice.clientEmail, subject, message, tone: rule.tone, createdBy: userId } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if (!reminder) { suppressed++; continue; }
      const ok = await deliver(reminder.id, workspaceId, invoice.id, invoice.issueSnapshot!, invoice.invoiceNumber, invoice.clientEmail, subject, message, userId); if (ok) sent++; else failed++;
    } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue; throw error; }
  }
  return { sent, failed, suppressed };
}
export { render as renderReminderTemplate, today as workspaceToday };
