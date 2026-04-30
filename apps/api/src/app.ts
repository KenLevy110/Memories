import { createHash, randomUUID } from "node:crypto";
import Fastify from "fastify";
import { apiErrorSchema, healthResponseSchema } from "@memories/shared";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const logLevel =
  (process.env["LOG_LEVEL"] as
    | "trace"
    | "debug"
    | "info"
    | "warn"
    | "error"
    | "fatal"
    | "silent"
    | undefined) ?? "info";

const API_PREFIX = "/api/v1";
const HEALTH_PATH = "/health";
const CLIENT_SELF_ROLE = "CLIENT_SELF";

type JwtAuthConfig = {
  issuer: string;
  audience: string;
  jwksUri: string;
};

type BuildAppOptions = {
  jwtAuth?: JwtAuthConfig;
};

type JwtVerifier = (token: string) => Promise<JWTPayload>;

class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    auth: JWTPayload | null;
    request_id: string;
  }
}

function readStringClaim(payload: JWTPayload, claimName: string): string | null {
  const rawClaim = payload[claimName];
  if (typeof rawClaim !== "string") {
    return null;
  }

  const value = rawClaim.trim();
  return value.length > 0 ? value : null;
}

function readStringArrayClaim(payload: JWTPayload, claimName: string): string[] {
  const rawClaim = payload[claimName];
  if (!Array.isArray(rawClaim)) {
    return [];
  }

  return rawClaim
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function readRoleSet(payload: JWTPayload): Set<string> {
  const roleClaim = readStringClaim(payload, "role");
  const roles = new Set<string>(
    readStringArrayClaim(payload, "roles").map((role) => role.toUpperCase()),
  );
  if (roleClaim) {
    roles.add(roleClaim.toUpperCase());
  }
  return roles;
}

function readClientScope(payload: JWTPayload): Set<string> {
  const scope = new Set<string>();
  const focalClientId = readStringClaim(payload, "client_id");
  if (focalClientId) {
    scope.add(focalClientId);
  }

  for (const clientId of readStringArrayClaim(payload, "client_ids")) {
    scope.add(clientId);
  }

  return scope;
}

function hashActorId(userId: string | null): string | null {
  if (!userId) {
    return null;
  }

  return createHash("sha256").update(userId).digest("hex");
}

function getPathParam(
  params: unknown,
  paramName: "clientId" | "memoryId",
): string | null {
  if (!params || typeof params !== "object") {
    return null;
  }

  const rawParam = (params as Record<string, unknown>)[paramName];
  if (typeof rawParam !== "string") {
    return null;
  }

  const value = rawParam.trim();
  return value.length > 0 ? value : null;
}

function logAuthzDenied(
  request: {
    id: string;
    method: string;
    url: string;
    auth: JWTPayload | null;
    log: { warn: (payload: Record<string, unknown>, message: string) => void };
  },
  reason: string,
  targetClientId: string | null,
  memoryIdPresent: boolean,
): void {
  request.log.warn(
    {
      event: "authz_denied",
      reason,
      status_code: 403,
      request_id: request.id,
      method: request.method,
      route: normalizePath(request.url),
      target_client_id: targetClientId,
      memory_id_present: memoryIdPresent,
      actor_hash: hashActorId(
        request.auth ? readStringClaim(request.auth, "user_id") : null,
      ),
    },
    "Authorization denied.",
  );
}

function enforceClientScopeAuthorization(request: {
  id: string;
  method: string;
  url: string;
  params: unknown;
  auth: JWTPayload | null;
  log: { warn: (payload: Record<string, unknown>, message: string) => void };
}): void {
  if (!request.auth) {
    throw new HttpError(401, "UNAUTHORIZED", "Bearer token is required.");
  }

  const clientId = getPathParam(request.params, "clientId");
  const memoryId = getPathParam(request.params, "memoryId");
  if (!clientId && !memoryId) {
    return;
  }

  if (memoryId && !clientId) {
    logAuthzDenied(request, "memory_route_without_client_id", null, true);
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Insufficient permissions for requested resource.",
    );
  }

  const practiceId = readStringClaim(request.auth, "practice_id");
  if (!practiceId) {
    logAuthzDenied(request, "missing_practice_scope", clientId, Boolean(memoryId));
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Insufficient permissions for requested resource.",
    );
  }

  const clientScope = readClientScope(request.auth);
  if (!clientId || clientScope.size === 0 || !clientScope.has(clientId)) {
    logAuthzDenied(request, "client_scope_mismatch", clientId, Boolean(memoryId));
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Insufficient permissions for requested resource.",
    );
  }

  const roles = readRoleSet(request.auth);
  const focalClientId = readStringClaim(request.auth, "client_id");
  if (
    roles.has(CLIENT_SELF_ROLE) &&
    (!focalClientId || focalClientId !== clientId || clientScope.size !== 1)
  ) {
    logAuthzDenied(request, "client_self_scope_mismatch", clientId, Boolean(memoryId));
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Insufficient permissions for requested resource.",
    );
  }
}

function parseBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function normalizePath(url: string): string {
  return url.split("?", 1)[0] ?? url;
}

function resolveJwtAuthConfig(options?: BuildAppOptions): JwtAuthConfig {
  const issuer = options?.jwtAuth?.issuer ?? process.env["JWT_ISSUER"];
  const audience = options?.jwtAuth?.audience ?? process.env["JWT_AUDIENCE"];
  const jwksUri = options?.jwtAuth?.jwksUri ?? process.env["JWT_JWKS_URI"];

  if (!issuer || !audience || !jwksUri) {
    throw new Error(
      "Missing JWT auth config. Set JWT_ISSUER, JWT_AUDIENCE, and JWT_JWKS_URI.",
    );
  }

  return { issuer, audience, jwksUri };
}

function createJwtVerifier(config: JwtAuthConfig): JwtVerifier {
  const remoteJwks = createRemoteJWKSet(new URL(config.jwksUri));

  return async (token: string) => {
    const verified = await jwtVerify(token, remoteJwks, {
      issuer: config.issuer,
      audience: config.audience,
    });
    return verified.payload;
  };
}

function toApiErrorCode(error: unknown, statusCode: number): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.length > 0
  ) {
    return error.code.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  }

  if (statusCode === 401) {
    return "UNAUTHORIZED";
  }
  if (statusCode === 403) {
    return "FORBIDDEN";
  }
  if (statusCode === 404) {
    return "NOT_FOUND";
  }

  return statusCode >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST";
}

function toStatusCode(error: unknown): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }
  return 500;
}

export function buildApp(options?: BuildAppOptions) {
  const jwtVerifier = createJwtVerifier(resolveJwtAuthConfig(options));

  const app = Fastify({
    logger: {
      level: logLevel,
    },
    requestIdHeader: "x-request-id",
    genReqId: (req) => {
      const incomingHeader = req.headers["x-request-id"];
      if (typeof incomingHeader === "string" && incomingHeader.trim().length > 0) {
        return incomingHeader.trim();
      }
      return randomUUID();
    },
  });

  app.decorateRequest("auth", null);
  app.decorateRequest("request_id", "");

  app.addHook("onRequest", async (request, reply) => {
    request.request_id = request.id;
    reply.header("x-request-id", request.id);

    const path = normalizePath(request.url);
    if (path === HEALTH_PATH) {
      return;
    }

    const bearerToken = parseBearerToken(request.headers.authorization);
    if (!bearerToken) {
      throw new HttpError(401, "UNAUTHORIZED", "Bearer token is required.");
    }

    try {
      request.auth = await jwtVerifier(bearerToken);
    } catch {
      throw new HttpError(401, "UNAUTHORIZED", "Bearer token is invalid.");
    }
  });

  app.addHook("preHandler", async (request) => {
    const path = normalizePath(request.url);
    if (path === HEALTH_PATH || !path.startsWith(API_PREFIX)) {
      return;
    }

    enforceClientScopeAuthorization(request);
  });

  app.setNotFoundHandler((request, reply) => {
    const body = apiErrorSchema.parse({
      code: "NOT_FOUND",
      message: "Route not found.",
      request_id: request.id,
    });
    reply.status(404).send(body);
  });

  app.setErrorHandler((error, request, reply) => {
    const statusCode = toStatusCode(error);
    const code = toApiErrorCode(error, statusCode);
    const unsafeMessage =
      error instanceof Error ? error.message : typeof error === "string" ? error : "";
    const message =
      statusCode >= 500 ? "Unexpected server error." : unsafeMessage || "Request failed.";

    if (statusCode >= 500) {
      request.log.error({ err: error, request_id: request.id, status_code: statusCode });
    } else {
      request.log.warn({ code, request_id: request.id, status_code: statusCode });
    }

    const body = apiErrorSchema.parse({
      code,
      message,
      request_id: request.id,
    });

    reply.status(statusCode).send(body);
  });

  app.get(HEALTH_PATH, async () => {
    const body = { status: "ok" as const, service: "memories-api" };
    return healthResponseSchema.parse(body);
  });

  app.get(`${API_PREFIX}`, async () => {
    return {
      status: "ok" as const,
      service: "memories-api",
      version: "v1" as const,
    };
  });

  return app;
}
