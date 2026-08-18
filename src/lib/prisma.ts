import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

// Reuse the client across HMR reloads in dev to avoid exhausting connections.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Prisma 7 requires a driver adapter. The app runtime uses the pooled
  // connection (DATABASE_URL); migrations use DIRECT_URL via prisma.config.ts.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Fail fast when the database is unreachable. Without these, `pg` waits on
    // the OS TCP timeout and a blip turns into a hung page render rather than
    // a caught error and a degraded (but served) response.
    connectionTimeoutMillis: 10_000,
    query_timeout: 15_000,
    statement_timeout: 15_000,
    // Supabase's transaction pooler is happiest with a small per-instance pool.
    max: 5,
    idleTimeoutMillis: 30_000,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
