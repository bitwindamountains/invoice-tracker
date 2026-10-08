import { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/lib/db";
import { archiveClientSchema, clientListSchema, clientSchema, clientUpdateSchema } from "@/features/clients/schema";

export class ClientNotFound extends Error {}
export class ClientVersionConflict extends Error {}
export class ClientAccessDenied extends Error {}

async function requireWorkspaceRole(transaction: Prisma.TransactionClient, workspaceId: string, userId: string, mutate: boolean) {
  const roles = mutate ? ["OWNER", "ADMIN"] as const : ["OWNER", "ADMIN", "STAFF"] as const;
  const membership = await transaction.workspaceMember.findFirst({ where: { workspaceId, userId, role: { in: [...roles] } }, select: { id: true } });
  if (!membership) throw new ClientAccessDenied();
}

export async function createClient(userId: string, workspaceId: string, rawInput: unknown) {
  const input = clientSchema.parse(rawInput);
  return getDatabase().$transaction(async (transaction) => {
    await requireWorkspaceRole(transaction, workspaceId, userId, true);
    const client = await transaction.client.create({ data: { workspaceId, ...input } });
    await transaction.auditLog.create({ data: { workspaceId, actorId: userId, action: "CLIENT_CREATED" } });
    return client;
  });
}

export async function updateClient(userId: string, workspaceId: string, clientId: string, rawInput: unknown) {
  const input = clientUpdateSchema.parse(rawInput);
  const { version, ...changes } = input;
  return getDatabase().$transaction(async (transaction) => {
    await requireWorkspaceRole(transaction, workspaceId, userId, true);
    const result = await transaction.client.updateMany({ where: { id: clientId, workspaceId, version }, data: { ...changes, version: { increment: 1 } } });
    if (!result.count) {
      const exists = await transaction.client.count({ where: { id: clientId, workspaceId } });
      if (exists) throw new ClientVersionConflict();
      throw new ClientNotFound();
    }
    await transaction.auditLog.create({ data: { workspaceId, actorId: userId, action: "CLIENT_UPDATED" } });
    return transaction.client.findFirstOrThrow({ where: { id: clientId, workspaceId } });
  });
}

export async function setClientArchived(userId: string, workspaceId: string, clientId: string, rawInput: unknown) {
  const input = archiveClientSchema.parse(rawInput);
  return getDatabase().$transaction(async (transaction) => {
    await requireWorkspaceRole(transaction, workspaceId, userId, true);
    const result = await transaction.client.updateMany({ where: { id: clientId, workspaceId, version: input.version }, data: { archivedAt: input.archived ? new Date() : null, version: { increment: 1 } } });
    if (!result.count) {
      const exists = await transaction.client.count({ where: { id: clientId, workspaceId } });
      if (exists) throw new ClientVersionConflict();
      throw new ClientNotFound();
    }
    await transaction.auditLog.create({ data: { workspaceId, actorId: userId, action: input.archived ? "CLIENT_ARCHIVED" : "CLIENT_RESTORED" } });
    return transaction.client.findFirstOrThrow({ where: { id: clientId, workspaceId } });
  });
}

export async function getClient(userId: string, workspaceId: string, clientId: string) {
  const database = getDatabase();
  const membership = await database.workspaceMember.count({ where: { workspaceId, userId } });
  if (!membership) throw new ClientAccessDenied();
  const client = await database.client.findFirst({ where: { id: clientId, workspaceId } });
  if (!client) throw new ClientNotFound();
  return client;
}

export async function listClients(userId: string, workspaceId: string, rawQuery: unknown) {
  const query = clientListSchema.parse(rawQuery);
  const database = getDatabase();
  const membership = await database.workspaceMember.count({ where: { workspaceId, userId } });
  if (!membership) throw new ClientAccessDenied();
  const pageSize = 25;
  const where: Prisma.ClientWhereInput = {
    workspaceId,
    archivedAt: query.status === "archived" ? { not: null } : null,
    ...(query.search ? { OR: [
      { name: { contains: query.search, mode: "insensitive" } }, { company: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } }, { phone: { contains: query.search, mode: "insensitive" } },
    ] } : {}),
  };
  const [items, total] = await database.$transaction([
    database.client.findMany({ where, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (query.page - 1) * pageSize, take: pageSize }),
    database.client.count({ where }),
  ]);
  return { items, total, page: query.page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), query };
}
