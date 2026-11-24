import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hasSameOrigin } from "@/lib/api-session";
import { DEMO_COOKIE, demoCookieOptions, findDemoUser } from "@/lib/demo-session";
import { getEnvironment, isDemoMode } from "@/lib/env";
import { logEvent } from "@/lib/logger";
import { takeRateLimit } from "@/lib/rate-limit";
import { createDemo } from "@/services/demo";

const headers = { "Cache-Control": "private, no-store" };

// Starts a demo from the landing page form (303 to /app) or from fetch with Accept: application/json.
export async function POST(request: Request) {
  if (!isDemoMode()) return NextResponse.json({ error: "Not found." }, { status: 404, headers });
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: "Request origin was rejected." }, { status: 403, headers });
  // A visitor with a live demo is starting over: replace it, outside the rate limit.
  const current = await findDemoUser((await cookies()).get(DEMO_COOKIE)?.value);
  if (!current) {
    const rate = await takeRateLimit(request, "demo", "", 3, 3600);
    if (!rate.allowed)
      return NextResponse.json(
        { error: "Too many demos started. Please try again later." },
        { status: 429, headers: { ...headers, "Retry-After": String(rate.retryAfter) } },
      );
  }
  try {
    const { token, expiresAt } = await createDemo({ replacingUserId: current?.id });
    const response = request.headers.get("accept")?.includes("application/json")
      ? NextResponse.json({ ok: true }, { headers })
      : NextResponse.redirect(new URL("/app", getEnvironment().APP_URL), { status: 303, headers });
    response.cookies.set(DEMO_COOKIE, token, demoCookieOptions(expiresAt));
    return response;
  } catch {
    logEvent("demo_create_failed");
    return NextResponse.json(
      { error: "The demo could not be started. Please try again." },
      { status: 500, headers },
    );
  }
}
