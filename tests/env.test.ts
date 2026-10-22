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
});
