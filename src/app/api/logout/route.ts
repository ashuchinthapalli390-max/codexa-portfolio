/**
 * POST /api/logout
 * Destroys user session and clears ALL authentication cookies.
 * Clears both the full session (cxa_session) and any leftover pre-auth (cxa_preauth).
 */
import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cxa_session")?.value;

  if (token) {
    await destroySession(token);
  }

  const res = NextResponse.json({ success: true, message: "Logged out successfully." });

  // Clear pre-auth cookie too if it exists
  res.cookies.set("cxa_preauth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
