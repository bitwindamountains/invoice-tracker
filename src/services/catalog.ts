import { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/lib/db";
import { catalogItemSchema, catalogItemUpdateSchema, catalogListSchema, catalogStatusSchema } from "@/features/catalog/schema";

export class CatalogItemNotFound extends Error {}
export class CatalogItemVersionConflict extends Error {}
export class CatalogAccessDenied extends Error {}

async function requireRole(tx: Prisma.TransactionClient, workspaceId: string, userId: string, mutate: boolean) {
  const roles = mutate ? ["OWNER", "ADMIN"] as const : ["OWNER", "ADMIN", "STAFF"] as const;
  const member = await tx.workspaceMember.count({ where: { workspaceId, userId, role: { in: [...roles] } } });
  if (!member) throw new CatalogAccessDenied();
}
export async function createCatalogItem(userId: string, workspaceId: string, raw: unknown) {
  const input = catalogItemSchema.parse(raw);
  return getDatabase().$transaction(async (tx) => {
    await requireRole(tx, workspaceId, userId, true);
    const item = await tx.productService.create({ data: { workspaceId, ...input, price: new Prisma.Decimal(input.price) } });
    await tx.auditLog.create({ data: { workspaceId, actorId: userId, action: "CATALOG_ITEM_CREATED" } });
    return item;
  });
}
export async function updateCatalogItem(userId: string, workspaceId: string, itemId: string, raw: unknown) {
  const input = catalogItemUpdateSchema.parse(raw); const { version, price, ...rest } = input;
  return getDatabase().$transaction(async (tx) => {
    await requireRole(tx, workspaceId, userId, true);
    const result = await tx.productService.updateMany({ where: { id: itemId, workspaceId, version }, data: { ...rest, price: new Prisma.Decimal(price), version: { increment: 1 } } });
    if (!result.count) { if (await tx.productService.count({ where: { id: itemId, workspaceId } })) throw new CatalogItemVersionConflict(); throw new CatalogItemNotFound(); }
    await tx.auditLog.create({ data: { workspaceId, actorId: userId, action: "CATALOG_ITEM_UPDATED" } });
    return tx.productService.findFirstOrThrow({ where: { id: itemId, workspaceId } });
  });
}
export async function setCatalogItemActive(userId: string, workspaceId: string, itemId: string, raw: unknown) {
  const input = catalogStatusSchema.parse(raw);
  return getDatabase().$transaction(async (tx) => {
    await requireRole(tx, workspaceId, userId, true);
    const result = await tx.productService.updateMany({ where: { id: itemId, workspaceId, version: input.version }, data: { active: input.active, version: { increment: 1 } } });
    if (!result.count) { if (await tx.productService.count({ where: { id: itemId, workspaceId } })) throw new CatalogItemVersionConflict(); throw new CatalogItemNotFound(); }
    await tx.auditLog.create({ data: { workspaceId, actorId: userId, action: input.active ? "CATALOG_ITEM_RESTORED" : "CATALOG_ITEM_ARCHIVED" } });
    return tx.productService.findFirstOrThrow({ where: { id: itemId, workspaceId } });
  });
}
export async function getCatalogItem(userId: string, workspaceId: string, itemId: string) {
  const db = getDatabase();
  if (!await db.workspaceMember.count({ where: { workspaceId, userId } })) throw new CatalogAccessDenied();
  const item = await db.productService.findFirst({ where: { id: itemId, workspaceId } });
  if (!item) throw new CatalogItemNotFound(); return item;
}
export async function listCatalogItems(userId: string, workspaceId: string, raw: unknown) {
  const query = catalogListSchema.parse(raw); const db = getDatabase();
  if (!await db.workspaceMember.count({ where: { workspaceId, userId } })) throw new CatalogAccessDenied();
  const pageSize = 25; const where: Prisma.ProductServiceWhereInput = { workspaceId, active: query.status === "active", ...(query.search ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { description: { contains: query.search, mode: "insensitive" } }, { unit: { contains: query.search, mode: "insensitive" } }] } : {}) };
  const [items, total] = await db.$transaction([db.productService.findMany({ where, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (query.page - 1) * pageSize, take: pageSize }), db.productService.count({ where })]);
  return { items, total, page: query.page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), query };
}
