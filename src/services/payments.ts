import { Prisma } from "@/generated/prisma/client";
import {
  confirmationListSchema,
  confirmationReviewSchema,
  paymentConfirmationSchema,
  paymentPromiseSchema,
  paymentSchema,
} from "@/features/payments/schema";
import { currencyScale } from "@/services/invoice-calculation";
import { getDatabase } from "@/lib/db";

export class PaymentNotFound extends Error {}
export class PaymentAccessDenied extends Error {}
export class PaymentConflict extends Error {}
export class PaymentOverage extends Error {}

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
async function requireManager(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  userId: string,
) {
  if (
    !(await tx.workspaceMember.count({
      where: { workspaceId, userId, role: { in: ["OWNER", "ADMIN"] } },
    }))
  )
    throw new PaymentAccessDenied();
}
async function transactional<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await getDatabase().$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retry = error as { code?: string; meta?: { code?: string }; cause?: { code?: string } };
      if (
        (retry.code === "P2034" ||
          retry.meta?.code === "40001" ||
          retry.cause?.code === "40001" ||
          (error instanceof Error && error.message.includes("40001"))) &&
        attempt < 5
      )
        continue;
      throw error;
    }
  }
  throw new PaymentConflict();
}

async function applyPayment(
  tx: Prisma.TransactionClient,
  values: {
    workspaceId: string;
    invoiceId: string;
    userId: string;
    amount: string;
    method: string;
    reference: string | null;
    note: string | null;
    paidAt: string;
    source: "MANUAL" | "CONFIRMATION";
    confirmationId?: string;
  },
) {
  await tx.$queryRaw`SELECT "id" FROM "Invoice" WHERE "id" = ${values.invoiceId} AND "workspaceId" = ${values.workspaceId} FOR UPDATE`;
  const invoice = await tx.invoice.findFirst({
    where: { id: values.invoiceId, workspaceId: values.workspaceId },
  });
  if (!invoice || invoice.status === "DRAFT" || invoice.status === "VOID")
    throw new PaymentNotFound();
  const amount = new Prisma.Decimal(values.amount).toDecimalPlaces(
    currencyScale(invoice.currency),
    Prisma.Decimal.ROUND_HALF_UP,
  );
  if (amount.lte(0)) throw new PaymentConflict();
  if (amount.gt(invoice.balanceDue)) throw new PaymentOverage();
  const amountPaid = invoice.amountPaid.plus(amount);
  const balanceDue = invoice.total.minus(amountPaid);
  const status = balanceDue.eq(0) ? "PAID" : "PARTIALLY_PAID";
  const payment = await tx.payment.create({
    data: {
      workspaceId: values.workspaceId,
      invoiceId: values.invoiceId,
      paymentConfirmationId: values.confirmationId,
      amount,
      method: values.method,
      reference: values.reference,
      note: values.note,
      paidAt: date(values.paidAt),
      source: values.source,
      recordedBy: values.userId,
    },
  });
  await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      amountPaid,
      balanceDue,
      status,
      paidAt: status === "PAID" ? new Date() : null,
      version: { increment: 1 },
    },
  });
  await tx.invoiceEvent.create({
    data: {
      workspaceId: values.workspaceId,
      invoiceId: values.invoiceId,
      type: status === "PAID" ? "PAYMENT_COMPLETED" : "PAYMENT_RECORDED",
      metadata: {
        paymentId: payment.id,
        amount: amount.toString(),
        method: values.method,
      },
    },
  });
  await tx.auditLog.create({
    data: {
      workspaceId: values.workspaceId,
      actorId: values.userId,
      action: "PAYMENT_RECORDED",
    },
  });
  return payment;
}

