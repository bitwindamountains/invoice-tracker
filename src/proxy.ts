import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getEnvironment } from "@/lib/env";
import { sessionCookieOptions } from "@/lib/session-cookie";

type CookieWrite = { name: string; value: string; options: object };

// Server Components can't write cookies, so expiring Supabase sessions are refreshed here.
async function refreshSession(request: NextRequest) {
  const writes: CookieWrite[] = [];
  let cacheHeaders: Record<string, string> = {};
  if (!request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-")))
    return { writes, cacheHeaders };
  const environment = getEnvironment();
  const supabase = createServerClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: sessionCookieOptions,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          writes.push(...cookiesToSet);
          cacheHeaders = headers;
        },
      },
    },
  );
  await supabase.auth.getClaims();
  return { writes, cacheHeaders };
}

export async function proxy(request: NextRequest) {
  const session = await refreshSession(request);
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const development = process.env.NODE_ENV !== "production";
  const policy = `default-src 'self'; script-src 'self' 'nonce-${nonce}' ${development ? "'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ${development ? "ws: wss:" : ""}; worker-src 'self'; manifest-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'${development ? "" : "; upgrade-insecure-requests"}`;
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  session.writes.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  Object.entries(session.cacheHeaders).forEach(([key, value]) => response.headers.set(key, value));
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  if (!development)
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  return response;
}
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
