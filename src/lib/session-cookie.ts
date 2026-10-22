// Auth runs only on the server, so page scripts never need to read the session cookie.
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
} as const;

// @supabase/ssr always writes its 400-day maxAge, so cap sessions at the previous seven days here.
// The proxy renews the cookie while the user stays active; removals keep their maxAge of 0.
export function withSessionLifetime<T extends { maxAge?: number }>(options: T) {
  return options.maxAge === 0 ? options : { ...options, maxAge: 60 * 60 * 24 * 7 };
}