export async function recordPayment(
  userId: string,
  workspaceId: string,
  invoiceId: string,
  raw: unknown,
) {
  const input = paymentSchema.parse(raw);
  return transactional(async (tx) => {
    await requireManager(tx, workspaceId, userId);
    return applyPayment(tx, {
      workspaceId,
      invoiceId,
      userId,
      ...input,
      source: "MANUAL",
    });
  });
}
export async function submitPaymentConfirmation(
  tokenHash: string,
  raw: unknown,
) {
  const input = paymentConfirmationSchema.parse(raw);
  try {
    return await getDatabase().$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          publicTokenHash: tokenHash,
          publicTokenRevokedAt: null,
          publicTokenExpiresAt: { gt: new Date() },
          status: { in: ["SENT", "PARTIALLY_PAID"] },
        },
      });
      if (!invoice) throw new PaymentNotFound();
      const confirmation = await tx.paymentConfirmation.create({
        data: {
          workspaceId: invoice.workspaceId,
          invoiceId: invoice.id,
          idempotencyKey: input.idempotencyKey,
          amount: new Prisma.Decimal(input.amount),
          method: input.method,
          reference: input.reference,
          message: input.message,
          paidAt: date(input.paidAt),
        },
      });
      await tx.invoiceEvent.create({
        data: {
          workspaceId: invoice.workspaceId,
          invoiceId: invoice.id,
          type: "PAYMENT_CONFIRMATION_SUBMITTED",
          metadata: { confirmationId: confirmation.id },
        },
      });
      return confirmation;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const invoice = await getDatabase().invoice.findFirst({
        where: { publicTokenHash: tokenHash },
      });
      if (!invoice) throw new PaymentNotFound();
      return getDatabase().paymentConfirmation.findUniqueOrThrow({
        where: {
          invoiceId_idempotencyKey: {
            invoiceId: invoice.id,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
    }
    throw error;
  }
}
export async function submitPaymentPromise(tokenHash: string, raw: unknown) {
  const input = paymentPromiseSchema.parse(raw);
  return getDatabase().$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: {
        publicTokenHash: tokenHash,
        publicTokenRevokedAt: null,
        publicTokenExpiresAt: { gt: new Date() },
        status: { in: ["SENT", "PARTIALLY_PAID"] },
      },
    });
    if (!invoice) throw new PaymentNotFound();
    const promise = await tx.paymentPromise.create({
      data: {
        workspaceId: invoice.workspaceId,
        invoiceId: invoice.id,
        promisedFor: date(input.promisedFor),
        note: input.note,
      },
    });
    await tx.invoiceEvent.create({
      data: {
        workspaceId: invoice.workspaceId,
        invoiceId: invoice.id,
        type: "PAYMENT_PROMISED",
        metadata: { promisedFor: input.promisedFor },
      },
    });
    return promise;
  });
}
export async function listConfirmations(
  userId: string,
  workspaceId: string,
  raw: unknown,
) {
  const query = confirmationListSchema.parse(raw);
  const db = getDatabase();
  if (!(await db.workspaceMember.count({ where: { workspaceId, userId } })))
    throw new PaymentAccessDenied();
  return db.paymentConfirmation.findMany({
    where: { workspaceId, status: query.status },
    include: {
      invoice: {
        select: { invoiceNumber: true, clientName: true, currency: true },
      },
      payment: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
export async function reviewConfirmation(
  userId: string,
  workspaceId: string,
  confirmationId: string,
  raw: unknown,
) {
  const input = confirmationReviewSchema.parse(raw);
  return transactional(async (tx) => {
    await requireManager(tx, workspaceId, userId);
    const confirmation = await tx.paymentConfirmation.findFirst({
      where: { id: confirmationId, workspaceId },
    });
    if (!confirmation) throw new PaymentNotFound();
    if (confirmation.status !== "PENDING") throw new PaymentConflict();
    if (input.action === "reject") {
      const updated = await tx.paymentConfirmation.updateMany({
        where: { id: confirmation.id, workspaceId, status: "PENDING" },
        data: {
          status: "REJECTED",
          reviewedBy: userId,
          reviewedAt: new Date(),
          rejectionNote: input.note,
        },
      });
      if (!updated.count) throw new PaymentConflict();
      await tx.invoiceEvent.create({
        data: {
          workspaceId,
          invoiceId: confirmation.invoiceId,
          type: "PAYMENT_CONFIRMATION_REJECTED",
          metadata: { confirmationId },
        },
      });
      await tx.auditLog.create({
        data: {
          workspaceId,
          actorId: userId,
          action: "PAYMENT_CONFIRMATION_REJECTED",
        },
      });
      return null;
    }
    const payment = await applyPayment(tx, {
      workspaceId,
      invoiceId: confirmation.invoiceId,
      userId,
      amount: confirmation.amount.toString(),
      method: confirmation.method,
      reference: confirmation.reference,
      note: confirmation.message,
      paidAt: confirmation.paidAt.toISOString().slice(0, 10),
      source: "CONFIRMATION",
      confirmationId,
    });
    const updated = await tx.paymentConfirmation.updateMany({
      where: { id: confirmation.id, workspaceId, status: "PENDING" },
      data: { status: "CONFIRMED", reviewedBy: userId, reviewedAt: new Date() },
    });
    if (!updated.count) throw new PaymentConflict();
    return payment;
  });
}
