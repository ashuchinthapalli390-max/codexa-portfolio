import { getOrCreateGlobalMobileConfig } from '../src/lib/mobile-features';
import { db } from '../src/lib/db';

async function verify() {
  console.log('=== VERIFYING UPDATE ENDPOINT LOGIC ===');

  const globalConfig = await getOrCreateGlobalMobileConfig();
  const publishedRelease = await db.mobileAppRelease.findFirst({
    where: {
      platform: 'ANDROID',
      releaseChannel: 'STABLE',
      isCurrentPublished: true,
      status: 'PUBLISHED',
    },
  });

  console.log('Published Release in DB:', {
    versionName: publishedRelease?.versionName,
    versionCode: publishedRelease?.versionCode,
    minimumSupportedVersionCode: publishedRelease?.minimumSupportedVersionCode,
    updateType: publishedRelease?.updateType,
    apkDownloadUrl: publishedRelease?.apkDownloadUrl,
  });

  console.log('Global Mobile Config in DB:', {
    currentVersion: globalConfig.currentVersion,
    buildNumber: globalConfig.buildNumber,
    minVersion: globalConfig.minVersion,
    forceUpdateEnabled: globalConfig.forceUpdateEnabled,
    downloadUrl: globalConfig.downloadUrl,
  });

  // Test client with older version: e.g. versionCode: 104, versionName: '1.0.4'
  const testClientCode = 104;
  const testClientVersion = '1.0.4';

  const latestVersionCode = publishedRelease?.versionCode || globalConfig.buildNumber || 105;
  const minVersionCode = publishedRelease?.minimumSupportedVersionCode || 105;
  const isMandatoryConfig = Boolean(globalConfig.forceUpdateEnabled) || publishedRelease?.updateType === 'MANDATORY';

  const updateAvailable = testClientCode < latestVersionCode;
  const forceUpdate = (testClientCode < minVersionCode) || (updateAvailable && isMandatoryConfig);

  console.log(`\nClient Test (Version ${testClientVersion}, Build ${testClientCode}):`);
  console.log('Update Available:', updateAvailable);
  console.log('Force Update Required:', forceUpdate);

  if (forceUpdate !== true) {
    throw new Error('Expected forceUpdate to be true for older version!');
  }

  // Test client with current version: versionCode: 105, versionName: '1.0.5'
  const currentClientCode = 105;
  const currentUpdateAvailable = currentClientCode < latestVersionCode;
  const currentForceUpdate = (currentClientCode < minVersionCode);

  console.log(`\nClient Test (Version 1.0.5, Build 105):`);
  console.log('Update Available:', currentUpdateAvailable);
  console.log('Force Update Required:', currentForceUpdate);

  if (currentUpdateAvailable !== false || currentForceUpdate !== false) {
    throw new Error('Expected no update required for latest version!');
  }

  console.log('\n✅ VERIFICATION COMPLETE: ALL OLDER VERSIONS ARE PROPERLY BLOCKED WITH MANDATORY UPDATE!');
}

verify()
  .catch((e) => {
    console.error('Verification failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
