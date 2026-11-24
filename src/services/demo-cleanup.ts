import type { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/lib/db";

// Children before parents. Every Restrict edge (workspace, and composite
// (workspaceId, x) keys) must point at a model deleted later in this list.
export const DEMO_DELETE_ORDER = [
  "Payment", // -> PaymentConfirmation, Invoice
  "PaymentConfirmation", // -> Invoice (after Payment)
  "InvoiceItem",
  "InvoiceReminder", // -> ReminderRule, Invoice
  "PaymentPromise",
  "InvoiceEvent",
  "InvoiceDelivery",
  "Invoice", // -> Client
  "ReminderRule",
  "Client",
  "Expense", // -> ExpenseCategory
  "ExpenseCategory",
  "ProductService",
  "BusinessProfile",
  "PaymentInstruction",
  "WorkspaceMember",
  "AuditLog",
] as const satisfies readonly Prisma.ModelName[];

/** Deletes demo workspaces matching `where` (real ones never match) and their owners. */
export async function deleteDemoWorkspaces(where: Prisma.WorkspaceWhereInput) {
  const db = getDatabase();
  const workspaces = await db.workspace.findMany({
    where: { AND: [where, { demoExpiresAt: { not: null } }] },
    select: { id: true, ownerId: true },
  });
  for (const { id: workspaceId, ownerId } of workspaces) {
    await db.$transaction(async (tx) => {
      for (const model of DEMO_DELETE_ORDER) {
        const delegate = tx[(model[0].toLowerCase() + model.slice(1)) as Uncapitalize<typeof model>];
        await (delegate as unknown as { deleteMany(a: object): Promise<unknown> }).deleteMany({
          where: { workspaceId },
        });
      }
      await tx.workspace.delete({ where: { id: workspaceId } });
      await tx.user.delete({ where: { id: ownerId } });
    });
  }
  return workspaces.length;
}
