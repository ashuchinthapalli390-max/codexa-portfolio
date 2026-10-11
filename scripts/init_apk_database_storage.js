require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB chunks

async function main() {
  console.log('[APK DB Storage] Ensuring database schema for APK storage...');

  // 1. Create tables if not exist
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS mobile_apk_binaries (
      id VARCHAR(64) PRIMARY KEY,
      release_id VARCHAR(64) NOT NULL,
      version_name VARCHAR(32) NOT NULL,
      version_code INT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_size BIGINT NOT NULL,
      sha256 VARCHAR(64) NOT NULL,
      mime_type VARCHAR(128) DEFAULT 'application/vnd.android.package-archive',
      total_chunks INT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS mobile_apk_chunks (
      id SERIAL PRIMARY KEY,
      apk_id VARCHAR(64) NOT NULL REFERENCES mobile_apk_binaries(id) ON DELETE CASCADE,
      chunk_index INT NOT NULL,
      chunk_data BYTEA NOT NULL,
      chunk_size INT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(apk_id, chunk_index)
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_apk_chunks_lookup ON mobile_apk_chunks(apk_id, chunk_index);
  `);

  console.log('[APK DB Storage] Database schema verified!');

  // 2. Read APK binary from disk
  const apkPath = path.resolve('public/CodeXa.apk');
  if (!fs.existsSync(apkPath)) {
    throw new Error(`APK file not found at ${apkPath}`);
  }

  const apkBuffer = fs.readFileSync(apkPath);
  const totalBytes = apkBuffer.length;
  const sha256Hash = crypto.createHash('sha256').update(apkBuffer).digest('hex');
  const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);
  const apkId = 'cxa_apk_v1_0_5';

  console.log(`[APK DB Storage] Storing APK (${(totalBytes / (1024 * 1024)).toFixed(2)} MB, ${totalChunks} chunks of 4MB) in PostgreSQL database...`);

  // 3. Upsert record in mobile_apk_binaries
  await prisma.$executeRawUnsafe(`
    INSERT INTO mobile_apk_binaries (id, release_id, version_name, version_code, file_name, file_size, sha256, mime_type, total_chunks, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    ON CONFLICT (id) DO UPDATE SET
      file_size = EXCLUDED.file_size,
      sha256 = EXCLUDED.sha256,
      total_chunks = EXCLUDED.total_chunks,
      updated_at = NOW();
  `, apkId, 'cmv2olwwf0000vnhel4g9qf7b', '1.0.5', 105, 'CodeXa.apk', BigInt(totalBytes), sha256Hash, 'application/vnd.android.package-archive', totalChunks);

  // 4. Delete existing chunks for this apkId
  await prisma.$executeRawUnsafe(`DELETE FROM mobile_apk_chunks WHERE apk_id = $1`, apkId);

  // 5. Insert chunks
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalBytes);
    const chunkSlice = apkBuffer.subarray(start, end);

    await prisma.$executeRawUnsafe(`
      INSERT INTO mobile_apk_chunks (apk_id, chunk_index, chunk_data, chunk_size)
      VALUES ($1, $2, $3, $4)
    `, apkId, i, chunkSlice, chunkSlice.length);

    process.stdout.write(`[APK DB Storage] Inserted chunk ${i + 1}/${totalChunks} (${((end / totalBytes) * 100).toFixed(1)}%)\r`);
  }

  console.log('\n[APK DB Storage] Successfully stored all APK chunks into database!');

  // 6. Verify stored chunks
  const verifyCount = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int as count, SUM(chunk_size)::bigint as total_size
    FROM mobile_apk_chunks
    WHERE apk_id = $1
  `, apkId);

  console.log('[APK DB Storage] Verification result:', verifyCount);
}

main()
  .catch((err) => {
    console.error('[APK DB Storage] Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
