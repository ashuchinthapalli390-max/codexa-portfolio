import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/downloads/CodeXa.apk";
  return NextResponse.redirect(url, 301);
}
