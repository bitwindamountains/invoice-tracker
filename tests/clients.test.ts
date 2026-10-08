import { describe, expect, it } from "vitest";
import { archiveClientSchema, clientListSchema, clientSchema, clientUpdateSchema } from "@/features/clients/schema";

const valid = { name: "  Acme Studio  ", company: "", email: "billing@acme.test", phone: "", addressLine1: "", addressLine2: "", city: "", provinceState: "", postalCode: "", country: "PH", taxId: "", currency: "PHP", notes: "" };

describe("client validation", () => {
  it("normalizes optional text and trims required fields", () => {
    const parsed = clientSchema.parse(valid);
    expect(parsed.name).toBe("Acme Studio");
    expect(parsed.company).toBeNull();
    expect(parsed.currency).toBe("PHP");
  });
  it("rejects malformed contacts and unsupported billing choices", () => {
    expect(clientSchema.safeParse({ ...valid, email: "bad" }).success).toBe(false);
    expect(clientSchema.safeParse({ ...valid, currency: "NOPE" }).success).toBe(false);
    expect(clientSchema.safeParse({ ...valid, country: "XX" }).success).toBe(false);
  });
  it("requires a positive version for concurrent mutations", () => {
    expect(clientUpdateSchema.safeParse({ ...valid, version: 0 }).success).toBe(false);
    expect(archiveClientSchema.safeParse({ archived: true, version: 2 }).success).toBe(true);
  });
  it("applies safe list defaults and limits pages", () => {
    expect(clientListSchema.parse({})).toEqual({ search: "", status: "active", page: 1 });
    expect(clientListSchema.safeParse({ page: 10001 }).success).toBe(false);
  });
});
