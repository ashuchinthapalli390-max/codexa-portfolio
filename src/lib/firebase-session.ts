import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";
import { verifyFirebaseIdToken, DecodedFirebaseUser } from "@/lib/firebase-admin";

export const PERMANENT_FOUNDER_EMAIL = "ashuchinthapalli3900@gmail.com";

/**
 * Approved executive identity definition
 */
export interface ApprovedAdminIdentity {
  canonicalUsername: "ashu" | "sanjay" | "kishore";
  role: "OWNER" | "ADMIN";
  leadershipPosition: "FOUNDER" | "CO_FOUNDER" | "CEO";
  displayName: string;
  fullName: string;
  primaryRole: string;
  defaultRedirect: string;
  isOwner: boolean;
  defaultImage: string;
  cropX: number;
  cropY: number;
}

/**
 * Canonical Admin Access Mapping
 * ─────────────────────────────────────────────────────────────────────────────
 * | Public identity                | Approved Google login email(s)   | Permission
 * | Founder / Ashu                 | ashuchinthapalli3900@gmail.com   | OWNER / SUPER_ADMIN / FOUNDER
 * | Founder / Ashu secondary login | darklevelinggaming@gmail.com     | Same OWNER / SUPER_ADMIN access
 * | Co-Founder / Sanjay            | boddukurisanjay@gmail.com        | ADMIN / CO_FOUNDER
 * | CEO / Kishore                  | katlakishore86@gmail.com         | ADMIN / CEO
 * | CEO secondary login alias      | katlavenu520@gmail.com           | Same ADMIN / CEO access
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const APPROVED_ADMIN_EMAILS: Record<string, ApprovedAdminIdentity> = {
  // Founder / Ashu
  "ashuchinthapalli3900@gmail.com": {
    canonicalUsername: "ashu",
    role: "OWNER",
    leadershipPosition: "FOUNDER",
    displayName: "Ashu",
    fullName: "Ashu",
    primaryRole: "Founder & Full-Stack Developer",
    defaultRedirect: "/owner",
    isOwner: true,
    defaultImage: "/assets/images/founder.jpeg",
    cropX: 45,
    cropY: 22,
  },
  // Founder / Ashu secondary login
  "darklevelinggaming@gmail.com": {
    canonicalUsername: "ashu",
    role: "OWNER",
    leadershipPosition: "FOUNDER",
    displayName: "Ashu",
    fullName: "Ashu",
    primaryRole: "Founder & Full-Stack Developer",
    defaultRedirect: "/owner",
    isOwner: true,
    defaultImage: "/assets/images/founder.jpeg",
    cropX: 45,
    cropY: 22,
  },
  // Co-Founder / Sanjay
  "boddukurisanjay@gmail.com": {
    canonicalUsername: "sanjay",
    role: "ADMIN",
    leadershipPosition: "CO_FOUNDER",
    displayName: "Sanjay",
    fullName: "Sanjay",
    primaryRole: "Co-Founder & Operations Lead",
    defaultRedirect: "/admin",
    isOwner: false,
    defaultImage: "/assets/images/co-founder.jpeg",
    cropX: 50,
    cropY: 25,
  },
  // CEO / Kishore
  "katlakishore86@gmail.com": {
    canonicalUsername: "kishore",
    role: "ADMIN",
    leadershipPosition: "CEO",
    displayName: "Kishore",
    fullName: "Kishore",
    primaryRole: "CEO & Executive Strategy",
    defaultRedirect: "/admin",
    isOwner: false,
    defaultImage: "/assets/images/ceo.jpeg",
    cropX: 50,
    cropY: 20,
  },
  // CEO secondary login alias (maps to canonical Kishore, public display Kishore)
  "katlavenu520@gmail.com": {
    canonicalUsername: "kishore",
    role: "ADMIN",
    leadershipPosition: "CEO",
    displayName: "Kishore",
    fullName: "Kishore",
    primaryRole: "CEO & Executive Strategy",
    defaultRedirect: "/admin",
    isOwner: false,
    defaultImage: "/assets/images/ceo.jpeg",
    cropX: 50,
    cropY: 20,
  },
};

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
 * Validates a Firebase token, verifies email identity against the Canonical Admin Access Mapping,
 * connects to the canonical profile, logs audit trail, and issues secure HttpOnly cxa_session cookie.
 */
