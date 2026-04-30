import { createServer } from "node:http";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SignJWT, exportJWK, generateKeyPair, type JWTPayload } from "jose";
import { buildApp } from "./app.js";

const issuer = "https://issuer.memories.test";
const audience = "memories-api";

type RunningJwksServer = {
  jwksUri: string;
  close: () => Promise<void>;
};

async function startJwksServer(jwks: Record<string, unknown>): Promise<RunningJwksServer> {
  const server = createServer((req, res) => {
    if (req.method === "GET" && req.url === "/.well-known/jwks.json") {
      const body = JSON.stringify(jwks);
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(body);
      return;
    }

    res.statusCode = 404;
    res.end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("JWKS server failed to bind to an address.");
  }

  return {
    jwksUri: `http://127.0.0.1:${address.port}/.well-known/jwks.json`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((err?: Error) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    },
  };
}

describe("api auth shell", () => {
  let app: ReturnType<typeof buildApp>;
  let closeJwksServer = async () => {};
  let privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
  const signedImageUploadUrl = "https://signed-upload.memories.test/put";
  const signedAudioUploadUrl = "https://signed-upload.memories.test/audio-put";

  beforeAll(async () => {
    const keyPair = await generateKeyPair("RS256");
    privateKey = keyPair.privateKey;
    const publicJwk = await exportJWK(keyPair.publicKey);
    const kid = "memories-test-key";
    const jwks = {
      keys: [{ ...publicJwk, kid }],
    };
    const jwksServer = await startJwksServer(jwks);
    closeJwksServer = jwksServer.close;

    app = buildApp({
      jwtAuth: {
        issuer,
        audience,
        jwksUri: jwksServer.jwksUri,
      },
      imageUploadMaxBytes: 2_000_000,
      audioUploadMaxBytes: 6_000_000,
      uploadSigner: async ({ practiceId, mediaId, mediaType, mimeType, byteSize }) => {
        const isImage = mediaType === "image";
        const mediaPathSegment = isImage ? "images" : "audio";

        return {
          uploadUrl: isImage ? signedImageUploadUrl : signedAudioUploadUrl,
          storageKey: `${practiceId}/uploads/${mediaPathSegment}/${mediaId}`,
          expiresAt: "2026-05-01T00:00:00.000Z",
          requiredHeaders: {
            "content-type": mimeType,
            "content-length": String(byteSize),
          },
        };
      },
    });

    app.get("/api/v1/test/clients/:clientId/memories", async (request) => {
      const params = request.params as { clientId: string };
      return { ok: true, client_id: params.clientId };
    });

    app.get("/api/v1/test/clients/:clientId/memories/:memoryId", async (request) => {
      const params = request.params as { clientId: string; memoryId: string };
      return { ok: true, client_id: params.clientId, memory_id: params.memoryId };
    });

    app.get("/api/v1/test/memories/:memoryId", async (request) => {
      const params = request.params as { memoryId: string };
      return { ok: true, memory_id: params.memoryId };
    });
  });

  afterAll(async () => {
    await app.close();
    await closeJwksServer();
  });

  async function createToken(payload: JWTPayload = {}) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "RS256", kid: "memories-test-key" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime("15m")
      .setIssuedAt()
      .sign(privateKey);
  }

  it("returns ok for /health without auth", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { status: string; service: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("memories-api");
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
});
