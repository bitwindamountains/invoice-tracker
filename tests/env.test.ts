import { describe, expect, it } from "vitest";
import { environmentSchema } from "../src/lib/env";
const local = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/test",
  BETTER_AUTH_SECRET: "a".repeat(48),
  BETTER_AUTH_URL: "http://localhost:3000",
  EMAIL_FROM: "test@example.com",
  EMAIL_MODE: "file",
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
  it("rejects placeholder secrets", () =>
    expect(
      environmentSchema.safeParse({
        ...local,
        BETTER_AUTH_SECRET: "REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS",
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
        BETTER_AUTH_URL: "https://example.com",
        EMAIL_MODE: "resend",
        RESEND_API_KEY: "test-only",
        TRUST_PROXY: "true",
        ERROR_MONITOR_URL: "https://monitor.example.test/events",
        ERROR_MONITOR_TOKEN: "test-monitor-token-1234567890",
      }).success,
    ).toBe(true));
});
