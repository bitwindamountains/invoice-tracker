import Link from "next/link";
import { InvoiceForm } from "@/features/invoices/invoice-form";
import type { InvoiceFormValues } from "@/features/invoices/types";
import { requireSession } from "@/lib/session";
import { getInvoice, getInvoiceEditorOptions, InvoiceAccessDenied, InvoiceNotFound } from "@/services/invoices";
import { ensurePersonalWorkspace } from "@/services/workspace";

function localDate(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(value: string, days: number) {
  const result = new Date(`${value}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  const options = await getInvoiceEditorOptions(user.id, workspace.id);
  const issueDate = localDate(workspace.timezone);
  const dueDate = addDays(issueDate, options.defaultPaymentTermsDays);
  const from = (await searchParams).from;
  let source: Awaited<ReturnType<typeof getInvoice>> | null = null;
  if (typeof from === "string" && from.length <= 128) {
    try {
      source = await getInvoice(user.id, workspace.id, from);
    } catch (error) {
      if (!(error instanceof InvoiceNotFound || error instanceof InvoiceAccessDenied)) throw error;
    }
  }
  const initial: InvoiceFormValues = source
    ? {
        // Duplicating copies the commercial content onto fresh dates and a new number; payments and history never carry over.
        clientId: options.clients.some((client) => client.id === source.clientId) ? source.clientId : "",
        invoiceNumber: "",
        issueDate,
        dueDate,
        currency: source.currency,
        notes: source.notes ?? "",
        terms: source.terms ?? "",
        paymentInstructions: source.paymentInstructions ?? options.paymentInstructions,
        items: source.items.map((item) => ({ description: item.description, unit: item.unit, quantity: item.quantity.toString(), unitPrice: item.unitPrice.toString(), discountType: item.discountType, discountValue: item.discountValue.toString(), taxRate: item.taxRate.toString() })),
      }
    : {
        clientId: "", invoiceNumber: "", issueDate, dueDate, currency: workspace.defaultCurrency, notes: options.defaultNotes, terms: "", paymentInstructions: options.paymentInstructions,
        items: [{ description: "", unit: "item", quantity: "1", unitPrice: "0.00", discountType: "NONE", discountValue: "0", taxRate: options.defaultTaxRate }],
      };
  return (
    <div className="workspace">
      <main id="main" className="invoice-editor-main">
        <h1>{source ? `Duplicate ${source.invoiceNumber}` : "Create an invoice draft"}</h1>
        <p className="form-description">{source ? "Line items, notes and terms are copied. Dates and the invoice number start fresh." : "Totals and the invoice number are verified when you save."}</p>
        {options.clients.length ? (
          <InvoiceForm clients={options.clients} catalog={options.catalog} defaultTaxRate={options.defaultTaxRate} initial={initial} />
        ) : (
          <section className="empty-state">
            <h2>Add a client first</h2>
            <p>An invoice needs an active client.</p>
            <Link className="button primary" href="/app/clients/new">Create client</Link>
          </section>
        )}
      </main>
    </div>
  );
}
