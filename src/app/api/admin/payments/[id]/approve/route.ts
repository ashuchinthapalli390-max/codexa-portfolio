import { POST as reviewApproveHandler } from "@/app/api/payments/[id]/review/approve/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = reviewApproveHandler;
