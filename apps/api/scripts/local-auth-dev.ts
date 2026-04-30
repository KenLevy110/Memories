/**
 * Local-only helper: serves JWKS and mints short-lived dev JWTs on 127.0.0.1.
 * Do not expose this process to a network. Not for production.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SignJWT, exportJWK, generateKeyPair } from "jose";

const HOST = "127.0.0.1";
const ISSUER = "https://issuer.memories.localdev";
const AUDIENCE = "memories-api";
const KID = "memories-local-dev-key";

const DEFAULT_CLAIMS = {
  user_id: "a6ba3030-d9ca-42f7-8c8e-e6ec4c478200",
  practice_id: "4ef4febe-b026-439d-abd9-d6477b4870f6",
  client_id: "8f9512d8-e88f-4f82-a8e9-6cb19a43ad52",
  roles: ["GUIDE"],
} as const;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(payload);
}

function readPort(): number {
  const raw = process.env["LOCAL_AUTH_DEV_PORT"];
  if (!raw) {
    return 3010;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0 || n > 65535) {
    throw new Error(`LOCAL_AUTH_DEV_PORT must be a valid TCP port (1–65535). Got: ${raw}`);
  }
  return n;
}

async function main(): Promise<void> {
  const port = readPort();
  const keyPair = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(keyPair.publicKey);
  const jwksBody = JSON.stringify({
    keys: [{ ...publicJwk, kid: KID, use: "sig", alg: "RS256" }],
  });

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? "";
    if (req.method === "GET" && url.split("?", 1)[0] === "/.well-known/jwks.json") {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      res.end(jwksBody);
      return;
    }

    if (req.method === "GET" && url.split("?", 1)[0] === "/dev/token") {
      const token = await new SignJWT({ ...DEFAULT_CLAIMS })
        .setProtectedHeader({ alg: "RS256", kid: KID })
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setExpirationTime("15m")
        .setIssuedAt()
        .sign(keyPair.privateKey);

      sendJson(res, 200, {
        access_token: token,
        token_type: "Bearer",
        expires_in: 900,
        note: "Use as Authorization: Bearer <access_token> against the API.",
      });
      return;
    }

    res.statusCode = 404;
    res.end();
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(port, HOST, () => resolve());
    server.on("error", reject);
  });

  const jwksUri = `http://${HOST}:${port}/.well-known/jwks.json`;

  console.log(`
Memories local auth (127.0.0.1 only). Do not expose this port to a network.

Add or merge into repo root .env:

JWT_ISSUER=${ISSUER}
JWT_AUDIENCE=${AUDIENCE}
JWT_JWKS_URI=${jwksUri}

Then start the API (e.g. npm run dev). Mint a test JWT:

  Browser:  http://${HOST}:${port}/dev/token
  curl:     curl -s http://${HOST}:${port}/dev/token

Leave this terminal running while you use the API.
`);
}

const thisFile = fileURLToPath(import.meta.url);
const entryScript = process.argv[1] ? path.resolve(process.argv[1]) : "";
const invokedDirectly =
  entryScript === thisFile ||
  entryScript.endsWith(`${path.sep}local-auth-dev.ts`) ||
  entryScript.endsWith(`${path.sep}scripts${path.sep}local-auth-dev.ts`);

if (invokedDirectly) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  });
}
