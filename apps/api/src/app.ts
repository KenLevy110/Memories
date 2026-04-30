import { createHash, randomUUID } from "node:crypto";
import Fastify from "fastify";
import {
  apiErrorSchema,
  cursorPaginationQuerySchema,
  healthResponseSchema,
  MEMORY_BODY_MAX_LENGTH,
  MEMORY_ROOM_MAX_LENGTH,
  MEMORY_TITLE_MAX_LENGTH,
  memoryDetailResponseSchema,
  memoryListResponseSchema,
} from "@memories/shared";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  auditEvents,
  memories,
  memoryMedia,
  memoryTranscripts,
} from "./db/schema.js";

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
const DEFAULT_IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_AUDIO_UPLOAD_MAX_BYTES = 30 * 1024 * 1024;
const DEFAULT_UPLOAD_URL_TTL_SECONDS = 5 * 60;
const DEFAULT_PLAYBACK_URL_TTL_SECONDS = 5 * 60;
const DEFAULT_UPLOAD_SIGN_ORIGIN = "https://uploads.memories.local";
const DEFAULT_MEMORY_LIST_PAGE_SIZE = 20;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GUIDE_MUTATION_ROLES = new Set(["GUIDE", "GUIDE_PRIMARY", "GUIDE_SUPPORT"]);
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const ALLOWED_AUDIO_MIME_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/mpeg",
]);

type JwtAuthConfig = {
  issuer: string;
  audience: string;
  jwksUri: string;
};

type BuildAppOptions = {
  jwtAuth?: JwtAuthConfig;
  imageUploadMaxBytes?: number;
  audioUploadMaxBytes?: number;
  uploadSigner?: UploadSigner;
  mediaLookup?: MediaLookup;
  playbackSigner?: PlaybackSigner;
  memoryRepository?: MemoryRepository;
};

type JwtVerifier = (token: string) => Promise<JWTPayload>;
type MemoryMediaType = "image" | "audio" | "video";
type UploadSigner = (input: {
  practiceId: string;
  mediaId: string;
  mediaType: "image" | "audio";
  mimeType: string;
  byteSize: number;
}) => Promise<{
  uploadUrl: string;
  storageKey: string;
  expiresAt: string;
  requiredHeaders: Record<string, string>;
}>;
type MediaLookupRecord = {
  mediaId: string;
  memoryId: string;
  practiceId: string;
  clientId: string;
  storageKey: string;
  mimeType: string;
};
type MediaLookup = (mediaId: string) => Promise<MediaLookupRecord | null>;
type PlaybackSigner = (input: MediaLookupRecord) => Promise<{
  readUrl: string;
  expiresAt: string;
}>;
type FinalizeMediaInput = {
  mediaId: string;
  type: MemoryMediaType;
  storageKey: string;
  mimeType: string;
  byteSize: number;
  sortOrder: number;
};
type MemoryRecord = {
  memoryId: string;
  practiceId: string;
  clientId: string;
  title: string;
  room: string | null;
  body: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
type MemoryTranscriptRecord = {
  status: "pending" | "ready" | "failed";
  text: string | null;
  confidence: number | null;
  updatedAt: Date;
};
type MemoryDetailRecord = {
  memory: MemoryRecord;
  media: Array<{
    mediaId: string;
    memoryId: string;
    type: MemoryMediaType;
    storageKey: string;
    mimeType: string;
    byteSize: number;
    sortOrder: number;
    createdAt: Date;
  }>;
  transcript: MemoryTranscriptRecord | null;
};
type CreateMemoryInput = {
  practiceId: string;
  clientId: string;
  actorUserId: string;
  idempotencyKey: string;
  title: string;
  room: string | null;
  body: string | null;
  media: FinalizeMediaInput[];
  requestId: string;
};
type UpdateMemoryInput = {
  practiceId: string;
  clientId: string;
  memoryId: string;
  actorUserId: string;
  requestId: string;
  patch: {
    title?: string;
    room?: string | null;
    body?: string | null;
  };
};
type ListMemoriesInput = {
  practiceId: string;
  clientId: string;
  pageSize: number;
  cursor: DecodedCursor | null;
};
type MemoryRepository = {
  finalizeMemory: (input: CreateMemoryInput) => Promise<MemoryDetailRecord>;
  listMemories: (
    input: ListMemoriesInput,
  ) => Promise<{ items: MemoryRecord[]; nextCursor: string | null }>;
  listThumbnailMediaIds: (memoryIds: string[]) => Promise<Map<string, string | null>>;
  getMemoryDetail: (input: {
    practiceId: string;
    clientId: string;
    memoryId: string;
  }) => Promise<MemoryDetailRecord | null>;
  updateMemory: (input: UpdateMemoryInput) => Promise<MemoryDetailRecord | null>;
  softDeleteMemory: (input: {
    practiceId: string;
    clientId: string;
    memoryId: string;
    actorUserId: string;
    requestId: string;
  }) => Promise<boolean>;
};
type DecodedCursor = {
  createdAtIso: string;
  memoryId: string;
};

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
  paramName: "clientId" | "memoryId" | "mediaId",
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

  if (!clientId) {
    return;
  }

  enforceClientScopeForTargetClient(request, clientId, Boolean(memoryId));
}

