require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const OFFICIAL_DOWNLOAD_URL = 'https://codxa-agency.online/downloads/CodeXa.apk';
const APK_FILE_SIZE = 148582251n;
const APK_SHA256 = '5b4d72fccebb3503344b8c1f2afac88c42951cc9c4f04053c362df19c068db0f';

async function main() {
  console.log('[Core DB Sync] Updating MobileAppRelease and MobileAppConfig to point to Official Database CDN...');

  // 1. Update MobileAppRelease
  const currentRelease = await prisma.mobileAppRelease.findFirst({
    where: { isCurrentPublished: true },
  });

  if (currentRelease) {
    const updated = await prisma.mobileAppRelease.update({
      where: { id: currentRelease.id },
      data: {
        versionName: '1.0.5',
        versionCode: 105,
        apkFileSize: APK_FILE_SIZE,
        apkSha256: APK_SHA256,
        apkDownloadUrl: OFFICIAL_DOWNLOAD_URL,
        storageProvider: 'POSTGRES_DATABASE',
        storageBucket: 'mobile_apk_binaries',
        storageKey: 'cxa_apk_v1_0_5',
        minimumSupportedVersionCode: 1,
        releaseNotes:
          'Official CodeXa Mobile Production Release v1.0.5 — Verified official APK hosted directly in CodeXa database storage. Direct high-speed installation, built-in CodeXa Store, Live Classes, Attendance QR Geofencing, Dynamic Projects, Intern Assignments, Team Chat & Media Sync.',
        publishedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('[Core DB Sync] Updated MobileAppRelease:', {
      id: updated.id,
      versionName: updated.versionName,
      versionCode: updated.versionCode,
      apkDownloadUrl: updated.apkDownloadUrl,
      storageProvider: updated.storageProvider,
    });
  }

  // 2. Update MobileAppConfig
  const currentConfig = await prisma.mobileAppConfig.findFirst();
  if (currentConfig) {
    const updatedConfig = await prisma.mobileAppConfig.update({
      where: { id: currentConfig.id },
      data: {
        currentVersion: '1.0.5',
        buildNumber: 105,
        minVersion: '1.0.0',
        softUpdateEnabled: true,
        downloadUrl: OFFICIAL_DOWNLOAD_URL,
        androidApkUrl: OFFICIAL_DOWNLOAD_URL,
        releaseNotes:
          'Official CodeXa Mobile Production Release v1.0.5 — Verified official APK hosted directly in CodeXa database storage. Direct high-speed installation, built-in CodeXa Store, Live Classes, Attendance QR Geofencing, Dynamic Projects, Intern Assignments, Team Chat & Media Sync.',
        updatedAt: new Date(),
      },
    });
    console.log('[Core DB Sync] Updated MobileAppConfig:', {
      currentVersion: updatedConfig.currentVersion,
      buildNumber: updatedConfig.buildNumber,
      downloadUrl: updatedConfig.downloadUrl,
      androidApkUrl: updatedConfig.androidApkUrl,
    });
  }

  console.log('[Core DB Sync] All database records successfully synchronized!');
}

main()
  .catch((e) => {
    console.error('[Core DB Sync] Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
