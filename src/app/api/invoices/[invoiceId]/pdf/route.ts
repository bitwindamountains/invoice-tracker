import { z } from "zod";
import { getApiWorkspace } from "@/lib/api-session";
import { generateInvoicePdf } from "@/services/invoice-pdf";
import { getIssuedSnapshot } from "@/services/invoice-issuing";
import { InvoiceAccessDenied, InvoiceNotFound } from "@/services/invoices";
const paramsSchema = z.object({ invoiceId: z.string().min(1).max(128) });
export async function GET(request: Request, context: { params: Promise<{ invoiceId: string }> }) { try { const api = await getApiWorkspace(request); if (!api) return Response.json({ error: "Unauthorized" }, { status: 401 }); const params = paramsSchema.parse(await context.params); const issued = await getIssuedSnapshot(api.session.user.id, api.workspace.id, params.invoiceId); const pdf = await generateInvoicePdf(issued.snapshot); const filename = issued.invoiceNumber.replace(/[^A-Za-z0-9_.-]/g, "-"); return new Response(Buffer.from(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }); } catch (error) { if (error instanceof InvoiceNotFound || error instanceof InvoiceAccessDenied) return Response.json({ error: "Not found" }, { status: 404 }); return Response.json({ error: "PDF could not be generated." }, { status: 500 }); } }
