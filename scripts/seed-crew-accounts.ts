/**
 * scripts/seed-crew-accounts.ts
 *
 * Idempotent seeder for the 5 official CodeXa Agency Crew Accounts:
 * 1. Co-Founder: Sanjay (boddukurisanjay@gmail.com)
 * 2. CEO: Kishore (katlakishore86@gmail.com)
 * 3. CTO: Amrutha Divvela (amruthadivvela@gmail.com)
 * 4. HR: Vyshnavi Reddy (vyshnavireddy720@gmail.com)
 * 5. COO: Varun Parlapalli (varunparlapalli2008@gmail.com)
 *
 * Security:
 * - Passwords hashed using bcrypt (12 rounds)
 * - Initial temporary password: "Codexa123"
 * - mustChangePassword = true
 * - Matches by normalized email to prevent duplicate accounts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ override: true });

const db = new PrismaClient();

export const CREW_DEFINITIONS = [
  {
    name: "Sanjay",
    email: "boddukurisanjay@gmail.com",
    username: "sanjay",
    role: "CO_FOUNDER",
    orgRole: "CO_FOUNDER",
    department: "Executive",
    leadershipPosition: "CO_FOUNDER",
    primaryRole: "Co-Founder & System Architect",
    headline: "Co-Founder of CodeXa Agency • System Architecture & Engineering Operations",
    displayOrder: 2,
  },
  {
    name: "Kishore",
    email: "katlakishore86@gmail.com",
    username: "kishore",
    role: "CEO",
    orgRole: "CEO",
    department: "Executive",
    leadershipPosition: "CEO",
    primaryRole: "Chief Executive Officer (CEO)",
    headline: "Chief Executive Officer • Strategic Expansion & Global Operations",
    displayOrder: 3,
  },
  {
    name: "Amrutha Divvela",
    email: "amruthadivvela@gmail.com",
    username: "amrutha",
    role: "CTO",
    orgRole: "CTO",
    department: "Engineering",
    leadershipPosition: "CTO",
    primaryRole: "Chief Technology Officer (CTO)",
    headline: "Chief Technology Officer • Engineering Leadership & Technical Platforms",
    displayOrder: 4,
  },
  {
    name: "Vyshnavi Reddy",
    email: "vyshnavireddy720@gmail.com",
    username: "vyshnavi",
    role: "HR",
    orgRole: "HR",
    department: "People & Culture",
    leadershipPosition: "HR",
    primaryRole: "Head of Human Resources (HR)",
    headline: "Head of Human Resources • Talent Engineering, Culture & Operations",
    displayOrder: 5,
  },
  {
    name: "Varun Parlapalli",
    email: "varunparlapalli2008@gmail.com",
    username: "varun",
    role: "COO",
    orgRole: "COO",
    department: "Operations",
    leadershipPosition: "COO",
    primaryRole: "Chief Operating Officer (COO)",
    headline: "Chief Operating Officer • Operational Delivery & Platform Scale",
    displayOrder: 6,
  },
];

export async function seedCrewAccounts() {
  console.log("\n==================================================");
  console.log("       CODEXA CREW ACCOUNTS & ROLES SEED          ");
  console.log("==================================================\n");

  const tempPasswordHash = await bcrypt.hash("Codexa123", 12);

  for (const member of CREW_DEFINITIONS) {
    const cleanEmail = member.email.toLowerCase().trim();
    const cleanUsername = member.username.toLowerCase().trim();

    console.log(`-> Processing ${member.name} (${member.role}) [${cleanEmail}]...`);

    // Find existing user by email or username
    let user = await db.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanEmail, mode: "insensitive" } },
          { username: { equals: cleanUsername, mode: "insensitive" } },
        ],
      },
    });

    if (user) {
      console.log(`   Found existing user account (ID: ${user.id}). Updating role & temporary flags...`);
      // Update email, role & orgRole, ensuring account remains active
      user = await db.user.update({
        where: { id: user.id },
        data: {
          email: cleanEmail,
          fullName: member.name,
          role: member.role,
          orgRole: member.orgRole,
          department: member.department,
          passwordHash: tempPasswordHash,
          mustChangePassword: true,
          isActive: true,
        },
      });
    } else {
      console.log(`   Creating fresh account for ${member.name}...`);
      user = await db.user.create({
        data: {
          username: cleanUsername,
          email: cleanEmail,
          fullName: member.name,
          passwordHash: tempPasswordHash,
          role: member.role,
          orgRole: member.orgRole,
          department: member.department,
          isActive: true,
          mustChangePassword: true,
        },
      });
      console.log(`   ✓ Created User: @${user.username} (ID: ${user.id})`);
    }

    // Sync or create associated TeamProfile
    const existingProfile = await db.teamProfile.findUnique({
      where: { userId: user.id },
    });

    if (existingProfile) {
      console.log(`   Updating TeamProfile for ${member.name}...`);
      await db.teamProfile.update({
        where: { id: existingProfile.id },
        data: {
          displayName: member.name,
          memberType: "LEADERSHIP",
          leadershipPosition: member.leadershipPosition,
          primaryRole: member.primaryRole,
          headline: existingProfile.headline || member.headline,
          isPublic: true,
          displayOrder: member.displayOrder,
        },
      });
    } else {
      console.log(`   Creating new TeamProfile for ${member.name}...`);
      await db.teamProfile.create({
        data: {
          userId: user.id,
          displayName: member.name,
          memberType: "LEADERSHIP",
          leadershipPosition: member.leadershipPosition,
          primaryRole: member.primaryRole,
          headline: member.headline,
          mediaUrl: "/assets/images/logo.jpeg",
          isPublic: true,
          displayOrder: member.displayOrder,
        },
      });
    }

    console.log(`   ✓ Successfully synced ${member.name} as ${member.role} (mustChangePassword: ${user.mustChangePassword})\n`);
  }

  console.log("==================================================");
  console.log(" ✓ All 5 Crew Accounts verified & synced in DB    ");
  console.log("==================================================\n");
}

async function main() {
  try {
    await seedCrewAccounts();
  } catch (err: any) {
    console.error("Crew Seeding Error:", err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main();
}
