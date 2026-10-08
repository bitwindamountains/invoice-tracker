import { describe, expect, it } from "vitest";
import { catalogItemSchema, catalogItemUpdateSchema, catalogListSchema, catalogStatusSchema } from "@/features/catalog/schema";
describe("catalog validation", () => {
  const valid = { name: "  Consultation  ", description: "", price: "750.0000", unit: "hour", taxable: true };
  it("normalizes text while preserving decimal money strings", () => { const parsed = catalogItemSchema.parse(valid); expect(parsed.name).toBe("Consultation"); expect(parsed.description).toBeNull(); expect(parsed.price).toBe("750.0000"); });
  it("rejects floating-point hazards and excessive precision", () => { expect(catalogItemSchema.safeParse({ ...valid, price: "NaN" }).success).toBe(false); expect(catalogItemSchema.safeParse({ ...valid, price: "1.00001" }).success).toBe(false); expect(catalogItemSchema.safeParse({ ...valid, price: "-1" }).success).toBe(false); });
  it("requires optimistic versions for edits and status changes", () => { expect(catalogItemUpdateSchema.safeParse({ ...valid, version: 1 }).success).toBe(true); expect(catalogStatusSchema.safeParse({ active: false, version: 0 }).success).toBe(false); });
  it("defaults to the active first page", () => { expect(catalogListSchema.parse({})).toEqual({ search: "", status: "active", page: 1 }); });
});
