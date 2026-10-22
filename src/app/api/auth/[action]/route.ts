import { z } from "zod";
import { createSupabase, createSupabaseAdmin } from "@/lib/auth";
import { hasSameOrigin } from "@/lib/api-session";
import { getEnvironment } from "@/lib/env";
import { takeRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { logEvent } from "@/lib/logger";

const email = z.email().max(254).transform((value) => value.trim().toLowerCase());
const newPassword = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use at most 128 characters.");
const actions = {
  "sign-in": { limit: 5, schema: z.object({ email, password: z.string().min(1).max(128) }) },
  "sign-up": {
    limit: 5,
    schema: z.object({
      name: z.string().trim().min(2, "Name must contain 2 to 100 characters.").max(100, "Name must contain 2 to 100 characters."),
      email,
      password: newPassword,
    }),
  },
  "forgot-password": { limit: 3, schema: z.object({ email }) },
  "resend-verification": { limit: 3, schema: z.object({ email }) },
  "reset-password": { limit: 5, schema: z.object({ password: newPassword }) },
  "sign-out": { limit: 30, schema: z.object({}) },
};
type Action = keyof typeof actions;
const headers = { "Cache-Control": "private, no-store" };
const reply = (body: object, status = 200) => Response.json(body, { status, headers });

export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  if (!Object.hasOwn(actions, action)) return reply({ error: "Not found." }, 404);
  if (!hasSameOrigin(request)) return reply({ error: "Request origin was rejected." }, 403);
  const { schema, limit } = actions[action as Action];
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return reply({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, 400);
  const data = parsed.data as Record<string, string>;
  const rate = await takeRateLimit(request, `auth:${action}`, data.email ?? "", limit);
  if (!rate.allowed)
    return Response.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429, headers: { ...headers, "Retry-After": String(rate.retryAfter) } },
    );

  const supabase = await createSupabase();
  const admin = createSupabaseAdmin().auth.admin;
  // The app sends auth emails itself with token_hash links that /auth/callback verifies. Supabase's own emails
  // carry PKCE links that only work in the browser that asked, and its templates are shared across the project.
  async function sendLink(tokenHash: string, type: "email" | "recovery", next: string, subject: string, intro: string) {
    const link = `${getEnvironment().APP_URL}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=${type}&next=${encodeURIComponent(next)}`;
    try {
      await sendEmail({ to: data.email, subject, text: `${intro}\n\n${link}\n\nThe link works once and expires soon. If you didn't ask for this, you can ignore this email.` });
      return true;
    } catch {
      logEvent("auth_email_failed", { route: action });
      return false;
    }
  }
  const emailFailed = () => reply({ error: "We couldn't send the email. Please try again in a few minutes." }, 503);

  switch (action as Action) {
    case "sign-in": {
      const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (error?.code === "email_not_confirmed")
        return reply({ error: "Verify your email before signing in. Need a new link? Use “Resend verification email”." }, 403);
      if (error) return reply({ error: "Invalid email or password." }, 401);
      return reply({ ok: true });
    }
    case "sign-up": {
      if (getEnvironment().REQUIRE_EMAIL_VERIFICATION === "false") {
        const created = await admin.createUser({
          email: data.email,
          password: data.password,
          email_confirm: true,
          user_metadata: { name: data.name },
        });
        if (created.error?.code === "weak_password") return reply({ error: created.error.message }, 400);
        // Same reply for an existing email as for any failure, so sign-up doesn't reveal who has an account.
        if (created.error)
          return reply({ ok: true, message: "If you already have an account, sign in or reset your password." });
        const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
        if (error) return reply({ error: "Account created, but sign-in failed. Please sign in." }, 500);
        return reply({ ok: true, signedIn: true });
      }
      const { data: created, error } = await admin.generateLink({
        type: "signup",
        email: data.email,
        password: data.password,
        options: { data: { name: data.name } },
      });
      if (error?.code === "weak_password") return reply({ error: error.message }, 400);
      // An existing email gets the same reply as a new one, so sign-up doesn't reveal who has an account.
      if (error?.code === "email_exists" || error?.code === "user_already_exists") return reply({ ok: true });
      if (error) return reply({ error: "Account creation failed. Please try again." }, 400);
      if (!(await sendLink(created.properties.hashed_token, "email", "/app", "Confirm your Invoice Tracker account", "Confirm your email to finish creating your Invoice Tracker account:")))
        return emailFailed();
      return reply({ ok: true });
    }
    case "forgot-password": {
      // Unknown emails fail to generate a link and get the same reply.
      const { data: recovery } = await admin.generateLink({ type: "recovery", email: data.email });
      if (recovery?.properties && !(await sendLink(recovery.properties.hashed_token, "recovery", "/reset-password", "Reset your Invoice Tracker password", "Use this link to choose a new password:")))
        return emailFailed();
      return reply({ ok: true });
    }
    case "resend-verification": {
      // Verifying a magic link confirms the address. Confirmed accounts get nothing: they sign in with their password.
      const { data: magic } = await admin.generateLink({ type: "magiclink", email: data.email });
      if (magic?.properties && !magic.user.email_confirmed_at && !(await sendLink(magic.properties.hashed_token, "email", "/app", "Confirm your Invoice Tracker account", "Confirm your email to finish creating your Invoice Tracker account:")))
        return emailFailed();
      return reply({ ok: true });
    }
    case "reset-password": {
      const { data: current } = await supabase.auth.getUser();
      if (!current.user) return reply({ error: "This reset link is invalid or expired." }, 401);
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) return reply({ error: error.message }, 400);
      // Match the old behaviour: a password reset signs out every session.
      await supabase.auth.signOut({ scope: "global" });
      return reply({ ok: true });
    }
    case "sign-out": {
      // Only this browser: the default global scope would end the user's other devices and apps on the project.
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) return reply({ error: "Could not sign out." }, 500);
      return reply({ ok: true });
    }
  }
}
