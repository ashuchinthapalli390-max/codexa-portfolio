import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import { generateSessionToken, hashToken, SESSION_MAX_AGE_SECONDS, generateRequestId } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";
import { verifyFirebaseIdToken, DecodedFirebaseUser } from "@/lib/firebase-admin";
import { APPROVED_ADMIN_EMAILS } from "@/lib/firebase-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function isDatabaseError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || "").toLowerCase();
  const name = String(err.name || "").toLowerCase();
  const code = String(err.code || "");
  if (code.startsWith("P10") || code === "P2024") return true;
  if (name.includes("prismaclientinitializationerror") || name.includes("prismaclientrustpanickerror")) return true;
  if (msg.includes("can't reach database") || msg.includes("connection pool") || msg.includes("timed out")) return true;
  if (msg.includes("connection refused") || msg.includes("econnrefused") || msg.includes("etimedout")) return true;
  return false;
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "Invalid JSON request payload." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const { idToken, deviceId, deviceName, platform } = body || {};

    if (!idToken || typeof idToken !== "string" || !idToken.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_TOKEN", message: "Google authentication token is required." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // 1. Verify Google / Firebase ID token
    let decoded: DecodedFirebaseUser;
    try {
      decoded = await verifyFirebaseIdToken(idToken.trim());
    } catch (tokenErr: any) {
      console.warn(`[Mobile Google Auth] Token verification failed [${requestId}]:`, tokenErr?.message);
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_TOKEN", message: tokenErr?.message || "Invalid or expired Google token." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const normalizedEmail = (decoded.email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return NextResponse.json(
        { ok: false, error: { code: "NO_EMAIL", message: "No email address associated with this Google account." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const identity = APPROVED_ADMIN_EMAILS[normalizedEmail];

    // 2. Resolve or provision user in Core DB
    let user = await db.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: "insensitive" } },
          { firebaseUid: decoded.uid },
          ...(identity ? [{ username: identity.canonicalUsername }] : []),
        ],
      },
      include: {
        profile: true,
        employmentProfile: true,
      },
    });

    if (!user && identity) {
      // Bootstrap canonical executive account
      user = await db.user.create({
        data: {
          email: normalizedEmail,
          username: identity.canonicalUsername,
          fullName: identity.fullName,
          passwordHash: "FIREBASE_MANAGED_OAUTH_ACCOUNT",
          role: identity.role,
          firebaseUid: decoded.uid,
          isActive: true,
          mustChangePassword: false,
          lastLoginAt: new Date(),
          profile: {
            create: {
              memberType: "LEADERSHIP",
              leadershipPosition: identity.leadershipPosition,
              primaryRole: identity.primaryRole,
              displayName: identity.displayName,
              mediaUrl: identity.defaultImage,
              cropX: identity.cropX,
              cropY: identity.cropY,
              cropZoom: 1.05,
              isPublic: true,
              displayOrder: identity.isOwner ? 1 : identity.leadershipPosition === "CO_FOUNDER" ? 2 : 3,
            },
          },
        },
        include: {
          profile: true,
          employmentProfile: true,
        },
      });
    } else if (!user && !identity) {
      // Auto-provision standard team member / intern account
      const basePrefix = normalizedEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || "user";
      let uniqueUsername = basePrefix;
      let counter = 1;
      while (await db.user.findUnique({ where: { username: uniqueUsername } })) {
        uniqueUsername = `${basePrefix}${counter++}`;
      }

      const displayName = decoded.name || basePrefix;
      user = await db.user.create({
        data: {
          email: normalizedEmail,
          username: uniqueUsername,
          fullName: decoded.name || basePrefix,
          passwordHash: "FIREBASE_MANAGED_OAUTH_ACCOUNT",
          role: "INTERN",
          orgRole: "INTERN",
          firebaseUid: decoded.uid,
          isActive: true,
          mustChangePassword: false,
          lastLoginAt: new Date(),
          profile: {
            create: {
              memberType: "CORE_TEAM",
              primaryRole: "Intern Developer",
              displayName: displayName,
              mediaUrl: decoded.picture || "/assets/images/logo.jpeg",
              cropX: 50,
              cropY: 20,
              cropZoom: 1.05,
              isPublic: true,
              displayOrder: 99,
            },
          },
        },
        include: {
          profile: true,
          employmentProfile: true,
        },
      });
    } else if (user) {
      // Account exists: ensure active and link firebaseUid safely
      if (!user.isActive) {
        return NextResponse.json(
          { ok: false, error: { code: "ACCOUNT_DISABLED", message: "Your CodeXa account is disabled." }, requestId },
          { status: 403, headers: NO_CACHE_HEADERS }
        );
      }

      const updateData: any = {
        lastLoginAt: new Date(),
      };

      if (!user.firebaseUid || user.firebaseUid !== decoded.uid) {
        await db.user.updateMany({
          where: { firebaseUid: decoded.uid, id: { not: user.id } },
          data: { firebaseUid: null },
        }).catch(() => {});
        updateData.firebaseUid = decoded.uid;
      }

      if (decoded.picture && user.profile && (!user.profile.mediaUrl || user.profile.mediaUrl === "/assets/images/logo.jpeg")) {
        await db.teamProfile.update({
          where: { id: user.profile.id },
          data: { mediaUrl: decoded.picture },
        }).catch(() => {});
      }

      user = await db.user.update({
        where: { id: user.id },
        data: updateData,
        include: {
          profile: true,
          employmentProfile: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "USER_RESOLUTION_FAILED", message: "Could not resolve account for this Google login." }, requestId },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // 3. Issue persistent 30-day mobile session token in Core DB
    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

    await db.session.create({
      data: {
        userId: user.id,
        sessionTokenHash: tokenHash,
        expiresAt,
        userAgent: req.headers.get("user-agent") || `CodeXa Mobile Google (${platform || "Android"})`,
        lastSeenAt: new Date(),
      },
    });

    // 4. Track device if deviceId provided
    if (deviceId) {
      try {
        await db.mobileSession.upsert({
          where: { id: `${user.id}_${deviceId}` },
          update: {
            lastActive: new Date(),
            appVersion: req.headers.get("x-app-version") || "1.0.0",
          },
          create: {
            id: `${user.id}_${deviceId}`,
            userId: user.id,
            deviceId,
            deviceName: deviceName || "Mobile Device",
            platform: platform || "ANDROID",
            appVersion: req.headers.get("x-app-version") || "1.0.0",
          },
        });
      } catch (devErr) {
        console.warn("[MobileSession tracking warning]", devErr);
      }
    }

    // 5. Audit log
    await dataStore.logAudit({
      action: "MOBILE_GOOGLE_LOGIN",
      targetId: user.id,
      actorId: user.id,
      actorName: user.profile?.displayName || user.fullName || user.username,
      details: `Google Sign-In via ${normalizedEmail} mapped to @${user.username} [${requestId}]`,
    }).catch(() => {});

    const effectiveRole = getEffectiveRole(user);

    return NextResponse.json({
      ok: true,
      accessToken: rawToken,
      refreshToken: rawToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || user.profile?.displayName || user.username,
        role: effectiveRole,
        orgRole: user.orgRole,
        department: user.department || user.employmentProfile?.department,
        designation: user.employmentProfile?.designation || user.profile?.primaryRole,
        employeeId: user.employmentProfile?.employeeId,
        profileMediaUrl: user.profileMediaUrl || user.profile?.profileMediaUrl || user.profile?.mediaUrl,
        mustChangePassword: false,
      },
      requestId,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/auth/google Error] [${requestId}]`, {
      message: err?.message,
      code: err?.code,
    });

    if (isDatabaseError(err)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DATABASE_UNAVAILABLE",
            message: "CodeXa is temporarily unable to connect to its database.",
          },
          requestId,
        },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "CodeXa encountered a server error.",
        },
        requestId,
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
