require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const GITHUB_DOWNLOAD_URL =
  'https://github.com/ashuchinthapalli390-max/codexa-portfolio/releases/download/v1.0.5/CodeXa.apk';
const APK_FILE_SIZE = 835669361n;
const APK_SHA256 = '07dc17a6044a4bd85c7d2d8d53f835fe5559a630e77c2bc192b5c006e080fd74';

async function main() {
  console.log('[DB Sync] Syncing GitHub Release APK v1.0.5 into Core Database...');

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
        apkDownloadUrl: GITHUB_DOWNLOAD_URL,
        storageProvider: 'GITHUB_RELEASES',
        storageBucket: 'codexa-portfolio',
        storageKey: 'releases/download/v1.0.5/CodeXa.apk',
        minimumSupportedVersionCode: 1,
        releaseNotes:
          'Official CodeXa Mobile Production Release v1.0.5 (Universal Build) — Complete support for all Android architectures, Built-in CodeXa Store, Live Classes, Attendance QR Geofencing, Dynamic Projects, Intern Assignments, Team Chat & Media Sync.',
        publishedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('[DB Sync] Updated MobileAppRelease:', {
      versionName: updated.versionName,
      versionCode: updated.versionCode,
      apkFileSize: updated.apkFileSize.toString(),
      apkSha256: updated.apkSha256,
      apkDownloadUrl: updated.apkDownloadUrl,
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
        downloadUrl: GITHUB_DOWNLOAD_URL,
        androidApkUrl: GITHUB_DOWNLOAD_URL,
        releaseNotes:
          'Official CodeXa Mobile Production Release v1.0.5 (Universal Build) — Complete support for all Android architectures, Built-in CodeXa Store, Live Classes, Attendance QR Geofencing, Dynamic Projects, Intern Assignments, Team Chat & Media Sync.',
        updatedAt: new Date(),
      },
    });
    console.log('[DB Sync] Updated MobileAppConfig:', {
      currentVersion: updatedConfig.currentVersion,
      buildNumber: updatedConfig.buildNumber,
      downloadUrl: updatedConfig.downloadUrl,
    });
  }

  console.log('[DB Sync] Database update completed successfully!');
}

main()
  .catch((e) => {
    console.error('[DB Sync] Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
