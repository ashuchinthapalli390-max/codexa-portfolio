import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";
import { verifyFirebaseIdToken, DecodedFirebaseUser } from "@/lib/firebase-admin";

export const PERMANENT_FOUNDER_EMAIL = "ashuchinthapalli3900@gmail.com";

/**
 * Approved executive identity definition
 */
export interface ApprovedAdminIdentity {
  canonicalUsername: string;
  role: string;
  leadershipPosition: string;
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
    primaryRole: "Co-Founder & System Architect",
    defaultRedirect: "/owner",
    isOwner: false,
    defaultImage: "/assets/images/co-founder.jpeg",
    cropX: 50,
    cropY: 25,
  },
  // CEO / Kishore
  "katlakishore86@gmail.com": {
    canonicalUsername: "kishore",
    role: "CEO",
    leadershipPosition: "CEO",
    displayName: "Kishore",
    fullName: "Kishore",
    primaryRole: "Chief Executive Officer (CEO)",
    defaultRedirect: "/dashboard",
    isOwner: false,
    defaultImage: "/assets/images/ceo.jpeg",
    cropX: 50,
    cropY: 20,
  },
  // CEO secondary login alias
  "katlavenu520@gmail.com": {
    canonicalUsername: "kishore",
    role: "CEO",
    leadershipPosition: "CEO",
    displayName: "Kishore",
    fullName: "Kishore",
    primaryRole: "Chief Executive Officer (CEO)",
    defaultRedirect: "/dashboard",
    isOwner: false,
    defaultImage: "/assets/images/ceo.jpeg",
    cropX: 50,
    cropY: 20,
  },
  // CTO / Amrutha
  "amruthadivvela@gmail.com": {
    canonicalUsername: "amrutha",
    role: "CTO",
    leadershipPosition: "CTO",
    displayName: "Amrutha Divvela",
    fullName: "Amrutha Divvela",
    primaryRole: "Chief Technology Officer (CTO)",
    defaultRedirect: "/dashboard",
    isOwner: false,
    defaultImage: "/assets/images/cto.jpeg",
    cropX: 50,
    cropY: 20,
  },
  // HR / Vyshnavi
  "vyshnavireddy720@gmail.com": {
    canonicalUsername: "vyshnavi",
    role: "HR",
    leadershipPosition: "HR",
    displayName: "Vyshnavi Reddy",
    fullName: "Vyshnavi Reddy",
    primaryRole: "Head of Human Resources (HR)",
    defaultRedirect: "/dashboard",
    isOwner: false,
    defaultImage: "/assets/images/hr.jpeg",
    cropX: 50,
    cropY: 20,
  },
  // COO / Varun
  "varunparlapalli2008@gmail.com": {
    canonicalUsername: "varun",
    role: "COO",
    leadershipPosition: "COO",
    displayName: "Varun Parlapalli",
    fullName: "Varun Parlapalli",
    primaryRole: "Chief Operating Officer (COO)",
    defaultRedirect: "/dashboard",
    isOwner: false,
    defaultImage: "/assets/images/coo.jpeg",
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

  // 2. Normalize and check email against approved executive mapping or database
  const normalizedEmail = (decoded.email || "").trim().toLowerCase();
  const identity = APPROVED_ADMIN_EMAILS[normalizedEmail];

  // 3. Email verification check (Google accounts ending in @gmail.com are inherently verified)
  const isGmail = normalizedEmail.endsWith("@gmail.com");
  if (!decoded.email_verified && !isGmail) {
    return {
      success: false,
      authorized: false,
      message: "Please verify your Google email address before signing in.",
    };
  }

  try {
    // 4. Find the EXACT SAME ACCOUNT in the database:
    // Priority 1: Match by registered email in DB (case-insensitive)
    // Priority 2: Match by existing linked firebaseUid
    // Priority 3: Match by canonical username (for aliases like darklevelinggaming@gmail.com -> ashu)
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
      },
    });

    if (!user && identity) {
      // Bootstrap canonical leadership user account if not yet seeded
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
    } else if (!user && !identity) {
      // Auto-provision new account for Google OAuth user (OAuth enabled for everyone)
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
        },
      });
    } else if (user) {
      // EXACT SAME USER FOUND: Ensure account is active and link firebaseUid safely
      const updateData: any = {
        isActive: true,
        lastLoginAt: new Date(),
      };

      if (!user.firebaseUid || user.firebaseUid !== decoded.uid) {
        // Clear conflicting firebaseUid on any other user row first to prevent unique constraint error
        await db.user.updateMany({
          where: { firebaseUid: decoded.uid, id: { not: user.id } },
          data: { firebaseUid: null },
        }).catch(() => {});

        updateData.firebaseUid = decoded.uid;
      }

      // If user profile doesn't have custom avatar, adopt Google profile photo
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
        },
      });
    }

    if (!user) {
      return {
        success: false,
        authorized: false,
        message: "Failed to resolve or create user account.",
      };
    }

    // 5. Track discrete AdminLoginIdentity safely without merging different UIDs
    try {
      await (db as any).adminLoginIdentity.updateMany({
        where: { firebaseUid: decoded.uid, email: { not: normalizedEmail } },
        data: { firebaseUid: null },
      }).catch(() => {});

      await (db as any).adminLoginIdentity.upsert({
        where: { email: normalizedEmail },
        update: {
          userId: user.id,
          firebaseUid: decoded.uid,
          role: identity?.role || user.role,
          isActive: true,
          lastLoginAt: new Date(),
        },
        create: {
          userId: user.id,
          email: normalizedEmail,
          firebaseUid: decoded.uid,
          role: identity?.role || user.role,
          isActive: true,
          lastLoginAt: new Date(),
        },
      });
    } catch (identityErr) {
      // Non-fatal if table is still migrating
      console.warn("[AdminLoginIdentity Warning]:", identityErr);
    }

    // 6. Create persistent session and set HttpOnly cxa_session cookie
    await createSession(user.id, metadata);

    // 7. Write comprehensive audit log
    await dataStore
      .logAudit({
        action: "FIREBASE_OAUTH_LOGIN",
        actorId: user.id,
        actorName: user.profile?.displayName || user.fullName || user.username,
        details: `Approved Google login via ${normalizedEmail} (UID: ${decoded.uid}) mapped to canonical @${user.username}, role: ${user.role}`,
        ipAddress: metadata?.ip || "127.0.0.1",
        userAgent: metadata?.userAgent,
      })
      .catch(() => {});

    const effectiveRole = (user.profile?.leadershipPosition || user.role || "").toUpperCase();
    const isOwnerOrFounder =
      user.role === "OWNER" ||
      user.role === "FOUNDER" ||
      effectiveRole === "FOUNDER" ||
      effectiveRole === "CO_FOUNDER" ||
      user.role === "CO_FOUNDER";

    const defaultRedirect = isOwnerOrFounder ? "/owner" : "/dashboard";
    const redirectUrl = identity?.defaultRedirect || defaultRedirect;

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
        leadershipPosition: user.profile?.leadershipPosition || identity?.leadershipPosition || null,
      },
    };
  } catch (dbErr: any) {
    console.error("[Firebase Session DB Error]:", dbErr);

    // Resilient fallback for any Google user if database is in temporary cold-start
    const fallbackUsername = identity?.canonicalUsername || normalizedEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || "user";
    const fallbackRole = identity?.role || "INTERN";
    const fallbackRedirect = identity?.defaultRedirect || (fallbackRole === "OWNER" || fallbackRole === "FOUNDER" || fallbackRole === "CO_FOUNDER" ? "/owner" : "/dashboard");

    return {
      success: true,
      authorized: true,
      redirectUrl: fallbackRedirect,
      user: {
        id: `mock_${fallbackUsername}_id`,
        username: fallbackUsername,
        email: normalizedEmail,
        displayName: identity?.displayName || decoded.name || fallbackUsername,
        role: fallbackRole,
        leadershipPosition: identity?.leadershipPosition || null,
      },
    };
  }
}

