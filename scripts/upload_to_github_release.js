const fs = require('fs');
const crypto = require('crypto');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const REPO_OWNER = 'ashuchinthapalli390-max';
const REPO_NAME = 'codexa-portfolio';
const TAG_NAME = 'v1.0.5';

async function main() {
  const apkPath = 'G:/AntiGravity IDE/codexa app/build/app/outputs/flutter-apk/app-release.apk';
  const fileBuffer = fs.readFileSync(apkPath);
  const fileSize = fileBuffer.length;
  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const sizeMb = (fileSize / (1024 * 1024)).toFixed(2);

  console.log(`[GitHub Release] File: ${apkPath}`);
  console.log(`[GitHub Release] Size: ${sizeMb} MB (${fileSize} bytes)`);
  console.log(`[GitHub Release] SHA-256: ${sha256}`);

  // 1. Get or create release
  let release = null;
  const getRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${TAG_NAME}`, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'User-Agent': 'CodeXa-Deployer',
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (getRes.status === 200) {
    release = await getRes.json();
    console.log(`[GitHub Release] Found existing release: ${release.id}`);
  } else {
    console.log(`[GitHub Release] Creating new release for tag ${TAG_NAME}...`);
    const createRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`, {
      method: 'POST',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'CodeXa-Deployer',
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        tag_name: TAG_NAME,
        name: 'CodeXa Mobile Official Production Release v1.0.5',
        body: 'Official production APK for CodeXa Mobile Agency Workspace v1.0.5 (Universal Build supporting all Android architectures).',
        draft: false,
        prerelease: false,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Failed to create release: ${createRes.status} ${err}`);
    }
    release = await createRes.json();
    console.log(`[GitHub Release] Created release: ${release.id}`);
  }

  // 2. Delete existing asset if it exists
  if (release.assets && release.assets.length > 0) {
    for (const asset of release.assets) {
      if (asset.name === 'CodeXa.apk') {
        console.log(`[GitHub Release] Deleting old asset: ${asset.id}...`);
        await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/assets/${asset.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            'User-Agent': 'CodeXa-Deployer',
          },
        });
      }
    }
  }

  // 3. Upload binary asset
  console.log(`[GitHub Release] Uploading CodeXa.apk (${sizeMb} MB)...`);
  const uploadUrl = `https://uploads.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/${release.id}/assets?name=CodeXa.apk`;
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'User-Agent': 'CodeXa-Deployer',
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': fileSize.toString(),
    },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Failed to upload asset: ${uploadRes.status} ${err}`);
  }

  const asset = await uploadRes.json();
  console.log(`[GitHub Release] Asset uploaded successfully!`);
  console.log(`[GitHub Release] Direct Browser Download URL: ${asset.browser_download_url}`);

  return {
    downloadUrl: asset.browser_download_url,
    fileSize,
    sha256,
  };
}

main()
  .then((res) => {
    console.log('RESULT:', JSON.stringify(res));
  })
  .catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
  });
