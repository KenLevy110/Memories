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
});
