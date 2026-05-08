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
