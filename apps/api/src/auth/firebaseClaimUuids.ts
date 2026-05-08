import { createHash } from "node:crypto";

/**
 * Fixed namespace UUID (RFC 4122 UUID v5) for deriving Postgres-compatible UUIDs
 * from Firebase Auth UIDs. Same namespace is used for practice, user, and client
 * rows so operators can reproduce values from a UID without calling Firebase.
 */
export const MEMORIES_FIREBASE_CLAIM_NAMESPACE = "c9bdfa20-7a3b-5c8e-a1f2-4d6e8b0c3a91";

function uuidStringToBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, "");
  if (hex.length !== 32) {
    throw new Error("Invalid namespace UUID.");
  }
  return Buffer.from(hex, "hex");
}

function formatUuidFromBytes(bytes: Buffer): string {
  if (bytes.length !== 16) {
    throw new Error("UUID bytes must be length 16.");
  }
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function uuidV5(name: string, namespaceUuid: string = MEMORIES_FIREBASE_CLAIM_NAMESPACE): string {
  const namespaceBytes = uuidStringToBytes(namespaceUuid);
  const digest = createHash("sha1").update(namespaceBytes).update(name, "utf8").digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return formatUuidFromBytes(bytes);
}

export function memoriesPracticeIdFromFirebaseUid(firebaseUid: string): string {
  return uuidV5(`practice|${firebaseUid.trim()}`);
}

export function memoriesUserIdFromFirebaseUid(firebaseUid: string): string {
  return uuidV5(`user|${firebaseUid.trim()}`);
}

export function memoriesClientIdFromFirebaseUid(firebaseUid: string): string {
  return uuidV5(`client|${firebaseUid.trim()}`);
}
