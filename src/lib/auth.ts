/**
 * Database-backed Persistent Session Authentication for CodeXa Agency
 *
 * Security Architecture:
 * - 30-day persistent session backed by PostgreSQL
 * - Cryptographically random 32-byte session tokens
 * - Database stores ONLY SHA-256 token hashes (never raw tokens)
 * - Raw token sent ONLY via HttpOnly, Secure, SameSite=Lax cookie (`cxa_session`)
 * - Rolling renewal (extends when <15 days remain)
 * - Throttled activity tracking (lastSeenAt updated at most once every 5 minutes)
 * - Explicit session revocation on logout, password change, account disable, or remote logout
 */
import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";

export const COOKIE_NAME = "cxa_session";
export const SESSION_DURATION_DAYS = 30;
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * SESSION_DURATION_DAYS; // 30 days = 2,592,000s
export const ROLLING_RENEWAL_THRESHOLD_SECONDS = 60 * 60 * 24 * 15; // 15 days = 1,296,000s
export const LAST_SEEN_THROTTLE_MS = 1000 * 60 * 5; // 5 minutes

export interface AuthenticatedUser {
  id: string;
  username: string | null;
  email: string | null;
  role: "OWNER" | "ADMIN" | "TEAM_MEMBER" | string;
  isActive: boolean;
  displayName: string;
  mediaUrl: string | null;
  leadershipPosition?: string | null;
  primaryRole?: string | null;
}

export interface SessionInfo {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  userAgent?: string | null;
  isCurrent: boolean;
}

export type SessionValidationResult =
  | {
      status: "authenticated";
      user: AuthenticatedUser;
      session: {
        id: string;
        expiresAt: Date;
        lastSeenAt: Date | null;
      };
    }
  | {
      status: "unauthenticated";
      reason:
        | "NO_COOKIE"
        | "INVALID_TOKEN"
        | "EXPIRED"
        | "REVOKED"
        | "ACCOUNT_DISABLED";
    }
  | {
      status: "error";
      reason: "DATABASE_UNAVAILABLE";
      error: string;
      requestId: string;
    };

/**
 * Generates a cryptographically secure random session token (32 bytes = 64 hex chars).
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generates a safe diagnostic request ID for auth tracking.
 */
