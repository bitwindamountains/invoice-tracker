import { ZodError } from "zod";
import { getAuth } from "@/lib/auth";
import { logEvent } from "@/lib/logger";
import { ensurePersonalWorkspace } from "@/services/workspace";
import { InvalidLogo, saveBusinessProfile } from "@/services/business-profile";

const MAX_BODY_BYTES = 800 * 1024;

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Request-Id": requestId,
  };
  try {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin)
      return Response.json(
        { error: "Request origin was rejected." },
        { status: 403, headers },
      );
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user.emailVerified)
      return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_BODY_BYTES)
      return Response.json(
        { error: "Request is too large." },
        { status: 413, headers },
      );
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES)
      return Response.json(
        { error: "Request is too large." },
        { status: 413, headers },
      );
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return Response.json(
        { error: "Invalid request." },
        { status: 400, headers },
      );
    }
    const workspace = await ensurePersonalWorkspace(session.user);
    await saveBusinessProfile(session.user.id, workspace.id, body);
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    if (error instanceof ZodError)
      return Response.json(
        {
          error: "Check the highlighted information and try again.",
          fields: error.flatten().fieldErrors,
        },
        { status: 400, headers },
      );
    if (error instanceof InvalidLogo)
      return Response.json({ error: error.message }, { status: 400, headers });
    logEvent("business_profile_save_failed", { requestId });
    return Response.json(
      { error: "Business settings could not be saved.", requestId },
      { status: 500, headers },
    );
  }
}
