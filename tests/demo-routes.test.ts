import { afterEach, describe, expect, it, vi } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { clientAddress } from "@/lib/rate-limit";

const mocks = vi.hoisted(() => ({ takeRateLimit: vi.fn(), createDemo: vi.fn(), findDemoUser: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "tok" }) }) }));
vi.mock("@/lib/demo-session", async (original) => ({ ...(await original<object>()), findDemoUser: mocks.findDemoUser }));
vi.mock("@/services/demo", async (original) => ({ ...(await original<object>()), createDemo: mocks.createDemo }));
vi.mock("@/lib/rate-limit", async (original) => ({ ...(await original<object>()), takeRateLimit: mocks.takeRateLimit }));

// Every API write route must be classified for demo mode (spec section 7); a new one fails here until it is.
const classification: Record<string, "allowed" | "restricted"> = {
  "auth/[action]/route.ts": "restricted",
  "catalog/[itemId]/route.ts": "allowed",
  "catalog/[itemId]/status/route.ts": "allowed",
  "catalog/route.ts": "allowed",
  "clients/[clientId]/archive/route.ts": "allowed",
  "clients/[clientId]/route.ts": "allowed",
  "clients/route.ts": "allowed",
  "demo/route.ts": "allowed",
  "expense-categories/[categoryId]/status/route.ts": "allowed",
  "expense-categories/route.ts": "allowed",
  "expenses/[expenseId]/route.ts": "allowed",
  "expenses/route.ts": "allowed",
  "invoices/[invoiceId]/payments/route.ts": "allowed",
  "invoices/[invoiceId]/public-link/route.ts": "allowed",
  "invoices/[invoiceId]/reminders/route.ts": "allowed",
  "invoices/[invoiceId]/route.ts": "allowed",
  "invoices/[invoiceId]/send/route.ts": "allowed",
  "invoices/route.ts": "allowed",
  "onboarding/route.ts": "restricted",
  "payment-confirmations/[confirmationId]/route.ts": "allowed",
  "public/invoices/[token]/payment-confirmations/route.ts": "allowed",
  "public/invoices/[token]/payment-promises/route.ts": "allowed",
  "reminder-rules/route.ts": "allowed",
  "reminders/run/route.ts": "allowed",
};

const baseEnv: Record<string, string | undefined> = {
  DATABASE_URL: "postgresql://user:pass@127.0.0.1:5432/db",
  APP_URL: "http://127.0.0.1:3000",
  EMAIL_FROM: "Test <test@example.test>",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_xxxxxxxxxxxxxxxxxxxx",
  SUPABASE_SECRET_KEY: undefined,
  RESEND_API_KEY: undefined,
  EMAIL_MODE: "file",
  TRUST_PROXY: "true",
};
const stubEnv = (values: Record<string, string | undefined>) => {
  for (const [key, value] of Object.entries({ ...baseEnv, ...values })) vi.stubEnv(key, value);
};

describe("demo routes", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("classifies every write route", async () => {
    const files = (await readdir("src/app/api", { recursive: true }))
      .map((file) => file.replaceAll("\\", "/"))
      .filter((file) => file.endsWith("/route.ts") || file === "route.ts");
    const writes: string[] = [];
    for (const file of files)
      if (/export async function (POST|PATCH|DELETE)/.test(await readFile(`src/app/api/${file}`, "utf8")))
        writes.push(file);
    expect(new Set(writes)).toEqual(new Set(Object.keys(classification)));
    for (const [file, kind] of Object.entries(classification))
      expect(kind, file).toBe(["auth/[action]/route.ts", "onboarding/route.ts"].includes(file) ? "restricted" : "allowed");
  });

  it("uses the last forwarded hop in demo mode", () => {
    const request = new Request("http://127.0.0.1:3000/api/demo", {
      method: "POST",
      headers: { "x-forwarded-for": "6.6.6.6, 1.2.3.4" },
    });
    stubEnv({ DEMO_MODE: "true", NEXT_PUBLIC_SUPABASE_URL: undefined, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined });
    expect(clientAddress(request)).toBe("1.2.3.4");
    stubEnv({ DEMO_MODE: "false", SUPABASE_SECRET_KEY: "sb_secret_xxxxxxxxxxxxxxxxxxxxxxxx" });
    expect(clientAddress(request)).toBe("6.6.6.6");
  });

  it("rate-limits Start over under its own scope and answers 429 with Retry-After", async () => {
    stubEnv({ DEMO_MODE: "true", NEXT_PUBLIC_SUPABASE_URL: undefined, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined });
    mocks.findDemoUser.mockResolvedValue({ id: "u1" });
    mocks.takeRateLimit.mockResolvedValue({ allowed: false, retryAfter: 3600 });
    const { POST } = await import("@/app/api/demo/route");
    const response = await POST(new Request("http://127.0.0.1:3000/api/demo", { method: "POST", headers: { origin: "http://127.0.0.1:3000" } }));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("3600");
    expect(mocks.takeRateLimit).toHaveBeenCalledWith(expect.anything(), "demo-replace", "", 10, 3600);
    expect(mocks.createDemo).not.toHaveBeenCalled();
  });
});
