import { z } from "zod";

export const toneSchema = z.enum(["FRIENDLY", "PROFESSIONAL", "FIRM"]);
export const manualReminderSchema = z.object({
  tone: toneSchema,
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(4000),
});
export const reminderRulesSchema = z.object({
  rules: z.array(z.object({
    id: z.string().min(1).max(128),
    enabled: z.boolean(),
    tone: toneSchema,
    subject: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(4000),
  })).length(5),
});
