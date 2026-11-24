import { describe, expect, it } from "vitest";
import { environmentSchema } from "../src/lib/env";
const local = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/test",
  APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only_key",
  EMAIL_FROM: "test@example.com",
  EMAIL_MODE: "file",
  SUPABASE_SECRET_KEY: "sb_secret_test_only_key",
};
describe("deployment environment", () => {
  it("accepts isolated local development", () =>
    expect(environmentSchema.safeParse(local).success).toBe(true));
  it("rejects local email delivery and HTTP in production", () =>
    expect(
      environmentSchema.safeParse({ ...local, NODE_ENV: "production" }).success,
    ).toBe(false));
  it("requires provider credentials", () =>
    expect(
      environmentSchema.safeParse({ ...local, EMAIL_MODE: "resend" }).success,
    ).toBe(false));
  it("rejects placeholder keys", () =>
    expect(
      environmentSchema.safeParse({
        ...local,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "REPLACE_WITH_PUBLISHABLE_KEY",
      }).success,
    ).toBe(false));
  it("requires the secret key for auth email links", () =>
    expect(
      environmentSchema.safeParse({ ...local, SUPABASE_SECRET_KEY: undefined }).success,
    ).toBe(false));
  it("refuses to skip email verification in production", () =>
    expect(
      environmentSchema.safeParse({
        ...local,
        NODE_ENV: "production",
        APP_URL: "https://example.com",
        EMAIL_MODE: "resend",
        RESEND_API_KEY: "test-only",
        TRUST_PROXY: "true",
        ERROR_MONITOR_URL: "https://monitor.example.test/events",
        ERROR_MONITOR_TOKEN: "test-monitor-token-1234567890",
        REQUIRE_EMAIL_VERIFICATION: "false",
        SUPABASE_SECRET_KEY: "sb_secret_test_only_key",
      }).success,
    ).toBe(false));
  it("requires PostgreSQL", () =>
    expect(
      environmentSchema.safeParse({
        ...local,
        DATABASE_URL: "https://example.com",
      }).success,
    ).toBe(false));
  it("accepts configured HTTPS production", () =>
    expect(
      environmentSchema.safeParse({
        ...local,
        NODE_ENV: "production",
        APP_URL: "https://example.com",
        EMAIL_MODE: "resend",
        RESEND_API_KEY: "test-only",
        TRUST_PROXY: "true",
        ERROR_MONITOR_URL: "https://monitor.example.test/events",
        ERROR_MONITOR_TOKEN: "test-monitor-token-1234567890",
      }).success,
    ).toBe(true));
  it("keeps Supabase keys required in real mode", () =>
    expect(
      environmentSchema.safeParse({ ...local, SUPABASE_SECRET_KEY: undefined }).success,
    ).toBe(false));
  describe("demo mode", () => {
    const demo = {
      NODE_ENV: "production",
      DATABASE_URL: local.DATABASE_URL,
      APP_URL: "https://demo.onrender.com",
      DEMO_MODE: "true",
      EMAIL_MODE: "file",
      EMAIL_FROM: "Demo <noreply@example.com>",
      TRUST_PROXY: "true",
    };
    it("accepts a demo environment with no Supabase or Resend keys", () => {
      const result = environmentSchema.safeParse(demo);
      expect(result.success).toBe(true);
      expect(result.data?.DEMO_MAX_ACTIVE).toBe(10);
    });
    it("treats empty values as unset", () => {
      expect(environmentSchema.safeParse({ ...demo, SUPABASE_SECRET_KEY: "", RESEND_API_KEY: "" }).success).toBe(true);
      const real = environmentSchema.safeParse({ ...local, SUPABASE_SECRET_KEY: "" });
      expect(real.error?.issues.map((issue) => issue.path)).toContainEqual(["SUPABASE_SECRET_KEY"]);
    });
    it("refuses provider keys in demo mode", () => {
      const secret = environmentSchema.safeParse({ ...demo, SUPABASE_SECRET_KEY: local.SUPABASE_SECRET_KEY });
      expect(secret.error?.issues.map((issue) => issue.path)).toContainEqual(["SUPABASE_SECRET_KEY"]);
      expect(
        environmentSchema.safeParse({ ...demo, EMAIL_MODE: "resend", RESEND_API_KEY: "x".repeat(20) }).success,
      ).toBe(false);
    });
    it("requires file email delivery in demo mode", () => {
      const result = environmentSchema.safeParse({ ...demo, EMAIL_MODE: "resend" });
      expect(result.error?.issues.map((issue) => issue.path)).toContainEqual(["EMAIL_MODE"]);
    });
    it("still requires HTTPS and a trusted proxy for a production demo", () => {
      expect(environmentSchema.safeParse({ ...demo, APP_URL: "http://demo.onrender.com" }).success).toBe(false);
      expect(environmentSchema.safeParse({ ...demo, TRUST_PROXY: "false" }).success).toBe(false);
    });
    it("bounds DEMO_MAX_ACTIVE", () => {
      expect(environmentSchema.safeParse({ ...demo, DEMO_MAX_ACTIVE: "0" }).success).toBe(false);
      expect(environmentSchema.safeParse({ ...demo, DEMO_MAX_ACTIVE: "201" }).success).toBe(false);
      expect(environmentSchema.safeParse({ ...demo, DEMO_MAX_ACTIVE: "25" }).data?.DEMO_MAX_ACTIVE).toBe(25);
    });
  });
});
