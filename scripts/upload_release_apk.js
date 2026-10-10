require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function upload() {
  const filePath = 'G:/AntiGravity IDE/codexa app/build/app/outputs/flutter-apk/app-release.apk';
  const fileBuffer = fs.readFileSync(filePath);
  const sizeMb = (fileBuffer.length / (1024 * 1024)).toFixed(2);
  console.log(`Read APK file into memory: ${sizeMb} MB. Starting upload...`);

  const storageKey = 'codexa-apk/stable/1.0.5/CodeXa.apk';
  const { data, error } = await supabase.storage
    .from('mobile-releases')
    .upload(storageKey, fileBuffer, {
      contentType: 'application/vnd.android.package-archive',
      upsert: true,
    });

  if (error) {
    console.error('Upload failed:', error);
    process.exit(1);
  }

  console.log('Upload successful! Data:', data);
  const { data: urlData } = supabase.storage.from('mobile-releases').getPublicUrl(storageKey);
  console.log('Public CDN URL:', urlData.publicUrl);
}

upload().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
