import { GET as proofImageHandler } from "@/app/api/payments/[id]/proof-image/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = proofImageHandler;
