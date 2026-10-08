import { getDatabase } from "@/lib/db";
import type { Role } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

export class AccessDenied extends Error {
  constructor() {
    super("Workspace not found");
  }
}

// Unique ownerId plus nested creation makes retries safe and membership atomic.
export async function ensurePersonalWorkspace(user: {
  id: string;
  name: string;
}) {
  const database = getDatabase();
  try {
    return await database.workspace.upsert({
      where: { ownerId: user.id },
      update: {},
      create: {
        name: `${user.name}'s workspace`,
        ownerId: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
        auditLogs: {
          create: { actorId: user.id, action: "WORKSPACE_CREATED" },
        },
      },
    });
  } catch (error) {
    // Concurrent nested upserts may race before the owner uniqueness check.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await database.workspace.findUnique({
        where: { ownerId: user.id },
      });
      if (existing) return existing;
    }
    throw error;
  }
}

export async function authorizeWorkspace(
  userId: string,
  workspaceId: string,
  allowedRoles: readonly Role[] = ["OWNER", "ADMIN", "STAFF"],
) {
  const membership = await getDatabase().workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: true },
  });
  if (!membership || !allowedRoles.includes(membership.role))
    throw new AccessDenied();
  return membership;
}
