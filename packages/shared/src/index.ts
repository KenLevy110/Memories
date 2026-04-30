import { z } from "zod";

export const serviceName = "memories" as const;

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const CURSOR_MAX_LENGTH = 256;
export const MEMORY_TITLE_MAX_LENGTH = 120;
export const MEMORY_ROOM_MAX_LENGTH = 80;
export const MEMORY_BODY_MAX_LENGTH = 4000;
export const MEMORY_TAG_MAX_LENGTH = 40;
export const ERROR_CODE_MAX_LENGTH = 64;
export const ERROR_MESSAGE_MAX_LENGTH = 500;
export const REQUEST_ID_MAX_LENGTH = 128;

const isoTimestampSchema = z.string().datetime({ offset: true });
const boundedText = (max: number) => z.string().trim().min(1).max(max);

export const cursorSchema = boundedText(CURSOR_MAX_LENGTH);
export type Cursor = z.infer<typeof cursorSchema>;

export const cursorPaginationQuerySchema = z
  .object({
    cursor: cursorSchema.optional(),
    page_size: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
  })
  .strict();
export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;

export const apiErrorSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1)
      .max(ERROR_CODE_MAX_LENGTH)
      .regex(/^[A-Z0-9_]+$/),
    message: boundedText(ERROR_MESSAGE_MAX_LENGTH),
    request_id: boundedText(REQUEST_ID_MAX_LENGTH),
  })
  .strict();
export type ApiError = z.infer<typeof apiErrorSchema>;

export const memoryMediaTypeSchema = z.enum(["image", "audio", "video"]);
export type MemoryMediaType = z.infer<typeof memoryMediaTypeSchema>;

export const memoryMediaDescriptorSchema = z
  .object({
    media_id: z.string().uuid(),
    memory_id: z.string().uuid(),
    type: memoryMediaTypeSchema,
    storage_key: boundedText(512),
    mime_type: boundedText(128),
    byte_size: z.number().int().nonnegative(),
    sort_order: z.number().int().min(0),
    created_at: isoTimestampSchema,
  })
  .strict();
export type MemoryMediaDescriptor = z.infer<typeof memoryMediaDescriptorSchema>;

export const transcriptStatusSchema = z.enum(["pending", "ready", "failed"]);
export type TranscriptStatus = z.infer<typeof transcriptStatusSchema>;

export const memoryTranscriptSchema = z
  .object({
    status: transcriptStatusSchema,
    text: z.string().max(20_000).nullable(),
    confidence: z.number().min(0).max(1).nullable(),
    updated_at: isoTimestampSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.status === "ready" && (!value.text || value.text.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ready transcripts must include text",
        path: ["text"],
      });
    }
  });
export type MemoryTranscript = z.infer<typeof memoryTranscriptSchema>;

export const memorySummarySchema = z
  .object({
    memory_id: z.string().uuid(),
    client_id: z.string().uuid(),
    practice_id: z.string().uuid(),
    title: boundedText(MEMORY_TITLE_MAX_LENGTH),
    room: z.string().trim().max(MEMORY_ROOM_MAX_LENGTH).nullable(),
    created_at: isoTimestampSchema,
    updated_at: isoTimestampSchema,
    thumbnail_media_id: z.string().uuid().nullable(),
  })
  .strict();
export type MemorySummary = z.infer<typeof memorySummarySchema>;

export const memoryListResponseSchema = z
  .object({
    items: z.array(memorySummarySchema),
    next_cursor: cursorSchema.nullable(),
    page_size: z.number().int().min(1).max(MAX_PAGE_SIZE),
  })
  .strict();
export type MemoryListResponse = z.infer<typeof memoryListResponseSchema>;

export const memoryTagSchema = boundedText(MEMORY_TAG_MAX_LENGTH);
export type MemoryTag = z.infer<typeof memoryTagSchema>;

export const memoryDetailSchema = z
  .object({
    memory_id: z.string().uuid(),
    client_id: z.string().uuid(),
    practice_id: z.string().uuid(),
    title: boundedText(MEMORY_TITLE_MAX_LENGTH),
    room: z.string().trim().max(MEMORY_ROOM_MAX_LENGTH).nullable(),
    body: z.string().max(MEMORY_BODY_MAX_LENGTH).nullable(),
    tags: z.array(memoryTagSchema).max(20),
    created_at: isoTimestampSchema,
    updated_at: isoTimestampSchema,
    deleted_at: isoTimestampSchema.nullable(),
  })
  .strict();
export type MemoryDetail = z.infer<typeof memoryDetailSchema>;

export const memoryDetailResponseSchema = z
  .object({
    memory: memoryDetailSchema,
    media: z.array(memoryMediaDescriptorSchema),
    transcript: memoryTranscriptSchema.nullable(),
  })
  .strict();
export type MemoryDetailResponse = z.infer<typeof memoryDetailResponseSchema>;
