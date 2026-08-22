/**
 * Comprehensive Database Stress & PgBouncer Health Test
 *
 * Validates:
 * 1. Sanitized connection properties (without revealing credentials)
 * 2. Sequential query execution
 * 3. Concurrent multi-resource stress queries (Promise.all)
 * 4. Multi-round rapid execution to guarantee zero 42P05 / 26000 errors
 *
 * Run with: npx tsx scripts/db-concurrent-stress.ts
 */
import { db } from "../src/lib/db";

function inspectSanitizedDbUrl(): void {
  const rawUrl = process.env.DATABASE_URL || "";
  if (!rawUrl) {
    console.error("❌ ERROR: DATABASE_URL is not defined in environment.");
    return;
  }

  try {
    const parsed = new URL(rawUrl);
    const hasPgBouncer = parsed.searchParams.get("pgbouncer") === "true";
    const connLimit = parsed.searchParams.get("connection_limit");
    const isPoolerPort = parsed.port === "6543";
    const hostType = parsed.hostname.includes("supabase") ? "Supabase Pooler" : "Custom Host";

    console.log("==================================================");
    console.log(" SANITIZED DATABASE CONNECTION PROPERTIES");
    console.log("==================================================");
    console.log(` Protocol          : ${parsed.protocol.replace(":", "")}`);
    console.log(` Host Type         : ${hostType}`);
    console.log(` Port              : ${parsed.port} (${isPoolerPort ? "PgBouncer Transaction Pooler Port" : "Direct Port"})`);
    console.log(` pgbouncer parameter: ${hasPgBouncer ? "true (ACTIVE)" : "MISSING/FALSE"}`);
    console.log(` connection_limit  : ${connLimit || "NOT SPECIFIED"}`);
    console.log(` Path Database     : ${parsed.pathname.replace("/", "")}`);
    console.log("==================================================");
  } catch (err: any) {
    console.log("⚠️ Could not parse DATABASE_URL as standard URL:", err.message);
  }
}

async function runStressTest() {
  inspectSanitizedDbUrl();

  console.log("\n[STAGE 1/3] Testing Sequential Queries...");
  const t0 = Date.now();
  const rawAlive = await db.$queryRawUnsafe("SELECT 1 as alive");
  console.log(`  ✓ SELECT 1 OK (${Date.now() - t0}ms):`, rawAlive);

  const tUsers = Date.now();
  const userCount = await db.user.count();
  console.log(`  ✓ user.count() OK (${Date.now() - tUsers}ms): ${userCount} users`);

  const tSessions = Date.now();
  const sessionCount = await db.session.count();
  console.log(`  ✓ session.count() OK (${Date.now() - tSessions}ms): ${sessionCount} sessions`);

  const tProjects = Date.now();
  const projectCount = await db.project.count();
  console.log(`  ✓ project.count() OK (${Date.now() - tProjects}ms): ${projectCount} projects`);

  console.log("\n[STAGE 2/3] Testing Heavy Concurrent Multi-Resource Queries (Single Round)...");
  const tConc = Date.now();
  const [users, session, projects, notifs, inquiries, posts, logs] = await Promise.all([
    db.user.findMany({ select: { id: true, username: true, role: true }, take: 10 }),
    db.session.findFirst({ select: { id: true, userId: true, expiresAt: true } }),
    db.project.findMany({ select: { id: true, slug: true, isMainProject: true }, take: 10 }),
    db.notification.findMany({ select: { id: true, title: true }, take: 5 }),
    db.inquiry.findMany({ select: { id: true, referenceId: true, status: true }, take: 5 }),
    db.post.findMany({ select: { id: true, content: true }, take: 5 }),
    db.auditLog.findMany({ select: { id: true, action: true }, take: 5 }),
  ]);

  console.log(`  ✓ Concurrent Round 1 OK (${Date.now() - tConc}ms):`);
  console.log(`    - Users Loaded      : ${users.length}`);
  console.log(`    - Session Sample    : ${session ? `User ID ${session.userId}` : "None"}`);
  console.log(`    - Projects Loaded   : ${projects.length}`);
  console.log(`    - Inquiries Loaded  : ${inquiries.length}`);
  console.log(`    - Audit Logs Loaded : ${logs.length}`);

  console.log("\n[STAGE 3/3] Testing Rapid Multi-Round Concurrent Stress (5 Consecutive Waves)...");
  for (let round = 1; round <= 5; round++) {
    const waveStart = Date.now();
    await Promise.all([
      db.user.findMany({ take: 5 }),
      db.session.findMany({ take: 5 }),
      db.project.findMany({ take: 5 }),
      db.notification.findMany({ take: 5 }),
      db.inquiry.findMany({ take: 5 }),
      db.post.findMany({ take: 5 }),
      db.siteSetting.findMany({ take: 5 }),
      db.activityEvent.findMany({ take: 5 }),
    ]);
    console.log(`  ✓ Wave ${round}/5 Succeeded (${Date.now() - waveStart}ms) — 0 prepared statement collisions`);
  }

  console.log("\n==================================================");
  console.log(" ✅ ALL CONCURRENT DATABASE STRESS TESTS PASSED!");
  console.log(" Zero 42P05 or 26000 errors detected.");
  console.log("==================================================");
}

runStressTest()
  .catch((err) => {
    console.error("\n❌ STRESS TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
