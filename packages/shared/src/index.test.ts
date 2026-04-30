import { describe, it, expect } from "vitest";
import {
  CURSOR_MAX_LENGTH,
  DEFAULT_PAGE_SIZE,
  ERROR_MESSAGE_MAX_LENGTH,
  MEMORY_TITLE_MAX_LENGTH,
  apiErrorSchema,
  cursorPaginationQuerySchema,
  healthResponseSchema,
  memoryDetailResponseSchema,
  memoryListResponseSchema,
  serviceName,
} from "./index.js";

const now = "2026-04-30T18:00:00.000Z";
const memoryId = "f9a60942-758b-46de-96ad-b637f300f0aa";
const clientId = "0e8f2a03-d6fc-4a99-a67e-26263ec04f83";
const practiceId = "11af3a35-d1f8-4823-aec9-75dd0d8e4f93";
const mediaId = "9279ea09-f589-4329-a67a-cdfb9151ca6b";

describe("shared", () => {
  it("exports service name", () => {
    expect(serviceName).toBe("legacy");
  });

  it("validates health response", () => {
    const parsed = healthResponseSchema.parse({
      status: "ok",
      service: "test",
    });
    expect(parsed.status).toBe("ok");
  });

  it("parses cursor pagination query and applies default page size", () => {
    const parsed = cursorPaginationQuerySchema.parse({});
    expect(parsed.page_size).toBe(DEFAULT_PAGE_SIZE);
    expect(parsed.cursor).toBeUndefined();
  });

  it("rejects cursor longer than max length", () => {
    const result = cursorPaginationQuerySchema.safeParse({
      cursor: "c".repeat(CURSOR_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("parses empty list response", () => {
    const parsed = memoryListResponseSchema.parse({
      items: [],
      next_cursor: null,
      page_size: DEFAULT_PAGE_SIZE,
    });
    expect(parsed.items).toHaveLength(0);
  });

  it("accepts memory title at max length in detail response", () => {
    const parsed = memoryDetailResponseSchema.parse({
      memory: {
        memory_id: memoryId,
        client_id: clientId,
        practice_id: practiceId,
        title: "t".repeat(MEMORY_TITLE_MAX_LENGTH),
        room: "Kitchen",
        body: null,
        tags: ["ring", "family"],
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      media: [
        {
          media_id: mediaId,
          memory_id: memoryId,
          type: "image",
          storage_key: "practice/memory/media",
          mime_type: "image/jpeg",
          byte_size: 1024,
          sort_order: 0,
          created_at: now,
        },
      ],
      transcript: {
        status: "ready",
        text: "A complete transcript.",
        confidence: 0.94,
        updated_at: now,
      },
    });
    expect(parsed.memory.title).toHaveLength(MEMORY_TITLE_MAX_LENGTH);
  });

  it("rejects memory title beyond max length", () => {
    const result = memoryDetailResponseSchema.safeParse({
      memory: {
        memory_id: memoryId,
        client_id: clientId,
        practice_id: practiceId,
        title: "t".repeat(MEMORY_TITLE_MAX_LENGTH + 1),
        room: null,
        body: null,
        tags: [],
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      media: [],
      transcript: null,
    });
    expect(result.success).toBe(false);
  });

  it("accepts max-length API error message", () => {
    const parsed = apiErrorSchema.parse({
      code: "VALIDATION_FAILED",
      message: "m".repeat(ERROR_MESSAGE_MAX_LENGTH),
      request_id: "req-123",
    });
    expect(parsed.code).toBe("VALIDATION_FAILED");
  });
});
