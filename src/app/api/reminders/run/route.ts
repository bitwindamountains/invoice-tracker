import { getApiWorkspace, hasSameOrigin } from "@/lib/api-session";
import { InvoiceAccessDenied } from "@/services/invoices";
import { runEligibleReminders } from "@/services/reminders";
export async function POST(request: Request) { try { if (!hasSameOrigin(request)) return Response.json({ error: "Request origin was rejected." }, { status: 403 }); const api = await getApiWorkspace(request); if (!api) return Response.json({ error: "Unauthorized" }, { status: 401 }); return Response.json(await runEligibleReminders(api.session.user.id, api.workspace.id)); } catch (error) { if (error instanceof InvoiceAccessDenied) return Response.json({ error: "Not found" }, { status: 404 }); console.error(error); return Response.json({ error: "Follow-ups could not be run." }, { status: 500 }); } }
