import { ZodError } from "zod";
import { getApiWorkspace, hasSameOrigin } from "@/lib/api-session";
import { logEvent } from "@/lib/logger";
import { ClientAccessDenied, createClient, listClients } from "@/services/clients";

const responseHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const context = await getApiWorkspace(request);
    if (!context) return Response.json({ error: "Unauthorized" }, { status: 401, headers: responseHeaders });
    const url = new URL(request.url);
    const result = await listClients(context.session.user.id, context.workspace.id, {
      search: url.searchParams.get("search") ?? "", status: url.searchParams.get("status") ?? "active", page: url.searchParams.get("page") ?? "1",
    });
    return Response.json(result, { headers: { ...responseHeaders, "X-Request-Id": requestId } });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: "Invalid filters." }, { status: 400, headers: responseHeaders });
    if (error instanceof ClientAccessDenied) return Response.json({ error: "Not found" }, { status: 404, headers: responseHeaders });
    logEvent("client_list_failed", { requestId });
    return Response.json({ error: "Clients could not be loaded.", requestId }, { status: 500, headers: responseHeaders });
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    if (!hasSameOrigin(request)) return Response.json({ error: "Request origin was rejected." }, { status: 403, headers: responseHeaders });
    const context = await getApiWorkspace(request);
    if (!context) return Response.json({ error: "Unauthorized" }, { status: 401, headers: responseHeaders });
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > 32 * 1024) return Response.json({ error: "Request is too large." }, { status: 413, headers: responseHeaders });
    let body: unknown;
    try { body = JSON.parse(text); } catch { return Response.json({ error: "Invalid request." }, { status: 400, headers: responseHeaders }); }
    const client = await createClient(context.session.user.id, context.workspace.id, body);
    return Response.json({ id: client.id }, { status: 201, headers: { ...responseHeaders, "X-Request-Id": requestId } });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: "Check the client details and try again.", fields: error.flatten().fieldErrors }, { status: 400, headers: responseHeaders });
    if (error instanceof ClientAccessDenied) return Response.json({ error: "Not found" }, { status: 404, headers: responseHeaders });
    logEvent("client_create_failed", { requestId });
    return Response.json({ error: "Client could not be created.", requestId }, { status: 500, headers: responseHeaders });
  }
}