function enforceClientScopeForTargetClient(
  request: {
    id: string;
    method: string;
    url: string;
    auth: JWTPayload | null;
    log: { warn: (payload: Record<string, unknown>, message: string) => void };
  },
  targetClientId: string,
  memoryIdPresent: boolean,
): void {
  if (!request.auth) {
    throw new HttpError(401, "UNAUTHORIZED", "Bearer token is required.");
  }

  const practiceId = readStringClaim(request.auth, "practice_id");
  if (!practiceId) {
    logAuthzDenied(request, "missing_practice_scope", targetClientId, memoryIdPresent);
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Insufficient permissions for requested resource.",
    );
  }

  const clientScope = readClientScope(request.auth);
  if (clientScope.size === 0 || !clientScope.has(targetClientId)) {
    logAuthzDenied(request, "client_scope_mismatch", targetClientId, memoryIdPresent);
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
    (!focalClientId || focalClientId !== targetClientId || clientScope.size !== 1)
  ) {
    logAuthzDenied(request, "client_self_scope_mismatch", targetClientId, memoryIdPresent);
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Insufficient permissions for requested resource.",
    );
  }
}

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function requireActorUserIdForMutation(request: {
  id: string;
  method: string;
  url: string;
  auth: JWTPayload | null;
  log: { warn: (payload: Record<string, unknown>, message: string) => void };
}): string {
  if (!request.auth) {
    throw new HttpError(401, "UNAUTHORIZED", "Bearer token is required.");
  }

  const actorUserId = readStringClaim(request.auth, "user_id");
  if (!actorUserId || !isUuid(actorUserId)) {
    request.log.warn(
      {
        event: "authz_denied",
        reason: "missing_or_invalid_user_scope",
        status_code: 403,
        request_id: request.id,
        method: request.method,
        route: normalizePath(request.url),
      },
      "Authorization denied.",
    );
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Insufficient permissions for requested resource.",
    );
  }

  return actorUserId;
}

