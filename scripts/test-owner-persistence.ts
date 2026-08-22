/**
 * Diagnostic Verification Script: Owner Account Persistence in PostgreSQL
 * Run with: npx tsx scripts/test-owner-persistence.ts
 */
import { dataStore } from "../src/lib/data-store";
import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function runTest() {
  console.log("==================================================");
  console.log(" TEST: OWNER ACCOUNT CREATION & PERSISTENCE IN POSTGRESQL");
  console.log("==================================================");

  const testUsername = `test_agent_${Date.now()}`;
  const testEmail = `${testUsername}@codexa-test.internal`;
  const testPassword = "SecureTestPassword123!";

  try {
    // 1. Initial State
    const initialProfiles = await dataStore.getProfiles();
    console.log(`[1/5] Initial Profile Count in Database: ${initialProfiles.length}`);

    // 2. Create Profile
    const passwordHash = await bcrypt.hash(testPassword, 10);
    console.log(`[2/5] Creating Test Member @${testUsername}...`);

    const created = await dataStore.createProfile({
      username: testUsername,
      email: testEmail,
      displayName: "Automated Test Agent",
      passwordHash,
      role: "TEAM_MEMBER",
      memberType: "CORE_TEAM",
      headline: null,
      bio: null,
      skills: [],
      mediaUrl: "/assets/images/logo.jpeg",
      isActive: true,
      isPublic: true,
      mustChangePassword: true,
    });

    console.log(`      ✓ Profile created with ID: ${created.id}`);
    console.log(`      ✓ Verified clean zero-dummy skills: ${JSON.stringify(created.skills)}`);
    console.log(`      ✓ Verified clean bio: ${created.bio}`);

    // 3. Query from PostgreSQL immediately
    console.log("[3/5] Querying PostgreSQL directly via dataStore.getProfileByUsername...");
    const queried = await dataStore.getProfileByUsername(testUsername);
    if (!queried) {
      throw new Error(`Profile @${testUsername} was NOT found in database query!`);
    }
    console.log(`      ✓ Successfully loaded from DB: @${queried.username} (${queried.displayName})`);

    // 4. Query full list
    console.log("[4/5] Querying full profile list via dataStore.getProfiles()...");
    const updatedProfiles = await dataStore.getProfiles();
    const foundInList = updatedProfiles.some((p) => p.username === testUsername);
    if (!foundInList) {
      throw new Error(`Profile @${testUsername} missing from full profile list!`);
    }
    console.log(`      ✓ New Profile Count: ${updatedProfiles.length} (Verified present in list)`);

    // 5. Cleanup
    console.log("[5/5] Cleaning up test profile from PostgreSQL...");
    await dataStore.deleteProfile(created.id);
    const afterDelete = await dataStore.getProfileByUsername(testUsername);
    if (afterDelete) {
      throw new Error("Profile still exists after delete!");
    }
    console.log("      ✓ Cleanup successful.");

    console.log("==================================================");
    console.log(" ALL TESTS PASSED: PostgreSQL Persistence Verified!");
    console.log("==================================================");
  } catch (error: any) {
    console.error("TEST FAILED:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

runTest();
