/**
 * Database-backed Session Authentication Utilities for CodeXa
 * Uses crypto-secure tokens, SHA-256 hashes, and HTTP-only cookies.
 */
import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";

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

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, rememberDevice: boolean = true): Promise<string> {
  const token = generateSessionToken();
  const hash = hashToken(token);
  
  const maxAge = rememberDevice ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_DEFAULT;
  const expiresAt = new Date(Date.now() + maxAge * 1000);

  // Store in PostgreSQL database
  await db.session.create({
    data: {
      userId,
      sessionTokenHash: hash,
      expiresAt,
    },
  });

  // Write secure HTTP-only cookie
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

export async function destroySession(token: string): Promise<void> {
  const hash = hashToken(token);

  try {
    await db.session.deleteMany({
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

export async function validateSession(rawToken: string): Promise<AuthenticatedUser | null> {
  if (!rawToken) return null;

  let token = rawToken;
  try {
    token = decodeURIComponent(rawToken);
  } catch {}

  // Support JSON-encoded session cookie from 2-Stage OTP verification
  if (token.startsWith("{") && token.endsWith("}")) {
    try {
      const parsed = JSON.parse(token);
      if (parsed.id) {
        const profile = await dataStore.getProfileById(parsed.id);
        if (profile && profile.isActive) {
          return {
            id: profile.id,
            username: profile.username,
            email: profile.email,
            role: profile.role,
            isActive: profile.isActive,
            displayName: profile.displayName,
            mediaUrl: profile.mediaUrl ?? null,
          };
        }
      }
    } catch {
      // ignore JSON parse error
    }
  }

  const hash = hashToken(token);

  // Validate from PostgreSQL DB
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

    if (session) {
      if (new Date() > session.expiresAt) {
        await db.session.delete({ where: { id: session.id } }).catch(() => {});
        return null;
      }
      if (!session.user.isActive) return null;

      return {
        id: session.user.id,
        username: session.user.username ?? null,
        email: session.user.email ?? null,
        role: session.user.role,
        isActive: session.user.isActive,
        displayName: session.user.profile?.displayName ?? session.user.username ?? session.user.email ?? session.user.id,
        mediaUrl: session.user.profile?.mediaUrl ?? null,
      };
    }
  } catch (err) {
    console.error("[validateSession Error]", err);
  }

  return null;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return validateSession(token);
}

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
