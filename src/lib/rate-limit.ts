import { createHash } from "node:crypto";
import { getDatabase } from "@/lib/db";
import { getEnvironment } from "@/lib/env";

function clientAddress(request: Request) {
  if (getEnvironment().TRUST_PROXY !== "true") return "direct";
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
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
