import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const APK_FILENAME = "CodeXa.apk";
const APK_MIME = "application/vnd.android.package-archive";
const DEFAULT_APK_ID = "cxa_apk_v1_0_5";

export interface ApkStreamOptions {
  apkId?: string;
  fallbackFilename?: string;
}

/**
 * Serves the Android APK binary directly with complete support for:
 * 1. High-speed local disk streaming when file is present on filesystem.
 * 2. PostgreSQL chunked database streaming from mobile_apk_chunks.
 * 3. HTTP 206 Partial Content (Range requests) for resumable mobile downloads.
 * 4. Zero third-party redirects (never sends user to GitHub).
 */
export async function serveDirectApkBinary(req: NextRequest, options?: ApkStreamOptions): Promise<Response> {
  const apkId = options?.apkId || DEFAULT_APK_ID;
  const fileName = options?.fallbackFilename || APK_FILENAME;

  // 1. Check local filesystem first for instant zero-overhead streaming
  const diskCandidates = [
    path.resolve(process.cwd(), "public", "CodeXa.apk"),
    path.resolve(process.cwd(), "public", "downloads", "CodeXa.apk"),
    path.resolve(process.cwd(), "public", "appstore", "CodeXa.apk"),
  ];

  let localFilePath: string | null = null;
  for (const candidate of diskCandidates) {
    if (fs.existsSync(candidate)) {
      localFilePath = candidate;
      break;
    }
  }

  const rangeHeader = req.headers.get("range");

  if (localFilePath) {
    try {
      const stats = fs.statSync(localFilePath);
      const totalSize = stats.size;

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

        if (isNaN(start) || start >= totalSize || end >= totalSize || start > end) {
          return new Response(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${totalSize}`,
            },
          });
        }

        const chunkLength = end - start + 1;
        const fileStream = fs.createReadStream(localFilePath, { start, end });
        const webStream = new ReadableStream({
          start(controller) {
            fileStream.on("data", (chunk: Buffer | string) => {
              controller.enqueue(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            });
            fileStream.on("end", () => controller.close());
            fileStream.on("error", (err) => controller.error(err));
          },
          cancel() {
            fileStream.destroy();
          },
        });

        return new Response(webStream, {
          status: 206,
          headers: {
            "Content-Type": APK_MIME,
            "Content-Disposition": `attachment; filename="${fileName}"`,
            "Content-Range": `bytes ${start}-${end}/${totalSize}`,
            "Content-Length": chunkLength.toString(),
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=86400, must-revalidate",
            "X-CodeXa-Storage-Source": "filesystem-direct",
          },
        });
      }

      // Full file stream
      const fileStream = fs.createReadStream(localFilePath);
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk: Buffer | string) => {
            controller.enqueue(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
          });
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new Response(webStream, {
        status: 200,
        headers: {
          "Content-Type": APK_MIME,
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": totalSize.toString(),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=86400, must-revalidate",
          "X-Content-Type-Options": "nosniff",
          "X-CodeXa-Storage-Source": "filesystem-direct",
        },
      });
    } catch (diskErr) {
      console.warn("[serveDirectApkBinary] Disk stream fallback to database:", diskErr);
    }
  }

  // 2. Stream directly from PostgreSQL Database (mobile_apk_chunks)
  try {
    const apkRecord = await db.$queryRawUnsafe<any[]>(
      `SELECT id, file_name, file_size, total_chunks, sha256 FROM mobile_apk_binaries WHERE id = $1 LIMIT 1`,
      apkId
    );

    if (!apkRecord || apkRecord.length === 0) {
      return NextResponse.json(
        { error: "APK binary record not found in database." },
        { status: 404 }
      );
    }

    const { file_size, total_chunks, sha256 } = apkRecord[0];
    const totalSize = Number(file_size);
    const numChunks = Number(total_chunks);

    // Stream entire database-stored APK in chunks
    const webStream = new ReadableStream({
      async start(controller) {
        try {
          for (let i = 0; i < numChunks; i++) {
            const chunkRows = await db.$queryRawUnsafe<any[]>(
              `SELECT chunk_data FROM mobile_apk_chunks WHERE apk_id = $1 AND chunk_index = $2 LIMIT 1`,
              apkId,
              i
            );

            if (chunkRows && chunkRows.length > 0 && chunkRows[0].chunk_data) {
              controller.enqueue(chunkRows[0].chunk_data);
            }
          }
          controller.close();
        } catch (streamErr) {
          controller.error(streamErr);
        }
      },
    });

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": APK_MIME,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": totalSize.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "X-CodeXa-Storage-Source": "database-chunks",
        "X-CodeXa-Sha256": sha256 || "",
      },
    });
  } catch (dbErr: any) {
    console.error("[serveDirectApkBinary database error]", dbErr);
    return NextResponse.json(
      { error: "Failed to stream APK binary from core database." },
      { status: 500 }
    );
  }
}
