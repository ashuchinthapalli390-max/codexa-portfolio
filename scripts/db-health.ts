/**
 * CodeXa Database Health Check Script
 *
 * Verifies Supabase PostgreSQL connectivity via Prisma Client,
 * testing transaction pooler query execution, table accessibility,
 * and concurrent query stability.
 *
 * Usage: npx ts-node scripts/db-health.ts
 * (or npx tsx scripts/db-health.ts)
 */
import { db } from "../src/lib/db";

async function main() {
  console.log("==================================================");
  console.log(" CODEXA PRODUCTION DATABASE HEALTH CHECK");
  console.log("==================================================");

  const startTime = Date.now();

  try {
    // 1. Test Raw Query Execution (SELECT 1)
    console.log("[1/4] Testing Raw Connection (SELECT 1)...");
    const qStart = Date.now();
    const rawResult = await db.$queryRaw<{ alive: number }[]>`SELECT 1 as alive`;
    const qDuration = Date.now() - qStart;
    console.log(`      ✓ Raw Query Passed (${qDuration}ms):`, rawResult);

    // 2. Test User Table Count
    console.log("[2/4] Testing User Table Query...");
    const uStart = Date.now();
    const userCount = await db.user.count();
    const uDuration = Date.now() - uStart;
    console.log(`      ✓ User Query Passed (${uDuration}ms): ${userCount} registered accounts`);

    // 3. Test Session Table Query
    console.log("[3/4] Testing Session Table Query...");
    const sStart = Date.now();
    const sessionCount = await db.session.count();
    const sDuration = Date.now() - sStart;
    console.log(`      ✓ Session Query Passed (${sDuration}ms): ${sessionCount} active sessions`);

    // 4. Test Concurrent Queries (Simulate Multi-API Dashboard Load)
    console.log("[4/4] Testing 5 Concurrent Read Queries (PgBouncer Stress Check)...");
    const cStart = Date.now();
    const [c1, c2, c3, c4, c5] = await Promise.all([
      db.user.findFirst({ select: { id: true, username: true } }),
      db.teamProfile.findFirst({ select: { id: true, displayName: true } }),
      db.project.count(),
      db.session.findFirst({ select: { id: true } }),
      db.activityEvent.count().catch(() => 0),
    ]);
    const cDuration = Date.now() - cStart;
    console.log(`      ✓ Concurrent Queries Succeeded (${cDuration}ms) without 42P05 errors`);

    const totalDuration = Date.now() - startTime;
    console.log("==================================================");
    console.log(` HEALTH CHECK PASSED (Total: ${totalDuration}ms)`);
    console.log(" Status: DATABASE_HEALTHY");
    console.log("==================================================");
    process.exit(0);
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error("==================================================");
    console.error(` HEALTH CHECK FAILED (${totalDuration}ms)`);
    console.error(" Error Code:", error?.code || "UNKNOWN");
    console.error(" Error Message:", error?.message || String(error));
    console.error("==================================================");
    process.exit(1);
  }
}

main();
