import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabase } from "@/lib/auth";
import { getEnvironment } from "@/lib/env";

// Landing point for Supabase email links (sign-up confirmation, password reset).
export async function GET(request: Request) {
  const url = new URL(request.url);
  // APP_URL, not request.url: in development Next reports localhost even when the browser uses 127.0.0.1.
  const base = getEnvironment().APP_URL;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/app";
  // Same-site paths only: "//host" and "/\host" would redirect off-site.
  const target = /^\/(?![\/\\])/.test(next) && !next.includes("\\") ? next : "/app";
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  if (code || (tokenHash && type)) {
    const supabase = await createSupabase();
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type! });
    if (!error) return NextResponse.redirect(new URL(target, base));
  }
  return NextResponse.redirect(new URL("/login?error=invalid_link", base));
}
