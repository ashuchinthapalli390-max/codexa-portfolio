/**
 * POST /api/login
 * Step 2 of two-step login.
 *
 * Requires a valid pre-auth cookie (from /api/auth/verify-key).
 * Accepts username/email + password, verifies credentials, creates full session.
 * On success: deletes pre-auth session and creates authenticated session cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

const PREAUTH_COOKIE = "cxa_preauth";

async function validatePreAuth(req: NextRequest): Promise<{
  userId: string;
  role: string;
  preAuthId: string;
} | null> {
  const rawToken = req.cookies.get(PREAUTH_COOKIE)?.value;
  if (!rawToken) return null;

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  try {
    const preAuth = await db.preAuthSession.findUnique({
      where: { tokenHash },
    });

    if (!preAuth) return null;
    if (new Date() > preAuth.expiresAt) {
      await db.preAuthSession.delete({ where: { id: preAuth.id } }).catch(() => {});
      return null;
    }

    return { userId: preAuth.userId, role: preAuth.role, preAuthId: preAuth.id };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // Step 1: Validate pre-auth token
  const preAuth = await validatePreAuth(req);
  if (!preAuth) {
    return NextResponse.json(
      { error: "Access key verification required before login." },
      { status: 403 }
    );
  }

  let body: {
    username?: string;
    email?: string;
    password?: string;
    rememberDevice?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { password, rememberDevice = false } = body;
  const identifier = (body.email || body.username || "").toLowerCase().trim();

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "Credentials required." },
      { status: 400 }
    );
  }

  const dummyHash = "$2b$12$invalidhashfordummycomparisononlytodisabletimingattacks";

  try {
    // Look up user by the preAuth userId (most secure — key already bound to user)
    const user = await db.user.findUnique({
      where: { id: preAuth.userId },
    });

    const userHash = user ? user.passwordHash : dummyHash;
    const isMatch = await bcrypt.compare(password, userHash);

    // Ensure the provided identifier matches the user
    const identifierMatches =
      user &&
      (user.email?.toLowerCase() === identifier ||
        user.username?.toLowerCase() === identifier);

    if (!user || !isMatch || !user.isActive || !identifierMatches) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Delete the pre-auth session — it's single-use
    await db.preAuthSession.delete({ where: { id: preAuth.preAuthId } }).catch(() => {});

    // Create full authenticated session
    await createSession(user.id, rememberDevice);

    // Clear pre-auth cookie
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, role: user.role },
    });
    response.cookies.set(PREAUTH_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("[POST /api/login] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
