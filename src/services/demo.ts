import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/db";
import { DEMO_LIFETIME_MS, newDemoToken } from "@/lib/demo-session";
import { getEnvironment } from "@/lib/env";
import { logEvent } from "@/lib/logger";
import { deleteDemoWorkspaces } from "./demo-cleanup";
import { seedDemoWorkspace } from "./demo-seed";

/** The demo being replaced was already gone (e.g. a concurrent Start over took it): not a free replacement. */
export class DemoReplacementGone extends Error {}

/** Error name and Prisma code only: messages can carry query input. */
export const errorLabel = (error: unknown) =>
  error instanceof Error ? [error.name, (error as { code?: unknown }).code].filter(Boolean).join(":") : "unknown";

export async function deleteDemoForUser(userId: string) {
  await deleteDemoWorkspaces({ ownerId: userId });
}

// Concurrent seeds conflict in the services' Serializable transactions (P2034), so creations run one at a time.
// ponytail: per process only; a second instance would need a database-level lock.
// A hung DB call stalls every queued creation until the pool or driver times it out.
let queue: Promise<unknown> = Promise.resolve();

/** Creates a seeded demo workspace, first freeing a slot under DEMO_MAX_ACTIVE. Returns the raw session token. */
export function createDemo(options: { replacingUserId?: string; now?: Date } = {}, seed = seedDemoWorkspace) {
  const run = queue.then(() => buildDemo(options, seed));
  queue = run.catch(() => undefined);
  return run;
}

async function buildDemo(
  { replacingUserId, now = new Date() }: { replacingUserId?: string; now?: Date },
  seed: typeof seedDemoWorkspace,
): Promise<{ token: string; expiresAt: Date }> {
  // Inside the queue, so N concurrent requests with one cookie get one free replacement, not N.
  if (replacingUserId && (await deleteDemoWorkspaces({ ownerId: replacingUserId })) === 0)
    throw new DemoReplacementGone();
  await deleteDemoWorkspaces({ demoExpiresAt: { lt: now } });
  // Evict before creating, so this call never deletes its own demo; keep the newest max - 1.
  const db = getDatabase();
  const evicted = await db.workspace.findMany({
    where: { demoExpiresAt: { gte: now } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: getEnvironment().DEMO_MAX_ACTIVE - 1,
    select: { id: true },
  });
  if (evicted.length) await deleteDemoWorkspaces({ id: { in: evicted.map(({ id }) => id) } });

  const { token, tokenHash } = newDemoToken();
  const expiresAt = new Date(now.getTime() + DEMO_LIFETIME_MS);
  const userId = randomUUID();
  const user = await db.user.create({
    data: {
      id: userId,
      name: "Demo Visitor",
      email: `demo-${userId}@demo.invalid`,
      emailVerified: true,
      demoTokenHash: tokenHash,
      ownedWorkspace: {
        create: {
          name: "Demo Visitor's workspace",
          demoExpiresAt: expiresAt,
          members: { create: { userId, role: "OWNER" } },
        },
      },
    },
    select: { ownedWorkspace: { select: { id: true } } },
  });
  const workspaceId = user.ownedWorkspace!.id;
  try {
    await seed(userId, workspaceId, now);
  } catch (error) {
    await deleteDemoWorkspaces({ id: workspaceId }).catch((cleanupError: unknown) =>
      logEvent("demo_seed_cleanup_failed", { error: errorLabel(cleanupError) }),
    );
    throw error;
  }
  return { token, expiresAt };
}
