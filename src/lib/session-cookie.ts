// Auth runs only on the server, so page scripts never need to read the session cookie.
export const sessionCookieOptions = { httpOnly: true, sameSite: "lax", path: "/" } as const;
