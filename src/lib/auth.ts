import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "./db";
import { getEnvironment } from "./env";
import { sessionCookieOptions } from "./session-cookie";

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
              cookieStore.set(name, value, options),
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
  if (!environment.SUPABASE_SECRET_KEY)
    throw new Error("SUPABASE_SECRET_KEY is not configured");
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
export async function getSession() {
  const supabase = await createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !user.email_confirmed_at) return null;
  return { user: await syncUser({ ...user, email: user.email }) };
}
