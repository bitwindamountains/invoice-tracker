import { z } from "zod";

const amount = z.string().trim().regex(/^\d{1,15}(\.\d{1,4})?$/, "Enter a valid positive amount").refine(value => Number(value) > 0, "Amount must be greater than zero");
const optionalText = (max: number) => z.string().trim().max(max).transform(value => value || null);

export const paymentSchema = z.object({
  amount,
  method: z.string().trim().min(1).max(100),
  reference: optionalText(200),
  paidAt: z.iso.date(),
  note: optionalText(1000),
});

export const paymentConfirmationSchema = paymentSchema.pick({ amount: true, method: true, reference: true, paidAt: true }).extend({
  message: optionalText(1000),
  idempotencyKey: z.uuid(),
});

export const paymentPromiseSchema = z.object({
  promisedFor: z.iso.date(),
  note: optionalText(1000),
});

export const confirmationReviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("reject"), note: optionalText(500) }),
]);

export const confirmationListSchema = z.object({ status: z.enum(["PENDING", "CONFIRMED", "REJECTED"]).default("PENDING") });
