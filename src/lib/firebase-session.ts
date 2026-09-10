import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";
import { verifyFirebaseIdToken, DecodedFirebaseUser } from "@/lib/firebase-admin";

export const PERMANENT_FOUNDER_EMAIL = "ashuchinthapalli3900@gmail.com";

export interface FirebaseSessionResult {
  success: boolean;
  authorized: boolean;
  message?: string;
  redirectUrl?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    displayName: string;
    role: string;
    leadershipPosition?: string | null;
  };
}

/**
 * Validates a Firebase token, verifies email identity, binds or verifies DB permissions,
 * and sets up a persistent secure HttpOnly session.
 */
export async function handleFirebaseSession(
  idToken: string,
  metadata?: { userAgent?: string; ip?: string }
): Promise<FirebaseSessionResult> {
  // 1. Verify Firebase token
  let decoded: DecodedFirebaseUser;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch (err: any) {
    return {
      success: false,
      authorized: false,
      message: err.message || "Invalid or expired Firebase token.",
    };
  }

  const email = decoded.email.trim().toLowerCase();
  const isFounder = email === PERMANENT_FOUNDER_EMAIL.toLowerCase();

  // 2. Email verification check
  if (!decoded.email_verified && !isFounder) {
    return {
      success: false,
      authorized: false,
      message: "Please verify your Google email address before signing in.",
    };
  }

  try {
    // 3. Look up user by firebaseUid or email
    let user = await db.user.findFirst({
      where: {
        OR: [
          { firebaseUid: decoded.uid },
          { email: { equals: email, mode: "insensitive" } },
        ],
      },
      include: {
        profile: true,
      },
    });

    // 4. Case A: Permanent Founder Login
    if (isFounder) {
      if (!user) {
        // Automatically bootstrap permanent Founder account
        user = await db.user.create({
          data: {
            email: PERMANENT_FOUNDER_EMAIL,
            username: "ashu",
            fullName: "Ashu",
            passwordHash: "FIREBASE_MANAGED_OAUTH_ACCOUNT",
            role: "OWNER",
            firebaseUid: decoded.uid,
            isActive: true,
            lastLoginAt: new Date(),
            profile: {
              create: {
                memberType: "LEADERSHIP",
                leadershipPosition: "FOUNDER",
                primaryRole: "Founder & Full-Stack Developer",
                displayName: "Ashu",
                headline: "Full-Stack Developer • AI Engineer • Cybersecurity & Linux Specialist",
                publicBio: "Ashu is the Founder and technical architect behind CodeXa Agency, building full-stack platforms, AI systems, cybersecurity tools, developer products, SaaS applications, desktop software and cross-platform applications.",
                mediaUrl: decoded.picture || "/assets/images/128acbeb739b3eb8bc4d1d9ae15fcfb2.jpg",
                isPublic: true,
                displayOrder: 1,
              },
            },
          },
          include: {
            profile: true,
          },
        });
      } else {
        // Enforce OWNER role and update Firebase UID and last login
        user = await db.user.update({
          where: { id: user.id },
          data: {
            role: "OWNER",
            firebaseUid: decoded.uid,
            isActive: true,
            lastLoginAt: new Date(),
          },
          include: {
            profile: true,
          },
        });
      }
    } else {
      // 5. Case B: Other Users
      if (!user || !user.isActive) {
        return {
          success: false,
          authorized: false,
          message: "Your account is not authorized for the CodeXa admin console. Please contact the Founder or Super Admin.",
        };
      }

      // Link firebaseUid if first time logging in with Google
      if (!user.firebaseUid) {
        user = await db.user.update({
          where: { id: user.id },
          data: {
            firebaseUid: decoded.uid,
            lastLoginAt: new Date(),
          },
          include: {
            profile: true,
          },
        });
      } else {
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      }
    }

    // 6. Create persistent session and set HttpOnly cookie
    await createSession(user.id, metadata);

    // 7. Write audit log
    await dataStore.logAudit({
      action: "GOOGLE_LOGIN_SUCCESS",
      actorId: user.id,
      actorName: user.profile?.displayName || user.fullName || user.username,
      details: `User ${user.email} successfully authenticated via Google Firebase Auth (UID: ${decoded.uid})`,
      ipAddress: metadata?.ip || "127.0.0.1",
      userAgent: metadata?.userAgent,
    }).catch(() => {});

    // 8. Determine redirect URL
    const redirectUrl =
      user.role === "OWNER"
        ? "/owner"
        : user.role === "ADMIN"
        ? "/admin"
        : "/dashboard";

    return {
      success: true,
      authorized: true,
      redirectUrl,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.profile?.displayName || user.fullName || user.username,
        role: user.role,
        leadershipPosition: user.profile?.leadershipPosition || null,
      },
    };
  } catch (dbErr: any) {
    console.error("[Firebase Session Error]", dbErr);
    // If local database is unreachable or in mock mode during testing
    if (isFounder) {
      return {
        success: true,
        authorized: true,
        redirectUrl: "/owner",
        user: {
          id: "mock_founder_id",
          username: "ashu",
          email: PERMANENT_FOUNDER_EMAIL,
          displayName: "Ashu (Founder)",
          role: "OWNER",
          leadershipPosition: "FOUNDER",
        },
      };
    }

    return {
      success: false,
      authorized: false,
      message: "Database unavailable during authentication. Please retry shortly.",
    };
  }
}
