/**
 * Database-backed Session Authentication Utilities for CodeXa
 * Uses crypto-secure tokens, SHA-256 hashes, and HTTP-only cookies
 */
import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE_NAME = "cxa_session";
const SESSION_MAX_AGE_DEFAULT = 60 * 60 * 8; // 8 hours
const SESSION_MAX_AGE_REMEMBER = 60 * 60 * 24 * 7; // 7 days

export interface AuthenticatedUser {
  id: string;
  username: string | null;
  email: string | null;
  role: string;
  isActive: boolean;
  displayName: string;
  mediaUrl: string | null;
}

/**
 * Generate a cryptographically secure random session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash a raw token with SHA-256 to prevent DB leakage attacks
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Create a new session in SQLite and write the cookie
 */
export async function createSession(userId: string, rememberDevice: boolean): Promise<string> {
  const token = generateSessionToken();
  const hash = hashToken(token);
  
  const maxAge = rememberDevice ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_DEFAULT;
  const expiresAt = new Date(Date.now() + maxAge * 1000);

  // Secure SQLite transaction
  await db.session.create({
    data: {
      userId,
      sessionTokenHash: hash,
      expiresAt,
    },
  });

  // Write cookie
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  return token;
}

/**
 * Destroy a session from SQLite and clear the cookie
 */
export async function destroySession(token: string): Promise<void> {
  const hash = hashToken(token);
  try {
    await db.session.delete({
      where: { sessionTokenHash: hash },
    });
  } catch {
    // Ignore if already deleted
  }

  // Clear cookie
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Validate a raw session token against SQLite
 */
export async function validateSession(token: string): Promise<AuthenticatedUser | null> {
  if (!token) return null;
  const hash = hashToken(token);

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

    if (!session) return null;

    // Check expiration
    if (new Date() > session.expiresAt) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    // Check if user is active
    if (!session.user.isActive) {
      return null;
    }

    return {
      id: session.user.id,
      username: session.user.username ?? null,
      email: session.user.email ?? null,
      role: session.user.role,
      isActive: session.user.isActive,
      displayName: session.user.profile?.displayName ?? session.user.username ?? session.user.email ?? session.user.id,
      mediaUrl: session.user.profile?.mediaUrl ?? null,
    };
  } catch (err) {
    console.error("[validateSession] Error validating session:", err);
    return null;
  }
}

/**
 * Helper to get the current authenticated user in Server Actions & API Handlers
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return validateSession(token);
}

/**
 * Helper to write to ProfileAuditLog
 */
export async function logProfileAction(
  actorUserId: string | null,
  targetUserId: string | null,
  action: string,
  details: string
): Promise<void> {
  try {
    await db.profileAuditLog.create({
      data: {
        actorUserId,
        targetUserId,
        action,
        details,
      },
    });
  } catch (err) {
    console.error("[logProfileAction] Error logging audit action:", err);
  }
}
