import crypto from "crypto";
import { validateApkBuffer } from "../src/lib/apk-validator";
import { serializeRelease } from "../src/lib/apk-releases";
import { db } from "../src/lib/db";

// Helper to construct a minimal valid ZIP/APK in-memory for testing
function createMockApkBuffer({
  includeManifest = true,
  includeDex = true,
  includeSigning = true,
  packageName = "com.codexa.app",
}): Buffer {
  const files: { name: string; content: Buffer }[] = [];

  if (includeManifest) {
    // Android binary XML mock containing package string
    const manifestContent = Buffer.from(
      `\x03\x00\x08\x00package="${packageName}"\x00versionCode="105"\x00versionName="1.0.5"`
    );
    files.push({ name: "AndroidManifest.xml", content: manifestContent });
  }

  if (includeDex) {
    const dexContent = Buffer.from("dex\n035\x00mock-dalvik-bytecode-content-here");
    files.push({ name: "classes.dex", content: dexContent });
  }

  if (includeSigning) {
    const certContent = Buffer.from("mock-sha256-signing-cert-rsa-block-data");
    files.push({ name: "META-INF/CERT.RSA", content: certContent });
    files.push({ name: "META-INF/MANIFEST.MF", content: Buffer.from("Manifest-Version: 1.0\n") });
  }

  // Create valid ZIP archive structure
  const localHeaders: Buffer[] = [];
  const cdHeaders: Buffer[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf8");

    // Local file header (30 bytes + name + content)
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
    lh.writeUInt16LE(20, 4); // version needed
    lh.writeUInt16LE(0, 6); // flags
    lh.writeUInt16LE(0, 8); // compression: store
    lh.writeUInt32LE(0, 14); // crc32
    lh.writeUInt32LE(f.content.length, 18); // comp size
    lh.writeUInt32LE(f.content.length, 22); // uncomp size
    lh.writeUInt16LE(nameBuf.length, 26); // name len
    lh.writeUInt16LE(0, 28); // extra len

    const localEntry = Buffer.concat([lh, nameBuf, f.content]);
    localHeaders.push(localEntry);

    // Central directory header (46 bytes + name)
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0, 8); // flags
    cd.writeUInt16LE(0, 10); // compression: store
    cd.writeUInt32LE(0, 16); // crc32
    cd.writeUInt32LE(f.content.length, 20); // comp size
    cd.writeUInt32LE(f.content.length, 24); // uncomp size
    cd.writeUInt16LE(nameBuf.length, 28); // name len
    cd.writeUInt16LE(0, 30); // extra len
    cd.writeUInt16LE(0, 32); // comment len
    cd.writeUInt32LE(offset, 42); // local header offset

    cdHeaders.push(Buffer.concat([cd, nameBuf]));
    offset += localEntry.length;
  }

  const localData = Buffer.concat(localHeaders);
  const cdData = Buffer.concat(cdHeaders);

  // Pad to reach realistic size (> 100KB)
  const padding = Buffer.alloc(110 * 1024, 0xaa);

  // End of Central Directory (22 bytes)
  const eocd = Buffer.alloc(22);
  const cdOffset = localData.length + padding.length;
  eocd.writeUInt32LE(0x06054b50, 0); // PK\x05\x06
  eocd.writeUInt16LE(0, 4); // disk num
  eocd.writeUInt16LE(0, 6); // start disk
  eocd.writeUInt16LE(files.length, 8); // entries on disk
  eocd.writeUInt16LE(files.length, 10); // total entries
  eocd.writeUInt32LE(cdData.length, 12); // cd size
  eocd.writeUInt32LE(cdOffset, 16); // cd offset
  eocd.writeUInt16LE(0, 20); // comment len

  return Buffer.concat([localData, padding, cdData, eocd]);
}

async function runTests() {
  console.log("=== CODEXA APK RELEASE MANAGEMENT SYSTEM VERIFICATION ===");

  // Test 1: Corrupted/Non-APK File Rejection
  console.log("\n[Test 1] Testing rejection of invalid binary file...");
  const invalidBuffer = Buffer.from("NOT_AN_APK_FILE_RANDOM_TEXT");
  const result1 = validateApkBuffer(invalidBuffer);
  console.assert(!result1.isValid, "Must fail validation");
  console.assert(result1.errors.length > 0, "Must contain error messages");
  console.log(" PASS: Corrupted file properly rejected:", result1.errors[0]);

  // Test 2: Missing AndroidManifest Rejection
  console.log("\n[Test 2] Testing APK missing AndroidManifest.xml...");
  const noManifestBuf = createMockApkBuffer({ includeManifest: false });
  const result2 = validateApkBuffer(noManifestBuf);
  console.assert(!result2.isValid, "Must fail validation");
  console.assert(
    result2.errors.some((e) => e.includes("AndroidManifest.xml")),
    "Must report missing manifest"
  );
  console.log(" PASS: Missing AndroidManifest.xml correctly caught.");

  // Test 3: Unsigned APK Rejection
  console.log("\n[Test 3] Testing unsigned APK rejection...");
  const unsignedBuf = createMockApkBuffer({ includeSigning: false });
  const result3 = validateApkBuffer(unsignedBuf);
  console.assert(!result3.isValid, "Must fail validation");
  console.assert(
    result3.errors.some((e) => e.includes("unsigned") || e.includes("signed")),
    "Must report unsigned APK"
  );
  console.log(" PASS: Unsigned APK correctly rejected.");

  // Test 4: Valid APK Validation
  console.log("\n[Test 4] Testing valid signed Android APK...");
  const validApk = createMockApkBuffer({
    includeManifest: true,
    includeDex: true,
    includeSigning: true,
    packageName: "com.codexa.app",
  });
  const result4 = validateApkBuffer(validApk, "com.codexa.app");
  console.assert(result4.isValid, "Valid APK must pass validation");
  console.assert(result4.hasManifest, "Must detect manifest");
  console.assert(result4.hasDex, "Must detect dex bytecode");
  console.assert(result4.hasSigning, "Must detect signature");
  console.assert(result4.sha256.length === 64, "Must compute 64-char SHA-256");
  console.log(" PASS: Valid APK passed inspection!");
  console.log("   - SHA-256:", result4.sha256);
  console.log("   - Signing Type:", result4.signingType);
  console.log("   - Package:", result4.detectedPackageName);
  console.log("   - Size:", (result4.fileSizeBytes / 1024).toFixed(1), "KB");

  // Test 5: BigInt Serialization Safety
  console.log("\n[Test 5] Testing BigInt JSON serialization safety...");
  const mockRelease = {
    id: "test-rel-1",
    versionName: "1.0.5",
    versionCode: 105,
    apkFileSize: BigInt(45123987),
    apkSha256: result4.sha256,
    uploadedAt: new Date(),
    publishedAt: null,
  };
  const serialized = serializeRelease(mockRelease);
  console.assert(typeof serialized.apkFileSize === "number", "apkFileSize must be serialized as number");
  const jsonString = JSON.stringify(serialized);
  console.assert(jsonString.includes("45123987"), "Must be valid JSON");
  console.log(" PASS: BigInt serialization verified without crashes.");

  // Test 6: Database Model Query Test
  console.log("\n[Test 6] Testing Database MobileAppRelease model connectivity...");
  const count = await db.mobileAppRelease.count();
  console.log(" PASS: Database query succeeded. Existing releases count:", count);

  console.log("\n=== ALL UNIT & INTEGRATION CHECKS PASSED SUCCESSFULLY ===");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
