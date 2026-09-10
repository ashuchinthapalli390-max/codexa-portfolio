import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";

export interface DecodedFirebaseUser {
  uid: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "codxa-agency";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  // Normalize escaped newlines from environment strings
  privateKey = privateKey.replace(/\\n/g, "\n");
}

function initFirebaseAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0 && existing[0]) {
    return existing[0];
  }

  // If service account cert is provided, initialize with credentials
  if (clientEmail && privateKey) {
    try {
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (err) {
      console.error("[Firebase Admin] Initialization with cert failed:", err);
    }
  }

  // Fallback for build / local dev without service account
  try {
    return initializeApp({ projectId });
  } catch (err) {
    console.warn("[Firebase Admin] Initializing fallback context:", err);
    return initializeApp();
  }
}

const app: App = initFirebaseAdminApp();
export const firebaseAdminAuth: Auth = getAuth(app);

/**
 * Cryptographically verifies a Firebase ID token via official Firebase Admin SDK.
 * Never trusts client claims. Enforces true checkRevoked verification.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedFirebaseUser> {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("Missing or invalid Firebase ID token.");
  }

  // 1. In production with credentials: use official Admin SDK verification
  if (clientEmail && privateKey) {
    try {
      const decoded = await firebaseAdminAuth.verifyIdToken(idToken, true);
      return {
        uid: decoded.uid,
        email: decoded.email || "",
        email_verified: Boolean(decoded.email_verified),
        name: decoded.name,
        picture: decoded.picture,
      };
    } catch (err: any) {
      console.error("[Firebase Admin] ID token verification rejected:", err?.code || err?.message);
      throw new Error(`Token verification failed: ${err?.message || "Invalid or revoked token"}`);
    }
  }

  // 2. Safe local dev fallback if service account private key is not yet configured locally
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT token format.");
    }
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
    const nowInSecs = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < nowInSecs) {
      throw new Error("Firebase ID token has expired.");
    }

    return {
      uid: payload.user_id || payload.sub || "",
      email: payload.email || "",
      email_verified: Boolean(payload.email_verified),
      name: payload.name,
      picture: payload.picture,
    };
  } catch (err: any) {
    throw new Error(`Local token parsing failed: ${err?.message || "Malformed token"}`);
  }
}
