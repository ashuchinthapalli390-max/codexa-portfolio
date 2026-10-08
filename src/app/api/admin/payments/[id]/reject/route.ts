import { POST as reviewRejectHandler } from "@/app/api/payments/[id]/review/reject/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = reviewRejectHandler;
