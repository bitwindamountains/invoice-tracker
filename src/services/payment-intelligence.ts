import { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/lib/db";
import { PaymentAccessDenied } from "@/services/payments";

type MoneyMap = Record<string, Prisma.Decimal>;
function add(target: MoneyMap, currency: string, amount: Prisma.Decimal) {
  target[currency] = (target[currency] ?? new Prisma.Decimal(0)).plus(amount);
}
function serialize(values: MoneyMap) {
  return Object.fromEntries(
    Object.entries(values)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, value]) => [currency, value.toString()]),
  );
}
function dayInTimezone(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)!.value;
  return new Date(
    `${value("year")}-${value("month")}-${value("day")}T00:00:00.000Z`,
  );
}
function daysBetween(left: Date, right: Date) {
  return Math.round((left.getTime() - right.getTime()) / 86_400_000);
}

export async function getPaymentDashboard(
  userId: string,
  workspaceId: string,
  now = new Date(),
) {
  const db = getDatabase();
  const workspace = await db.workspace.findFirst({
    where: { id: workspaceId, members: { some: { userId } } },
    select: { timezone: true },
  });
  if (!workspace) throw new PaymentAccessDenied();
  const today = dayInTimezone(now, workspace.timezone);
  const weekEnd = new Date(today);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const monthStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
  );
  const chartStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1),
  );
  const [
    openInvoices,
    paidThisMonth,
    recentPayments,
    recentEvents,
    confirmations,
  ] = await db.$transaction([
    db.invoice.findMany({
      where: { workspaceId, status: { in: ["SENT", "PARTIALLY_PAID"] } },
      include: {
        paymentPromises: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: {
          select: { paymentConfirmations: { where: { status: "PENDING" } } },
        },
      },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
    }),
    db.payment.findMany({
      where: { workspaceId, paidAt: { gte: monthStart } },
      include: { invoice: { select: { currency: true } } },
    }),
    db.payment.findMany({
      where: { workspaceId, paidAt: { gte: chartStart } },
      include: { invoice: { select: { currency: true } } },
      orderBy: { paidAt: "asc" },
    }),
    db.invoiceEvent.findMany({
      where: { workspaceId },
      include: {
        invoice: {
          select: { invoiceNumber: true, clientName: true, currency: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.paymentConfirmation.count({ where: { workspaceId, status: "PENDING" } }),
  ]);
  const outstanding: MoneyMap = {},
    overdue: MoneyMap = {},
    dueThisWeek: MoneyMap = {},
    paid: MoneyMap = {};
  for (const invoice of openInvoices) {
    add(outstanding, invoice.currency, invoice.balanceDue);
    if (invoice.dueDate < today)
      add(overdue, invoice.currency, invoice.balanceDue);
    else if (invoice.dueDate <= weekEnd)
      add(dueThisWeek, invoice.currency, invoice.balanceDue);
  }
  for (const payment of paidThisMonth)
    add(paid, payment.invoice.currency, payment.amount);
  const attention = openInvoices
    .flatMap((invoice) => {
      const promise = invoice.paymentPromises[0];
      const activePromise = promise && promise.promisedFor >= today;
      let reason: string | null = null;
      let priority = 9;
      if (invoice._count.paymentConfirmations > 0) {
        reason = `${invoice._count.paymentConfirmations} payment confirmation${invoice._count.paymentConfirmations === 1 ? "" : "s"} to review`;
        priority = 0;
      } else if (invoice.dueDate < today && !activePromise) {
        const days = daysBetween(today, invoice.dueDate);
        reason = `${days} day${days === 1 ? "" : "s"} overdue`;
        priority = 1;
      } else if (invoice.dueDate <= weekEnd && invoice.dueDate >= today) {
        const days = daysBetween(invoice.dueDate, today);
        reason =
          days === 0
            ? "Due today"
            : `Due in ${days} day${days === 1 ? "" : "s"}`;
        priority = 2;
      }
      return reason
        ? [
            {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              clientName: invoice.clientName,
              currency: invoice.currency,
              balanceDue: invoice.balanceDue.toString(),
              reason,
              priority,
            },
          ]
        : [];
    })
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        a.invoiceNumber.localeCompare(b.invoiceNumber),
    );
  const promises = openInvoices
    .flatMap((invoice) =>
      invoice.paymentPromises[0]
        ? [
            {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              clientName: invoice.clientName,
              currency: invoice.currency,
              balanceDue: invoice.balanceDue.toString(),
              promisedFor: invoice.paymentPromises[0].promisedFor
                .toISOString()
                .slice(0, 10),
              active: invoice.paymentPromises[0].promisedFor >= today,
            },
          ]
        : [],
    )
    .sort((a, b) => a.promisedFor.localeCompare(b.promisedFor));
  const chart = new Map<string, MoneyMap>();
  for (let offset = 5; offset >= 0; offset--) {
    const date = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1),
    );
    chart.set(date.toISOString().slice(0, 7), {});
  }
  for (const payment of recentPayments) {
    const key = payment.paidAt.toISOString().slice(0, 7);
    const bucket = chart.get(key);
    if (bucket) add(bucket, payment.invoice.currency, payment.amount);
  }
  return {
    asOf: today.toISOString().slice(0, 10),
    outstanding: serialize(outstanding),
    overdue: serialize(overdue),
    dueThisWeek: serialize(dueThisWeek),
    paidThisMonth: serialize(paid),
    pendingConfirmations: confirmations,
    attention,
    promises,
    recentActivity: recentEvents.map((event) => ({
      id: event.id,
      type: event.type,
      createdAt: event.createdAt,
      invoiceId: event.invoiceId,
      invoiceNumber: event.invoice.invoiceNumber,
      clientName: event.invoice.clientName,
      metadata: event.metadata,
    })),
    revenue: [...chart].map(([month, values]) => ({
      month,
      values: serialize(values),
    })),
  };
}

export async function getClientPaymentMetrics(
  userId: string,
  workspaceId: string,
  clientId: string,
) {
  const db = getDatabase();
  if (!(await db.workspaceMember.count({ where: { workspaceId, userId } })))
    throw new PaymentAccessDenied();
  const [invoices, payments] = await db.$transaction([
    db.invoice.findMany({
      where: { workspaceId, clientId, status: { not: "DRAFT" } },
      select: {
        status: true,
        currency: true,
        balanceDue: true,
        issueDate: true,
        dueDate: true,
        paidAt: true,
      },
    }),
    db.payment.findMany({
      where: { workspaceId, invoice: { clientId } },
      include: { invoice: { select: { currency: true } } },
    }),
  ]);
  const outstanding: MoneyMap = {};
  const revenue: MoneyMap = {};
  const paid = invoices.filter(
    (invoice) => invoice.status === "PAID" && invoice.paidAt,
  );
  for (const invoice of invoices)
    if (["SENT", "PARTIALLY_PAID"].includes(invoice.status))
      add(outstanding, invoice.currency, invoice.balanceDue);
  for (const payment of payments)
    add(revenue, payment.invoice.currency, payment.amount);
  const average = (values: number[]) =>
    values.length
      ? Math.round(
          values.reduce((sum, value) => sum + value, 0) / values.length,
        )
      : null;
  return {
    invoiceCount: invoices.length,
    paidInvoiceCount: paid.length,
    outstanding: serialize(outstanding),
    totalRevenue: serialize(revenue),
    averageDaysToPayment: average(
      paid.map((invoice) => daysBetween(invoice.paidAt!, invoice.issueDate)),
    ),
    averageDaysEarlyLate: average(
      paid.map((invoice) => daysBetween(invoice.paidAt!, invoice.dueDate)),
    ),
  };
}
