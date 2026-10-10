require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const REPO_OWNER = 'ashuchinthapalli390-max';
const REPO_NAME = 'codexa-portfolio';
const TAG_NAME = 'v1.0.5';
const APK_PATH = 'G:/AntiGravity IDE/codexa app/build/app/outputs/flutter-apk/app-release.apk';

async function main() {
  console.log('[Deployer] Starting CodeXa APK deployment & database sync...');

  if (!fs.existsSync(APK_PATH)) {
    throw new Error(`APK file not found at: ${APK_PATH}`);
  }

  // 1. Calculate file stats
  const stat = fs.statSync(APK_PATH);
  const fileSize = stat.size;
  const sizeMb = (fileSize / (1024 * 1024)).toFixed(2);

  console.log(`[Deployer] APK Size: ${sizeMb} MB (${fileSize} bytes)`);

  const fileBuffer = fs.readFileSync(APK_PATH);
  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  console.log(`[Deployer] APK SHA-256: ${sha256}`);

  // 2. Get GitHub Token from git remote
  let githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  if (!githubToken) {
    try {
      const remote = cp.execSync('git remote get-url origin').toString().trim();
      const match = remote.match(/https:\/\/([^:@]+)@github\.com/);
      if (match) githubToken = match[1];
    } catch (e) {
      console.warn('[Deployer] Could not read token from git remote:', e.message);
    }
  }

  if (!githubToken) {
    throw new Error('GitHub token not available');
  }

  // 3. Find GitHub Release
  console.log(`[Deployer] Fetching release tag ${TAG_NAME}...`);
  const relRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${TAG_NAME}`, {
    headers: {
      Authorization: `token ${githubToken}`,
      'User-Agent': 'CodeXa-Deployer',
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!relRes.ok) {
    throw new Error(`Failed to find release ${TAG_NAME}: ${relRes.status} ${await relRes.text()}`);
  }

  const release = await relRes.json();
  const releaseId = release.id;
  console.log(`[Deployer] Target release ID: ${releaseId}`);

  // 4. Delete existing asset if any
  if (release.assets && release.assets.length > 0) {
    for (const asset of release.assets) {
      if (asset.name === 'CodeXa.apk') {
        console.log(`[Deployer] Deleting old asset ${asset.id}...`);
        await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/assets/${asset.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `token ${githubToken}`,
            'User-Agent': 'CodeXa-Deployer',
          },
        });
      }
    }
  }

  // 5. Upload asset using curl.exe
  console.log(`[Deployer] Uploading CodeXa.apk (${sizeMb} MB) via curl.exe...`);
  const uploadUrl = `https://uploads.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/${releaseId}/assets?name=CodeXa.apk`;
  
  const curlCmd = `curl.exe -f -s -S -X POST -H "Authorization: token ${githubToken}" -H "User-Agent: CodeXa-Deployer" -H "Content-Type: application/vnd.android.package-archive" --data-binary @"${APK_PATH}" "${uploadUrl}"`;

  try {
    const uploadOutput = cp.execSync(curlCmd, { maxBuffer: 10 * 1024 * 1024 }).toString();
    const uploadedAsset = JSON.parse(uploadOutput);
    console.log(`[Deployer] Upload successful! Asset ID: ${uploadedAsset.id}, Size: ${(uploadedAsset.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (curlErr) {
    console.error('[Deployer] Curl upload failed:', curlErr.message);
    throw curlErr;
  }

  // 6. Copy to local public directories for direct website downloads
  const publicDownloadsDir = path.resolve(__dirname, '../public/downloads');
  const publicDir = path.resolve(__dirname, '../public');

  if (!fs.existsSync(publicDownloadsDir)) {
    fs.mkdirSync(publicDownloadsDir, { recursive: true });
  }

  const destDownloadApk = path.join(publicDownloadsDir, 'CodeXa.apk');
  const destPublicApk = path.join(publicDir, 'CodeXa.apk');

  fs.copyFileSync(APK_PATH, destDownloadApk);
  fs.copyFileSync(APK_PATH, destPublicApk);
  console.log(`[Deployer] Copied APK to ${destDownloadApk} and ${destPublicApk}`);

  // 7. Sync into Core Database (MobileAppRelease & GlobalMobileConfig)
  const downloadUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${TAG_NAME}/CodeXa.apk`;

  console.log('[Deployer] Updating database records...');
  const currentRelease = await prisma.mobileAppRelease.findFirst({
    where: { isCurrentPublished: true },
  });

  const releaseData = {
    versionName: '1.0.5',
    versionCode: 105,
    apkFileSize: BigInt(fileSize),
    apkSha256: sha256,
    apkDownloadUrl: downloadUrl,
    storageProvider: 'GITHUB_RELEASES',
    storageBucket: 'codexa-portfolio',
    storageKey: `releases/download/${TAG_NAME}/CodeXa.apk`,
    minimumSupportedVersionCode: 1,
    releaseNotes:
      'Official CodeXa Mobile Production Release v1.0.5 - Universal multi-ABI build with 34 authentic offline sticker packs (533 stickers), CodeXa Store, Live Classes, Attendance QR Geofencing, Dynamic Projects, Intern Assignments, Team Chat & Media Sync.',
    publishedAt: new Date(),
    updatedAt: new Date(),
  };

  if (currentRelease) {
    await prisma.mobileAppRelease.update({
      where: { id: currentRelease.id },
      data: releaseData,
    });
    console.log('[Deployer] Updated MobileAppRelease record:', currentRelease.id);
  } else {
    await prisma.mobileAppRelease.create({
      data: {
        ...releaseData,
        platform: 'ANDROID',
        releaseChannel: 'STABLE',
        isCurrentPublished: true,
      },
    });
    console.log('[Deployer] Created new published MobileAppRelease record');
  }

  // Update GlobalMobileConfig
  try {
    const config = await prisma.mobileAppConfig.findFirst();
    if (config) {
      await prisma.mobileAppConfig.update({
        where: { id: config.id },
        data: {
          androidApkUrl: downloadUrl,
          androidLatestVersion: '1.0.5',
          androidLatestVersionCode: 105,
          updatedAt: new Date(),
        },
      });
      console.log('[Deployer] Updated GlobalMobileConfig');
    }
  } catch (cfgErr) {
    console.warn('[Deployer] GlobalMobileConfig update warning:', cfgErr.message);
  }

  console.log('[Deployer] ALL DEPLOYMENT & SYNC STEPS COMPLETED SUCCESSFULLY!');
}

main()
  .catch(err => {
    console.error('[Deployer] Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
