import { NextRequest, NextResponse } from "next/server";
import { GET as getCatalog } from "../store/catalog/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return getCatalog(req);
}
