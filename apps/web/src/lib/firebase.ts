import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { registerFirebaseIdTokenProvider } from "./api";

let firebaseApp: FirebaseApp | null = null;

function readFirebaseWebConfig(): Record<string, string> | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
  const appId = import.meta.env.VITE_FIREBASE_APP_ID?.trim();
  if (!apiKey || !authDomain || !projectId || !appId) {
    return null;
  }
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim();
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim();
  const config: Record<string, string> = {
    apiKey,
    authDomain,
    projectId,
    appId,
  };
  if (messagingSenderId) {
    config["messagingSenderId"] = messagingSenderId;
  }
  if (storageBucket) {
    config["storageBucket"] = storageBucket;
  }
  return config;
}

export function isFirebaseClientConfigured(): boolean {
  return readFirebaseWebConfig() !== null;
}

export function initFirebaseClient(): void {
  if (firebaseApp) {
    return;
  }
  const config = readFirebaseWebConfig();
  if (!config) {
    return;
  }

  firebaseApp = initializeApp(config);
  registerFirebaseIdTokenProvider(async () => {
    const auth = getAuth(firebaseApp!);
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    return user.getIdToken();
  });
}

export function getFirebaseAuthOrNull() {
  if (!firebaseApp) {
    return null;
  }
  return getAuth(firebaseApp);
}

export function subscribeFirebaseUser(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuthOrNull();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGooglePopup(): Promise<void> {
  const auth = getFirebaseAuthOrNull();
  if (!auth) {
    throw new Error("Firebase Auth is not configured.");
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(auth, provider);
}

export function getFirebaseAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
      ? (error as { code: string }).code
      : null;

  switch (code) {
    case "auth/operation-not-allowed":
      return "Google sign-in is disabled for this Firebase project. Enable Google in Firebase Authentication > Sign-in method and confirm your Hosting domain is listed in Authentication > Settings > Authorized domains.";
    case "auth/unauthorized-domain":
      return "This site domain is not authorized for Firebase sign-in. Add the current domain in Firebase Authentication > Settings > Authorized domains.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in popup. Allow popups for this site and try again.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was canceled before completion.";
    default:
      break;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Sign-in failed.";
}

export async function signOutFirebase(): Promise<void> {
  const auth = getFirebaseAuthOrNull();
  if (!auth) {
    return;
  }
  await signOut(auth);
}

export async function readMemoriesClaims(user: User): Promise<Record<string, unknown>> {
  const result = await user.getIdTokenResult(true);
  return result.claims;
}
