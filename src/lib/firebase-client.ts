import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User as FirebaseUser,
  Auth
} from "firebase/auth";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDZcQ-NecC9S82VhqcIEy5lq1kwbjdKng8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "codxa-agency.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "codxa-agency",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "codxa-agency.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "268559658188",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:268559658188:web:2f9920e7145498240e2669",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-EZQL4W66WR",
};

// Singleton Firebase Client App initialization
export const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Auth singleton
export const auth: Auth = getAuth(app);

// Google Auth Provider setup
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

/**
 * Sign in using Google OAuth with popup, gracefully falling back to redirect if popup is blocked
 */
export async function signInWithGoogle(): Promise<{ user: FirebaseUser; idToken: string }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    return { user: result.user, idToken };
  } catch (error: any) {
    // If popup is blocked by browser, trigger redirect mode
    if (error?.code === "auth/popup-blocked" || error?.code === "auth/cancelled-popup-request") {
      console.warn("[Firebase] Popup blocked, initiating redirect sign-in flow...");
      await signInWithRedirect(auth, googleProvider);
      // Returns never because redirect navigates away
      throw new Error("REDIRECT_INITIATED");
    }
    throw error;
  }
}

/**
 * Check if the user is returning from a signInWithRedirect flow
 */
export async function handleRedirectResult(): Promise<{ user: FirebaseUser; idToken: string } | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result || !result.user) return null;
    const idToken = await result.user.getIdToken();
    return { user: result.user, idToken };
  } catch (err) {
    console.error("[Firebase] Error resolving redirect result:", err);
    return null;
  }
}

/**
 * Sign out from client-side Firebase Auth
 */
export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn("[Firebase] Error during client signOut:", err);
  }
}
