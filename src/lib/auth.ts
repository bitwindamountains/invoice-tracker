import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getDatabase } from "./db";
import { getEnvironment } from "./env";
import { sendEmail } from "./email";
import { ensurePersonalWorkspace } from "@/services/workspace";

function createAuth() {
  const environment = getEnvironment();
  return betterAuth({
    appName: "Invoice Tracker",
    baseURL: environment.BETTER_AUTH_URL,
    secret: environment.BETTER_AUTH_SECRET,
    database: prismaAdapter(getDatabase(), { provider: "postgresql" }),
    trustedOrigins: [environment.BETTER_AUTH_URL],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) =>
        sendEmail({
          to: user.email,
          subject: "Reset your password",
          text: `Reset your Invoice Tracker password: ${url}\n\nIf you did not request this, ignore this email.`,
        }),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 3600,
      sendVerificationEmail: async ({ user, url }) =>
        sendEmail({
          to: user.email,
          subject: "Verify your email",
          text: `Verify your Invoice Tracker email: ${url}\n\nThis link expires in one hour.`,
        }),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60, max: 3 },
        "/send-verification-email": { window: 60, max: 3 },
      },
    },
    advanced: { useSecureCookies: environment.NODE_ENV === "production" },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const name = z.string().trim().min(2).max(100).safeParse(user.name);
            if (!name.success)
              throw new APIError("BAD_REQUEST", {
                message: "Name must contain 2 to 100 characters.",
              });
            return { data: { ...user, name: name.data } };
          },
          after: async (user) => {
            await ensurePersonalWorkspace(user);
          },
        },
      },
    },
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth());
}
