import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, Analytics, logEvent as firebaseLogEvent } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDZcQ-NecC9S82VhqcIEy5lq1kwbjdKng8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "codxa-agency.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "codxa-agency",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "codxa-agency.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "268559658188",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:268559658188:web:2f9920e7145498240e2669",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-EZQL4W66WR",
};

// Initialize Firebase App singleton across SSR and Client
export const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Analytics singleton instance
let analyticsInstance: Analytics | null = null;

/**
 * Initializes and retrieves the Firebase Analytics instance safely in browser environments.
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (analyticsInstance) {
    return analyticsInstance;
  }

  try {
    const supported = await isSupported();
    if (supported) {
      analyticsInstance = getAnalytics(app);
      return analyticsInstance;
    }
  } catch (err) {
    // Ad-blockers or privacy extensions may block analytics scripts
    if (process.env.NODE_ENV === "development") {
      console.warn("[Firebase] Analytics initialization skipped or blocked:", err);
    }
  }

  return null;
}

/**
 * Helper to log custom analytical events safely
 */
export async function trackEvent(eventName: string, eventParams?: Record<string, any>) {
  try {
    const analytics = await getFirebaseAnalytics();
    if (analytics) {
      firebaseLogEvent(analytics, eventName, eventParams);
    }
  } catch {
    // Silently ignore tracking failures
  }
}

export { analyticsInstance as analytics };
