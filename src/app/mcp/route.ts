import { NextRequest } from "next/server";
import { GET as apiGet, POST as apiPost, OPTIONS as apiOptions } from "@/app/api/mcp/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return apiOptions();
}

export async function GET(req: NextRequest) {
  return apiGet(req);
}

export async function POST(req: NextRequest) {
  return apiPost(req);
}
