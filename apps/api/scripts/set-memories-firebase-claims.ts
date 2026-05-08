/**
 * Sets Firebase Auth custom claims for Legacy Memories (v0.5 manual onboarding).
 *
 * Prerequisites: Application Default Credentials with permission to edit users
 * (e.g. `gcloud auth application-default login` as a project admin, or a service
 * account key with `roles/firebaseauth.admin`).
 *
 * Usage:
 *   npx tsx scripts/set-memories-firebase-claims.ts <firebase_uid> [--dry-run]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applicationDefault, initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { config as loadEnv } from "dotenv";
import {
  memoriesClientIdFromFirebaseUid,
  memoriesPracticeIdFromFirebaseUid,
  memoriesUserIdFromFirebaseUid,
} from "../src/auth/firebaseClaimUuids.js";

const monorepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
loadEnv({ path: path.join(monorepoRoot, ".env") });

function parseArgs(argv: string[]): { uid: string; dryRun: boolean } | null {
  const rest = argv.slice(2).filter((a) => a !== "--");
  const dryRun = argv.includes("--dry-run");
  const uid = rest[0]?.trim();
  if (!uid) {
    console.error("Usage: set-memories-firebase-claims.ts <firebase_uid> [--dry-run]");
    return null;
  }
  return { uid, dryRun };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  if (!parsed) {
    process.exitCode = 1;
    return;
  }
  const { uid, dryRun } = parsed;

  const practiceId = memoriesPracticeIdFromFirebaseUid(uid);
  const userId = memoriesUserIdFromFirebaseUid(uid);
  const clientId = memoriesClientIdFromFirebaseUid(uid);

  const claims = {
    practice_id: practiceId,
    user_id: userId,
    client_id: clientId,
    client_ids: [clientId],
    roles: ["GUIDE"],
  };

  console.log(
    JSON.stringify(
      {
        firebase_uid: uid,
        custom_claims: claims,
        note: "Postgres UUID columns require stable UUIDs; these are UUID v5 derivations of the Firebase UID (see docs/infrastructure.md).",
      },
      null,
      2,
    ),
  );

  if (dryRun) {
    console.log("--dry-run: not calling Firebase Admin.");
    return;
  }

  if (getApps().length === 0) {
    initializeApp({ credential: applicationDefault() });
  }

  await getAuth().setCustomUserClaims(uid, claims);
  console.log("Custom claims written. Ask the user to sign out and sign in again (or wait for token refresh).");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
