import { ZodError, z } from "zod";
import { getApiWorkspace, hasSameOrigin } from "@/lib/api-session";
import { logEvent } from "@/lib/logger";
import { ClientAccessDenied, ClientNotFound, ClientVersionConflict, setClientArchived } from "@/services/clients";

const responseHeaders = { "Cache-Control": "private, no-store" };
const parameters = z.object({ clientId: z.string().min(1).max(128) });

export async function POST(request: Request, context: { params: Promise<{ clientId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    if (!hasSameOrigin(request)) return Response.json({ error: "Request origin was rejected." }, { status: 403, headers: responseHeaders });
    const api = await getApiWorkspace(request);
    if (!api) return Response.json({ error: "Unauthorized" }, { status: 401, headers: responseHeaders });
    const parsed = parameters.safeParse(await context.params);
    if (!parsed.success) return Response.json({ error: "Invalid client" }, { status: 400, headers: responseHeaders });
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > 4 * 1024) return Response.json({ error: "Request is too large." }, { status: 413, headers: responseHeaders });
    let body: unknown;
    try { body = JSON.parse(text); } catch { return Response.json({ error: "Invalid request." }, { status: 400, headers: responseHeaders }); }
    const client = await setClientArchived(api.session.user.id, api.workspace.id, parsed.data.clientId, body);
    return Response.json({ id: client.id, version: client.version, archived: Boolean(client.archivedAt) }, { headers: { ...responseHeaders, "X-Request-Id": requestId } });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) return Response.json({ error: "Invalid request." }, { status: 400, headers: responseHeaders });
    if (error instanceof ClientVersionConflict) return Response.json({ error: "This client changed in another session. Reload before trying again." }, { status: 409, headers: responseHeaders });
    if (error instanceof ClientNotFound || error instanceof ClientAccessDenied) return Response.json({ error: "Not found" }, { status: 404, headers: responseHeaders });
    logEvent("client_archive_failed", { requestId });
    return Response.json({ error: "Client status could not be changed.", requestId }, { status: 500, headers: responseHeaders });
  }
}
