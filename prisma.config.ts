import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer loads .env automatically. Load it here so the CLI
// (migrate/seed/studio) sees DATABASE_URL and DIRECT_URL. `.env.local` wins,
// matching Next.js precedence; neither overrides real shell variables.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

/**
 * Prisma 7 configuration. Connection URLs live here rather than in
 * schema.prisma.
 *
 * - `url` is the DIRECT connection (port 5432). Migrations and introspection
 *   must not go through the pooler.
 * - The app itself connects with DATABASE_URL (the pooled 6543 endpoint) via
 *   the generated client at runtime.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    // `prisma generate` runs during the build, where only DATABASE_URL may be
    // present, so fall back rather than failing the build. Migration commands
    // still need the real DIRECT_URL (the direct 5432 endpoint).
    url: process.env.DIRECT_URL
      ? env("DIRECT_URL")
      : process.env.DATABASE_URL
        ? env("DATABASE_URL")
        : "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "npx tsx prisma/seed.ts",
  },
});