export function generateRequestId(): string {
  return `CXA-AUTH-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

/**
 * Computes SHA-256 hash of a session token for safe storage and lookup.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a persistent 30-day database session and writes the HttpOnly cookie.
 */
export async function createSession(
  userId: string,
  metadata?: { userAgent?: string; ip?: string }
): Promise<string> {
  const token = generateSessionToken();
  const hash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

  // Store hashed session in PostgreSQL
  await db.session.create({
    data: {
      userId,
      sessionTokenHash: hash,
      expiresAt,
      lastSeenAt: now,
      revokedAt: null,
      userAgent: metadata?.userAgent?.slice(0, 255) || null,
      ipHash: metadata?.ip ? hashToken(metadata.ip) : null,
    },
  });

  // Write secure HTTP-only cookie
  try {
    const cookieStore = cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  } catch (err) {
    // In edge cases where cookies() is called outside request scope
    console.error("[createSession cookieStore.set]", err);
  }

  return token;
}

/**
 * Comprehensive session validation returning explicit 3-way status:
 * - "authenticated"
 * - "unauthenticated" (positive reason)
 * - "error" (temporary database / service unavailability)
 *
 * Never collapses database errors into unauthenticated.
 */
export async function validateSessionResult(rawToken?: string | null): Promise<SessionValidationResult> {
  if (!rawToken || typeof rawToken !== "string" || !rawToken.trim()) {
    return { status: "unauthenticated", reason: "NO_COOKIE" };
  }

  let token = rawToken.trim();
  try {
    token = decodeURIComponent(token);
  } catch {}

  const hash = hashToken(token);
  const now = new Date();

  try {
    const session = await db.session.findUnique({
      where: { sessionTokenHash: hash },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!session) {
      return { status: "unauthenticated", reason: "INVALID_TOKEN" };
    }

    // Check if session has been revoked
    if (session.revokedAt) {
      return { status: "unauthenticated", reason: "REVOKED" };
    }

    // Check if session has expired
    if (now > session.expiresAt) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
      return { status: "unauthenticated", reason: "EXPIRED" };
    }

    // Check if user is active
    if (!session.user.isActive) {
      return { status: "unauthenticated", reason: "ACCOUNT_DISABLED" };
    }

    // Rolling session renewal: if fewer than 15 days remain, extend by 30 days
    const remainingMs = session.expiresAt.getTime() - now.getTime();
    const shouldRenew = remainingMs < ROLLING_RENEWAL_THRESHOLD_SECONDS * 1000;
    const shouldUpdateLastSeen =
      !session.lastSeenAt || now.getTime() - session.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS;

    if (shouldRenew || shouldUpdateLastSeen) {
      const newExpiresAt = shouldRenew
        ? new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000)
        : session.expiresAt;

      await db.session
        .update({
          where: { id: session.id },
          data: {
            expiresAt: newExpiresAt,
            lastSeenAt: now,
          },
        })
        .catch((e) => console.warn("[validateSessionResult renewal warning]", e?.message));

      if (shouldRenew) {
        try {
          const cookieStore = cookies();
          cookieStore.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_MAX_AGE_SECONDS,
          });
        } catch {}
      }
    }

    const authUser: AuthenticatedUser = {
      id: session.user.id,
      username: session.user.username ?? null,
      email: session.user.email ?? null,
      role: session.user.role,
      isActive: session.user.isActive,
      displayName:
        session.user.profile?.displayName ??
        session.user.fullName ??
        session.user.username ??
        session.user.email ??
        "Member",
      mediaUrl: session.user.profile?.mediaUrl ?? null,
      leadershipPosition: session.user.profile?.leadershipPosition ?? null,
      primaryRole: session.user.profile?.primaryRole ?? null,
    };

    return {
      status: "authenticated",
      user: authUser,
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
        lastSeenAt: session.lastSeenAt,
      },
    };
  } catch (err: any) {
    const requestId = generateRequestId();
    console.error(`[validateSessionResult Error] [${requestId}]`, {
      code: err?.code,
      message: err?.message,
    });

    return {
      status: "error",
      reason: "DATABASE_UNAVAILABLE",
      error: "Authentication service is temporarily unavailable.",
      requestId,
    };
  }
}

/**
 * Validates a session token from the database, applies rolling renewal if needed,
 * and returns the authenticated user payload (null if unauthenticated or on error).
 */
export async function validateSession(rawToken: string): Promise<AuthenticatedUser | null> {
  const result = await validateSessionResult(rawToken);
  if (result.status === "authenticated") {
    return result.user;
  }
  return null;
}

/**
 * Returns full session result from the request's `cxa_session` cookie.
 */
export async function getCurrentSessionResult(): Promise<SessionValidationResult> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    return validateSessionResult(token);
  } catch (err: any) {
    const requestId = generateRequestId();
    console.error(`[getCurrentSessionResult Error] [${requestId}]`, err?.message);
    return {
      status: "error",
      reason: "DATABASE_UNAVAILABLE",
      error: "Authentication service is temporarily unavailable.",
      requestId,
    };
  }
}

/**
 * Returns the currently authenticated user from the request's `cxa_session` cookie.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const result = await getCurrentSessionResult();
  if (result.status === "authenticated") {
    return result.user;
  }
  return null;
}

/**
 * Destroys a single session by token and clears the `cxa_session` cookie.
 */
export async function destroySession(token?: string): Promise<void> {
  let sessionToken = token;
  try {
    if (!sessionToken) {
      const cookieStore = cookies();
      sessionToken = cookieStore.get(COOKIE_NAME)?.value;
    }
  } catch {}

  if (sessionToken) {
    const hash = hashToken(sessionToken);
    try {
      await db.session.updateMany({
        where: { sessionTokenHash: hash },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Ignore if session already gone
    }
  }

  // Clear cookie
  try {
    const cookieStore = cookies();
    cookieStore.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  } catch {}
}

/**
 * Revokes all active sessions for a user (e.g. on password change, password reset, account disable, or "Log Out All Devices").
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  try {
    await db.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[revokeAllUserSessions Error]", err);
  }
}

/**
 * Returns a list of active sessions for a user.
 */
export async function getUserActiveSessions(userId: string, currentToken?: string): Promise<SessionInfo[]> {
  const currentHash = currentToken ? hashToken(currentToken) : null;
  const now = new Date();

  const sessions = await db.session.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { lastSeenAt: "desc" },
  });

  return sessions.map((s) => ({
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    lastSeenAt: (s.lastSeenAt || s.createdAt).toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    userAgent: s.userAgent || "Unknown Device",
    isCurrent: s.sessionTokenHash === currentHash,
  }));
}

/**
 * Audit log helper
 */
export async function logProfileAction(
  actorUserId: string | null,
  targetUserId: string | null,
  action: string,
  details: string
): Promise<void> {
  await dataStore.logAudit({
    actorId: actorUserId || undefined,
    targetId: targetUserId || undefined,
    action,
    details,
  });
}
