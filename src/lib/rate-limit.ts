import { createHash } from "node:crypto";
import { getDatabase } from "@/lib/db";
import { getEnvironment, isDemoMode } from "@/lib/env";
import { logEvent } from "@/lib/logger";

let hopsLogged = false;
export function clientAddress(request: Request) {
  if (getEnvironment().TRUST_PROXY !== "true") return "direct";
  const hops = request.headers.get("x-forwarded-for")?.split(",") ?? [];
  if (!isDemoMode()) return hops[0]?.trim() || "unknown";
  // Render's Cloudflare edge sets True-Client-IP to the visitor and overwrites any value the client sent.
  // Its X-Forwarded-For ends in proxy hops (every visitor would share one limit), so it is only a fallback.
  const trueClient = request.headers.get("true-client-ip")?.trim();
  if (!hopsLogged) {
    hopsLogged = true;
    logEvent("demo_forwarded_hops", { hops: hops.length, trueClientIp: Boolean(trueClient) }); // never the addresses
  }
  return trueClient || hops.at(-1)?.trim() || "unknown";
}
export async function takeRateLimit(request: Request, scope: string, discriminator: string, limit = 10, windowSeconds = 60) {
  const identity = createHash("sha256").update(`${scope}\0${clientAddress(request)}\0${discriminator}`).digest("hex");
  const key = `app:${scope}:${identity}`; const now = BigInt(Date.now()); const cutoff = now - BigInt(windowSeconds * 1000);
  const rows = await getDatabase().$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimit" ("id", "key", "count", "lastRequest")
    VALUES (${crypto.randomUUID()}, ${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."lastRequest" < ${cutoff} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "lastRequest" = CASE WHEN "RateLimit"."lastRequest" < ${cutoff} THEN ${now} ELSE "RateLimit"."lastRequest" END
    RETURNING "count"`;
  return { allowed: rows[0].count <= limit, retryAfter: windowSeconds };
}
