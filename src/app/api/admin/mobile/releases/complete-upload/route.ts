import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult, validateSessionResult } from "@/lib/auth";
import { canManageMobile } from "@/lib/permissions";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import { validateApkBuffer } from "@/lib/apk-validator";
import {
  fetchApkBufferFromStorage,
  uploadApkBufferDirect,
  deleteApkFromStorage,
  cleanChannelPreviousApks,
  APK_BUCKET_NAME,
} from "@/lib/apk-storage";
import { publishMobileRelease, serializeRelease } from "@/lib/apk-releases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    if (rawToken) {
      const res = await validateSessionResult(rawToken);
      if (res.status === "authenticated") return res.user;
    }
  }
  const cookieRes = await getCurrentSessionResult();
  if (cookieRes.status === "authenticated") return cookieRes.user;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canManageMobile(user)) {
      return NextResponse.json(
        { error: "Forbidden. Only Founder and Co-Founder can upload APK releases." },
        { status: 403 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let storageBucket = APK_BUCKET_NAME;
    let storageKey = "";
    let downloadUrl = "";
    let versionName = "";
    let versionCode = 0;
    let releaseChannel = "STABLE";
    let releaseNotes = "";
    let updateType = "OPTIONAL";
    let minSupportedVersionCode = 1;
    let publishImmediately = false;
    let apkBuffer: Buffer | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No APK file uploaded." }, { status: 400 });
      }

      versionName = (formData.get("versionName") as string) || "";
      versionCode = parseInt((formData.get("versionCode") as string) || "0", 10);
      releaseChannel = ((formData.get("releaseChannel") as string) || "STABLE").toUpperCase();
      releaseNotes = (formData.get("releaseNotes") as string) || "";
      updateType = ((formData.get("updateType") as string) || "OPTIONAL").toUpperCase();
      minSupportedVersionCode = parseInt((formData.get("minSupportedVersionCode") as string) || "1", 10);
      publishImmediately = formData.get("publishImmediately") === "true";

      const arrayBuffer = await file.arrayBuffer();
      apkBuffer = Buffer.from(arrayBuffer);

      // Upload directly to persistent cloud storage
      const uploaded = await uploadApkBufferDirect({
        buffer: apkBuffer,
        channel: releaseChannel,
        versionName,
        fileName: file.name,
      });

      storageBucket = uploaded.bucket;
      storageKey = uploaded.storageKey;
      downloadUrl = uploaded.publicDownloadUrl;
    } else {
      const body = await req.json().catch(() => ({}));
      storageBucket = body.storageBucket || APK_BUCKET_NAME;
      storageKey = body.storageKey || "";
      downloadUrl = body.downloadUrl || "";
      versionName = (body.versionName || "").trim();
      versionCode = parseInt(String(body.versionCode || 0), 10);
      releaseChannel = (body.releaseChannel || "STABLE").toUpperCase();
      releaseNotes = body.releaseNotes || "";
      updateType = (body.updateType || "OPTIONAL").toUpperCase();
      minSupportedVersionCode = parseInt(String(body.minSupportedVersionCode || 1), 10);
      publishImmediately = Boolean(body.publishImmediately);

      if (!storageKey) {
        return NextResponse.json({ error: "Storage key is required." }, { status: 400 });
      }

      // Download from cloud storage to inspect and validate
      apkBuffer = await fetchApkBufferFromStorage(storageBucket, storageKey);
    }

    if (!versionName || !versionCode) {
      return NextResponse.json({ error: "Version name and version code are required." }, { status: 400 });
    }

    if (!apkBuffer || apkBuffer.length === 0) {
      return NextResponse.json({ error: "APK content is empty." }, { status: 400 });
    }

    // 1. Run deep APK validation
    const validation = validateApkBuffer(apkBuffer, "com.codexa.app");

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "APK validation failed.",
          validationErrors: validation.errors,
          validation,
        },
        { status: 422 }
      );
    }

    // 2. Check for duplicate versionCode in the same channel
    const existingRelease = await db.mobileAppRelease.findFirst({
      where: {
        platform: "ANDROID",
        releaseChannel,
        versionCode,
      },
    });

    if (existingRelease) {
      if (existingRelease.status === "PUBLISHED") {
        return NextResponse.json(
          {
            error: `Version code ${versionCode} has already been published in ${releaseChannel} channel. Version codes must strictly increase.`,
          },
          { status: 409 }
        );
      }
      // If it exists but is a DRAFT or FAILED, remove from cloud storage and database
      if (existingRelease.storageBucket && existingRelease.storageKey && existingRelease.storageKey !== storageKey) {
        await deleteApkFromStorage(existingRelease.storageBucket, existingRelease.storageKey).catch(() => {});
      }
      await db.mobileAppRelease.delete({ where: { id: existingRelease.id } });
    }

    // Automatically delete previous un-published DRAFT/FAILED APK binaries in this channel from cloud storage
    const obsoleteDrafts = await db.mobileAppRelease.findMany({
      where: {
        platform: "ANDROID",
        releaseChannel,
        status: { in: ["DRAFT", "FAILED"] },
      },
      select: { id: true, storageBucket: true, storageKey: true },
    });
    for (const draft of obsoleteDrafts) {
      if (draft.storageBucket && draft.storageKey && draft.storageKey !== storageKey) {
        await deleteApkFromStorage(draft.storageBucket, draft.storageKey).catch(() => {});
      }
      await db.mobileAppRelease.delete({ where: { id: draft.id } }).catch(() => {});
    }

    // Clean orphaned or superseded storage objects in this channel partition
    const currentPublished = await db.mobileAppRelease.findFirst({
      where: {
        platform: "ANDROID",
        releaseChannel,
        isCurrentPublished: true,
      },
      select: { storageKey: true },
    });
    const preserveKeys = [storageKey];
    if (!publishImmediately && currentPublished?.storageKey) {
      preserveKeys.push(currentPublished.storageKey);
    }
    await cleanChannelPreviousApks({
      channel: releaseChannel,
      preserveStorageKeys: preserveKeys,
    }).catch(() => {});

    const actorName = user.displayName || user.username || "Founder";

    // 3. Save release metadata in Core database
    const release = await db.mobileAppRelease.create({
      data: {
        appId: "codexa-mobile",
        platform: "ANDROID",
        packageName: validation.detectedPackageName || "com.codexa.app",
        versionName,
        versionCode,
        releaseChannel,
        storageProvider: "SUPABASE",
        storageBucket,
        storageKey,
        apkDownloadUrl: downloadUrl,
        apkFileSize: BigInt(validation.fileSizeBytes),
        apkSha256: validation.sha256,
        signingCertificateFingerprint: validation.signingFingerprint || null,
        releaseNotes,
        status: "DRAFT",
        updateType: updateType === "MANDATORY" ? "MANDATORY" : "OPTIONAL",
        minimumSupportedVersionCode: minSupportedVersionCode || 1,
        isCurrentPublished: false,
        uploadedById: user.id,
        uploadedByName: actorName,
        validationReport: validation as any,
      },
    });

    await dataStore.logAudit({
      actorId: user.id,
      actorName,
      targetId: release.id,
      action: "MOBILE_APP_RELEASE_UPLOADED",
      details: `Uploaded and validated APK v${versionName} (Build ${versionCode}, SHA-256: ${validation.sha256.substring(0, 12)}...).`,
    });

    // 4. Publish immediately if requested
    if (publishImmediately) {
      const published = await publishMobileRelease({
        releaseId: release.id,
        publisherId: user.id,
        publisherName: actorName,
        notifyUsers: true,
      });

      return NextResponse.json({
        success: true,
        published: true,
        release: published,
        validation,
      });
    }

    return NextResponse.json({
      success: true,
      published: false,
      release: serializeRelease(release),
      validation,
    });
  } catch (err: any) {
    console.error("[POST /api/admin/mobile/releases/complete-upload]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to complete APK upload and validation." },
      { status: 500 }
    );
  }
}
