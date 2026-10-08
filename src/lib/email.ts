import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { getEnvironment } from "./env";
import { logEvent } from "./logger";

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  attachments?: Array<{ filename: string; content: string }>;
}) {
  const environment = getEnvironment();
  if (environment.EMAIL_MODE === "file") {
    const directory = join(process.cwd(), ".local", "mail");
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, `${Date.now()}-${randomUUID()}.json`),
      JSON.stringify(message, null, 2),
      { mode: 0o600 },
    );
    logEvent("development_email_saved");
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${environment.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: environment.EMAIL_FROM, ...message }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    logEvent("email_delivery_failed", { status: response.status });
    throw new Error("Email delivery failed. Please request a new link.");
  }
}
