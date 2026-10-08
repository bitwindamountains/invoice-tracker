import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getDatabase } from "@/lib/db";
import { PaymentAccessDenied, PaymentNotFound } from "@/services/payments";

export async function generatePaymentReceipt(
  userId: string,
  workspaceId: string,
  paymentId: string,
) {
  const db = getDatabase();
  if (!(await db.workspaceMember.count({ where: { workspaceId, userId } })))
    throw new PaymentAccessDenied();
  const payment = await db.payment.findFirst({
    where: { id: paymentId, workspaceId },
    include: {
      invoice: {
        select: { invoiceNumber: true, clientName: true, currency: true },
      },
      workspace: { select: { name: true } },
    },
  });
  if (!payment) throw new PaymentNotFound();
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Payment receipt ${payment.id}`);
  pdf.setCreationDate(new Date("2000-01-01T00:00:00Z"));
  pdf.setModificationDate(new Date("2000-01-01T00:00:00Z"));
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(0.12, 0.16, 0.14);
  const green = rgb(0.12, 0.36, 0.26);
  page.drawText("PAYMENT RECEIPT", {
    x: 48,
    y: 760,
    size: 12,
    font: bold,
    color: green,
  });
  page.drawText(payment.workspace.name, {
    x: 48,
    y: 724,
    size: 25,
    font: bold,
    color: dark,
  });
  const rows = [
    ["Receipt", payment.id],
    ["Invoice", payment.invoice.invoiceNumber],
    ["Client", payment.invoice.clientName],
    [
      "Amount",
      `${payment.invoice.currency} ${payment.amount.toFixed(payment.invoice.currency === "JPY" ? 0 : 2)}`,
    ],
    ["Method", payment.method],
    ["Reference", payment.reference ?? "—"],
    ["Payment date", payment.paidAt.toISOString().slice(0, 10)],
  ];
  let y = 650;
  for (const [label, value] of rows) {
    page.drawText(label, { x: 48, y, size: 10, font: bold, color: green });
    page.drawText(value, { x: 180, y, size: 11, font: regular, color: dark });
    y -= 36;
  }
  page.drawText("Recorded payment acknowledgment", {
    x: 48,
    y: 90,
    size: 9,
    font: regular,
    color: rgb(0.4, 0.43, 0.41),
  });
  return {
    bytes: await pdf.save({ useObjectStreams: false }),
    invoiceNumber: payment.invoice.invoiceNumber,
  };
}
