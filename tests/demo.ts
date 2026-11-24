import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getDatabase } from "../src/lib/db";
import { findDemoUser, newDemoToken } from "../src/lib/demo-session";

// Never run against a shared database: these checks create and delete rows.
const host = new URL(process.env.DATABASE_URL ?? "postgresql://invalid").hostname;
if (!["127.0.0.1", "localhost"].includes(host))
  throw new Error("Demo tests require a local DATABASE_URL (127.0.0.1 or localhost)");

const db = getDatabase();
const checks: [string, () => Promise<void>][] = [];
const check = (name: string, fn: () => Promise<void>) => checks.push([name, fn]);

// Creates a user (+ workspace) with a fresh token, runs fn, always deletes them.
async function withDemoUser(
  demoExpiresAt: Date | null,
  fn: (token: string) => Promise<void>,
) {
  const { token, tokenHash } = newDemoToken();
  const id = randomUUID();
  await db.user.create({
    data: { id, name: "Demo test", email: `demo-${id}@example.test`, demoTokenHash: tokenHash },
  });
  await db.workspace.create({ data: { name: "Demo test", ownerId: id, demoExpiresAt } });
  try {
    await fn(token);
  } finally {
    await db.workspace.deleteMany({ where: { ownerId: id } });
    await db.user.delete({ where: { id } });
  }
}

check("valid token returns the user", () =>
  withDemoUser(new Date(Date.now() + 3_600_000), async (token) => {
    assert.ok(await findDemoUser(token));
  }));
check("expired workspace returns null", () =>
  withDemoUser(new Date(Date.now() - 1000), async (token) => {
    assert.equal(await findDemoUser(token), null);
  }));
check("wrong, missing and malformed tokens return null", () =>
  withDemoUser(new Date(Date.now() + 3_600_000), async () => {
    assert.equal(await findDemoUser(newDemoToken().token), null);
    assert.equal(await findDemoUser(undefined), null);
    assert.equal(await findDemoUser("short"), null);
  }));
check("real workspace (no demoExpiresAt) returns null", () =>
  withDemoUser(null, async (token) => {
    assert.equal(await findDemoUser(token), null);
  }));

let failed = 0;
for (const [name, fn] of checks) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL ${name}`, error);
  }
}
console.log(`${checks.length - failed}/${checks.length} demo checks passed`);
await db.$disconnect();
process.exit(failed ? 1 : 0);
