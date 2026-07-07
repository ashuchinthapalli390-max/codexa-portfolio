/**
 * Prisma Client singleton for CodeXa Admin System (Prisma 5 + MySQL/Aiven)
 *
 * - Prevents multiple instances during Next.js hot-reload in development
 * - In production each serverless function invocation reuses the global instance
 * - Never initialize PrismaClient in browser/client components
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

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
