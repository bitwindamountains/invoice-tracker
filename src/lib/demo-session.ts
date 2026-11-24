import { createHash, randomBytes } from "node:crypto";
import type { User } from "@/generated/prisma/client";
import { getDatabase } from "./db";

export const DEMO_COOKIE = "demo_session";
export const DEMO_LIFETIME_MS = 86_400_000;

export function hashDemoToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newDemoToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashDemoToken(token) };
}

export async function findDemoUser(token: string | undefined, now = new Date()): Promise<User | null> {
  if (!token || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const db = getDatabase();
  const user = await db.user.findUnique({ where: { demoTokenHash: hashDemoToken(token) } });
  if (!user) return null;
  const workspace = await db.workspace.findUnique({
    where: { ownerId: user.id },
    select: { demoExpiresAt: true },
  });
  const expiresAt = workspace?.demoExpiresAt;
  return expiresAt && expiresAt > now ? user : null;
}

export function demoCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}
