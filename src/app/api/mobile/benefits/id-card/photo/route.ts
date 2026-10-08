import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/auth";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    // Verify payment eligibility
    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      select: { internServicePaymentPaid: true, profileMediaUrl: true, fullName: true, username: true },
    });

    const ownPayment = await db.paymentRequest.findFirst({
      where: { userId: user.id, paymentPurpose: "INTERNSHIP_FEE" },
      orderBy: { createdAt: "desc" },
    });

    const isPaid = ownPayment?.paymentStatus === "APPROVED" ||
      ownPayment?.paymentStatus === "SUCCESS" ||
      ownPayment?.cashStatus === "CASH_RECEIVED" ||
      Boolean(fullUser?.internServicePaymentPaid);

    if (!isPaid) {
      return NextResponse.json({
        ok: false,
        error: {
          code: "PAYMENT_REQUIRED",
          message: "ID Card photo upload unlocks only after confirmed payment of the ₹450 internship fee.",
        },
      }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    let imageUrl: string | null = null;
    let mimeType = "image/jpeg";
    let fileSize = 0;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file || file.size === 0) {
        return NextResponse.json({ ok: false, error: { code: "NO_FILE", message: "Please select an image file to upload." } }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fileSize = file.size;
      mimeType = file.type || "image/jpeg";
      const ext = path.extname(file.name) || ".jpg";
      const filename = `idcard_${user.id}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;

      const uploadDir = path.join(process.cwd(), "public", "uploads", "id_card_photos");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, filename), buffer);
      imageUrl = `https://codxa-agency.online/uploads/id_card_photos/${filename}`;

    } else {
      const body = await req.json().catch(() => ({}));

      if (body.useProfilePhoto === true) {
        if (!fullUser?.profileMediaUrl) {
          return NextResponse.json({ ok: false, error: { code: "NO_PROFILE_PHOTO", message: "No profile photo found on your account." } }, { status: 400, headers: NO_CACHE_HEADERS });
        }
        imageUrl = fullUser.profileMediaUrl;
      } else if (body.base64) {
        const cleanBase64 = body.base64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        fileSize = buffer.length;
        const filename = `idcard_${user.id}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.jpg`;
        const uploadDir = path.join(process.cwd(), "public", "uploads", "id_card_photos");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        fs.writeFileSync(path.join(uploadDir, filename), buffer);
        imageUrl = `https://codxa-agency.online/uploads/id_card_photos/${filename}`;
      } else if (body.imageUrl) {
        imageUrl = body.imageUrl;
      }
    }

    if (!imageUrl) {
      return NextResponse.json({ ok: false, error: { code: "INVALID_IMAGE", message: "No valid image provided." } }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // Determine submission version
    const existing = await db.$queryRawUnsafe<any[]>(`
      SELECT version FROM id_card_photo_submissions
      WHERE user_id = $1
      ORDER BY version DESC
      LIMIT 1
    `, user.id);

    const nextVersion = existing.length > 0 ? (existing[0].version + 1) : 1;
    const submissionId = `idcard_sub_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    await db.$executeRawUnsafe(`
      INSERT INTO id_card_photo_submissions (
        id, user_id, payment_request_id, storage_path, image_url,
        mime_type, file_size, version, status
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, 'SUBMITTED'
      )
    `,
      submissionId,
      user.id,
      ownPayment?.id || null,
      imageUrl,
      imageUrl,
      mimeType,
      fileSize,
      nextVersion
    );

    // Notify Founder and Co-Founder in app
    const leadership = await db.user.findMany({
      where: { role: { in: ["FOUNDER", "CO_FOUNDER", "OWNER"] }, isActive: true },
      select: { id: true },
    });

    for (const leader of leadership) {
      try {
        await db.notification.create({
          data: {
            userId: leader.id,
            type: "ID_CARD_SUBMISSION",
            title: `New ID Card Photo: ${fullUser?.fullName || user.username}`,
            message: `${fullUser?.fullName || user.username} has submitted their portrait photo for ID Card preparation.`,
            link: `/dashboard/id-card-submissions`,
          },
        });
      } catch (_) {}
    }

    return NextResponse.json({
      ok: true,
      message: "ID Card photo submitted successfully. Awaiting website review.",
      submission: {
        id: submissionId,
        imageUrl,
        version: nextVersion,
        status: "SUBMITTED",
        submittedAt: new Date().toISOString(),
      },
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[POST /api/mobile/benefits/id-card/photo]", err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to submit ID Card photo." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
