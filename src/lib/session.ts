/**
 * iron-session configuration for CodeXa Admin System
 * Creates HTTP-only, Secure, SameSite=Lax session cookies
 * Keys are NEVER stored in localStorage, client JS, or URLs
 */
import { SessionOptions } from "iron-session";

export interface AdminSessionData {
  /** ID of the validated AdminAccessKey record */
  keyId?: string;
  /** Role granted by the access key */
  role?: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
  /** Whether the access key verification step is complete */
  accessGranted?: boolean;
  /** ID of the logged-in AdminUser (after email+password login) */
  userId?: string;
  /** Whether the full login flow is complete */
  authenticated?: boolean;
  /** Whether this device is remembered (longer session) */
  rememberDevice?: boolean;
}

const secret = process.env.AUTH_SECRET || process.env.SESSION_SECRET || "f64885a6961a18819401e01e914e56de0c49ab1ace20404ba63f2c3a3b153323";

export const sessionOptions: SessionOptions = {
  password: secret,
  cookieName: "cxa_admin_sess",
  cookieOptions: {
    // secure: true — only send over HTTPS (Next.js handles this in production)
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    // 8 hours default session, 7 days if "remember device"
    maxAge: 60 * 60 * 8,
  },
};

export const REMEMBER_DEVICE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
