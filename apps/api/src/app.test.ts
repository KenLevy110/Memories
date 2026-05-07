import { randomUUID } from "node:crypto";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { JWTPayload } from "jose";
import type { InMemoryApiHarness } from "./testing/inMemoryAppHarness.js";
import { createInMemoryApiHarness } from "./testing/inMemoryAppHarness.js";

describe("api auth shell", () => {
  let harness: InMemoryApiHarness;
  let app: InMemoryApiHarness["app"];
  let createToken: InMemoryApiHarness["createToken"];
  let signedImageUploadUrl: string;
  let signedAudioUploadUrl: string;
  let signedPlaybackReadUrl: string;
  let allowedPlaybackMediaId: string;
  let deniedPlaybackMediaId: string;
  let allowedPlaybackMemoryId: string;
  let deniedPlaybackMemoryId: string;
  let playbackPracticeId: string;
  let playbackClientId: string;
  let hiddenClientId: string;

  beforeAll(async () => {
    harness = await createInMemoryApiHarness();
    app = harness.app;
    createToken = harness.createToken;
    signedImageUploadUrl = harness.signedImageUploadUrl;
    signedAudioUploadUrl = harness.signedAudioUploadUrl;
    signedPlaybackReadUrl = harness.signedPlaybackReadUrl;
    allowedPlaybackMediaId = harness.allowedPlaybackMediaId;
    deniedPlaybackMediaId = harness.deniedPlaybackMediaId;
    allowedPlaybackMemoryId = harness.allowedPlaybackMemoryId;
    deniedPlaybackMemoryId = harness.deniedPlaybackMemoryId;
    playbackPracticeId = harness.playbackPracticeId;
    playbackClientId = harness.playbackClientId;
    hiddenClientId = harness.hiddenClientId;
  });

  afterAll(async () => {
    await harness.dispose();
  });

  it("returns ok for /health without auth", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["x-health-probe"]).toBe("legacy-api");
    const body = JSON.parse(res.body) as { status: string; service: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("legacy-api");
  });

  it("supports HEAD /health for load balancer probes", async () => {
    const res = await app.inject({ method: "HEAD", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["x-health-probe"]).toBe("legacy-api");
  });

  it("accepts dev upload sink PUT without bearer token when NODE_ENV is not production", async () => {
    const practiceId = "11111111-1111-4111-8111-111111111111";
    const mediaId = "22222222-2222-4222-8222-222222222222";
    const res = await app.inject({
      method: "PUT",
      url: `/${practiceId}/uploads/images/${mediaId}`,
      headers: {
        "content-type": "image/jpeg",
        origin: "http://localhost:5173",
      },
      payload: Buffer.from([0xff, 0xd8, 0xff]),
    });
    expect(res.statusCode).toBe(204);
    expect(res.body).toBe("");
    expect(res.headers["access-control-allow-private-network"]).toBe("true");
  });

  it("returns Access-Control-Allow-Private-Network on upload sink OPTIONS when requested", async () => {
    const practiceId = "11111111-1111-4111-8111-111111111111";
    const mediaId = "22222222-2222-4222-8222-222222222222";
    const res = await app.inject({
      method: "OPTIONS",
      url: `/${practiceId}/uploads/images/${mediaId}`,
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "PUT",
        "access-control-request-headers": "content-type",
        "access-control-request-private-network": "true",
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-private-network"]).toBe("true");
  });

  it("reflects loopback Origin for CORS when NODE_ENV is not production (arbitrary Vite port)", async () => {
    const res = await app.inject({
      method: "OPTIONS",
      url: "/11111111-1111-4111-8111-111111111111/uploads/images/22222222-2222-4222-8222-222222222222",
      headers: {
        origin: "http://localhost:5999",
        "access-control-request-method": "PUT",
        "access-control-request-headers": "content-type",
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5999");
  });

  it("reflects RFC1918 LAN Origin for upload sink CORS when NODE_ENV is not production", async () => {
    const practiceId = "11111111-1111-4111-8111-111111111111";
    const mediaId = "22222222-2222-4222-8222-222222222222";
    const res = await app.inject({
      method: "OPTIONS",
      url: `/${practiceId}/uploads/images/${mediaId}`,
      headers: {
        origin: "http://192.168.55.44:5173",
        "access-control-request-method": "PUT",
        "access-control-request-headers": "content-type",
        "access-control-request-private-network": "true",
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://192.168.55.44:5173");
    expect(res.headers["access-control-allow-private-network"]).toBe("true");
  });

  it("reflects CORS Allow-Origin from Referer when Origin is omitted (upload sink preflight)", async () => {
    const practiceId = "11111111-1111-4111-8111-111111111111";
    const mediaId = "22222222-2222-4222-8222-222222222222";
    const res = await app.inject({
      method: "OPTIONS",
      url: `/${practiceId}/uploads/images/${mediaId}`,
      headers: {
        referer: "http://localhost:5173/clients/00000000-0000-4000-8000-000000000001/capture",
        "access-control-request-method": "PUT",
        "access-control-request-headers": "content-type",
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(res.headers.vary?.toLowerCase()).toContain("referer");
  });

  it("reflects CORS Allow-Origin from Referer on upload sink PUT when Origin is omitted", async () => {
    const practiceId = "11111111-1111-4111-8111-111111111111";
    const mediaId = "22222222-2222-4222-8222-222222222222";
    const res = await app.inject({
      method: "PUT",
      url: `/${practiceId}/uploads/images/${mediaId}`,
      headers: {
        "content-type": "image/jpeg",
        referer: "http://localhost:5173/",
      },
      payload: Buffer.from([0xff, 0xd8, 0xff]),
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(res.headers["access-control-allow-private-network"]).toBe("true");
  });

  it("allows wildcard CORS on upload sink preflight when Origin and Referer are missing", async () => {
    const practiceId = "11111111-1111-4111-8111-111111111111";
    const mediaId = "22222222-2222-4222-8222-222222222222";
    const res = await app.inject({
      method: "OPTIONS",
      url: `/${practiceId}/uploads/images/${mediaId}`,
      headers: {
        "access-control-request-method": "PUT",
        "access-control-request-headers": "content-type",
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    expect(res.headers["access-control-allow-methods"]).toMatch(/PUT/);
  });

  it("allows wildcard CORS on upload sink PUT when Origin and Referer are missing", async () => {
    const practiceId = "11111111-1111-4111-8111-111111111111";
    const mediaId = "22222222-2222-4222-8222-222222222222";
    const res = await app.inject({
      method: "PUT",
      url: `/${practiceId}/uploads/images/${mediaId}`,
      headers: {
        "content-type": "image/jpeg",
      },
      payload: Buffer.from([0xff, 0xd8, 0xff]),
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    expect(res.headers["access-control-allow-private-network"]).toBe("true");
  });

  it("responds to CORS preflight for an allowed web origin without a bearer token", async () => {
    const res = await app.inject({
      method: "OPTIONS",
      url: `/api/v1/clients/${playbackClientId}/memories`,
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "GET",
        "access-control-request-headers": "authorization",
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(res.headers["access-control-allow-methods"]).toMatch(/GET/);
    expect(res.headers["access-control-allow-headers"]?.toLowerCase()).toContain("authorization");
  });

  it("adds CORS headers to authenticated API responses for an allowed origin", async () => {
    const token = await createToken();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1",
      headers: {
        authorization: `Bearer ${token}`,
        origin: "http://127.0.0.1:5173",
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:5173");
  });

  it("returns 401 for unsigned /api/v1 requests", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1",
      headers: { "x-request-id": "req-unauth" },
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body) as {
      code: string;
      message: string;
      request_id: string;
    };
    expect(body.code).toBe("UNAUTHORIZED");
    expect(body.request_id).toBe("req-unauth");
  });

  it("does not reflect overlong request ids", async () => {
    const overlongRequestId = "x".repeat(129);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1",
      headers: { "x-request-id": overlongRequestId },
    });

    expect(res.statusCode).toBe(401);
    expect(res.headers["x-request-id"]).not.toBe(overlongRequestId);
    const body = JSON.parse(res.body) as { request_id: string };
    expect(body.request_id).not.toBe(overlongRequestId);
    expect(body.request_id.length).toBeLessThanOrEqual(128);
  });

  it("returns 401 for invalid bearer token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1",
      headers: {
        authorization: "Bearer definitely-not-a-jwt",
      },
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("accepts valid JWT signed by mocked JWKS", async () => {
    const token = await createToken({
      user_id: "a6ba3030-d9ca-42f7-8c8e-e6ec4c478200",
      practice_id: "4ef4febe-b026-439d-abd9-d6477b4870f6",
      client_id: "8f9512d8-e88f-4f82-a8e9-6cb19a43ad52",
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1",
      headers: {
        authorization: `Bearer ${token}`,
        "x-request-id": "req-valid",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-request-id"]).toBe("req-valid");
    const body = JSON.parse(res.body) as { status: string; version: string };
    expect(body.status).toBe("ok");
    expect(body.version).toBe("v1");
  });

  it("allows client route when token has matching client_id scope", async () => {
    const token = await createToken({
      user_id: "f4f40313-8c11-43f5-9e25-2ec8248a64f6",
      practice_id: "6d515776-d744-4c86-a233-6b7f3e90d11c",
      client_id: "ab8ca243-4898-4bcb-a8b6-28238b1165dc",
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/test/clients/ab8ca243-4898-4bcb-a8b6-28238b1165dc/memories",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it("returns 403 for cross-client access", async () => {
    const token = await createToken({
      user_id: "b7ca675d-17df-4461-a53a-9d73d38f8b87",
      practice_id: "f62a635a-897d-4cea-ad34-7ce401691e3b",
      client_id: "71c5f754-f6c8-4645-a924-c8cc6385178c",
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/test/clients/f8aeed9c-97be-44eb-b13e-1a7d99b0dc0c/memories",
      headers: {
        authorization: `Bearer ${token}`,
        "x-request-id": "req-cross-client-deny",
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body) as {
      code: string;
      message: string;
      request_id: string;
    };
    expect(body.code).toBe("FORBIDDEN");
    expect(body.message).toBe("Insufficient permissions for requested resource.");
    expect(body.request_id).toBe("req-cross-client-deny");
  });

  it("allows guide token with client_ids list for scoped access", async () => {
    const token = await createToken({
      user_id: "5fd44f16-5cd4-4c63-af31-f8e1e4c87d56",
      practice_id: "5ba2d21a-c8d8-497b-bf7d-84ef4f8b2eea",
      client_ids: [
        "d7ec89db-84d8-4ae4-a845-f60f8bcc2db4",
        "e6d8de95-a06c-4c4f-ad46-1c5cc89bb85f",
      ],
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/test/clients/e6d8de95-a06c-4c4f-ad46-1c5cc89bb85f/memories/6a7a4232-0f92-4f15-8237-911658b85c42",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it("returns 403 when CLIENT_SELF token is not narrow", async () => {
    const token = await createToken({
      user_id: "8cb74206-5adf-4e4b-9e9d-d7a8d2cb0f2a",
      practice_id: "ffcc8f17-f68f-4cf8-b7df-5c94f7648f27",
      client_id: "52f35ae1-7024-4de6-96f5-7f5bf8acaf91",
      client_ids: [
        "52f35ae1-7024-4de6-96f5-7f5bf8acaf91",
        "452bf379-a590-4682-99f0-045f4cab9fb4",
      ],
      roles: ["CLIENT_SELF"],
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/test/clients/52f35ae1-7024-4de6-96f5-7f5bf8acaf91/memories",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns 403 for memory route without clientId path binding", async () => {
    const token = await createToken({
      user_id: "5f08686b-4cb9-45c9-b4d2-5f68e5ce52dd",
      practice_id: "f5944ef4-4d4f-497f-b4d0-bbf7d67d65d1",
      client_id: "a5e5482f-7698-4e2f-a4eb-72c9252f5f37",
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/test/memories/c5e0926f-eeb8-49f8-808d-63f8862eb373",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns signed image upload URL for allowed mime and size", async () => {
    const token = await createToken({
      user_id: "bdaf5f58-c38a-4f4a-91e5-d8dff7f40a81",
      practice_id: "d5f8f8d6-3128-4ac2-9fe9-79e3ba0ceeba",
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/uploads/images/sign",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mime_type: "image/jpeg",
        byte_size: 512_000,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      media_id: string;
      storage_key: string;
      upload_url: string;
      upload_method: string;
      required_headers: Record<string, string>;
    };
    expect(body.media_id.length).toBeGreaterThan(0);
    expect(body.storage_key).toContain("d5f8f8d6-3128-4ac2-9fe9-79e3ba0ceeba/uploads/images/");
    expect(body.upload_url).toBe(signedImageUploadUrl);
    expect(body.upload_method).toBe("PUT");
    expect(body.required_headers["content-type"]).toBe("image/jpeg");
  });

  it("returns 400 for disallowed image mime type", async () => {
    const token = await createToken({
      user_id: "52f47ac5-40d7-4fbd-b311-3aa7124f3770",
      practice_id: "dfdf0043-9f0d-45a0-8de0-d351793f26c2",
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/uploads/images/sign",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mime_type: "image/gif",
        byte_size: 100_000,
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("returns signed image upload URL for image/avif", async () => {
    const token = await createToken({
      user_id: "c01f72aa-6f01-4d01-b601-4d017201f72a",
      practice_id: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/uploads/images/sign",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mime_type: "image/avif",
        byte_size: 120_000,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { required_headers: Record<string, string> };
    expect(body.required_headers["content-type"]).toBe("image/avif");
  });

  it("returns signed image upload URL for image/bmp and image/x-ms-bmp", async () => {
    const token = await createToken({
      user_id: "b0b0b0b0-b0b0-40b0-b0b0-b0b0b0b0b0b0",
      practice_id: "c1c1c1c1-c1c1-41c1-c1c1-c1c1c1c1c1c1",
      roles: ["GUIDE"],
    });

    const bmp = await app.inject({
      method: "POST",
      url: "/api/v1/uploads/images/sign",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mime_type: "image/bmp",
        byte_size: 40_000,
      },
    });
    expect(bmp.statusCode).toBe(200);
    expect(
      JSON.parse(bmp.body) as { required_headers: Record<string, string> },
    ).toMatchObject({
      required_headers: { "content-type": "image/bmp" },
    });

    const msBmp = await app.inject({
      method: "POST",
      url: "/api/v1/uploads/images/sign",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mime_type: "image/x-ms-bmp",
        byte_size: 40_000,
      },
    });
    expect(msBmp.statusCode).toBe(200);
    expect(
      JSON.parse(msBmp.body) as { required_headers: Record<string, string> },
    ).toMatchObject({
      required_headers: { "content-type": "image/x-ms-bmp" },
    });
  });

  it("returns 400 when image size exceeds configured limit", async () => {
    const token = await createToken({
      user_id: "fd313a5f-1068-4a92-a855-0be3418fd852",
      practice_id: "8cf4f445-2ecf-441a-b613-dbb2fbc791d7",
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/uploads/images/sign",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mime_type: "image/png",
        byte_size: 2_000_001,
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe("IMAGE_TOO_LARGE");
  });

  it("returns 403 for image signing when practice scope is missing", async () => {
    const token = await createToken({
      user_id: "d16b7f72-31e8-44db-8af1-8f0a81355c6d",
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/uploads/images/sign",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mime_type: "image/webp",
        byte_size: 200_000,
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns 403 for image signing when role is not allowed to mutate", async () => {
    const token = await createToken({
      user_id: "fcc4f596-68e8-4449-bab9-2dfdc1f2f763",
      practice_id: "9de5830f-61f9-402e-9e33-b37e45d7d762",
      client_id: "e7bf4cd7-c1ae-40f9-b3a2-c9f57f6c49fa",
      roles: ["CLIENT_SELF"],
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/uploads/images/sign",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mime_type: "image/jpeg",
        byte_size: 100_000,
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns signed audio upload URL for allowed mime and size", async () => {
    const token = await createToken({
      user_id: "26be31ac-1673-4e3d-a66d-e0b2f0fef9a9",
      practice_id: "2f88ca9f-3567-48a8-a0d7-f0d2f6c0db5f",
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/uploads/audio/sign",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mime_type: "audio/webm;codecs=opus",
        byte_size: 5_500_000,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      media_id: string;
      storage_key: string;
      upload_url: string;
      upload_method: string;
      required_headers: Record<string, string>;
    };
    expect(body.media_id.length).toBeGreaterThan(0);
    expect(body.storage_key).toContain("2f88ca9f-3567-48a8-a0d7-f0d2f6c0db5f/uploads/audio/");
    expect(body.upload_url).toBe(signedAudioUploadUrl);
    expect(body.upload_method).toBe("PUT");
    expect(body.required_headers["content-type"]).toBe("audio/webm");
  });

  it("returns 400 for disallowed audio mime type", async () => {
    const token = await createToken({
      user_id: "42d41548-6775-4f24-8e87-fb53b380eeb5",
      practice_id: "55ee0254-b26d-4ca5-b0db-0eb4bb8e2bd8",
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/uploads/audio/sign",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mime_type: "video/mp4",
        byte_size: 100_000,
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("returns 400 when audio size exceeds configured limit", async () => {
    const token = await createToken({
      user_id: "6d0c6595-c93f-46c3-9f17-2063617dc108",
      practice_id: "4de3c6e6-0998-4c26-990e-0f034f7ca3de",
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/uploads/audio/sign",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mime_type: "audio/mp4",
        byte_size: 6_000_001,
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe("AUDIO_TOO_LARGE");
  });

  it("returns 403 for audio signing when practice scope is missing", async () => {
    const token = await createToken({
      user_id: "445c2f59-2f13-4fbc-9c13-d9128f5be6ff",
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/uploads/audio/sign",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mime_type: "audio/mp4",
        byte_size: 500_000,
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns signed read URL for media in caller scope", async () => {
    const token = await createToken({
      user_id: "2c71a5a7-3025-4a9a-ab11-4c91b1d4a2f9",
      practice_id: playbackPracticeId,
      client_id: playbackClientId,
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/memory-media/${allowedPlaybackMediaId}/sign-read`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      media_id: string;
      memory_id: string;
      read_url: string;
      read_method: string;
      mime_type: string;
    };
    expect(body.media_id).toBe(allowedPlaybackMediaId);
    expect(body.memory_id).toBe(allowedPlaybackMemoryId);
    expect(body.read_url).toBe(signedPlaybackReadUrl);
    expect(body.read_method).toBe("GET");
    expect(body.mime_type).toBe("audio/webm");
  });

  it("returns 400 for playback sign-read with invalid mediaId format", async () => {
    const token = await createToken({
      user_id: "99104e83-ee4a-4ea3-b2da-85f48a4bb844",
      practice_id: playbackPracticeId,
      client_id: playbackClientId,
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/memory-media/not-a-uuid/sign-read",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 403 when playback media is outside caller client scope", async () => {
    const token = await createToken({
      user_id: "db83fd9f-736e-4677-a6f9-e8cdacdcc1af",
      practice_id: playbackPracticeId,
      client_id: playbackClientId,
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/memory-media/${deniedPlaybackMediaId}/sign-read`,
      headers: {
        authorization: `Bearer ${token}`,
        "x-request-id": "req-playback-denied",
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body) as { code: string; request_id: string };
    expect(body.code).toBe("FORBIDDEN");
    expect(body.request_id).toBe("req-playback-denied");
  });

  it("replays finalize create by idempotency key with the same memory id", async () => {
    const clientId = "154f0bd6-bcdf-43b7-9f8f-fc2de7b59fe4";
    const practiceId = "f4cc930e-f9db-4a35-b4d2-e4f9f6f05704";
    const imageMediaId = randomUUID();
    const audioMediaId = randomUUID();
    const token = await createToken({
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

    const first = await app.inject({
      method: "POST",
      url: `/api/v1/clients/${clientId}/memories`,
      headers: {
        authorization: `Bearer ${token}`,
        "idempotency-key": "idem-t8-replay",
      },
      payload,
    });
    const second = await app.inject({
      method: "POST",
      url: `/api/v1/clients/${clientId}/memories`,
      headers: {
        authorization: `Bearer ${token}`,
        "idempotency-key": "idem-t8-replay",
      },
      payload,
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    const firstBody = JSON.parse(first.body) as { memory: { memory_id: string } };
    const secondBody = JSON.parse(second.body) as { memory: { memory_id: string } };
    expect(secondBody.memory.memory_id).toBe(firstBody.memory.memory_id);
  });

  it("returns 400 when finalize includes more than one image", async () => {
    const clientId = "f2e22495-16e5-414f-9b15-9f1f1669a56f";
    const practiceId = "77190dae-84bf-4a2f-b7f4-65073b26122b";
    const firstImageId = randomUUID();
    const secondImageId = randomUUID();
    const token = await createToken({
      user_id: "3c5ea224-0b96-4e94-b29f-768de7be2afb",
      practice_id: practiceId,
      client_id: clientId,
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/clients/${clientId}/memories`,
      headers: {
        authorization: `Bearer ${token}`,
        "idempotency-key": "idem-t8-too-many-images",
      },
      payload: {
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

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when finalize includes more than one audio", async () => {
    const clientId = "c4a8b2e1-6f3a-4d2c-9e1b-0a7f6d5c4b3a";
    const practiceId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
    const firstAudioId = randomUUID();
    const secondAudioId = randomUUID();
    const token = await createToken({
      user_id: "b2c3d4e5-f6a7-4890-b123-456789abcdef",
      practice_id: practiceId,
      client_id: clientId,
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/clients/${clientId}/memories`,
      headers: {
        authorization: `Bearer ${token}`,
        "idempotency-key": "idem-t8-too-many-audios",
      },
      payload: {
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

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { code: string; message: string };
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.message).toContain("At most one audio");
  });

  it("returns 400 when finalize media storage_key is tampered", async () => {
    const clientId = "a1d6c9ac-566a-4f95-b8ef-a3d8f0152f44";
    const practiceId = "f9f4a11f-28f5-4e95-8c15-433464f843fa";
    const imageMediaId = randomUUID();
    const token = await createToken({
      user_id: "35ed6e13-cb42-4331-9d65-638a1ed53ac8",
      practice_id: practiceId,
      client_id: clientId,
      roles: ["GUIDE"],
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/clients/${clientId}/memories`,
      headers: {
        authorization: `Bearer ${token}`,
        "idempotency-key": "idem-t8-storage-tamper",
      },
      payload: {
        title: "Tampered key",
        media: [
          {
            media_id: imageMediaId,
            type: "image",
            storage_key: `${practiceId}/uploads/images/not-${imageMediaId}`,
            mime_type: "image/png",
            byte_size: 100_000,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("paginates list responses with cursor semantics", async () => {
    const clientId = "35b965e2-e888-4843-a3b7-c89ce33ea43f";
    const practiceId = "099669f8-f597-4b5b-8fa6-611b3a7e704f";
    const token = await createToken({
      user_id: "f2b3192d-ab40-4f52-b2f5-7ef925a2074f",
      practice_id: practiceId,
      client_id: clientId,
      roles: ["GUIDE"],
    });

    const firstAudioMediaId = randomUUID();
    const secondAudioMediaId = randomUUID();

    const firstCreate = await app.inject({
      method: "POST",
      url: `/api/v1/clients/${clientId}/memories`,
      headers: {
        authorization: `Bearer ${token}`,
        "idempotency-key": "idem-list-1",
      },
      payload: {
        title: "Old memory",
        media: [
          {
            media_id: firstAudioMediaId,
            type: "audio",
            storage_key: `${practiceId}/uploads/audio/${firstAudioMediaId}`,
            mime_type: "audio/webm",
            byte_size: 210_000,
          },
        ],
      },
    });
    const secondCreate = await app.inject({
      method: "POST",
      url: `/api/v1/clients/${clientId}/memories`,
      headers: {
        authorization: `Bearer ${token}`,
        "idempotency-key": "idem-list-2",
      },
      payload: {
        title: "New memory",
        media: [
          {
            media_id: secondAudioMediaId,
            type: "audio",
            storage_key: `${practiceId}/uploads/audio/${secondAudioMediaId}`,
            mime_type: "audio/webm",
            byte_size: 220_000,
          },
        ],
      },
    });

    expect(firstCreate.statusCode).toBe(200);
    expect(secondCreate.statusCode).toBe(200);

    const firstPage = await app.inject({
      method: "GET",
      url: `/api/v1/clients/${clientId}/memories?page_size=1`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(firstPage.statusCode).toBe(200);
    const firstPageBody = JSON.parse(firstPage.body) as {
      items: Array<{ memory_id: string }>;
      next_cursor: string | null;
    };
    expect(firstPageBody.items).toHaveLength(1);
    expect(firstPageBody.next_cursor).toBeTruthy();

    const secondPage = await app.inject({
      method: "GET",
      url: `/api/v1/clients/${clientId}/memories?page_size=1&cursor=${encodeURIComponent(
        firstPageBody.next_cursor as string,
      )}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(secondPage.statusCode).toBe(200);
    const secondPageBody = JSON.parse(secondPage.body) as {
      items: Array<{ memory_id: string }>;
      next_cursor: string | null;
    };
    expect(secondPageBody.items).toHaveLength(1);
    expect(secondPageBody.items[0]?.memory_id).not.toBe(firstPageBody.items[0]?.memory_id);
  });

  it("returns 403 for CLIENT_SELF patch attempts on memories", async () => {
    const clientId = "2cffeb73-c94a-45b2-a920-4f318fe214d0";
    const practiceId = "2013e8e7-2897-4cb1-a0ef-d8f958c5ee8f";
    const audioMediaId = randomUUID();
    const guideToken = await createToken({
      user_id: "f6b6f052-3c9e-4ec9-85c4-53ca0f7d44e4",
      practice_id: practiceId,
      client_id: clientId,
      roles: ["GUIDE"],
    });
    const createRes = await app.inject({
      method: "POST",
      url: `/api/v1/clients/${clientId}/memories`,
      headers: { authorization: `Bearer ${guideToken}`, "idempotency-key": "idem-patch-authz" },
      payload: {
        title: "Protected memory",
        media: [
          {
            media_id: audioMediaId,
            type: "audio",
            storage_key: `${practiceId}/uploads/audio/${audioMediaId}`,
            mime_type: "audio/webm",
            byte_size: 200_000,
          },
        ],
      },
    });
    expect(createRes.statusCode).toBe(200);
    const created = JSON.parse(createRes.body) as { memory: { memory_id: string } };

    const clientSelfToken = await createToken({
      user_id: "e7c82a7f-bf06-467d-975e-87d9e594d0d6",
      practice_id: practiceId,
      client_id: clientId,
      roles: ["CLIENT_SELF"],
    });
    const patchRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/clients/${clientId}/memories/${created.memory.memory_id}`,
      headers: { authorization: `Bearer ${clientSelfToken}` },
      payload: { title: "Client self edit" },
    });

    expect(patchRes.statusCode).toBe(403);
    const body = JSON.parse(patchRes.body) as { code: string };
    expect(body.code).toBe("FORBIDDEN");
  });

  it("patches and soft-deletes memory for guide role", async () => {
    const clientId = "54e33851-c132-4fdf-ad5d-d4860bf215a6";
    const practiceId = "13dc3f50-13f4-4f3e-a026-6af57a1ca14d";
    const audioMediaId = randomUUID();
    const guideToken = await createToken({
      user_id: "26abfdc6-b8f6-427e-b8f4-9f1f6f7f77ad",
      practice_id: practiceId,
      client_id: clientId,
      roles: ["GUIDE"],
    });

    const createRes = await app.inject({
      method: "POST",
      url: `/api/v1/clients/${clientId}/memories`,
      headers: { authorization: `Bearer ${guideToken}`, "idempotency-key": "idem-patch-delete" },
      payload: {
        title: "Update me",
        media: [
          {
            media_id: audioMediaId,
            type: "audio",
            storage_key: `${practiceId}/uploads/audio/${audioMediaId}`,
            mime_type: "audio/webm",
            byte_size: 200_000,
          },
        ],
      },
    });
    expect(createRes.statusCode).toBe(200);
    const created = JSON.parse(createRes.body) as { memory: { memory_id: string } };
    const memoryId = created.memory.memory_id;

    const patchRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/clients/${clientId}/memories/${memoryId}`,
      headers: { authorization: `Bearer ${guideToken}` },
      payload: {
        title: "Updated title",
        room: "Living room",
      },
    });
    expect(patchRes.statusCode).toBe(200);
    const patched = JSON.parse(patchRes.body) as { memory: { title: string; room: string | null } };
    expect(patched.memory.title).toBe("Updated title");
    expect(patched.memory.room).toBe("Living room");

    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/v1/clients/${clientId}/memories/${memoryId}`,
      headers: { authorization: `Bearer ${guideToken}` },
    });
    expect(deleteRes.statusCode).toBe(204);

    const detailAfterDelete = await app.inject({
      method: "GET",
      url: `/api/v1/clients/${clientId}/memories/${memoryId}`,
      headers: { authorization: `Bearer ${guideToken}` },
    });
    expect(detailAfterDelete.statusCode).toBe(404);
  });
});
