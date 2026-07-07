/**
 * GET & POST /api/profile-media/upload
 *
 * GET: Requests a signed single-use upload nonce for a target profile.
 * POST: Generates client token using @vercel/blob/client handleUpload().
 *
 * Node.js Runtime. Secure, roles verified.
 */
import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ALLOWED_MIME_TYPES,
  MAX_SIZE_GIF,
  issueUploadNonce,
  verifyUploadNonce,
  generateUploadRef,
} from "@/lib/upload";

export const runtime = "nodejs";

// Helper to verify permissions
async function checkPermission(user: any, targetProfileId: string) {
  if (!user || user.role === "ADMIN") {
    return { allowed: false, reason: "ADMIN_BLOCKED" };
  }

  // Load target profile
  const targetProfile = await db.teamProfile.findUnique({
    where: { id: targetProfileId },
    select: { id: true, userId: true, memberType: true },
  });

  if (!targetProfile) {
    return { allowed: false, reason: "PROFILE_NOT_FOUND" };
  }

  // Permissions logic:
  // - OWNER can edit any profile (Leadership or Core Team)
  // - TEAM_MEMBER can only edit their own profile
  if (user.role === "OWNER") {
    return { allowed: true, targetProfile };
  }

  if (user.role === "TEAM_MEMBER" && targetProfile.userId === user.id) {
    return { allowed: true, targetProfile };
  }

  return { allowed: false, reason: "PERMISSION_DENIED" };
}

/**
 * GET: Obtain a signed upload nonce.
 * Query parameters: ?targetProfileId=...
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const ref = generateUploadRef();
  const searchParams = req.nextUrl.searchParams;
  let targetProfileId = searchParams.get("targetProfileId");

  console.log(`[upload-token] GET PROFILE_TOKEN_REQUEST ref=${ref} target=${targetProfileId}`);

  const user = await getCurrentUser();
  if (!user) {
    console.warn(`[upload-token] PROFILE_COMMIT_AUTH_FAILED ref=${ref} reason=NO_SESSION`);
    return NextResponse.json({ error: "Unauthorized. Please log in.", ref }, { status: 401 });
  }

  if (user.role === "ADMIN") {
    console.warn(`[upload-token] PROFILE_COMMIT_PERMISSION_DENIED ref=${ref} reason=ADMIN_BLOCKED`);
    return NextResponse.json({ error: "Forbidden. Admins cannot upload media.", ref }, { status: 403 });
  }

  // If targetProfileId is not specified, resolve it to current user's own profile
  if (!targetProfileId) {
    const ownProfile = await db.teamProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!ownProfile) {
      console.warn(`[upload-token] PROFILE_COMMIT_PERMISSION_DENIED ref=${ref} reason=NO_PROFILE`);
      return NextResponse.json({ error: "Profile not found.", ref }, { status: 404 });
    }
    targetProfileId = ownProfile.id;
  }

  const perm = await checkPermission(user, targetProfileId);
  if (!perm.allowed) {
    console.warn(`[upload-token] PROFILE_COMMIT_PERMISSION_DENIED ref=${ref} reason=${perm.reason}`);
    return NextResponse.json({ error: "Access denied.", ref }, { status: 403 });
  }

  const nonce = issueUploadNonce(user.id, targetProfileId);
  return NextResponse.json({ uploadNonce: nonce, targetProfileId });
}

/**
 * POST: handleUpload endpoint called by @vercel/blob/client during upload.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ref = generateUploadRef();
  const user = await getCurrentUser();

  if (!user) {
    console.warn(`[upload-token] PROFILE_COMMIT_AUTH_FAILED ref=${ref} reason=NO_SESSION`);
    return NextResponse.json({ error: "Unauthorized. Please log in.", ref }, { status: 401 });
  }

  if (user.role === "ADMIN") {
    console.warn(`[upload-token] PROFILE_COMMIT_PERMISSION_DENIED ref=${ref} reason=ADMIN_BLOCKED`);
    return NextResponse.json({ error: "Forbidden.", ref }, { status: 403 });
  }

  try {
    const body = (await req.json()) as HandleUploadBody;
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        console.log(`[upload-token] PROFILE_TOKEN_REQUEST ref=${ref} pathname=${pathname}`);

        let targetProfileId: string | null = null;
        let uploadNonce: string | null = null;

        if (clientPayload) {
          try {
            const parsed = JSON.parse(clientPayload);
            targetProfileId = parsed.targetProfileId ?? null;
            uploadNonce = parsed.uploadNonce ?? null;
          } catch {
            // ignore
          }
        }

        if (!targetProfileId || !uploadNonce) {
          throw new Error("Missing targetProfileId or uploadNonce in payload");
        }

        // Verify permission
        const perm = await checkPermission(user, targetProfileId);
        if (!perm.allowed) {
          throw new Error(`Permission denied: ${perm.reason}`);
        }

        // Verify nonce is valid and signed by us
        const isValidNonce = verifyUploadNonce(uploadNonce, user.id, targetProfileId);
        if (!isValidNonce) {
          throw new Error("Invalid or expired upload nonce");
        }

        console.log(`[upload-token] PROFILE_TOKEN_CREATED ref=${ref} targetProfile=${targetProfileId}`);

        return {
          allowedContentTypes: [...ALLOWED_MIME_TYPES],
          maximumSizeInBytes: MAX_SIZE_GIF,
          tokenPayload: JSON.stringify({
            actingUserId: user.id,
            targetProfileId,
            uploadNonce,
            allowedRole: user.role,
            ref,
          }),
        };
      },
      onUploadCompleted: async ({ tokenPayload }) => {
        try {
          const payload = JSON.parse(tokenPayload ?? "{}");
          console.log(`[upload-token] PROFILE_BLOB_UPLOAD_SUCCESS ref=${payload.ref ?? "unknown"}`);
        } catch {
          // ignore
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = (err as Error).message ?? "Unknown error";
    console.error(`[upload-token] PROFILE_BLOB_UPLOAD_FAILED ref=${ref} reason=${message}`);
    return NextResponse.json(
      { error: "Profile media could not be saved. Please try again.", ref },
      { status: 400 }
    );
  }
}

export const dynamic = "force-dynamic";
