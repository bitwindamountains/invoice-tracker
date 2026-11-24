/** Error name and Prisma code only: messages can carry query input. Dependency-free so Edge-bundled code can import it. */
export const errorLabel = (error: unknown) =>
  error instanceof Error ? [error.name, (error as { code?: unknown }).code].filter(Boolean).join(":") : "unknown";