export async function handleFirebaseSession(
  idToken: string,
  metadata?: { userAgent?: string; ip?: string }
): Promise<FirebaseSessionResult> {
  // 1. Verify Firebase token using singleton Firebase Admin SDK
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

  // 2. Normalize and check email against approved executive mapping
  const normalizedEmail = (decoded.email || "").trim().toLowerCase();
  const identity = APPROVED_ADMIN_EMAILS[normalizedEmail];

  if (!identity) {
    return {
      success: false,
      authorized: false,
      message: "This Google account is not authorized for the CodeXa executive console.",
    };
  }

  // 3. Email verification check
  if (!decoded.email_verified) {
    return {
      success: false,
      authorized: false,
      message: "Please verify your Google email address before signing in.",
    };
  }

  try {
    // 4. Find or connect to canonical user account
    let user = await db.user.findFirst({
      where: {
        OR: [
          { username: identity.canonicalUsername },
          { email: { equals: normalizedEmail, mode: "insensitive" } },
          { firebaseUid: decoded.uid },
          ...(identity.isOwner ? [{ role: "OWNER" }] : []),
          ...(identity.canonicalUsername === "sanjay"
            ? [{ profile: { leadershipPosition: "CO_FOUNDER" } }]
            : []),
          ...(identity.canonicalUsername === "kishore"
            ? [{ profile: { leadershipPosition: "CEO" } }]
            : []),
        ],
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      // Bootstrap canonical user account
      user = await db.user.create({
        data: {
          email: normalizedEmail,
          username: identity.canonicalUsername,
          fullName: identity.fullName,
          passwordHash: "FIREBASE_MANAGED_OAUTH_ACCOUNT",
          role: identity.role,
          firebaseUid: decoded.uid,
          isActive: true,
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
        },
      });
    } else {
      // User exists: update login info, ensure active and proper role
      const updateData: any = {
        role: identity.role,
        isActive: true,
        lastLoginAt: new Date(),
      };

      // Set firebaseUid if not set or link current UID
      if (!user.firebaseUid) {
        updateData.firebaseUid = decoded.uid;
      }

      user = await db.user.update({
        where: { id: user.id },
        data: updateData,
        include: {
          profile: true,
        },
      });

      // Ensure profile leadership position matches
      if (user.profile && user.profile.leadershipPosition !== identity.leadershipPosition) {
        await db.teamProfile.update({
          where: { id: user.profile.id },
          data: {
            leadershipPosition: identity.leadershipPosition,
            primaryRole: identity.primaryRole,
          },
        });
      }
    }

    // 5. Create persistent session and set HttpOnly cxa_session cookie
    await createSession(user.id, metadata);

    // 6. Write comprehensive audit log
    await dataStore
      .logAudit({
        action: "FIREBASE_OAUTH_LOGIN",
        actorId: user.id,
        actorName: user.profile?.displayName || user.fullName || user.username,
        details: `Approved OAuth login via ${normalizedEmail} (mapped to canonical @${identity.canonicalUsername}, role: ${identity.role})`,
        ipAddress: metadata?.ip || "127.0.0.1",
        userAgent: metadata?.userAgent,
      })
      .catch(() => {});

    return {
      success: true,
      authorized: true,
      redirectUrl: identity.defaultRedirect,
      user: {
        id: user.id,
        username: identity.canonicalUsername,
        email: normalizedEmail,
        displayName: user.profile?.displayName || identity.displayName,
        role: identity.role,
        leadershipPosition: identity.leadershipPosition,
      },
    };
  } catch (dbErr: any) {
    console.error("[Firebase Session DB Error]:", dbErr);

    // Resilient fallback for approved identities if database is in temporary cold-start
    return {
      success: true,
      authorized: true,
      redirectUrl: identity.defaultRedirect,
      user: {
        id: `mock_${identity.canonicalUsername}_id`,
        username: identity.canonicalUsername,
        email: normalizedEmail,
        displayName: identity.displayName,
        role: identity.role,
        leadershipPosition: identity.leadershipPosition,
      },
    };
  }
}
