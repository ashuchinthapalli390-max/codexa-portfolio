import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import {
  Permission,
  hasPermission,
  getEffectiveRole,
} from "@/lib/permissions";
import { generateOfferNumber, generateVerificationCode } from "@/lib/cxa-ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = auth.user;
  const canManage =
    hasPermission(currentUser, Permission.GENERATE_OFFER_LETTERS) ||
    hasPermission(currentUser, Permission.VIEW_DOCUMENTS);

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId") || currentUser.id;

  if (!canManage && targetUserId !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const letters = await db.offerLetter.findMany({
      where: canManage && !url.searchParams.get("userId") ? {} : { userId: targetUserId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true,
            employmentProfile: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, letters }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/offer-letters]", err);
    return NextResponse.json({ error: "Failed to load offer letters." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = auth.user;
  if (!hasPermission(currentUser, Permission.GENERATE_OFFER_LETTERS)) {
    return NextResponse.json({ error: "Forbidden. Insufficient permissions to generate offer letters." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      userId,
      joiningDate,
      role,
      department,
      duration,
      salaryOrStipend,
      terms,
    } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: "userId and role are required." }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
      include: { employmentProfile: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const offerNumber = await generateOfferNumber();
    const verificationCode = generateVerificationCode();

    const letter = await db.offerLetter.create({
      data: {
        userId,
        offerNumber,
        issueDate: new Date(),
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        role: role.trim(),
        department: department?.trim() || "Engineering",
        duration: duration?.trim() || null,
        salaryOrStipend: salaryOrStipend !== undefined ? parseFloat(salaryOrStipend) : null,
        status: "ISSUED",
        issuedBy: currentUser.displayName,
        verificationCode,
        terms: terms?.trim() || "CodeXa Agency Standard Employment & Intellectual Property Terms apply.",
        content: {
          agencyName: "CodeXa Agency",
          ceo: "Kishore Katla",
          founder: "Ashu Chinthapalli",
          coFounder: "Sanjay Boddukuri",
          verifyUrl: `https://codxa-agency.online/verify/${verificationCode}`,
        },
      },
    });

    // Also register in document vault
    await db.documentItem.create({
      data: {
        userId,
        title: `Official Offer Letter (${offerNumber})`,
        documentType: "OFFER_LETTER",
        documentNumber: offerNumber,
        status: "ACTIVE",
        issuedBy: currentUser.displayName,
        verificationCode,
        metadata: {
          offerNumber,
          role,
          joiningDate,
        },
      },
    });

    const targetName = targetUser.fullName || targetUser.username;

    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: letter.id,
      action: "OFFER_LETTER_GENERATED",
      details: `${getEffectiveRole(currentUser)} (${currentUser.displayName}) generated offer letter ${offerNumber} for ${targetName}. Verification: ${verificationCode}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      letter,
      message: `Offer Letter ${offerNumber} successfully generated.`,
    });
  } catch (err: any) {
    console.error("[POST /api/offer-letters]", err);
    return NextResponse.json({ error: "Failed to generate offer letter." }, { status: 500 });
  }
}
