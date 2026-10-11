import { NextRequest } from "next/server";
import { serveDirectApkBinary } from "@/lib/apk-database-streamer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return await serveDirectApkBinary(req, {
    fallbackFilename: "CodeXa.apk",
  });
}

export async function HEAD(req: NextRequest) {
  return await serveDirectApkBinary(req);
}
