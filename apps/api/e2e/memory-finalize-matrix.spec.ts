import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import type { InMemoryApiHarness } from "../src/testing/inMemoryAppHarness.js";
import { createInMemoryApiHarness } from "../src/testing/inMemoryAppHarness.js";

test.describe("T8 manual matrix: memory finalize over HTTP (development-plan 12.5)", () => {
  let harness: InMemoryApiHarness;
  let baseUrl: string;

  test.beforeAll(async () => {
    harness = await createInMemoryApiHarness();
    await harness.app.listen({ port: 0, host: "127.0.0.1" });
    const address = harness.app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind in-memory API for Playwright.");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  test.afterAll(async () => {
    await harness.dispose();
  });

  test("same Idempotency-Key twice returns the same memory_id", async ({ request }) => {
    const clientId = "154f0bd6-bcdf-43b7-9f8f-fc2de7b59fe4";
    const practiceId = "f4cc930e-f9db-4a35-b4d2-e4f9f6f05704";
    const imageMediaId = randomUUID();
    const audioMediaId = randomUUID();
    const token = await harness.createToken({
      user_id: "a3f1a2a8-cf05-4794-a521-fb8bd7f06745",
      practice_id: practiceId,
      client_id: clientId,
      roles: ["GUIDE"],
    });

    const payload = {
      title: "Grandma story",
      room: "Room 101",
      body: "A short memory",
      media: [
        {
          media_id: imageMediaId,
          type: "image",
          storage_key: `${practiceId}/uploads/images/${imageMediaId}`,
          mime_type: "image/jpeg",
          byte_size: 120_000,
          sort_order: 0,
        },
        {
          media_id: audioMediaId,
          type: "audio",
          storage_key: `${practiceId}/uploads/audio/${audioMediaId}`,
          mime_type: "audio/webm",
          byte_size: 220_000,
          sort_order: 1,
        },
      ],
    };

    const url = `${baseUrl}/api/v1/clients/${clientId}/memories`;
    const headers = {
      authorization: `Bearer ${token}`,
      "idempotency-key": "e2e-idem-t8-replay",
    };

    const first = await request.post(url, { headers, data: payload });
    const second = await request.post(url, { headers, data: payload });

    expect(first.status()).toBe(200);
    expect(second.status()).toBe(200);
    const firstBody = (await first.json()) as { memory: { memory_id: string } };
    const secondBody = (await second.json()) as { memory: { memory_id: string } };
    expect(secondBody.memory.memory_id).toBe(firstBody.memory.memory_id);
  });

  test("finalize with more than one image returns 400", async ({ request }) => {
    const clientId = "f2e22495-16e5-414f-9b15-9f1f1669a56f";
    const practiceId = "77190dae-84bf-4a2f-b7f4-65073b26122b";
    const firstImageId = randomUUID();
    const secondImageId = randomUUID();
    const token = await harness.createToken({
      user_id: "3c5ea224-0b96-4e94-b29f-768de7be2afb",
      practice_id: practiceId,
      client_id: clientId,
      roles: ["GUIDE"],
    });

    const res = await request.post(`${baseUrl}/api/v1/clients/${clientId}/memories`, {
      headers: {
        authorization: `Bearer ${token}`,
        "idempotency-key": "e2e-idem-t8-too-many-images",
      },
      data: {
        title: "Too many photos",
        media: [
          {
            media_id: firstImageId,
            type: "image",
            storage_key: `${practiceId}/uploads/images/${firstImageId}`,
            mime_type: "image/png",
            byte_size: 100_000,
          },
          {
            media_id: secondImageId,
            type: "image",
            storage_key: `${practiceId}/uploads/images/${secondImageId}`,
            mime_type: "image/png",
            byte_size: 100_000,
          },
        ],
      },
    });

    expect(res.status()).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  test("finalize with more than one audio returns 400", async ({ request }) => {
    const clientId = "c4a8b2e1-6f3a-4d2c-9e1b-0a7f6d5c4b3a";
    const practiceId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
    const firstAudioId = randomUUID();
    const secondAudioId = randomUUID();
    const token = await harness.createToken({
      user_id: "b2c3d4e5-f6a7-4890-b123-456789abcdef",
      practice_id: practiceId,
      client_id: clientId,
      roles: ["GUIDE"],
    });

    const res = await request.post(`${baseUrl}/api/v1/clients/${clientId}/memories`, {
      headers: {
        authorization: `Bearer ${token}`,
        "idempotency-key": "e2e-idem-t8-too-many-audios",
      },
      data: {
        title: "Too many clips",
        media: [
          {
            media_id: firstAudioId,
            type: "audio",
            storage_key: `${practiceId}/uploads/audio/${firstAudioId}`,
            mime_type: "audio/webm",
            byte_size: 100_000,
          },
          {
            media_id: secondAudioId,
            type: "audio",
            storage_key: `${practiceId}/uploads/audio/${secondAudioId}`,
            mime_type: "audio/webm",
            byte_size: 100_000,
          },
        ],
      },
    });

    expect(res.status()).toBe(400);
    const body = (await res.json()) as { code: string; message: string };
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.message).toContain("At most one audio");
  });
});
