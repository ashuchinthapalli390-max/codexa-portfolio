import fs from "fs";
import path from "path";
import { db } from "../src/lib/db";
import { supabaseUploadFile } from "../src/lib/supabase";

async function main() {
  console.log("=== SYNCING APPSTORE MEDIA METADATA ===");

  // 1. Upload poster thumbnail to Supabase Storage if poster exists
  const posterPath = path.join(process.cwd(), "public", "appstore", "codexa-demo-poster.jpg");
  let posterUrl = "/appstore/codexa-demo-poster.jpg";

  if (fs.existsSync(posterPath)) {
    const posterBuffer = fs.readFileSync(posterPath);
    const uploadRes = await supabaseUploadFile(
      "mobile-releases",
      "showcase/videos/codexa-demo-poster.jpg",
      posterBuffer,
      "image/jpeg"
    );
    if (!uploadRes.error) {
      posterUrl = "https://vdpbdveensbnyahjougj.supabase.co/storage/v1/object/public/mobile-releases/showcase/videos/codexa-demo-poster.jpg";
      console.log("Uploaded codexa-demo-poster.jpg to Supabase:", posterUrl);
    } else {
      console.warn("Supabase poster upload notice:", uploadRes.error);
    }
  }

  // 2. Update Video metadata
  await db.mobileShowcaseMedia.updateMany({
    where: {
      storageKey: "showcase/videos/codexa-demo-1080p.mp4",
    },
    data: {
      width: 1080,
      height: 1920,
      durationSeconds: 30.02,
      thumbnailUrl: posterUrl,
      caption: "Official CodeXa Mobile application walkthrough — exploring Dashboard, Attendance, Classes, Projects, Assignments, and Communications.",
    },
  });
  console.log("Updated video metadata (1080x1920, 30.02s, poster thumbnail)");

  // 3. Update Screenshots metadata (all 941x1672)
  const screenshots = await db.mobileShowcaseMedia.findMany({
    where: { mediaType: "IMAGE" },
  });

  for (const s of screenshots) {
    await db.mobileShowcaseMedia.update({
      where: { id: s.id },
      data: {
        width: 941,
        height: 1672,
        mimeType: "image/png",
        thumbnailUrl: s.publicUrl,
      },
    });
  }
  console.log(`Updated ${screenshots.length} screenshot dimensions to 941x1672`);

  // 4. Verify updated records
  const allMedia = await db.mobileShowcaseMedia.findMany({
    orderBy: { displayOrder: "asc" },
  });
  console.log(`\nVerified ${allMedia.length} media records in DB:`);
  allMedia.forEach((m) => {
    console.log(`- [${m.mediaCategory}] order=${m.displayOrder}: ${m.title} (${m.width}x${m.height}${m.durationSeconds ? `, ${m.durationSeconds}s` : ""})`);
  });
}

main().catch(console.error).finally(() => db.$disconnect());
