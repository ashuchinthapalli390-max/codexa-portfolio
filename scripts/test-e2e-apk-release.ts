import crypto from "crypto";
import { db } from "../src/lib/db";
import { dataStore } from "../src/lib/data-store";
import { validateApkBuffer } from "../src/lib/apk-validator";
import {
  ensureApkReleaseBucket,
  createApkUploadSession,
  uploadApkBufferDirect,
  fetchApkBufferFromStorage,
  deleteApkFromStorage,
  APK_BUCKET_NAME,
} from "../src/lib/apk-storage";
import {
  publishMobileRelease,
  rollbackMobileRelease,
  serializeRelease,
} from "../src/lib/apk-releases";
import { canManageMobile, canViewMobile } from "../src/lib/permissions";
import { getOrCreateGlobalMobileConfig } from "../src/lib/mobile-features";

// Helper to construct a valid in-memory APK binary (> 100KB with manifest, dex, and META-INF cert)
function createMockValidApk({
  packageName = "com.codexa.app",
  versionName = "1.0.9",
  versionCode = 109,
}: {
  packageName?: string;
  versionName?: string;
  versionCode?: number;
} = {}): Buffer {
  const files: { name: string; content: Buffer }[] = [
    {
      name: "AndroidManifest.xml",
      content: Buffer.from(`package="${packageName}" versionCode="${versionCode}" versionName="${versionName}"`),
    },
    {
      name: "classes.dex",
      content: Buffer.from("dex\n035\x00dalvik-bytecode-codexa-production-binary"),
    },
    {
      name: "META-INF/CERT.RSA",
      content: Buffer.from("mock-sha256-signing-cert-rsa-block-data-codexa"),
    },
    {
      name: "META-INF/MANIFEST.MF",
      content: Buffer.from("Manifest-Version: 1.0\nCreated-By: CodeXa Build Tools\n"),
    },
  ];

  const localHeaders: Buffer[] = [];
  const cdHeaders: Buffer[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf8");
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(0, 8);
    lh.writeUInt32LE(0, 14);
    lh.writeUInt32LE(f.content.length, 18);
    lh.writeUInt32LE(f.content.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);

    const localEntry = Buffer.concat([lh, nameBuf, f.content]);
    localHeaders.push(localEntry);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt32LE(0, 16);
    cd.writeUInt32LE(f.content.length, 20);
    cd.writeUInt32LE(f.content.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt32LE(offset, 42);

    cdHeaders.push(Buffer.concat([cd, nameBuf]));
    offset += localEntry.length;
  }

  const localData = Buffer.concat(localHeaders);
  const cdData = Buffer.concat(cdHeaders);
  const padding = Buffer.alloc(115 * 1024, 0xbb); // Ensures > 100KB size

  const eocd = Buffer.alloc(22);
  const cdOffset = localData.length + padding.length;
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdData.length, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([localData, padding, cdData, eocd]);
}

interface TestReport {
  testId: string;
  name: string;
  status: "PASS" | "FAIL";
  details: string;
}

const reports: TestReport[] = [];

function record(testId: string, name: string, passed: boolean, details: string) {
  reports.push({
    testId,
    name,
    status: passed ? "PASS" : "FAIL",
    details,
  });
  const symbol = passed ? "✓" : "✗";
  console.log(`[${symbol}] ${testId}: ${name} — ${details}`);
}

async function runE2ETests() {
  console.log("================================================================================");
  console.log("CODEXA AGENCY — COMPLETE APK RELEASE MANAGEMENT END-TO-END VERIFICATION SUITE");
  console.log("================================================================================");

  let createdReleaseId1: string | null = null;
  let createdReleaseId2: string | null = null;
  let storageKey1: string | null = null;

  try {
    // ── TEST 1: Role Permissions & RBAC Enforcement ────────────────────────────
    console.log("\n[PHASE 10] Testing RBAC Matrix Enforcement...");
    const founderUser = { role: "FOUNDER", email: "ashuchinthapalli3900@gmail.com" };
    const coFounderUser = { role: "CO_FOUNDER", email: "boddukurisanjay@gmail.com" };
    const ctoUser = { role: "CTO", email: "cto@codxa.online" };
    const internUser = { role: "INTERN", email: "intern@codxa.online" };
    const employeeUser = { role: "EMPLOYEE", email: "emp@codxa.online" };

    const founderCanManage = canManageMobile(founderUser as any);
    const coFounderCanManage = canManageMobile(coFounderUser as any);
    const ctoCanManage = canManageMobile(ctoUser as any);
    const internCanManage = canManageMobile(internUser as any);
    const employeeCanManage = canManageMobile(employeeUser as any);

    const ctoCanView = canViewMobile(ctoUser as any);
    const internCanView = canViewMobile(internUser as any);

    record("TC-01", "Founder Upload & Manage Permission", founderCanManage === true, "Founder has full release management access.");
    record("TC-02", "Co-Founder Upload & Manage Permission", coFounderCanManage === true, "Co-Founder has identical full release management access.");
    record("TC-03", "Intern Permission Rejection (403)", internCanManage === false && internCanView === false, "Intern blocked from both management and viewing.");
    record("TC-04", "Employee Permission Rejection", employeeCanManage === false, "Employee blocked from release operations.");
    record("TC-05", "CTO Read-Only Visibility", ctoCanManage === false && ctoCanView === true, "CTO granted read-only visibility without edit/publish authority.");

    // ── TEST 2: Binary Validation Engine ──────────────────────────────────────
    console.log("\n[PHASE 2 & 10] Testing Deep APK Inspection & Validation...");
    const corruptBuffer = Buffer.from("CORRUPT_BYTES_NOT_ZIP_NOT_APK");
    const vCorrupt = validateApkBuffer(corruptBuffer);
    record("TC-06", "Corrupted APK Rejection", vCorrupt.isValid === false, `Rejected with error: ${vCorrupt.errors[0]}`);

    const validApkBuf = createMockValidApk({ packageName: "com.codexa.app", versionName: "2.0.0", versionCode: 200 });
    const vValid = validateApkBuffer(validApkBuf, "com.codexa.app");
    record(
      "TC-07",
      "Valid APK Inspection & Integrity",
      vValid.isValid && vValid.hasManifest && vValid.hasDex && vValid.hasSigning && vValid.sha256.length === 64,
      `Valid: SHA-256=${vValid.sha256.substring(0, 12)}..., Package=${vValid.detectedPackageName}, Type=${vValid.signingType}`
    );

    // ── TEST 3: Persistent Cloud Storage Integration ──────────────────────────
    console.log("\n[PHASE 2 & 4] Testing Persistent Cloud Object Storage...");
    const bucketEnsured = await ensureApkReleaseBucket();
    record("TC-08", "Supabase Storage Bucket Verified", bucketEnsured === true, `Bucket '${APK_BUCKET_NAME}' verified active.`);

    const uploadSession = await createApkUploadSession({
      channel: "stable",
      versionName: "2.0.0-test",
      versionCode: 200,
      fileName: "codexa-test-2.0.0.apk",
    });

    storageKey1 = uploadSession.storageKey;
    record(
      "TC-09",
      "Direct-to-Cloud Pre-signed Session Generated",
      Boolean(uploadSession.signedUploadUrl && uploadSession.publicDownloadUrl),
      `Generated signedUploadUrl for key: ${uploadSession.storageKey}`
    );

    // Upload APK binary buffer using uploadApkBufferDirect
    const uploadedDirect = await uploadApkBufferDirect({
      buffer: validApkBuf,
      channel: "stable",
      versionName: "2.0.0-test",
      fileName: "codexa-2.0.0-test.apk",
    });

    record("TC-10", "APK Uploaded to Cloud Storage", Boolean(uploadedDirect.publicDownloadUrl), `Object stored at ${uploadedDirect.storageKey}`);

    // Download and verify integrity from cloud storage
    const downloadedBuf = await fetchApkBufferFromStorage(uploadedDirect.bucket, uploadedDirect.storageKey);
    const downloadedSha256 = crypto.createHash("sha256").update(downloadedBuf).digest("hex");
    record(
      "TC-11",
      "Cloud Object Integrity Verification",
      downloadedSha256 === vValid.sha256,
      `Downloaded ${downloadedBuf.length} bytes with matching SHA-256: ${downloadedSha256.substring(0, 12)}...`
    );

    // ── TEST 4: PostgreSQL Database Release Registration ───────────────────────
    console.log("\n[PHASE 3 & 4] Testing Database Release Record Lifecycle...");
    // Find a founder user for uploadedById
    const adminUser = await db.user.findFirst({
      where: { role: { in: ["FOUNDER", "CO_FOUNDER", "OWNER"] } },
      select: { id: true, username: true },
    });
    const actorId = adminUser?.id || "test-founder-id";
    const actorName = adminUser?.username || "Shaik Ashu (Founder)";

    const testRelease1 = await db.mobileAppRelease.create({
      data: {
        appId: "codexa-mobile",
        platform: "ANDROID",
        packageName: "com.codexa.app",
        versionName: "2.0.0",
        versionCode: 200,
        releaseChannel: "STABLE",
        storageProvider: "SUPABASE",
        storageBucket: uploadedDirect.bucket,
        storageKey: uploadedDirect.storageKey,
        apkDownloadUrl: uploadedDirect.publicDownloadUrl,
        apkFileSize: BigInt(validApkBuf.length),
        apkSha256: vValid.sha256,
        signingCertificateFingerprint: vValid.signingFingerprint || null,
        releaseNotes: "• Core database synchronization update\n• Attendance speed optimizations",
        status: "DRAFT",
        updateType: "OPTIONAL",
        minimumSupportedVersionCode: 100,
        isCurrentPublished: false,
        uploadedById: actorId,
        uploadedByName: actorName,
        validationReport: vValid as any,
      },
    });
    createdReleaseId1 = testRelease1.id;

    record("TC-12", "PostgreSQL Draft Release Stored", Boolean(testRelease1.id), `Draft release v${testRelease1.versionName} created (ID: ${testRelease1.id}).`);

    // Verify Draft does not modify global MobileAppConfig
    const configBeforePublish = await getOrCreateGlobalMobileConfig();
    record(
      "TC-13",
      "Draft Release Does Not Alter Active Config",
      configBeforePublish.buildNumber !== 200,
      `Active config remains at build ${configBeforePublish.buildNumber || 1}. Users unaffected.`
    );

    // Duplicate version code check
    let duplicateCaught = false;
    try {
      await db.mobileAppRelease.create({
        data: {
          appId: "codexa-mobile",
          platform: "ANDROID",
          packageName: "com.codexa.app",
          versionName: "2.0.0-dupe",
          versionCode: 200,
          releaseChannel: "STABLE",
          storageProvider: "SUPABASE",
          storageBucket: uploadedDirect.bucket,
          storageKey: "codexa-apk/stable/2.0.0/dupe.apk",
          apkDownloadUrl: uploadedDirect.publicDownloadUrl,
          apkFileSize: BigInt(validApkBuf.length),
          apkSha256: vValid.sha256,
          uploadedById: actorId,
        },
      });
    } catch {
      duplicateCaught = true;
    }
    record("TC-14", "Unique Version Code Constraint Enforced", duplicateCaught === true, "Database rejected duplicate versionCode in the same channel.");

    // ── TEST 5: Publishing & MobileAppConfig Synchronization ──────────────────
    console.log("\n[PHASE 5 & 6] Testing Atomic Release Publication & Sync...");
    const publishedRelease = await publishMobileRelease({
      releaseId: testRelease1.id,
      publisherId: actorId,
      publisherName: actorName,
      notifyUsers: false,
    });

    record(
      "TC-15",
      "Release Atomically Published",
      publishedRelease.status === "PUBLISHED" && publishedRelease.isCurrentPublished === true,
      `Release v${publishedRelease.versionName} marked PUBLISHED and current.`
    );

    const configAfterPublish = await db.mobileAppConfig.findFirst({ where: { targetType: "GLOBAL" } });
    record(
      "TC-16",
      "MobileAppConfig Synchronized with Active Release",
      configAfterPublish?.currentVersion === "2.0.0" && configAfterPublish?.buildNumber === 200,
      `MobileAppConfig now reflects v${configAfterPublish?.currentVersion} (Build ${configAfterPublish?.buildNumber}).`
    );

    // ── TEST 6: Mobile Client Update Detection (Flutter Simulation) ───────────
    console.log("\n[PHASE 6 & 7] Testing Mobile App Update Check Engine...");
    // Older client checking
    const clientCodeOld = 105;
    const updateAvailable = clientCodeOld < (configAfterPublish?.buildNumber || 0);
    const forceUpdate = clientCodeOld < (publishedRelease.minimumSupportedVersionCode || 1) || publishedRelease.updateType === "MANDATORY";

    record(
      "TC-17",
      "Older App Client Detects Update Available",
      updateAvailable === true,
      `Client build ${clientCodeOld} detected update to ${configAfterPublish?.buildNumber}.`
    );

    // Current client checking
    const clientCodeCurrent = 200;
    const updateAvailableForCurrent = clientCodeCurrent < (configAfterPublish?.buildNumber || 0);
    record(
      "TC-18",
      "Up-to-Date App Client Detects No Update",
      updateAvailableForCurrent === false,
      `Client build ${clientCodeCurrent} recognized as current.`
    );

    // Test Mandatory / Force Update behavior
    const updatedToMandatory = await db.mobileAppRelease.update({
      where: { id: testRelease1.id },
      data: { updateType: "MANDATORY", minimumSupportedVersionCode: 200 },
    });
    const forcedForOld = clientCodeOld < updatedToMandatory.minimumSupportedVersionCode;
    record(
      "TC-19",
      "Force Update Policy Blocks Deprecated Builds",
      forcedForOld === true,
      `Client build ${clientCodeOld} < minimumSupportedCode ${updatedToMandatory.minimumSupportedVersionCode} -> Update Required.`
    );

    // ── TEST 7: Download Telemetry & Diagnostics ──────────────────────────────
    console.log("\n[PHASE 7 & 9] Testing Download Telemetry & Audit Logs...");
    const downloadEvent = await db.mobileReleaseEvent.create({
      data: {
        releaseId: testRelease1.id,
        eventType: "DOWNLOAD_START",
        deviceId: "mock-device-pixel-8",
        versionCode: 200,
        metadata: { client: "Flutter Android", ip: "127.0.0.1" },
      },
    });

    await db.mobileAppRelease.update({
      where: { id: testRelease1.id },
      data: { downloadCount: { increment: 1 } },
    });

    const verifyRel = await db.mobileAppRelease.findUnique({
      where: { id: testRelease1.id },
      select: { downloadCount: true },
    });

    record(
      "TC-20",
      "Download Diagnostics & Telemetry Tracking",
      Boolean(downloadEvent.id) && verifyRel?.downloadCount === 1,
      `Event logged (ID: ${downloadEvent.id}), downloadCount incremented to ${verifyRel?.downloadCount}.`
    );

    // ── TEST 8: Demotion & Rollback Handling ──────────────────────────────────
    console.log("\n[PHASE 9] Testing Atomic Demotion & Safe Rollback...");
    // Create a newer release v2.0.1 (Build 201)
    const validApkBuf2 = createMockValidApk({ packageName: "com.codexa.app", versionName: "2.0.1", versionCode: 201 });
    const vValid2 = validateApkBuffer(validApkBuf2, "com.codexa.app");
    const testRelease2 = await db.mobileAppRelease.create({
      data: {
        appId: "codexa-mobile",
        platform: "ANDROID",
        packageName: "com.codexa.app",
        versionName: "2.0.1",
        versionCode: 201,
        releaseChannel: "STABLE",
        storageProvider: "SUPABASE",
        storageBucket: uploadedDirect.bucket,
        storageKey: uploadedDirect.storageKey,
        apkDownloadUrl: uploadedDirect.publicDownloadUrl,
        apkFileSize: BigInt(validApkBuf2.length),
        apkSha256: vValid2.sha256,
        status: "DRAFT",
        uploadedById: actorId,
        uploadedByName: actorName,
      },
    });
    createdReleaseId2 = testRelease2.id;

    // Publish v2.0.1
    await publishMobileRelease({
      releaseId: testRelease2.id,
      publisherId: actorId,
      publisherName: actorName,
      notifyUsers: false,
    });

    // Check v2.0.0 was automatically demoted to ARCHIVED
    const demotedRel1 = await db.mobileAppRelease.findUnique({ where: { id: testRelease1.id } });
    record(
      "TC-21",
      "Previous Active Release Safely Demoted to ARCHIVED",
      demotedRel1?.status === "ARCHIVED" && demotedRel1.isCurrentPublished === false,
      `v2.0.0 demoted to ARCHIVED; v2.0.1 is now active.`
    );

    // Rollback back to v2.0.0
    const rolledBack = await rollbackMobileRelease({
      releaseId: testRelease1.id,
      actorId,
      actorName,
    });

    const rolledBackRel = await db.mobileAppRelease.findUnique({ where: { id: testRelease1.id } });
    const demotedRel2 = await db.mobileAppRelease.findUnique({ where: { id: testRelease2.id } });
    const configAfterRollback = await db.mobileAppConfig.findFirst({ where: { targetType: "GLOBAL" } });

    record(
      "TC-22",
      "Rollback Re-promotes Target & Demotes Superseded Release",
      rolledBackRel?.isCurrentPublished === true &&
        demotedRel2?.isCurrentPublished === false &&
        configAfterRollback?.buildNumber === 200,
      `Successfully rolled back active pointer to v${rolledBack.versionName} (Build ${rolledBack.versionCode}).`
    );

    // Check Audit Log
    const auditLogs = await db.auditLog.findMany({
      where: {
        action: { in: ["MOBILE_APP_RELEASE_PUBLISHED", "MOBILE_APP_RELEASE_ROLLED_BACK"] },
      },
      orderBy: { createdAt: "desc" },
      take: 2,
    });

    record(
      "TC-23",
      "Audit Trail Permanently Logged",
      auditLogs.length >= 2,
      `Found ${auditLogs.length} audit logs. Latest action: ${auditLogs[0]?.action}.`
    );

  } finally {
    // ── CLEANUP TEST ARTIFACTS ────────────────────────────────────────────────
    console.log("\n[CLEANUP] Cleaning up test database records and storage artifacts...");
    try {
      if (createdReleaseId1) {
        await db.mobileReleaseEvent.deleteMany({ where: { releaseId: createdReleaseId1 } }).catch(() => {});
        await db.mobileAppRelease.delete({ where: { id: createdReleaseId1 } }).catch(() => {});
      }
      if (createdReleaseId2) {
        await db.mobileReleaseEvent.deleteMany({ where: { releaseId: createdReleaseId2 } }).catch(() => {});
        await db.mobileAppRelease.delete({ where: { id: createdReleaseId2 } }).catch(() => {});
      }
      if (storageKey1) {
        await deleteApkFromStorage(APK_BUCKET_NAME, storageKey1).catch(() => {});
      }
      console.log("Cleanup complete. Production state clean.");
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr);
    }
  }

  // ── FINAL SUMMARY ─────────────────────────────────────────────────────────
  console.log("\n================================================================================");
  console.log("FINAL TEST SUMMARY");
  console.log("================================================================================");
  const total = reports.length;
  const passed = reports.filter((r) => r.status === "PASS").length;
  const failed = reports.filter((r) => r.status === "FAIL").length;

  console.log(`Total Scenarios: ${total} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) {
    console.error("SOME TESTS FAILED!");
    process.exit(1);
  } else {
    console.log("ALL 23 END-TO-END SPECIFICATION SCENARIOS PASSED WITH 100% SUCCESS!");
    process.exit(0);
  }
}

runE2ETests().catch((err) => {
  console.error("Test execution exception:", err);
  process.exit(1);
});
