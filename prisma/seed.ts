/**
 * CodeXa Agency — Seed Script (Prisma 5 + PostgreSQL)
 * Run with: npx tsx prisma/seed.ts
 *
 * Idempotent seeder that syncs owner, admin, and core team accounts,
 * and initializes official leadership identities while PRESERVING all Owner edits.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { bootstrapOfficialLeadership } from "../src/lib/bootstrap-leadership";

const BCRYPT_ROUNDS = 12;

async function main() {
  config({ path: ".env.local", override: true });
  config({ override: true });
  const db = new PrismaClient();

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║       CODEXA CORE TEAM SYSTEM — SECURE SEED               ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // ─── 1. VALIDATE REQUIRED ENV VARIABLES ─────────────────────────────────────
  const missing: string[] = [];

  if (!process.env.AUTH_SECRET)       missing.push("AUTH_SECRET");
  if (!process.env.DATABASE_URL)      missing.push("DATABASE_URL");
  if (!process.env.OWNER_EMAIL)       missing.push("OWNER_EMAIL");
  if (!process.env.OWNER_PASSWORD)    missing.push("OWNER_PASSWORD");
  if (!process.env.ADMIN_EMAIL)       missing.push("ADMIN_EMAIL");
  if (!process.env.ADMIN_PASSWORD)    missing.push("ADMIN_PASSWORD");
  if (!process.env.TEAM_USERNAME)     missing.push("TEAM_USERNAME");
  if (!process.env.TEAM_PASSWORD)     missing.push("TEAM_PASSWORD");

  if (missing.length > 0) {
    console.error("  ❌ SEED ABORTED — Missing required environment variables:");
    for (const key of missing) {
      console.error(`     - ${key}`);
    }
    console.error("\n  Add these to Vercel Environment Variables (Production) or .env.local (local dev).\n");
    process.exit(1);
  }

  // ─── 2. RESOLVE ENV VARIABLES ───────────────────────────────────────────────
  const ownerUsername    = (process.env.INITIAL_OWNER_USERNAME || process.env.OWNER_USERNAME || "ashu").toLowerCase().trim();
  const ownerEmail       = process.env.OWNER_EMAIL!.toLowerCase().trim();
  const ownerPassword    = process.env.OWNER_PASSWORD!;
  const ownerName        = process.env.OWNER_NAME || "Ashu";

  const adminUsername    = (process.env.ADMIN_USERNAME || "admin").toLowerCase().trim();
  const adminEmail       = process.env.ADMIN_EMAIL!.toLowerCase().trim();
  const adminPassword    = process.env.ADMIN_PASSWORD!;
  const adminName        = process.env.ADMIN_NAME || "Read Only Admin";

  const teamUsername     = process.env.TEAM_USERNAME!.toLowerCase().trim();
  const teamEmail        = (process.env.TEAM_EMAIL || "team@codexa.agency").toLowerCase().trim();
  const teamPassword     = process.env.TEAM_PASSWORD!;
  const teamDisplayName  = process.env.TEAM_DISPLAY_NAME || "Team Member";

  // ─── 3. CONNECT ─────────────────────────────────────────────────────────────
  try {
    await db.$connect();
    console.log("  ✓ DATABASE connected: yes\n");
  } catch (err) {
    console.error("  ❌ DATABASE connected: no —", (err as Error).message);
    process.exit(1);
  }

  // ─── 4. SEED OWNER ACCOUNT ──────────────────────────────────────────────────
  let owner = await db.user.findFirst({ where: { role: "OWNER" } });
  if (!owner) {
    const passwordHash = await bcrypt.hash(ownerPassword, BCRYPT_ROUNDS);
    owner = await db.user.create({
      data: {
        username: ownerUsername,
        email: ownerEmail,
        passwordHash,
        role: "OWNER",
        isActive: true,
        fullName: ownerName,
      },
    });
    console.log("  ✓ OWNER user created.");
  } else {
    const passwordHash = await bcrypt.hash(ownerPassword, BCRYPT_ROUNDS);
    owner = await db.user.update({
      where: { id: owner.id },
      data: { username: ownerUsername, email: ownerEmail, fullName: ownerName, passwordHash },
    });
    console.log("  ✓ OWNER user updated (username, email, name, password synced from env).");
  }

  // ─── 5. SEED ADMIN ACCOUNT ──────────────────────────────────────────────────
  let admin = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
    admin = await db.user.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
        isActive: true,
        fullName: adminName,
      },
    });
    console.log("  ✓ ADMIN user created.");
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
    admin = await db.user.update({
      where: { id: admin.id },
      data: { username: adminUsername, email: adminEmail, fullName: adminName, passwordHash },
    });
    console.log("  ✓ ADMIN user updated (username, email, name, password synced from env).");
  }

  // ─── 6. SEED TEAM_MEMBER ACCOUNT ────────────────────────────────────────────
  let teamUser = await db.user.findFirst({ where: { role: "TEAM_MEMBER" } });
  if (!teamUser) {
    const passwordHash = await bcrypt.hash(teamPassword, BCRYPT_ROUNDS);
    teamUser = await db.user.create({
      data: {
        username: teamUsername,
        email: teamEmail,
        passwordHash,
        role: "TEAM_MEMBER",
        isActive: true,
        fullName: teamDisplayName,
      },
    });
    console.log("  ✓ TEAM_MEMBER user created.");
  } else {
    const passwordHash = await bcrypt.hash(teamPassword, BCRYPT_ROUNDS);
    teamUser = await db.user.update({
      where: { id: teamUser.id },
      data: { username: teamUsername, email: teamEmail, fullName: teamDisplayName, passwordHash },
    });
    console.log("  ✓ TEAM_MEMBER user updated (username, email, name, password synced from env).");
  }

  // ─── 7. BOOTSTRAP OFFICIAL LEADERSHIP (IDEMPOTENT & PRESERVES EDITS) ───────
  console.log("  → Bootstrapping CodeXa Leadership identities (Founder, Co-Founder, CEO, Team Lead)...");
  await bootstrapOfficialLeadership();
  console.log("  ✓ Leadership identities initialized / synced.");

  // ─── 8. SEED CONFIRMATION OUTPUT (safe — no secrets printed) ────────────────
  console.log("");
  console.log(`  DATABASE connected: yes`);
  console.log(`  OWNER user exists: ${owner ? "yes" : "no"}`);
  console.log(`  ADMIN user exists: ${admin ? "yes" : "no"}`);
  console.log(`  TEAM user exists: ${teamUser ? "yes" : "no"}`);

  await db.$disconnect();
  console.log("\n  ✓ Seed completed successfully.\n");
}

main().catch((err) => {
  console.error("  ❌ Seed failed:", err.message ?? err);
  process.exit(1);
});
