/**
 * Prisma Client singleton for CodeXa Enterprise Platform (Supabase PostgreSQL + PgBouncer)
 *
 * - Single shared global singleton across all serverless invocations
 * - Always preserves globalThis.prisma in all environments (development & production)
 * - Prevents connection exhaustion & prepared statement collisions (42P05)
 * - Never initialize PrismaClient in browser/client components or individual route files
 * - DATABASE_URL must never be exposed via NEXT_PUBLIC_ variables
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Always store db in globalThis so serverless function module re-evaluations reuse the exact same client instance
globalForPrisma.prisma = db;

