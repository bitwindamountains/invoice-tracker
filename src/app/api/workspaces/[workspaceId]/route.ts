import { getSession } from "@/lib/auth";
import { authorizeWorkspace, AccessDenied } from "@/services/workspace";
import { logEvent } from "@/lib/logger";
import { z } from "zod";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const requestId = crypto.randomUUID();
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Request-Id": requestId,
  };
  try {
    const session = await getSession();
    if (!session)
      return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    const parameters = z
      .object({ workspaceId: z.string().min(1).max(128) })
      .safeParse(await context.params);
    if (!parameters.success)
      return Response.json(
        { error: "Invalid workspace" },
        { status: 400, headers },
      );
    const membership = await authorizeWorkspace(
      session.user.id,
      parameters.data.workspaceId,
    );
    return Response.json(
      {
        id: membership.workspace.id,
        name: membership.workspace.name,
        role: membership.role,
      },
      { headers },
    );
  } catch (error) {
    if (error instanceof AccessDenied)
      return Response.json({ error: "Not found" }, { status: 404, headers });
    logEvent("workspace_read_failed", { requestId });
    return Response.json(
      { error: "Unable to load workspace", requestId },
      { status: 500, headers },
    );
  }
}