function requireGuideMutationRole(request: {
  id: string;
  method: string;
  url: string;
  auth: JWTPayload | null;
  log: { warn: (payload: Record<string, unknown>, message: string) => void };
}): void {
  if (!request.auth) {
    throw new HttpError(401, "UNAUTHORIZED", "Bearer token is required.");
  }

  const roles = readRoleSet(request.auth);
  const hasGuideRole = [...roles].some((role) => GUIDE_MUTATION_ROLES.has(role));
  if (hasGuideRole) {
    return;
  }

  request.log.warn(
    {
      event: "authz_denied",
      reason: "insufficient_role_for_memory_mutation",
      status_code: 403,
      request_id: request.id,
      method: request.method,
      route: normalizePath(request.url),
      actor_hash: hashActorId(readStringClaim(request.auth, "user_id")),
    },
    "Authorization denied.",
  );
  throw new HttpError(
    403,
    "FORBIDDEN",
    "Insufficient permissions for requested resource.",
  );
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

function resolveImageUploadMaxBytes(options?: BuildAppOptions): number {
  const fromOption = options?.imageUploadMaxBytes;
  if (
    typeof fromOption === "number" &&
    Number.isFinite(fromOption) &&
    Number.isInteger(fromOption) &&
    fromOption > 0
  ) {
    return fromOption;
  }

  const fromEnvRaw = process.env["IMAGE_UPLOAD_MAX_BYTES"];
  if (!fromEnvRaw) {
    return DEFAULT_IMAGE_UPLOAD_MAX_BYTES;
  }

  const fromEnv = Number(fromEnvRaw);
  if (!Number.isFinite(fromEnv) || !Number.isInteger(fromEnv) || fromEnv <= 0) {
    return DEFAULT_IMAGE_UPLOAD_MAX_BYTES;
  }

  return fromEnv;
}

function resolveAudioUploadMaxBytes(options?: BuildAppOptions): number {
  const fromOption = options?.audioUploadMaxBytes;
  if (
    typeof fromOption === "number" &&
    Number.isFinite(fromOption) &&
    Number.isInteger(fromOption) &&
    fromOption > 0
  ) {
    return fromOption;
  }

  const fromEnvRaw = process.env["AUDIO_UPLOAD_MAX_BYTES"];
  if (!fromEnvRaw) {
    return DEFAULT_AUDIO_UPLOAD_MAX_BYTES;
  }

  const fromEnv = Number(fromEnvRaw);
  if (!Number.isFinite(fromEnv) || !Number.isInteger(fromEnv) || fromEnv <= 0) {
    return DEFAULT_AUDIO_UPLOAD_MAX_BYTES;
  }

  return fromEnv;
}

function resolveUploadSignOrigin(): string {
  const fromEnv = process.env["UPLOAD_SIGN_ORIGIN"];
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  return DEFAULT_UPLOAD_SIGN_ORIGIN;
}

function resolvePlaybackSignOrigin(): string {
  const fromEnv = process.env["PLAYBACK_SIGN_ORIGIN"];
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  return resolveUploadSignOrigin();
}

function createDefaultUploadSigner(): UploadSigner {
  const origin = resolveUploadSignOrigin();

  return async ({ practiceId, mediaId, mediaType, mimeType, byteSize }) => {
    const expiresAt = new Date(
      Date.now() + DEFAULT_UPLOAD_URL_TTL_SECONDS * 1000,
    ).toISOString();
    const mediaPathSegment = mediaType === "image" ? "images" : "audio";
    const storageKey = `${practiceId}/uploads/${mediaPathSegment}/${mediaId}`;
    const url = new URL(
      storageKey,
      origin.endsWith("/") ? origin : `${origin}/`,
    );
    url.searchParams.set("expires_at", expiresAt);
    url.searchParams.set("mime_type", mimeType);
    url.searchParams.set("byte_size", String(byteSize));
    url.searchParams.set("signature", randomUUID().replace(/-/g, ""));

    return {
      uploadUrl: url.toString(),
      storageKey,
      expiresAt,
      requiredHeaders: {
        "content-type": mimeType,
      },
    };
  };
}

function createDefaultPlaybackSigner(): PlaybackSigner {
  const origin = resolvePlaybackSignOrigin();

  return async ({ storageKey, mimeType }) => {
    const expiresAt = new Date(
      Date.now() + DEFAULT_PLAYBACK_URL_TTL_SECONDS * 1000,
    ).toISOString();
    const url = new URL(
      storageKey,
      origin.endsWith("/") ? origin : `${origin}/`,
    );
    url.searchParams.set("expires_at", expiresAt);
    url.searchParams.set("mime_type", mimeType);
    url.searchParams.set("signature", randomUUID().replace(/-/g, ""));

    return {
      readUrl: url.toString(),
      expiresAt,
    };
  };
}

function createDefaultMediaLookup(): {
  lookup: MediaLookup;
  close: (() => Promise<void>) | null;
} {
  const databaseUrl = process.env["DATABASE_URL"]?.trim();
  if (!databaseUrl) {
    return {
      lookup: async () => null,
      close: null,
    };
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  const lookup: MediaLookup = async (mediaId) => {
    const rows = await db
      .select({
        mediaId: memoryMedia.id,
        memoryId: memoryMedia.memoryId,
        practiceId: memoryMedia.practiceId,
        clientId: memoryMedia.clientId,
        storageKey: memoryMedia.storageKey,
        mimeType: memoryMedia.mimeType,
      })
      .from(memoryMedia)
      .innerJoin(memories, eq(memories.id, memoryMedia.memoryId))
      .where(
        and(
          eq(memoryMedia.id, mediaId),
          isNull(memoryMedia.deletedAt),
          isNull(memories.deletedAt),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  };

  return {
    lookup,
    close: async () => {
      await pool.end();
    },
  };
}

function createDefaultMemoryRepository(): {
  repository: MemoryRepository | null;
  close: (() => Promise<void>) | null;
} {
  const databaseUrl = process.env["DATABASE_URL"]?.trim();
  if (!databaseUrl) {
    return {
      repository: null,
      close: null,
    };
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  const loadMemoryDetail = async (
    executor: any,
    input: { practiceId: string; clientId: string; memoryId: string },
  ): Promise<MemoryDetailRecord | null> => {
    const memoryRows = await executor
      .select({
        memoryId: memories.id,
        practiceId: memories.practiceId,
        clientId: memories.clientId,
        title: memories.title,
        room: memories.room,
        body: memories.body,
        createdAt: memories.createdAt,
        updatedAt: memories.updatedAt,
        deletedAt: memories.deletedAt,
      })
      .from(memories)
      .where(
        and(
          eq(memories.id, input.memoryId),
          eq(memories.practiceId, input.practiceId),
          eq(memories.clientId, input.clientId),
          isNull(memories.deletedAt),
        ),
      )
      .limit(1);

    const memoryRow = memoryRows[0];
    if (!memoryRow) {
      return null;
    }

    const mediaRows = await executor
      .select({
        mediaId: memoryMedia.id,
        memoryId: memoryMedia.memoryId,
        type: memoryMedia.type,
        storageKey: memoryMedia.storageKey,
        mimeType: memoryMedia.mimeType,
        byteSize: memoryMedia.byteSize,
        sortOrder: memoryMedia.sortOrder,
        createdAt: memoryMedia.createdAt,
      })
      .from(memoryMedia)
      .where(
        and(eq(memoryMedia.memoryId, memoryRow.memoryId), isNull(memoryMedia.deletedAt)),
      )
      .orderBy(memoryMedia.sortOrder, memoryMedia.createdAt);

    const transcriptRows = await executor
      .select({
        status: memoryTranscripts.status,
        text: memoryTranscripts.text,
        confidence: memoryTranscripts.confidence,
        updatedAt: memoryTranscripts.updatedAt,
      })
      .from(memoryTranscripts)
      .where(
        and(
          eq(memoryTranscripts.memoryId, memoryRow.memoryId),
          eq(memoryTranscripts.practiceId, memoryRow.practiceId),
          eq(memoryTranscripts.clientId, memoryRow.clientId),
        ),
      )
      .limit(1);

    const transcriptRow = transcriptRows[0];
    const transcript = transcriptRow
      ? {
          status: transcriptRow.status,
          text: transcriptRow.text,
          confidence:
            typeof transcriptRow.confidence === "number" &&
            transcriptRow.confidence >= 0 &&
            transcriptRow.confidence <= 1
              ? transcriptRow.confidence
              : null,
          updatedAt: transcriptRow.updatedAt,
        }
      : null;

    return {
      memory: {
        memoryId: memoryRow.memoryId,
        practiceId: memoryRow.practiceId,
        clientId: memoryRow.clientId,
        title: memoryRow.title,
        room: memoryRow.room,
        body: memoryRow.body,
        createdAt: memoryRow.createdAt,
        updatedAt: memoryRow.updatedAt,
        deletedAt: memoryRow.deletedAt,
      },
      media: mediaRows.map((row: any) => ({
        mediaId: row.mediaId,
        memoryId: row.memoryId,
        type: row.type,
        storageKey: row.storageKey,
        mimeType: row.mimeType,
        byteSize: row.byteSize,
        sortOrder: row.sortOrder,
        createdAt: row.createdAt,
      })),
      transcript,
    };
  };

  const repository: MemoryRepository = {
    finalizeMemory: async (input) => {
      const created = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${`finalize:${input.practiceId}:${input.clientId}:${input.actorUserId}:${input.idempotencyKey}`}))`,
        );

        const priorAuditRows = await tx
          .select({
            memoryId: auditEvents.memoryId,
          })
          .from(auditEvents)
          .where(
            and(
              eq(auditEvents.practiceId, input.practiceId),
              eq(auditEvents.clientId, input.clientId),
              eq(auditEvents.actorUserId, input.actorUserId),
              eq(auditEvents.entityType, "memory"),
              eq(auditEvents.action, "memory.create"),
              sql`${auditEvents.metadata}->>'idempotency_key' = ${input.idempotencyKey}`,
            ),
          )
          .orderBy(desc(auditEvents.createdAt))
          .limit(1);

        const priorMemoryId = priorAuditRows[0]?.memoryId;
        if (priorMemoryId) {
          const prior = await loadMemoryDetail(tx, {
            practiceId: input.practiceId,
            clientId: input.clientId,
            memoryId: priorMemoryId,
          });
          if (prior) {
            return prior;
          }
        }

        const memoryId = randomUUID();
        const now = new Date();
        await tx.insert(memories).values({
          id: memoryId,
          practiceId: input.practiceId,
          clientId: input.clientId,
          title: input.title,
          room: input.room,
          body: input.body,
          updatedAt: now,
        });

        if (input.media.length > 0) {
          await tx.insert(memoryMedia).values(
            input.media.map((item) => ({
              id: item.mediaId,
              memoryId,
              practiceId: input.practiceId,
              clientId: input.clientId,
              type: item.type,
              storageKey: item.storageKey,
              mimeType: item.mimeType,
              byteSize: item.byteSize,
              sortOrder: item.sortOrder,
            })),
          );
        }

        await tx.insert(auditEvents).values({
          id: randomUUID(),
          practiceId: input.practiceId,
          clientId: input.clientId,
          memoryId,
          actorUserId: input.actorUserId,
          entityType: "memory",
          entityId: memoryId,
          action: "memory.create",
          requestId: input.requestId,
          metadata: {
            idempotency_key: input.idempotencyKey,
            media_count: input.media.length,
          },
        });

        const createdDetail = await loadMemoryDetail(tx, {
          practiceId: input.practiceId,
          clientId: input.clientId,
          memoryId,
        });
        if (!createdDetail) {
          throw new Error("Created memory could not be loaded.");
        }
        return createdDetail;
      });

      return created;
    },
    listMemories: async (input) => {
      const cursorClause = input.cursor
        ? sql`(${memories.createdAt}, ${memories.id}) < (${input.cursor.createdAtIso}::timestamptz, ${input.cursor.memoryId}::uuid)`
        : undefined;
      const whereClause = cursorClause
        ? and(
            eq(memories.practiceId, input.practiceId),
            eq(memories.clientId, input.clientId),
            isNull(memories.deletedAt),
            cursorClause,
          )
        : and(
            eq(memories.practiceId, input.practiceId),
            eq(memories.clientId, input.clientId),
            isNull(memories.deletedAt),
          );

      const rows = await db
        .select({
          memoryId: memories.id,
          practiceId: memories.practiceId,
          clientId: memories.clientId,
          title: memories.title,
          room: memories.room,
          body: memories.body,
          createdAt: memories.createdAt,
          updatedAt: memories.updatedAt,
          deletedAt: memories.deletedAt,
        })
        .from(memories)
        .where(whereClause)
        .orderBy(desc(memories.createdAt), desc(memories.id))
        .limit(input.pageSize + 1);

      const hasMore = rows.length > input.pageSize;
      const pageRows = rows.slice(0, input.pageSize);
      const items = pageRows.map((row) => ({
        memoryId: row.memoryId,
        practiceId: row.practiceId,
        clientId: row.clientId,
        title: row.title,
        room: row.room,
        body: row.body,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
      }));

      return {
        items,
        nextCursor: hasMore && items.length > 0 ? encodeCursor(items[items.length - 1]!) : null,
      };
    },
    listThumbnailMediaIds: async (memoryIds) => {
      if (memoryIds.length === 0) {
        return new Map<string, string | null>();
      }

      const mediaRows = await db
        .select({
          memoryId: memoryMedia.memoryId,
          mediaId: memoryMedia.id,
        })
        .from(memoryMedia)
        .where(
          and(
            inArray(memoryMedia.memoryId, memoryIds),
            eq(memoryMedia.type, "image"),
            isNull(memoryMedia.deletedAt),
          ),
        )
        .orderBy(memoryMedia.memoryId, memoryMedia.sortOrder, memoryMedia.createdAt);

      const thumbnailMap = new Map<string, string | null>();
      for (const memoryId of memoryIds) {
        thumbnailMap.set(memoryId, null);
      }
      for (const row of mediaRows) {
        if (!thumbnailMap.has(row.memoryId) || thumbnailMap.get(row.memoryId) !== null) {
          continue;
        }
        thumbnailMap.set(row.memoryId, row.mediaId);
      }
      return thumbnailMap;
    },
    getMemoryDetail: async (input) => loadMemoryDetail(db, input),
    updateMemory: async (input) => {
      const updated = await db.transaction(async (tx) => {
        const updateValues: Record<string, unknown> = {
          updatedAt: new Date(),
        };
        const changedFields: string[] = [];
        if (input.patch.title !== undefined) {
          updateValues["title"] = input.patch.title;
          changedFields.push("title");
        }
        if (input.patch.room !== undefined) {
          updateValues["room"] = input.patch.room;
          changedFields.push("room");
        }
        if (input.patch.body !== undefined) {
          updateValues["body"] = input.patch.body;
          changedFields.push("body");
        }

        const rows = await tx
          .update(memories)
          .set(updateValues)
          .where(
            and(
              eq(memories.id, input.memoryId),
              eq(memories.practiceId, input.practiceId),
              eq(memories.clientId, input.clientId),
              isNull(memories.deletedAt),
            ),
          )
          .returning({ memoryId: memories.id });

        const memoryId = rows[0]?.memoryId;
        if (!memoryId) {
          return null;
        }

        await tx.insert(auditEvents).values({
          id: randomUUID(),
          practiceId: input.practiceId,
          clientId: input.clientId,
          memoryId,
          actorUserId: input.actorUserId,
          entityType: "memory",
          entityId: memoryId,
          action: "memory.update",
          requestId: input.requestId,
          metadata: {
            changed_fields: changedFields,
          },
        });

        return loadMemoryDetail(tx, {
          practiceId: input.practiceId,
          clientId: input.clientId,
          memoryId,
        });
      });

      return updated;
    },
    softDeleteMemory: async (input) => {
      const deleted = await db.transaction(async (tx) => {
        const rows = await tx
          .update(memories)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(memories.id, input.memoryId),
              eq(memories.practiceId, input.practiceId),
              eq(memories.clientId, input.clientId),
              isNull(memories.deletedAt),
            ),
          )
          .returning({ memoryId: memories.id });

        const memoryId = rows[0]?.memoryId;
        if (!memoryId) {
          return false;
        }

        await tx.insert(auditEvents).values({
          id: randomUUID(),
          practiceId: input.practiceId,
          clientId: input.clientId,
          memoryId,
          actorUserId: input.actorUserId,
          entityType: "memory",
          entityId: memoryId,
          action: "memory.delete",
          requestId: input.requestId,
          metadata: {},
        });

        return true;
      });

      return deleted;
    },
  };

  return {
    repository,
    close: async () => {
      await pool.end();
    },
  };
}

function normalizeMimeType(rawMimeType: string): string {
  const [baseMimeType] = rawMimeType.split(";", 1);
  return (baseMimeType ?? "").trim().toLowerCase();
}

function parseImageUploadSignBody(
  body: unknown,
  maxImageUploadBytes: number,
): { mimeType: string; byteSize: number } {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
  }

  const payload = body as Record<string, unknown>;
  const mimeTypeRaw = payload["mime_type"];
  const byteSizeRaw = payload["byte_size"];

  if (typeof mimeTypeRaw !== "string" || mimeTypeRaw.trim().length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "mime_type is required.");
  }
  const mimeType = normalizeMimeType(mimeTypeRaw);
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new HttpError(
      400,
      "UNSUPPORTED_MEDIA_TYPE",
      "Unsupported image mime_type.",
    );
  }

  if (
    typeof byteSizeRaw !== "number" ||
    !Number.isFinite(byteSizeRaw) ||
    !Number.isInteger(byteSizeRaw) ||
    byteSizeRaw <= 0
  ) {
    throw new HttpError(400, "VALIDATION_ERROR", "byte_size must be a positive integer.");
  }
  const byteSize = byteSizeRaw;
  if (byteSize > maxImageUploadBytes) {
    throw new HttpError(
      400,
      "IMAGE_TOO_LARGE",
      `byte_size exceeds ${maxImageUploadBytes}.`,
    );
  }

  return { mimeType, byteSize };
}

function parseAudioUploadSignBody(
  body: unknown,
  maxAudioUploadBytes: number,
): { mimeType: string; byteSize: number } {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
  }

  const payload = body as Record<string, unknown>;
  const mimeTypeRaw = payload["mime_type"];
  const byteSizeRaw = payload["byte_size"];

  if (typeof mimeTypeRaw !== "string" || mimeTypeRaw.trim().length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "mime_type is required.");
  }
  const mimeType = normalizeMimeType(mimeTypeRaw);
  if (!ALLOWED_AUDIO_MIME_TYPES.has(mimeType)) {
    throw new HttpError(
      400,
      "UNSUPPORTED_MEDIA_TYPE",
      "Unsupported audio mime_type.",
    );
  }

  if (
    typeof byteSizeRaw !== "number" ||
    !Number.isFinite(byteSizeRaw) ||
    !Number.isInteger(byteSizeRaw) ||
    byteSizeRaw <= 0
  ) {
    throw new HttpError(400, "VALIDATION_ERROR", "byte_size must be a positive integer.");
  }
  const byteSize = byteSizeRaw;
  if (byteSize > maxAudioUploadBytes) {
    throw new HttpError(
      400,
      "AUDIO_TOO_LARGE",
      `byte_size exceeds ${maxAudioUploadBytes}.`,
    );
  }

  return { mimeType, byteSize };
}

function parseNonEmptyString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new HttpError(400, "VALIDATION_ERROR", `${fieldName} is required.`);
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${fieldName} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      `${fieldName} exceeds ${maxLength} characters.`,
    );
  }
  return normalized;
}

function parseOptionalNullableString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "VALIDATION_ERROR", `${fieldName} must be a string.`);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      `${fieldName} exceeds ${maxLength} characters.`,
    );
  }

  return normalized.length === 0 ? null : normalized;
}

function parseFinalizeMemoryBody(
  body: unknown,
  maxImageUploadBytes: number,
  maxAudioUploadBytes: number,
): {
  idempotencyKeyFromBody: string | null;
  title: string;
  room: string | null;
  body: string | null;
  media: FinalizeMediaInput[];
} {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
  }

  const payload = body as Record<string, unknown>;
  const idempotencyKeyRaw = payload["idempotency_key"];
  const idempotencyKeyFromBody =
    typeof idempotencyKeyRaw === "string" && idempotencyKeyRaw.trim().length > 0
      ? idempotencyKeyRaw.trim()
      : null;
  const title = parseNonEmptyString(payload["title"], "title", MEMORY_TITLE_MAX_LENGTH);
  const room = parseOptionalNullableString(payload["room"], "room", MEMORY_ROOM_MAX_LENGTH);
  const memoryBody = parseOptionalNullableString(
    payload["body"],
    "body",
    MEMORY_BODY_MAX_LENGTH,
  );

  if (!Array.isArray(payload["media"])) {
    throw new HttpError(400, "VALIDATION_ERROR", "media must be an array.");
  }

  const mediaInput = payload["media"] as unknown[];
  if (mediaInput.length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "media must include at least one item.");
  }

  let imageCount = 0;
  let audioCount = 0;
  const seenMediaIds = new Set<string>();
  const parsedMedia: FinalizeMediaInput[] = [];

  for (let index = 0; index < mediaInput.length; index += 1) {
    const entry = mediaInput[index];
    if (!entry || typeof entry !== "object") {
      throw new HttpError(400, "VALIDATION_ERROR", "media items must be objects.");
    }
    const mediaPayload = entry as Record<string, unknown>;
    const mediaId = parseNonEmptyString(mediaPayload["media_id"], "media.media_id", 64);
    if (!isUuid(mediaId)) {
      throw new HttpError(400, "VALIDATION_ERROR", "media.media_id must be a UUID.");
    }
    if (seenMediaIds.has(mediaId)) {
      throw new HttpError(400, "VALIDATION_ERROR", "media.media_id values must be unique.");
    }
    seenMediaIds.add(mediaId);

    const type = parseNonEmptyString(mediaPayload["type"], "media.type", 16).toLowerCase();
    if (type !== "image" && type !== "audio") {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "media.type must be one of: image, audio.",
      );
    }
    const storageKey = parseNonEmptyString(
      mediaPayload["storage_key"],
      "media.storage_key",
      512,
    );
    const mimeType = parseNonEmptyString(mediaPayload["mime_type"], "media.mime_type", 128);
    const byteSize = mediaPayload["byte_size"];
    if (
      typeof byteSize !== "number" ||
      !Number.isFinite(byteSize) ||
      !Number.isInteger(byteSize) ||
      byteSize <= 0
    ) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "media.byte_size must be a positive integer.",
      );
    }

    if (type === "image") {
      imageCount += 1;
      if (imageCount > 1) {
        throw new HttpError(400, "VALIDATION_ERROR", "At most one image is allowed.");
      }
      if (byteSize > maxImageUploadBytes) {
        throw new HttpError(
          400,
          "IMAGE_TOO_LARGE",
          `media.byte_size exceeds ${maxImageUploadBytes} for image media.`,
        );
      }
    }
    if (type === "audio") {
      audioCount += 1;
      if (audioCount > 1) {
        throw new HttpError(400, "VALIDATION_ERROR", "At most one audio file is allowed.");
      }
      if (byteSize > maxAudioUploadBytes) {
        throw new HttpError(
          400,
          "AUDIO_TOO_LARGE",
          `media.byte_size exceeds ${maxAudioUploadBytes} for audio media.`,
        );
      }
    }

    const sortOrderRaw = mediaPayload["sort_order"];
    let sortOrder = index;
    if (sortOrderRaw !== undefined) {
      if (
        typeof sortOrderRaw !== "number" ||
        !Number.isFinite(sortOrderRaw) ||
        !Number.isInteger(sortOrderRaw) ||
        sortOrderRaw < 0
      ) {
        throw new HttpError(
          400,
          "VALIDATION_ERROR",
          "media.sort_order must be a non-negative integer.",
        );
      }
      sortOrder = sortOrderRaw;
    }

    parsedMedia.push({
      mediaId,
      type,
      storageKey,
      mimeType: normalizeMimeType(mimeType),
      byteSize,
      sortOrder,
    });
  }

  return {
    idempotencyKeyFromBody,
    title,
    room,
    body: memoryBody,
    media: parsedMedia,
  };
}

function resolveIdempotencyKey(
  idempotencyHeader: string | string[] | undefined,
  idempotencyKeyFromBody: string | null,
): string {
  const headerValue = Array.isArray(idempotencyHeader)
    ? idempotencyHeader[0]
    : idempotencyHeader;
  const normalizedHeader =
    typeof headerValue === "string" && headerValue.trim().length > 0
      ? headerValue.trim()
      : null;

  const resolved = normalizedHeader ?? idempotencyKeyFromBody;
  if (!resolved) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Idempotency-Key header (or idempotency_key in body) is required.",
    );
  }
  if (resolved.length > 200) {
    throw new HttpError(400, "VALIDATION_ERROR", "idempotency key exceeds 200 characters.");
  }
  return resolved;
}

function parseMemoryPatchBody(body: unknown): UpdateMemoryInput["patch"] {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
  }

  const payload = body as Record<string, unknown>;
  const patch: UpdateMemoryInput["patch"] = {};
  if ("title" in payload) {
    patch.title = parseNonEmptyString(payload["title"], "title", MEMORY_TITLE_MAX_LENGTH);
  }
  if ("room" in payload) {
    patch.room = parseOptionalNullableString(payload["room"], "room", MEMORY_ROOM_MAX_LENGTH);
  }
  if ("body" in payload) {
    patch.body = parseOptionalNullableString(payload["body"], "body", MEMORY_BODY_MAX_LENGTH);
  }

  if (Object.keys(patch).length === 0) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "PATCH payload must include at least one updatable field.",
    );
  }

  return patch;
}

function encodeCursor(memory: MemoryRecord): string {
  return `${memory.createdAt.toISOString()}|${memory.memoryId}`;
}

function decodeCursor(cursor: string): DecodedCursor {
  const parts = cursor.split("|");
  if (parts.length !== 2) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid cursor.");
  }
  const [createdAtIso, memoryId] = parts;
  if (!createdAtIso || Number.isNaN(Date.parse(createdAtIso))) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid cursor timestamp.");
  }
  if (!memoryId || !isUuid(memoryId)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid cursor memory id.");
  }

  return { createdAtIso, memoryId };
}

function toMemoryDetailResponse(detail: MemoryDetailRecord) {
  return memoryDetailResponseSchema.parse({
    memory: {
      memory_id: detail.memory.memoryId,
      client_id: detail.memory.clientId,
      practice_id: detail.memory.practiceId,
      title: detail.memory.title,
      room: detail.memory.room,
      body: detail.memory.body,
      tags: [],
      created_at: detail.memory.createdAt.toISOString(),
      updated_at: detail.memory.updatedAt.toISOString(),
      deleted_at: detail.memory.deletedAt ? detail.memory.deletedAt.toISOString() : null,
    },
    media: detail.media.map((item) => ({
      media_id: item.mediaId,
      memory_id: item.memoryId,
      type: item.type,
      storage_key: item.storageKey,
      mime_type: item.mimeType,
      byte_size: item.byteSize,
      sort_order: item.sortOrder,
      created_at: item.createdAt.toISOString(),
    })),
    transcript: detail.transcript
      ? {
          status: detail.transcript.status,
          text: detail.transcript.text,
          confidence: detail.transcript.confidence,
          updated_at: detail.transcript.updatedAt.toISOString(),
        }
      : null,
  });
}

function parseListMemoriesQuery(query: unknown): { pageSize: number; cursor: DecodedCursor | null } {
  const parsed = cursorPaginationQuerySchema.parse(query ?? {});
  return {
    pageSize: parsed.page_size ?? DEFAULT_MEMORY_LIST_PAGE_SIZE,
    cursor: parsed.cursor ? decodeCursor(parsed.cursor) : null,
  };
}

function requirePracticeIdForProtectedRoute(request: {
  id: string;
  method: string;
  url: string;
  auth: JWTPayload | null;
  log: { warn: (payload: Record<string, unknown>, message: string) => void };
}): string {
  if (!request.auth) {
    throw new HttpError(401, "UNAUTHORIZED", "Bearer token is required.");
  }

  const practiceId = readStringClaim(request.auth, "practice_id");
  if (!practiceId) {
    request.log.warn(
      {
        event: "authz_denied",
        reason: "missing_practice_scope",
        status_code: 403,
        request_id: request.id,
        method: request.method,
        route: normalizePath(request.url),
        actor_hash: hashActorId(readStringClaim(request.auth, "user_id")),
      },
      "Authorization denied.",
    );
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Insufficient permissions for requested resource.",
    );
  }

  return practiceId;
}

function requireMemoryRepository(
  memoryRepository: MemoryRepository | null | undefined,
  request: {
    id: string;
    log: { error: (payload: Record<string, unknown>, message: string) => void };
  },
): MemoryRepository {
  if (memoryRepository) {
    return memoryRepository;
  }

  request.log.error(
    { request_id: request.id },
    "Memory repository unavailable due to missing database configuration.",
  );
  throw new HttpError(503, "SERVICE_UNAVAILABLE", "Memory service is not configured.");
}

function resolveJwtAuthConfig(options?: BuildAppOptions): JwtAuthConfig {
  const issuerRaw = options?.jwtAuth?.issuer ?? process.env["JWT_ISSUER"];
  const audienceRaw = options?.jwtAuth?.audience ?? process.env["JWT_AUDIENCE"];
  const jwksUriRaw = options?.jwtAuth?.jwksUri ?? process.env["JWT_JWKS_URI"];

  const issuer = typeof issuerRaw === "string" ? issuerRaw.trim() : "";
  const audience = typeof audienceRaw === "string" ? audienceRaw.trim() : "";
  const jwksUri = typeof jwksUriRaw === "string" ? jwksUriRaw.trim() : "";

  const missing: string[] = [];
  if (!issuer) missing.push("JWT_ISSUER");
  if (!audience) missing.push("JWT_AUDIENCE");
  if (!jwksUri) missing.push("JWT_JWKS_URI");

  if (missing.length > 0) {
    throw new Error(
      `Missing JWT auth config: ${missing.join(", ")}. Set these in the repo root .env (see .env.example), ` +
        `or run a local JWKS helper from the repo root: npm run dev:local-auth — then copy the printed values into .env (README Quick start).`,
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
  const imageUploadMaxBytes = resolveImageUploadMaxBytes(options);
  const audioUploadMaxBytes = resolveAudioUploadMaxBytes(options);
  const uploadSigner = options?.uploadSigner ?? createDefaultUploadSigner();
  const playbackSigner = options?.playbackSigner ?? createDefaultPlaybackSigner();
  const defaultMediaLookup = options?.mediaLookup ? null : createDefaultMediaLookup();
  const mediaLookup = options?.mediaLookup ?? defaultMediaLookup?.lookup;
  const defaultMemoryRepository = options?.memoryRepository
    ? null
    : createDefaultMemoryRepository();
  const memoryRepository = options?.memoryRepository ?? defaultMemoryRepository?.repository;

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

  if (defaultMediaLookup?.close) {
    app.addHook("onClose", async () => {
      await defaultMediaLookup.close?.();
    });
  }
  if (defaultMemoryRepository?.close) {
    app.addHook("onClose", async () => {
      await defaultMemoryRepository.close?.();
    });
  }

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
    const body = { status: "ok" as const, service: "legacy-api" };
    return healthResponseSchema.parse(body);
  });

  app.get(`${API_PREFIX}`, async () => {
    return {
      status: "ok" as const,
      service: "legacy-api",
      version: "v1" as const,
    };
  });

  app.post(`${API_PREFIX}/uploads/images/sign`, async (request) => {
    const practiceId = requirePracticeIdForProtectedRoute(request);
    const { mimeType, byteSize } = parseImageUploadSignBody(
      request.body as unknown,
      imageUploadMaxBytes,
    );
    const mediaId = randomUUID();

    try {
      const signed = await uploadSigner({
        practiceId,
        mediaId,
        mediaType: "image",
        mimeType,
        byteSize,
      });

      return {
        media_id: mediaId,
        storage_key: signed.storageKey,
        upload_url: signed.uploadUrl,
        upload_method: "PUT" as const,
        required_headers: signed.requiredHeaders,
        expires_at: signed.expiresAt,
      };
    } catch (error) {
      request.log.error(
        { err: error, request_id: request.id },
        "Image upload signer unavailable.",
      );
      throw new HttpError(503, "SIGNER_UNAVAILABLE", "Unable to issue upload URL.");
    }
  });

  app.post(`${API_PREFIX}/uploads/audio/sign`, async (request) => {
    const practiceId = requirePracticeIdForProtectedRoute(request);
    const { mimeType, byteSize } = parseAudioUploadSignBody(
      request.body as unknown,
      audioUploadMaxBytes,
    );
    const mediaId = randomUUID();

    try {
      const signed = await uploadSigner({
        practiceId,
        mediaId,
        mediaType: "audio",
        mimeType,
        byteSize,
      });

      return {
        media_id: mediaId,
        storage_key: signed.storageKey,
        upload_url: signed.uploadUrl,
        upload_method: "PUT" as const,
        required_headers: signed.requiredHeaders,
        expires_at: signed.expiresAt,
      };
    } catch (error) {
      request.log.error(
        { err: error, request_id: request.id },
        "Audio upload signer unavailable.",
      );
      throw new HttpError(503, "SIGNER_UNAVAILABLE", "Unable to issue upload URL.");
    }
  });

  app.post(`${API_PREFIX}/clients/:clientId/memories`, async (request) => {
    requireGuideMutationRole(request);
    const practiceId = requirePracticeIdForProtectedRoute(request);
    const actorUserId = requireActorUserIdForMutation(request);
    const clientId = getPathParam(request.params, "clientId");
    if (!clientId || !isUuid(clientId)) {
      throw new HttpError(400, "VALIDATION_ERROR", "clientId path parameter must be a UUID.");
    }

    const parsedBody = parseFinalizeMemoryBody(
      request.body as unknown,
      imageUploadMaxBytes,
      audioUploadMaxBytes,
    );
    const idempotencyKey = resolveIdempotencyKey(
      request.headers["idempotency-key"],
      parsedBody.idempotencyKeyFromBody,
    );

    const repo = requireMemoryRepository(memoryRepository, request);
    const detail = await repo.finalizeMemory({
      practiceId,
      clientId,
      actorUserId,
      idempotencyKey,
      title: parsedBody.title,
      room: parsedBody.room,
      body: parsedBody.body,
      media: parsedBody.media,
      requestId: request.id,
    });

    return toMemoryDetailResponse(detail);
  });

  app.get(`${API_PREFIX}/clients/:clientId/memories`, async (request) => {
    const practiceId = requirePracticeIdForProtectedRoute(request);
    const clientId = getPathParam(request.params, "clientId");
    if (!clientId || !isUuid(clientId)) {
      throw new HttpError(400, "VALIDATION_ERROR", "clientId path parameter must be a UUID.");
    }

    const { pageSize, cursor } = parseListMemoriesQuery(request.query);
    const repo = requireMemoryRepository(memoryRepository, request);
    const { items, nextCursor } = await repo.listMemories({
      practiceId,
      clientId,
      pageSize,
      cursor,
    });
    const thumbnailMap = await repo.listThumbnailMediaIds(items.map((item) => item.memoryId));

    return memoryListResponseSchema.parse({
      items: items.map((item) => ({
        memory_id: item.memoryId,
        client_id: item.clientId,
        practice_id: item.practiceId,
        title: item.title,
        room: item.room,
        created_at: item.createdAt.toISOString(),
        updated_at: item.updatedAt.toISOString(),
        thumbnail_media_id: thumbnailMap.get(item.memoryId) ?? null,
      })),
      next_cursor: nextCursor,
      page_size: pageSize,
    });
  });

  app.get(`${API_PREFIX}/clients/:clientId/memories/:memoryId`, async (request) => {
    const practiceId = requirePracticeIdForProtectedRoute(request);
    const clientId = getPathParam(request.params, "clientId");
    const memoryId = getPathParam(request.params, "memoryId");
    if (!clientId || !isUuid(clientId)) {
      throw new HttpError(400, "VALIDATION_ERROR", "clientId path parameter must be a UUID.");
    }
    if (!memoryId || !isUuid(memoryId)) {
      throw new HttpError(400, "VALIDATION_ERROR", "memoryId path parameter must be a UUID.");
    }

    const repo = requireMemoryRepository(memoryRepository, request);
    const detail = await repo.getMemoryDetail({
      practiceId,
      clientId,
      memoryId,
    });
    if (!detail) {
      throw new HttpError(404, "NOT_FOUND", "Memory not found.");
    }
    return toMemoryDetailResponse(detail);
  });

  app.patch(`${API_PREFIX}/clients/:clientId/memories/:memoryId`, async (request) => {
    requireGuideMutationRole(request);
    const practiceId = requirePracticeIdForProtectedRoute(request);
    const actorUserId = requireActorUserIdForMutation(request);
    const clientId = getPathParam(request.params, "clientId");
    const memoryId = getPathParam(request.params, "memoryId");
    if (!clientId || !isUuid(clientId)) {
      throw new HttpError(400, "VALIDATION_ERROR", "clientId path parameter must be a UUID.");
    }
    if (!memoryId || !isUuid(memoryId)) {
      throw new HttpError(400, "VALIDATION_ERROR", "memoryId path parameter must be a UUID.");
    }

    const patch = parseMemoryPatchBody(request.body as unknown);
    const repo = requireMemoryRepository(memoryRepository, request);
    const detail = await repo.updateMemory({
      practiceId,
      clientId,
      memoryId,
      actorUserId,
      requestId: request.id,
      patch,
    });
    if (!detail) {
      throw new HttpError(404, "NOT_FOUND", "Memory not found.");
    }

    return toMemoryDetailResponse(detail);
  });

  app.delete(`${API_PREFIX}/clients/:clientId/memories/:memoryId`, async (request, reply) => {
    requireGuideMutationRole(request);
    const practiceId = requirePracticeIdForProtectedRoute(request);
    const actorUserId = requireActorUserIdForMutation(request);
    const clientId = getPathParam(request.params, "clientId");
    const memoryId = getPathParam(request.params, "memoryId");
    if (!clientId || !isUuid(clientId)) {
      throw new HttpError(400, "VALIDATION_ERROR", "clientId path parameter must be a UUID.");
    }
    if (!memoryId || !isUuid(memoryId)) {
      throw new HttpError(400, "VALIDATION_ERROR", "memoryId path parameter must be a UUID.");
    }

    const repo = requireMemoryRepository(memoryRepository, request);
    const deleted = await repo.softDeleteMemory({
      practiceId,
      clientId,
      memoryId,
      actorUserId,
      requestId: request.id,
    });
    if (!deleted) {
      throw new HttpError(404, "NOT_FOUND", "Memory not found.");
    }
    return reply.status(204).send();
  });

  app.post(`${API_PREFIX}/memory-media/:mediaId/sign-read`, async (request) => {
    const mediaId = getPathParam(request.params, "mediaId");
    if (!mediaId) {
      throw new HttpError(400, "VALIDATION_ERROR", "mediaId path parameter is required.");
    }

    const practiceId = requirePracticeIdForProtectedRoute(request);

    let mediaRecord: MediaLookupRecord | null = null;
    try {
      mediaRecord = mediaLookup ? await mediaLookup(mediaId) : null;
    } catch (error) {
      request.log.error(
        { err: error, request_id: request.id },
        "Playback media lookup unavailable.",
      );
      throw new HttpError(503, "LOOKUP_UNAVAILABLE", "Unable to resolve playback media.");
    }

    if (!mediaRecord) {
      throw new HttpError(404, "NOT_FOUND", "Media not found.");
    }

    if (mediaRecord.practiceId !== practiceId) {
      logAuthzDenied(request, "practice_scope_mismatch", mediaRecord.clientId, true);
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Insufficient permissions for requested resource.",
      );
    }
    enforceClientScopeForTargetClient(request, mediaRecord.clientId, true);

    try {
      const signed = await playbackSigner(mediaRecord);
      return {
        media_id: mediaRecord.mediaId,
        memory_id: mediaRecord.memoryId,
        read_url: signed.readUrl,
        read_method: "GET" as const,
        mime_type: mediaRecord.mimeType,
        expires_at: signed.expiresAt,
      };
    } catch (error) {
      request.log.error(
        { err: error, request_id: request.id },
        "Playback signer unavailable.",
      );
      throw new HttpError(503, "SIGNER_UNAVAILABLE", "Unable to issue read URL.");
    }
  });

  return app;
}
