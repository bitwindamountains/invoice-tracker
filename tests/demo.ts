import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getDatabase } from "../src/lib/db";
import { Prisma } from "../src/generated/prisma/client";
import { DEMO_DELETE_ORDER, deleteDemoWorkspaces } from "../src/services/demo-cleanup";
import { findDemoUser, newDemoToken } from "../src/lib/demo-session";
import { seedDemoWorkspace } from "../src/services/demo-seed";

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
  fn: (token: string, workspaceId: string) => Promise<void>,
) {
  const { token, tokenHash } = newDemoToken();
  const id = randomUUID();
  await db.user.create({
    data: { id, name: "Demo test", email: `demo-${id}@example.test`, demoTokenHash: tokenHash },
  });
  const ws = await db.workspace.create({
    data: { name: "Demo test", ownerId: id, demoExpiresAt },
  });
  try {
    await fn(token, ws.id);
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

check("DEMO_DELETE_ORDER completeness", async () => {
  // Prisma 7 no longer exposes dmmf; the scalar field enums carry the same info.
  const enums = Prisma as unknown as Record<string, Record<string, string> | undefined>;
  const expected = Object.values(Prisma.ModelName).filter(
    (name) => name !== "Workspace" && enums[`${name}ScalarFieldEnum`]?.workspaceId,
  );
  assert.ok(expected.length > 10);
  assert.deepEqual(new Set(DEMO_DELETE_ORDER), new Set(expected));
  assert.equal(DEMO_DELETE_ORDER.length, expected.length);
});
check("real workspaces are untouched, guard cannot be bypassed", () =>
  withDemoUser(null, async (_token, realId) => {
    for (const where of [
      { id: realId },
      { demoExpiresAt: null },
      { OR: [{ id: realId }, { demoExpiresAt: null }] },
    ])
      assert.equal(await deleteDemoWorkspaces(where), 0);
    assert.ok(await db.workspace.findUnique({ where: { id: realId } }));
  }));
check("concurrent cleanup of the same workspace deletes it once", async () => {
  const id = randomUUID();
  await db.user.create({ data: { id, name: "Demo test", email: `demo-${id}@example.test` } });
  const ws = await db.workspace.create({
    data: { name: "Demo test", ownerId: id, demoExpiresAt: new Date() },
  });
  const results = await Promise.all([
    deleteDemoWorkspaces({ id: ws.id }),
    deleteDemoWorkspaces({ id: ws.id }),
  ]);
  assert.equal(results[0] + results[1], 1);
  assert.equal(await db.user.count({ where: { id } }), 0);
});
check("demo workspace and its owner are deleted", async () => {
  const id = randomUUID();
  await db.user.create({ data: { id, name: "Demo test", email: `demo-${id}@example.test` } });
  const ws = await db.workspace.create({
    data: { name: "Demo test", ownerId: id, demoExpiresAt: new Date() },
  });
  assert.equal(await deleteDemoWorkspaces({ id: ws.id }), 1);
  assert.equal(await db.workspace.count({ where: { id: ws.id } }), 0);
  assert.equal(await db.user.count({ where: { id } }), 0);
});

check("seed + cleanup", async () => {
  const id = randomUUID();
  const now = new Date();
  await db.user.create({ data: { id, name: "Demo test", email: `demo-${id}@example.test` } });
  const ws = await db.workspace.create({
    data: {
      name: "Demo test",
      ownerId: id,
      demoExpiresAt: new Date(now.getTime() + 86_400_000),
      members: { create: { userId: id, role: "OWNER" } },
    },
  });
  try {
    const started = performance.now();
    await seedDemoWorkspace(id, ws.id, now);
    console.log(`seed took ${Math.round(performance.now() - started)}ms`);
    const workspaceId = ws.id;
    const workspace = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    assert.ok(workspace.onboardingCompletedAt);
    const invoices = await db.invoice.findMany({ where: { workspaceId } });
    const statuses = new Set(invoices.map((invoice) => invoice.status));
    for (const status of ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID"] as const)
      assert.ok(statuses.has(status), `missing ${status}`);
    const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
    const overdue = invoices.filter(
      (invoice) => invoice.status !== "DRAFT" && invoice.dueDate < today && invoice.balanceDue.gt(0),
    );
    assert.ok(overdue.length >= 2, `overdue: ${overdue.length}`);
    const viewed = await db.invoiceEvent.groupBy({
      by: ["invoiceId"],
      where: { workspaceId, type: "PUBLIC_LINK_OPENED" },
    });
    assert.ok(viewed.length >= 2, `viewed: ${viewed.length}`);
    assert.equal(await db.paymentConfirmation.count({ where: { workspaceId, status: "PENDING" } }), 1);
    assert.ok((await db.paymentPromise.count({ where: { workspaceId } })) >= 1);
    // Services stamp "now"; the seed must have moved every event into the past.
    const recent = { workspaceId, createdAt: { gt: new Date(now.getTime() - 12 * 3_600_000) } };
    for (const model of [
      "payment", "paymentPromise", "paymentConfirmation", "invoiceDelivery", "expense", "client",
      "productService", "invoiceItem", "invoice", "invoiceEvent", "auditLog",
    ] as const) {
      const delegate = db[model] as unknown as { count(a: object): Promise<number> };
      assert.equal(await delegate.count({ where: recent }), 0, `${model} still stamped now`);
    }
    for (const invoice of invoices.filter((item) => item.status !== "DRAFT")) {
      assert.ok(invoice.sentAt && invoice.sentAt < now, `${invoice.invoiceNumber} sentAt`);
      if (invoice.status === "PAID")
        assert.ok(invoice.paidAt && invoice.paidAt > invoice.sentAt, `${invoice.invoiceNumber} paidAt`);
    }
    assert.equal(invoices.length, 10);
    assert.equal(invoices.filter((invoice) => invoice.status === "PAID").length, 2);
    assert.equal(invoices.filter((invoice) => invoice.status === "PARTIALLY_PAID").length, 1);
    assert.equal(await db.client.count({ where: { workspaceId } }), 6);
    assert.equal(await db.expense.count({ where: { workspaceId } }), 8);
    for (const invoice of invoices) {
      assert.ok(invoice.total.equals(invoice.amountPaid.plus(invoice.balanceDue)), invoice.invoiceNumber);
      assert.ok(invoice.issueDate <= now, `${invoice.invoiceNumber} issued in the future`);
    }
  } finally {
    assert.equal(await deleteDemoWorkspaces({ id: ws.id }), 1);
  }
  for (const model of DEMO_DELETE_ORDER) {
    const delegate = db[(model[0].toLowerCase() + model.slice(1)) as Uncapitalize<typeof model>];
    const count = await (delegate as unknown as { count(a: object): Promise<number> }).count({
      where: { workspaceId: ws.id },
    });
    assert.equal(count, 0, model);
  }
  assert.equal(await db.user.count({ where: { id } }), 0);
});

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
