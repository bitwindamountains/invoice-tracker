import { getApiWorkspace } from "@/lib/api-session";
import { listConfirmations, PaymentAccessDenied } from "@/services/payments";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) { try { const api = await getApiWorkspace(); if (!api) return Response.json({ error: "Unauthorized" }, { status: 401, headers }); const url = new URL(request.url); return Response.json(await listConfirmations(api.session.user.id, api.workspace.id, { status: url.searchParams.get("status") ?? undefined }), { headers }); } catch (error) { if (error instanceof PaymentAccessDenied) return Response.json({ error: "Not found" }, { status: 404, headers }); return Response.json({ error: "Payment confirmations could not be loaded." }, { status: 500, headers }); } }
