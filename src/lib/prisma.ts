/**
 * Prisma Client export bridge
 * Provides default and named export of the shared database singleton
 */

import { db } from "./db";

export { db, db as prisma };
export default db;
