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
  let deleted = 0;
  for (const { id: workspaceId, ownerId } of workspaces) {
    try {
      await db.$transaction(async (tx) => {
        for (const model of DEMO_DELETE_ORDER) {
          const delegate = tx[(model[0].toLowerCase() + model.slice(1)) as Uncapitalize<typeof model>];
          await (delegate as unknown as { deleteMany(a: object): Promise<unknown> }).deleteMany({
            where: { workspaceId },
          });
        }
        // Re-assert the guard; no match (gone or no longer demo) rolls everything back.
        const { count } = await tx.workspace.deleteMany({
          where: { id: workspaceId, demoExpiresAt: { not: null } },
        });
        if (count === 0) throw new StaleWorkspace();
        await tx.user.delete({ where: { id: ownerId } });
      });
      deleted++;
    } catch (error) {
      // A concurrent run (e.g. two evictions of the same workspace) got there first.
      if (!(error instanceof StaleWorkspace)) throw error;
    }
  }
  return deleted;
}

class StaleWorkspace extends Error {}
