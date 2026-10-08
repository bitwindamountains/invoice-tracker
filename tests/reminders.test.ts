import { describe, expect, it } from "vitest";
import { renderReminderTemplate, workspaceToday } from "@/services/reminders";

describe("reminder rules", () => {
  it("renders the current remaining balance and invoice context", () => {
    const text = renderReminderTemplate("{client_name} owes {balance} on {invoice_number}, due {due_date} — {business_name}", { invoiceNumber: "INV-7", clientName: "Ana", balanceDue: { toString: () => "250.5" }, currency: "PHP", dueDate: new Date("2026-09-20T00:00:00Z") }, "Studio");
    expect(text).toContain("PHP 250.50"); expect(text).toContain("INV-7"); expect(text).toContain("Ana");
  });
  it("uses the workspace timezone for the evaluation date", () => {
    expect(workspaceToday(new Date("2026-09-21T16:30:00Z"), "Asia/Manila").toISOString()).toBe("2026-09-22T00:00:00.000Z");
  });
});
