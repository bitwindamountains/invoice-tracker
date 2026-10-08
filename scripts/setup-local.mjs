import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";

const password = randomBytes(24).toString("hex");
try {
  await writeFile(
    ".env",
    `DATABASE_URL=postgresql://invoice:${password}@127.0.0.1:54329/invoice_tracker\nBETTER_AUTH_SECRET=${randomBytes(48).toString("hex")}\nBETTER_AUTH_URL=http://localhost:3000\nEMAIL_MODE=file\nEMAIL_FROM=Invoice Tracker <noreply@example.com>\n`,
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    "Created .env with random local credentials. Existing files are never overwritten.",
  );
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log(".env already exists; left unchanged.");
}
