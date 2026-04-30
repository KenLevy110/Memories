CREATE TYPE "public"."memory_media_type" AS ENUM('image', 'audio', 'video');--> statement-breakpoint
CREATE TYPE "public"."transcript_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."transcription_job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"practice_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"memory_id" uuid,
	"actor_user_id" uuid,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" uuid,
	"action" varchar(64) NOT NULL,
	"request_id" varchar(128) NOT NULL,
	"ip_address" varchar(64),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"practice_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"title" varchar(120) NOT NULL,
	"room" varchar(80),
	"body" text,
	"sharing_visibility" varchar(32) DEFAULT 'practice' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "memory_media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"memory_id" uuid NOT NULL,
	"practice_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"type" "memory_media_type" NOT NULL,
	"storage_key" varchar(512) NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"byte_size" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "memory_transcripts" (
	"memory_id" uuid PRIMARY KEY NOT NULL,
	"practice_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" "transcript_status" DEFAULT 'pending' NOT NULL,
	"text" text,
	"confidence" integer,
	"vendor_reference" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcription_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"memory_id" uuid NOT NULL,
	"media_id" uuid,
	"practice_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" "transcription_job_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_media" ADD CONSTRAINT "memory_media_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_transcripts" ADD CONSTRAINT "memory_transcripts_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcription_jobs" ADD CONSTRAINT "transcription_jobs_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcription_jobs" ADD CONSTRAINT "transcription_jobs_media_id_memory_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."memory_media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_practice_client_created_idx" ON "audit_events" USING btree ("practice_id","client_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_request_id_idx" ON "audit_events" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "audit_events_memory_created_idx" ON "audit_events" USING btree ("memory_id","created_at");--> statement-breakpoint
CREATE INDEX "memories_practice_client_created_idx" ON "memories" USING btree ("practice_id","client_id","created_at");--> statement-breakpoint
CREATE INDEX "memories_client_created_idx" ON "memories" USING btree ("client_id","created_at");--> statement-breakpoint
CREATE INDEX "memory_media_memory_sort_order_idx" ON "memory_media" USING btree ("memory_id","sort_order");--> statement-breakpoint
CREATE INDEX "memory_media_practice_client_idx" ON "memory_media" USING btree ("practice_id","client_id");--> statement-breakpoint
CREATE INDEX "memory_transcripts_practice_client_status_idx" ON "memory_transcripts" USING btree ("practice_id","client_id","status");--> statement-breakpoint
CREATE INDEX "transcription_jobs_memory_status_idx" ON "transcription_jobs" USING btree ("memory_id","status");--> statement-breakpoint
CREATE INDEX "transcription_jobs_practice_client_created_idx" ON "transcription_jobs" USING btree ("practice_id","client_id","created_at");