require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const apkPath = 'G:/AntiGravity IDE/codexa app/build/app/outputs/flutter-apk/app-release.apk';
  if (!fs.existsSync(apkPath)) {
    console.error('APK file not found at:', apkPath);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(apkPath);
  const fileSize = fileBuffer.length;
  const sizeMb = (fileSize / (1024 * 1024)).toFixed(2);
  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  console.log(`[APK Sync] Found compiled APK: ${sizeMb} MB (${fileSize} bytes)`);
  console.log(`[APK Sync] SHA-256: ${sha256}`);

  // Upload to Supabase Storage CDN
  const storageKey = 'codexa-apk/stable/1.0.5/CodeXa.apk';
  console.log(`[APK Sync] Uploading to Supabase Storage bucket 'mobile-releases' at ${storageKey}...`);
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('mobile-releases')
    .upload(storageKey, fileBuffer, {
      contentType: 'application/vnd.android.package-archive',
      upsert: true,
    });

  if (uploadError) {
    console.error('[APK Sync] Storage upload failed:', uploadError);
    process.exit(1);
  }
  console.log('[APK Sync] Supabase Storage upload complete:', uploadData);

  const { data: urlData } = supabase.storage.from('mobile-releases').getPublicUrl(storageKey);
  const cdnUrl = urlData.publicUrl;
  console.log('[APK Sync] Public CDN URL:', cdnUrl);

  // Update Core Database MobileAppRelease
  const currentRelease = await prisma.mobileAppRelease.findFirst({
    where: { isCurrentPublished: true }
  });

  if (currentRelease) {
    const updated = await prisma.mobileAppRelease.update({
      where: { id: currentRelease.id },
      data: {
        apkFileSize: BigInt(fileSize),
        apkSha256: sha256,
        versionName: '1.0.5',
        versionCode: 105,
        apkDownloadUrl: cdnUrl,
        storageKey,
        storageBucket: 'mobile-releases',
        storageProvider: 'SUPABASE',
        minimumSupportedVersionCode: 1,
        releaseNotes: 'Official CodeXa Mobile Production Release v1.0.5 — Built-in CodeXa Store, Live Classes, Attendance QR Geofencing, Dynamic Projects, Intern Assignments, Team Chat & Media Sync.',
        publishedAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('[APK Sync] Updated MobileAppRelease in DB:', {
      id: updated.id,
      versionName: updated.versionName,
      versionCode: updated.versionCode,
      apkFileSize: updated.apkFileSize.toString(),
      apkSha256: updated.apkSha256,
      apkDownloadUrl: updated.apkDownloadUrl
    });
  }

  // Update Core Database MobileAppConfig
  const currentConfig = await prisma.mobileAppConfig.findFirst();
  if (currentConfig) {
    const updatedConfig = await prisma.mobileAppConfig.update({
      where: { id: currentConfig.id },
      data: {
        currentVersion: '1.0.5',
        buildNumber: 105,
        minVersion: '1.0.0',
        softUpdateEnabled: true,
        downloadUrl: cdnUrl,
        androidApkUrl: cdnUrl,
        releaseNotes: 'Official CodeXa Mobile Production Release v1.0.5 — Built-in CodeXa Store, Live Classes, Attendance QR Geofencing, Dynamic Projects, Intern Assignments, Team Chat & Media Sync.',
        updatedAt: new Date()
      }
    });
    console.log('[APK Sync] Updated MobileAppConfig in DB:', {
      id: updatedConfig.id,
      currentVersion: updatedConfig.currentVersion,
      buildNumber: updatedConfig.buildNumber,
      downloadUrl: updatedConfig.downloadUrl
    });
  }

  console.log('[APK Sync] All sync operations completed successfully!');
}

main()
  .catch((e) => {
    console.error('[APK Sync] Fatal error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
