/**
 * POST /api/profile-media/commit
 *
 * Explicitly commits the completed Vercel Blob URL to Aiven MySQL.
 * Verifies session, permissions, HMAC-signed nonce, single-use nonce usage,
 * and matches the Blob URL pathname to the expected target profile prefix.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, logProfileAction } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ALLOWED_MIME_TYPES,
  deleteProfileMedia,
  verifyUploadNonce,
  isValidBlobUrl,
  generateUploadRef,
} from "@/lib/upload";

export const runtime = "nodejs";

interface CommitBody {
  blobUrl: string;
  contentType: string;
  targetProfileId: string;
  uploadNonce: string;
  cropX?: number | null;
  cropY?: number | null;
  cropW?: number | null;
  cropH?: number | null;
  cropZoom?: number | null;
  cropRotation?: number | null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ref = generateUploadRef();
  console.log(`[commit] PROFILE_COMMIT_REQUEST ref=${ref}`);

  const user = await getCurrentUser();
  if (!user) {
    console.warn(`[commit] PROFILE_COMMIT_AUTH_FAILED ref=${ref} reason=NO_SESSION`);
    return NextResponse.json(
      { error: "Profile media could not be saved. Please try again.", ref },
      { status: 401 }
    );
  }

  if (user.role === "ADMIN") {
    console.warn(`[commit] PROFILE_COMMIT_PERMISSION_DENIED ref=${ref} reason=ADMIN_BLOCKED`);
    return NextResponse.json(
      { error: "Profile media could not be saved. Please try again.", ref },
      { status: 403 }
    );
  }

  let body: CommitBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Profile media could not be saved. Please try again.", ref },
      { status: 400 }
    );
  }

  const {
    blobUrl,
    contentType,
    targetProfileId,
    uploadNonce,
    cropX = null,
    cropY = null,
    cropW = null,
    cropH = null,
    cropZoom = null,
    cropRotation = null,
  } = body;

  // 1. Validate required fields
  if (!blobUrl || !contentType || !targetProfileId || !uploadNonce) {
    console.warn(`[commit] PROFILE_COMMIT_INVALID_URL ref=${ref} reason=MISSING_FIELDS`);
    return NextResponse.json(
      { error: "Profile media could not be saved. Please try again.", ref },
      { status: 400 }
    );
  }

  // 2. Confirm content type is allowed
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(contentType)) {
    console.warn(`[commit] PROFILE_COMMIT_INVALID_URL ref=${ref} reason=INVALID_CONTENT_TYPE`);
    return NextResponse.json(
      { error: "Profile media could not be saved. Please try again.", ref },
      { status: 415 }
    );
  }

  // 3. Confirm Blob URL is valid and contains /profiles/{targetProfileId}/
  if (!isValidBlobUrl(blobUrl, targetProfileId)) {
    console.warn(`[commit] PROFILE_COMMIT_INVALID_URL ref=${ref} reason=URL_PATH_MISMATCH`);
    return NextResponse.json(
      { error: "Profile media could not be saved. Please try again.", ref },
      { status: 400 }
    );
  }

  // 4. Validate nonce signature + expiry + scope
  const isNonceValid = verifyUploadNonce(uploadNonce, user.id, targetProfileId);
  if (!isNonceValid) {
    console.warn(`[commit] PROFILE_COMMIT_INVALID_URL ref=${ref} reason=INVALID_OR_EXPIRED_NONCE`);
    return NextResponse.json(
      { error: "Profile media could not be saved. Please try again.", ref },
      { status: 400 }
    );
  }

  // 5. Ensure single-use: check if nonce signature has been used/logged
  const signature = uploadNonce.split(":")[3] || "invalid_sig";
  try {
    const existingUse = await db.profileAuditLog.findFirst({
      where: {
        details: {
          contains: signature,
        },
      },
    });

    if (existingUse) {
      console.warn(`[commit] PROFILE_COMMIT_INVALID_URL ref=${ref} reason=NONCE_ALREADY_USED`);
      return NextResponse.json(
        { error: "Profile media could not be saved. Please try again.", ref },
        { status: 400 }
      );
    }
  } catch (auditErr) {
    console.error(`[commit] Audit query failed ref=${ref} error=${(auditErr as Error).message}`);
    // Non-fatal database safety check failed; proceed but log
  }

  // 6. Verify profile permissions
  const targetProfile = await db.teamProfile.findUnique({
    where: { id: targetProfileId },
    select: { id: true, userId: true, memberType: true, mediaUrl: true, displayName: true },
  });

  if (!targetProfile) {
    console.warn(`[commit] PROFILE_COMMIT_INVALID_URL ref=${ref} reason=PROFILE_NOT_FOUND`);
    return NextResponse.json(
      { error: "Profile media could not be saved. Please try again.", ref },
      { status: 404 }
    );
  }

  if (user.role === "TEAM_MEMBER" && targetProfile.userId !== user.id) {
    console.warn(`[commit] PROFILE_COMMIT_PERMISSION_DENIED ref=${ref} reason=TEAM_MEMBER_WRONG_PROFILE`);
    return NextResponse.json(
      { error: "Profile media could not be saved. Please try again.", ref },
      { status: 403 }
    );
  }

  const oldMediaUrl = targetProfile.mediaUrl;

  // 7. Update Aiven MySQL database via transaction
  let updatedProfile;
  try {
    updatedProfile = await db.$transaction(async (tx) => {
      return tx.teamProfile.update({
        where: { id: targetProfileId },
        data: {
          mediaUrl: blobUrl,
          mediaMimeType: contentType,
          cropX: cropX ?? null,
          cropY: cropY ?? null,
          cropW: cropW ?? null,
          cropH: cropH ?? null,
          cropZoom: cropZoom ?? null,
          cropRotation: cropRotation ?? null,
        },
      });
    });
  } catch (dbErr) {
    console.error(`[commit] PROFILE_MYSQL_SAVE_FAILED ref=${ref} reason=${(dbErr as Error).message}`);
    // Clean up newly uploaded blob to prevent orphaned blobs
    deleteProfileMedia(blobUrl).catch(() => {});
    return NextResponse.json(
      { error: "Profile media could not be saved. Please try again.", ref },
      { status: 500 }
    );
  }

  console.log(`[commit] PROFILE_MYSQL_SAVE_SUCCESS ref=${ref} profile=${targetProfileId}`);

  // 8. Log successful audit with nonce signature to mark it "used"
  await logProfileAction(
    user.id,
    targetProfile.userId,
    "profile_media_commit",
    `Media committed for profile ${targetProfile.displayName}. Nonce signature: ${signature}`
  );

  // 9. Clean up old blob after successful DB write
  if (oldMediaUrl && oldMediaUrl !== blobUrl) {
    deleteProfileMedia(oldMediaUrl).catch(() => {});
  }

  return NextResponse.json({ success: true, profile: updatedProfile });
}

export const dynamic = "force-dynamic";
