import { ZodError, z } from "zod";
import { getApiWorkspace, hasSameOrigin } from "@/lib/api-session";
import { logEvent } from "@/lib/logger";
import { ClientAccessDenied, ClientNotFound, ClientVersionConflict, getClient, updateClient } from "@/services/clients";

const responseHeaders = { "Cache-Control": "private, no-store" };
const parameters = z.object({ clientId: z.string().min(1).max(128) });

export async function GET(request: Request, context: { params: Promise<{ clientId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const api = await getApiWorkspace(request);
    if (!api) return Response.json({ error: "Unauthorized" }, { status: 401, headers: responseHeaders });
    const parsed = parameters.safeParse(await context.params);
    if (!parsed.success) return Response.json({ error: "Invalid client" }, { status: 400, headers: responseHeaders });
    const client = await getClient(api.session.user.id, api.workspace.id, parsed.data.clientId);
    return Response.json(client, { headers: { ...responseHeaders, "X-Request-Id": requestId } });
  } catch (error) {
    if (error instanceof ClientNotFound || error instanceof ClientAccessDenied) return Response.json({ error: "Not found" }, { status: 404, headers: responseHeaders });
    logEvent("client_read_failed", { requestId });
    return Response.json({ error: "Client could not be loaded.", requestId }, { status: 500, headers: responseHeaders });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ clientId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    if (!hasSameOrigin(request)) return Response.json({ error: "Request origin was rejected." }, { status: 403, headers: responseHeaders });
    const api = await getApiWorkspace(request);
    if (!api) return Response.json({ error: "Unauthorized" }, { status: 401, headers: responseHeaders });
    const parsed = parameters.safeParse(await context.params);
    if (!parsed.success) return Response.json({ error: "Invalid client" }, { status: 400, headers: responseHeaders });
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > 32 * 1024) return Response.json({ error: "Request is too large." }, { status: 413, headers: responseHeaders });
    let body: unknown;
    try { body = JSON.parse(text); } catch { return Response.json({ error: "Invalid request." }, { status: 400, headers: responseHeaders }); }
    const client = await updateClient(api.session.user.id, api.workspace.id, parsed.data.clientId, body);
    return Response.json({ id: client.id, version: client.version }, { headers: { ...responseHeaders, "X-Request-Id": requestId } });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: "Check the client details and try again.", fields: error.flatten().fieldErrors }, { status: 400, headers: responseHeaders });
    if (error instanceof ClientVersionConflict) return Response.json({ error: "This client changed in another session. Reload before saving again." }, { status: 409, headers: responseHeaders });
    if (error instanceof ClientNotFound || error instanceof ClientAccessDenied) return Response.json({ error: "Not found" }, { status: 404, headers: responseHeaders });
    logEvent("client_update_failed", { requestId });
    return Response.json({ error: "Client could not be updated.", requestId }, { status: 500, headers: responseHeaders });
  }
}
