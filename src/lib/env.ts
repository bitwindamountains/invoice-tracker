import { z } from "zod";

export const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (value) => /^postgres(ql)?:/.test(value),
        "PostgreSQL URL required",
      ),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32)
      .refine(
        (value) => !value.includes("REPLACE_WITH"),
        "Generate a random secret",
      ),
    BETTER_AUTH_URL: z.string().url(),
    EMAIL_MODE: z.enum(["file", "resend"]).default("file"),
    EMAIL_FROM: z.string().min(3),
    RESEND_API_KEY: z.string().optional(),
    TRUST_PROXY: z.enum(["true", "false"]).default("false"),
    DEPLOYMENT_VERSION: z.string().trim().max(100).default("development"),
    ERROR_MONITOR_URL: z.string().url().optional(),
    ERROR_MONITOR_TOKEN: z.string().min(20).optional(),
  })
  .superRefine((value, context) => {
    if (value.EMAIL_MODE === "resend" && !value.RESEND_API_KEY)
      context.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "Required for Resend",
      });
    if (value.NODE_ENV === "production") {
      if (!value.BETTER_AUTH_URL.startsWith("https://"))
        context.addIssue({
          code: "custom",
          path: ["BETTER_AUTH_URL"],
          message: "Production requires HTTPS",
        });
      if (value.EMAIL_MODE !== "resend")
        context.addIssue({
          code: "custom",
          path: ["EMAIL_MODE"],
          message: "Local file delivery is forbidden in production",
        });
      if (value.TRUST_PROXY !== "true")
        context.addIssue({ code: "custom", path: ["TRUST_PROXY"], message: "Production requires a trusted proxy that replaces forwarding headers" });
      if (!value.ERROR_MONITOR_URL || !value.ERROR_MONITOR_TOKEN)
        context.addIssue({ code: "custom", path: ["ERROR_MONITOR_URL"], message: "Production requires a configured error monitor" });
    }
  });

export function getEnvironment() {
  const result = environmentSchema.safeParse(process.env);
  if (!result.success)
    throw new Error(
      `Invalid environment: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
    );
  return result.data;
}
