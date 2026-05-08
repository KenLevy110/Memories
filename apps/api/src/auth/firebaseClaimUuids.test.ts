import { describe, expect, it } from "vitest";
import {
  MEMORIES_FIREBASE_CLAIM_NAMESPACE,
  memoriesClientIdFromFirebaseUid,
  memoriesPracticeIdFromFirebaseUid,
  memoriesUserIdFromFirebaseUid,
  uuidV5,
} from "./firebaseClaimUuids.js";

describe("firebaseClaimUuids", () => {
  it("produces deterministic UUID v5 output for a fixed name and namespace", () => {
    const a = uuidV5("hello", MEMORIES_FIREBASE_CLAIM_NAMESPACE);
    const b = uuidV5("hello", MEMORIES_FIREBASE_CLAIM_NAMESPACE);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("produces stable Memories tenant UUIDs for a Firebase UID", () => {
    const uid = "firebaseUidExample01";
    expect(memoriesPracticeIdFromFirebaseUid(uid)).toBe(
      uuidV5(`practice|${uid}`, MEMORIES_FIREBASE_CLAIM_NAMESPACE),
    );
    expect(memoriesUserIdFromFirebaseUid(uid)).toBe(uuidV5(`user|${uid}`, MEMORIES_FIREBASE_CLAIM_NAMESPACE));
    expect(memoriesClientIdFromFirebaseUid(uid)).toBe(uuidV5(`client|${uid}`, MEMORIES_FIREBASE_CLAIM_NAMESPACE));
    expect(memoriesPracticeIdFromFirebaseUid(uid)).not.toBe(memoriesUserIdFromFirebaseUid(uid));
  });

  it("trims Firebase UID before hashing", () => {
    expect(memoriesPracticeIdFromFirebaseUid("  abc  ")).toBe(memoriesPracticeIdFromFirebaseUid("abc"));
  });
});
