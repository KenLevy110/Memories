import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { SignJWT, exportJWK, generateKeyPair, type JWTPayload } from "jose";
import { buildApp } from "../app.js";

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

export type InMemoryApiHarness = {
  app: ReturnType<typeof buildApp>;
  createToken: (payload?: JWTPayload) => Promise<string>;
  dispose: () => Promise<void>;
  signedImageUploadUrl: string;
  signedAudioUploadUrl: string;
  signedPlaybackReadUrl: string;
  allowedPlaybackMediaId: string;
  deniedPlaybackMediaId: string;
  allowedPlaybackMemoryId: string;
  deniedPlaybackMemoryId: string;
  playbackPracticeId: string;
  playbackClientId: string;
  hiddenClientId: string;
};

export async function createInMemoryApiHarness(): Promise<InMemoryApiHarness> {
  const signedImageUploadUrl = "https://signed-upload.memories.test/put";
  const signedAudioUploadUrl = "https://signed-upload.memories.test/audio-put";
  const signedPlaybackReadUrl = "https://signed-upload.memories.test/read";
  const allowedPlaybackMediaId = "11111111-1111-4111-8111-111111111111";
  const deniedPlaybackMediaId = "22222222-2222-4222-8222-222222222222";
  const allowedPlaybackMemoryId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const deniedPlaybackMemoryId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const playbackPracticeId = "8e7ac795-5538-4dd7-9cbf-61fe8f0929bb";
  const playbackClientId = "3f0f94b7-035f-4a62-98cc-28aedf34b4d2";
  const hiddenClientId = "5d2ef2ef-4aa4-41e9-bd3b-fa007e81940b";
  const playbackMediaById = new Map([
    [
      allowedPlaybackMediaId,
      {
        mediaId: allowedPlaybackMediaId,
        memoryId: allowedPlaybackMemoryId,
        practiceId: playbackPracticeId,
        clientId: playbackClientId,
        storageKey: `${playbackPracticeId}/memories/${allowedPlaybackMemoryId}/audio/${allowedPlaybackMediaId}`,
        mimeType: "audio/webm",
      },
    ],
    [
      deniedPlaybackMediaId,
      {
        mediaId: deniedPlaybackMediaId,
        memoryId: deniedPlaybackMemoryId,
        practiceId: playbackPracticeId,
        clientId: hiddenClientId,
        storageKey: `${playbackPracticeId}/memories/${deniedPlaybackMemoryId}/audio/${deniedPlaybackMediaId}`,
        mimeType: "audio/webm",
      },
    ],
  ]);
  const memoriesById = new Map<
    string,
    {
      memoryId: string;
      practiceId: string;
      clientId: string;
      title: string;
      room: string | null;
      body: string | null;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    }
  >();
  const mediaByMemoryId = new Map<
    string,
    Array<{
      mediaId: string;
      memoryId: string;
      type: "image" | "audio" | "video";
      storageKey: string;
      mimeType: string;
      byteSize: number;
      sortOrder: number;
      createdAt: Date;
    }>
  >();
  const idempotencyToMemoryId = new Map<string, string>();

  function getMemoryDetail(memoryId: string) {
    const memory = memoriesById.get(memoryId);
    if (!memory || memory.deletedAt) {
      return null;
    }
    const media = (mediaByMemoryId.get(memoryId) ?? []).slice().sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return {
      memory,
      media,
      transcript: null,
    };
  }

  const keyPair = await generateKeyPair("RS256");
  const privateKey = keyPair.privateKey;
  const publicJwk = await exportJWK(keyPair.publicKey);
  const kid = "memories-test-key";
  const jwks = {
    keys: [{ ...publicJwk, kid }],
  };
  const jwksServer = await startJwksServer(jwks);

  const app = buildApp({
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
    mediaLookup: async (mediaId) => playbackMediaById.get(mediaId) ?? null,
    playbackSigner: async () => ({
      readUrl: signedPlaybackReadUrl,
      expiresAt: "2026-05-01T00:00:00.000Z",
    }),
    memoryRepository: {
      finalizeMemory: async ({
        practiceId,
        clientId,
        actorUserId,
        idempotencyKey,
        title,
        room,
        body,
        media,
      }) => {
        const idempotencyMapKey = `${practiceId}|${clientId}|${actorUserId}|${idempotencyKey}`;
        const existingMemoryId = idempotencyToMemoryId.get(idempotencyMapKey);
        if (existingMemoryId) {
          const existing = getMemoryDetail(existingMemoryId);
          if (!existing) {
            throw new Error("Expected existing memory for idempotent replay.");
          }
          return existing;
        }

        const memoryId = randomUUID();
        const now = new Date();
        memoriesById.set(memoryId, {
          memoryId,
          practiceId,
          clientId,
          title,
          room,
          body,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });
        mediaByMemoryId.set(
          memoryId,
          media.map((item) => ({
            mediaId: item.mediaId,
            memoryId,
            type: item.type,
            storageKey: item.storageKey,
            mimeType: item.mimeType,
            byteSize: item.byteSize,
            sortOrder: item.sortOrder,
            createdAt: new Date(now.getTime() + item.sortOrder),
          })),
        );
        idempotencyToMemoryId.set(idempotencyMapKey, memoryId);

        for (const item of media) {
          playbackMediaById.set(item.mediaId, {
            mediaId: item.mediaId,
            memoryId,
            practiceId,
            clientId,
            storageKey: item.storageKey,
            mimeType: item.mimeType,
          });
        }

        const created = getMemoryDetail(memoryId);
        if (!created) {
          throw new Error("Expected created memory detail.");
        }
        return created;
      },
      listMemories: async ({ practiceId, clientId, pageSize, cursor }) => {
        const sorted = [...memoriesById.values()]
          .filter(
            (item) =>
              !item.deletedAt && item.practiceId === practiceId && item.clientId === clientId,
          )
          .sort((a, b) => {
            const byCreatedAt = b.createdAt.getTime() - a.createdAt.getTime();
            if (byCreatedAt !== 0) {
              return byCreatedAt;
            }
            return b.memoryId.localeCompare(a.memoryId);
          });

        const filtered = cursor
          ? sorted.filter((item) => {
              const itemCreatedAt = item.createdAt.toISOString();
              if (itemCreatedAt < cursor.createdAtIso) {
                return true;
              }
              if (itemCreatedAt > cursor.createdAtIso) {
                return false;
              }
              return item.memoryId < cursor.memoryId;
            })
          : sorted;

        const page = filtered.slice(0, pageSize);
        const hasMore = filtered.length > pageSize;
        return {
          items: page,
          nextCursor:
            hasMore && page.length > 0
              ? `${page[page.length - 1]!.createdAt.toISOString()}|${page[page.length - 1]!.memoryId}`
              : null,
        };
      },
      listThumbnailMediaIds: async (memoryIds) => {
        const map = new Map<string, string | null>();
        for (const memoryId of memoryIds) {
          const memoryMedia = (mediaByMemoryId.get(memoryId) ?? []).slice().sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) {
              return a.sortOrder - b.sortOrder;
            }
            return a.createdAt.getTime() - b.createdAt.getTime();
          });
          const thumbnail = memoryMedia.find((item) => item.type === "image");
          map.set(memoryId, thumbnail?.mediaId ?? null);
        }
        return map;
      },
      getMemoryDetail: async ({ memoryId, clientId, practiceId }) => {
        const detail = getMemoryDetail(memoryId);
        if (!detail) {
          return null;
        }
        if (
          detail.memory.clientId !== clientId ||
          detail.memory.practiceId !== practiceId ||
          detail.memory.deletedAt
        ) {
          return null;
        }
        return detail;
      },
      updateMemory: async ({ memoryId, practiceId, clientId, patch }) => {
        const existing = memoriesById.get(memoryId);
        if (
          !existing ||
          existing.deletedAt ||
          existing.practiceId !== practiceId ||
          existing.clientId !== clientId
        ) {
          return null;
        }

        const updated = {
          ...existing,
          title: patch.title ?? existing.title,
          room: patch.room !== undefined ? patch.room : existing.room,
          body: patch.body !== undefined ? patch.body : existing.body,
          updatedAt: new Date(),
        };
        memoriesById.set(memoryId, updated);
        return getMemoryDetail(memoryId);
      },
      softDeleteMemory: async ({ memoryId, practiceId, clientId }) => {
        const existing = memoriesById.get(memoryId);
        if (
          !existing ||
          existing.deletedAt ||
          existing.practiceId !== practiceId ||
          existing.clientId !== clientId
        ) {
          return false;
        }

        memoriesById.set(memoryId, {
          ...existing,
          deletedAt: new Date(),
          updatedAt: new Date(),
        });
        return true;
      },
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

  let disposed = false;
  async function dispose() {
    if (disposed) {
      return;
    }
    disposed = true;
    await app.close();
    await jwksServer.close();
  }

  async function createToken(payload: JWTPayload = {}) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "RS256", kid: "memories-test-key" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime("15m")
      .setIssuedAt()
      .sign(privateKey);
  }

  return {
    app,
    createToken,
    dispose,
    signedImageUploadUrl,
    signedAudioUploadUrl,
    signedPlaybackReadUrl,
    allowedPlaybackMediaId,
    deniedPlaybackMediaId,
    allowedPlaybackMemoryId,
    deniedPlaybackMemoryId,
    playbackPracticeId,
    playbackClientId,
    hiddenClientId,
  };
}
