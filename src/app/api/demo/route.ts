import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hasSameOrigin } from "@/lib/api-session";
import { DEMO_COOKIE, demoCookieOptions, findDemoUser } from "@/lib/demo-session";
import { getEnvironment, isDemoMode } from "@/lib/env";
import { logEvent } from "@/lib/logger";
import { takeRateLimit } from "@/lib/rate-limit";
import { errorLabel } from "@/lib/error-label";
import { createDemo, DemoReplacementGone } from "@/services/demo";

const headers = { "Cache-Control": "private, no-store" };

// Starts a demo from the landing page form (303 to /app) or from fetch with Accept: application/json.
export async function POST(request: Request) {
  if (!isDemoMode()) return NextResponse.json({ error: "Not found." }, { status: 404, headers });
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: "Request origin was rejected." }, { status: 403, headers });
  const rateLimited = async (scope = "demo", limit = 3) => {
    const rate = await takeRateLimit(request, scope, "", limit, 3600);
    return rate.allowed
      ? null
      : NextResponse.json(
          { error: "Too many demos started. Please try again later." },
          { status: 429, headers: { ...headers, "Retry-After": String(rate.retryAfter) } },
        );
  };
  try {
    // A visitor with a live demo is starting over: replace it under its own, looser limit (each replacement is a full reseed).
    // If that demo is already gone (a concurrent replay of the cookie), fall back to a rate-limited new demo.
    const current = await findDemoUser((await cookies()).get(DEMO_COOKIE)?.value);
    let demo;
    if (current) {
      const limited = await rateLimited("demo-replace", 10);
      if (limited) return limited;
      demo = await createDemo({ replacingUserId: current.id }).catch((error: unknown) => {
        if (error instanceof DemoReplacementGone) return null;
        throw error;
      });
    }
    if (!demo) {
      const limited = await rateLimited();
      if (limited) return limited;
      demo = await createDemo();
    }
    const { token, expiresAt } = demo;
    const response = request.headers.get("accept")?.includes("application/json")
      ? NextResponse.json({ ok: true }, { headers })
      : NextResponse.redirect(new URL("/app", getEnvironment().APP_URL), { status: 303, headers });
    response.cookies.set(DEMO_COOKIE, token, demoCookieOptions(expiresAt));
    return response;
  } catch (error) {
    logEvent("demo_create_failed", { error: errorLabel(error) });
    return NextResponse.json(
      { error: "The demo could not be started. Please try again." },
      { status: 500, headers },
    );
  }
}
