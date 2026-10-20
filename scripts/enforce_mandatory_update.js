require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('[Enforce Mandatory Update] Starting configuration update...');

  // 1. Fetch current published release
  const currentRelease = await prisma.mobileAppRelease.findFirst({
    where: { isCurrentPublished: true },
  });

  const releaseNotes =
    'Official CodeXa Mobile Production Release v1.0.5 — Critical mandatory update required. Enhancements include optimized engine (41.5 MB), live classes synchronization, attendance QR geofencing, dynamic projects, intern assignments, team chat & media sync.';
  const downloadUrl = 'https://codxa-agency.online/downloads/CodeXa.apk';

  if (currentRelease) {
    const updated = await prisma.mobileAppRelease.update({
      where: { id: currentRelease.id },
      data: {
        versionName: '1.0.5',
        versionCode: 105,
        minimumSupportedVersionCode: 105,
        updateType: 'MANDATORY',
        apkDownloadUrl: downloadUrl,
        releaseNotes,
        updatedAt: new Date(),
      },
    });
    console.log('[Enforce Mandatory Update] Updated MobileAppRelease:', {
      id: updated.id,
      versionName: updated.versionName,
      versionCode: updated.versionCode,
      minimumSupportedVersionCode: updated.minimumSupportedVersionCode,
      updateType: updated.updateType,
      apkDownloadUrl: updated.apkDownloadUrl,
    });
  } else {
    const created = await prisma.mobileAppRelease.create({
      data: {
        platform: 'ANDROID',
        releaseChannel: 'STABLE',
        versionName: '1.0.5',
        versionCode: 105,
        minimumSupportedVersionCode: 105,
        updateType: 'MANDATORY',
        isCurrentPublished: true,
        status: 'PUBLISHED',
        apkDownloadUrl: downloadUrl,
        storageProvider: 'LOCAL_STREAM',
        storageBucket: 'public',
        storageKey: 'downloads/CodeXa.apk',
        apkFileSize: BigInt(43601207),
        apkSha256: '89cf47cbca0461b2475c625e1fe10d772480732d43d0cfae28aec084d692235e',
        releaseNotes,
        publishedAt: new Date(),
      },
    });
    console.log('[Enforce Mandatory Update] Created published MobileAppRelease:', created.id);
  }

  // 2. Archive any older releases that might still be marked as published
  const others = await prisma.mobileAppRelease.updateMany({
    where: {
      versionCode: { lt: 105 },
      isCurrentPublished: true,
    },
    data: {
      isCurrentPublished: false,
      status: 'ARCHIVED',
    },
  });
  console.log(`[Enforce Mandatory Update] Archived ${others.count} older releases.`);

  // 3. Update MobileAppConfig
  const config = await prisma.mobileAppConfig.findFirst();
  if (config) {
    const updatedConfig = await prisma.mobileAppConfig.update({
      where: { id: config.id },
      data: {
        currentVersion: '1.0.5',
        buildNumber: 105,
        minVersion: '1.0.5',
        forceUpdateEnabled: true,
        softUpdateEnabled: false,
        downloadUrl,
        androidApkUrl: downloadUrl,
        releaseNotes,
        updatedAt: new Date(),
      },
    });
    console.log('[Enforce Mandatory Update] Updated MobileAppConfig:', {
      id: updatedConfig.id,
      currentVersion: updatedConfig.currentVersion,
      buildNumber: updatedConfig.buildNumber,
      minVersion: updatedConfig.minVersion,
      forceUpdateEnabled: updatedConfig.forceUpdateEnabled,
      softUpdateEnabled: updatedConfig.softUpdateEnabled,
      downloadUrl: updatedConfig.downloadUrl,
    });
  } else {
    const createdConfig = await prisma.mobileAppConfig.create({
      data: {
        currentVersion: '1.0.5',
        buildNumber: 105,
        minVersion: '1.0.5',
        forceUpdateEnabled: true,
        softUpdateEnabled: false,
        downloadUrl,
        androidApkUrl: downloadUrl,
        releaseNotes,
      },
    });
    console.log('[Enforce Mandatory Update] Created MobileAppConfig:', createdConfig.id);
  }

  console.log('[Enforce Mandatory Update] Successfully enforced mandatory update for all older versions!');
}

main()
  .catch((e) => {
    console.error('[Enforce Mandatory Update] Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
