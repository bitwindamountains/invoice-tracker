import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "./db";
import { getEnvironment } from "./env";
import { sessionCookieOptions, withSessionLifetime } from "./session-cookie";

export async function createSupabase() {
  const environment = getEnvironment();
  const cookieStore = await cookies();
  return createServerClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: sessionCookieOptions,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, withSessionLifetime(options)),
            );
          } catch {
            // Server Components can't write cookies; the proxy refreshes sessions.
          }
        },
      },
    },
  );
}

// Admin client (secret key) for server-side account creation; it bypasses RLS, so never expose it.
export function createSupabaseAdmin() {
  const environment = getEnvironment();
  return createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function displayName(user: SupabaseUser, email: string) {
  const metadata = user.user_metadata ?? {};
  const name = String(metadata.name ?? metadata.full_name ?? "").trim();
  return (name.length >= 2 ? name : email.split("@")[0]).slice(0, 100);
}

// Workspaces reference the app's own User table, so mirror each verified Supabase user into it.
async function syncUser(user: SupabaseUser & { email: string }) {
  const database = getDatabase();
  const name = displayName(user, user.email);
  let existing = await database.user.findUnique({ where: { id: user.id } });
  if (!existing || existing.email !== user.email)
    // Supabase emails are unique, so another row holding this one is stale (a deleted or since-renamed account).
    // Release it rather than hand its workspace to the new owner of the address.
    await database.user.updateMany({
      where: { email: user.email, NOT: { id: user.id } },
      data: { email: `released-${user.id}-${Date.now()}@invalid` },
    });
  if (!existing)
    try {
      return await database.user.create({
        data: { id: user.id, email: user.email, name, emailVerified: true },
      });
    } catch (error) {
      // The layout and page render in parallel on first sign-in, so another request may have just created it.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"))
        throw error;
      existing = await database.user.findUniqueOrThrow({ where: { id: user.id } });
    }
  if (existing.email === user.email) return existing;
  return database.user.update({
    where: { id: user.id },
    data: { email: user.email },
  });
}

// getUser() asks Supabase Auth to validate the token, unlike reading the cookie alone.
// cache() shares that round trip between the layout and page of one render.
export const getSession = cache(async () => {
  const supabase = await createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !user.email_confirmed_at) return null;
  return { user: await syncUser({ ...user, email: user.email }) };
});
