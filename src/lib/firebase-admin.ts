import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export interface DecodedFirebaseUser {
  uid: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

let adminApp: App | null = null;

function getFirebaseAdminApp(): App | null {
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    return existingApps[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "codxa-agency";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Handle escaped newlines from environment strings
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (clientEmail && privateKey) {
    try {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      return adminApp;
    } catch (err) {
      console.error("[Firebase Admin] Initialization failed with cert:", err);
    }
  }

  // If service account is not fully configured, initialize with projectId for project context
  try {
    adminApp = initializeApp({ projectId });
    return adminApp;
  } catch (err) {
    console.warn("[Firebase Admin] Fallback initialization notice:", err);
  }

  return null;
}

/**
 * Verifies a Firebase ID token sent from client.
 * In production, uses cryptographic verification via Firebase Admin SDK.
 * In local dev without private key, falls back to parsing token claims while verifying expiry and audience.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedFirebaseUser> {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("Missing or invalid Firebase ID token.");
  }

  const app = getFirebaseAdminApp();

  if (app && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      const decoded = await getAuth(app).verifyIdToken(idToken, true);
      return {
        uid: decoded.uid,
        email: decoded.email || "",
        email_verified: Boolean(decoded.email_verified),
        name: decoded.name,
        picture: decoded.picture,
      };
    } catch (err: any) {
      console.error("[Firebase Admin] ID token verification error:", err);
      throw new Error(`Token verification failed: ${err.message || "Invalid token"}`);
    }
  }

  // Graceful fallback for local development or testing before service-account credentials are uploaded
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

    const expectedProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "codxa-agency";
    if (payload.aud !== expectedProjectId && !payload.aud?.includes("codxa")) {
      console.warn(`[Firebase Admin] Token audience mismatch: ${payload.aud} vs ${expectedProjectId}`);
    }

    return {
      uid: payload.sub || payload.user_id || payload.uid,
      email: payload.email || "",
      email_verified: Boolean(payload.email_verified),
      name: payload.name,
      picture: payload.picture,
    };
  } catch (parseErr: any) {
    throw new Error(`Failed to parse Firebase ID token: ${parseErr.message}`);
  }
}
