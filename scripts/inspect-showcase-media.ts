import { db } from "../src/lib/db";

async function main() {
  const content = await db.mobileShowcaseContent.findFirst();
  console.log("=== SHOWCASE CONTENT ===");
  console.log(JSON.stringify(content, null, 2));

  const media = await db.mobileShowcaseMedia.findMany({
    orderBy: { displayOrder: "asc" },
  });
  console.log(`\n=== SHOWCASE MEDIA (${media.length} records) ===`);
  media.forEach((m, idx) => {
    console.log(`[${idx + 1}] id=${m.id}`);
    console.log(`     category=${m.mediaCategory} | type=${m.mediaType} | order=${m.displayOrder}`);
    console.log(`     title="${m.title}"`);
    console.log(`     publicUrl=${m.publicUrl}`);
    console.log(`     storageKey=${m.storageKey} | provider=${m.storageProvider}`);
    console.log(`     isPublished=${m.isPublished} | isFeatured=${m.isFeatured} | isCover=${m.isCover}`);
    console.log(`     dimensions=${m.width}x${m.height} | duration=${m.durationSeconds}s | size=${m.fileSize} bytes`);
  });

  const releases = await db.mobileAppRelease.findMany({
    orderBy: { versionCode: "desc" },
  });
  console.log(`\n=== MOBILE RELEASES (${releases.length} records) ===`);
  releases.forEach((r, idx) => {
    console.log(`[${idx + 1}] v${r.versionName} (${r.versionCode}) | status=${r.status} | published=${r.isCurrentPublished}`);
    console.log(`     url=${r.apkDownloadUrl} | size=${r.apkFileSize} | sha=${r.apkSha256}`);
  });
}

main().catch(console.error).finally(() => db.$disconnect());
