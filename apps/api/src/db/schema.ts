import { sql } from "drizzle-orm";
import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const memoryMediaTypeEnum = pgEnum("memory_media_type", [
  "image",
  "audio",
  "video",
]);

export const transcriptStatusEnum = pgEnum("transcript_status", [
  "pending",
  "ready",
  "failed",
]);

export const transcriptionJobStatusEnum = pgEnum("transcription_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey(),
    practiceId: uuid("practice_id").notNull(),
    clientId: uuid("client_id").notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    room: varchar("room", { length: 80 }),
    body: text("body"),
    sharingVisibility: varchar("sharing_visibility", { length: 32 })
      .notNull()
      .default("practice"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    practiceClientCreatedIdx: index("memories_practice_client_created_idx").on(
      table.practiceId,
      table.clientId,
      table.createdAt,
    ),
    clientCreatedIdx: index("memories_client_created_idx").on(table.clientId, table.createdAt),
  }),
);

export const memoryMedia = pgTable(
  "memory_media",
  {
    id: uuid("id").primaryKey(),
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    practiceId: uuid("practice_id").notNull(),
    clientId: uuid("client_id").notNull(),
    type: memoryMediaTypeEnum("type").notNull(),
    storageKey: varchar("storage_key", { length: 512 }).notNull(),
    mimeType: varchar("mime_type", { length: 128 }).notNull(),
    byteSize: integer("byte_size").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    memorySortOrderIdx: index("memory_media_memory_sort_order_idx").on(table.memoryId, table.sortOrder),
    practiceClientIdx: index("memory_media_practice_client_idx").on(table.practiceId, table.clientId),
  }),
);

export const memoryTranscripts = pgTable(
  "memory_transcripts",
  {
    memoryId: uuid("memory_id")
      .primaryKey()
      .references(() => memories.id, { onDelete: "cascade" }),
    practiceId: uuid("practice_id").notNull(),
    clientId: uuid("client_id").notNull(),
    status: transcriptStatusEnum("status").notNull().default("pending"),
    text: text("text"),
    confidence: doublePrecision("confidence"),
    vendorReference: varchar("vendor_reference", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    practiceClientStatusIdx: index("memory_transcripts_practice_client_status_idx").on(
      table.practiceId,
      table.clientId,
      table.status,
    ),
  }),
);

export const transcriptionJobs = pgTable(
  "transcription_jobs",
  {
    id: uuid("id").primaryKey(),
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id").references(() => memoryMedia.id, { onDelete: "set null" }),
    practiceId: uuid("practice_id").notNull(),
    clientId: uuid("client_id").notNull(),
    status: transcriptionJobStatusEnum("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    memoryStatusIdx: index("transcription_jobs_memory_status_idx").on(table.memoryId, table.status),
    practiceClientCreatedIdx: index("transcription_jobs_practice_client_created_idx").on(
      table.practiceId,
      table.clientId,
      table.createdAt,
    ),
  }),
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey(),
    practiceId: uuid("practice_id").notNull(),
    clientId: uuid("client_id").notNull(),
    memoryId: uuid("memory_id").references(() => memories.id, { onDelete: "set null" }),
    actorUserId: uuid("actor_user_id"),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: uuid("entity_id"),
    action: varchar("action", { length: 64 }).notNull(),
    requestId: varchar("request_id", { length: 128 }).notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    practiceClientCreatedIdx: index("audit_events_practice_client_created_idx").on(
      table.practiceId,
      table.clientId,
      table.createdAt,
    ),
    requestIdIdx: index("audit_events_request_id_idx").on(table.requestId),
    memoryCreatedIdx: index("audit_events_memory_created_idx").on(table.memoryId, table.createdAt),
  }),
);
