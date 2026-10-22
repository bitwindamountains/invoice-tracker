import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnvironment } from "./env";

const globalDatabase = globalThis as unknown as {
  invoiceDatabase?: PrismaClient;
};
export function getDatabase() {
  if (!globalDatabase.invoiceDatabase) {
    const environment = getEnvironment();
    globalDatabase.invoiceDatabase = new PrismaClient({
      adapter: new PrismaPg(
        {
          connectionString: environment.DATABASE_URL,
          max: 5,
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
        },
        // The pg driver ignores ?schema=, so pass it on as Prisma CLI does for migrations.
        {
          schema:
            new URL(environment.DATABASE_URL).searchParams.get("schema") ??
            undefined,
        },
      ),
    });
  }
  return globalDatabase.invoiceDatabase;
}
