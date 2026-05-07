import { Storage } from "@google-cloud/storage";

type UploadSignerInput = {
  practiceId: string;
  mediaId: string;
  mediaType: "image" | "audio";
  mimeType: string;
  byteSize: number;
};

type UploadSignerResult = {
  uploadUrl: string;
  storageKey: string;
  expiresAt: string;
  requiredHeaders: Record<string, string>;
};

type PlaybackSignerInput = {
  storageKey: string;
  mimeType: string;
};

type PlaybackSignerResult = {
  readUrl: string;
  expiresAt: string;
};

export type GcsSignerConfig = {
  bucket: string;
  uploadUrlTtlSeconds?: number;
  playbackUrlTtlSeconds?: number;
};

const DEFAULT_UPLOAD_TTL_SECONDS = 5 * 60;
const DEFAULT_PLAYBACK_TTL_SECONDS = 5 * 60;

function buildStorageKey(input: UploadSignerInput): string {
  const segment = input.mediaType === "image" ? "images" : "audio";
  return `${input.practiceId}/uploads/${segment}/${input.mediaId}`;
}

/**
 * Issues V4 signed URLs for direct browser PUT uploads to a Cloud Storage bucket.
 * The storage key contract matches `parseFinalizeMemoryBody` in `app.ts`:
 * `{practiceId}/uploads/{images|audio}/{mediaId}`.
 *
 * On Cloud Run with default credentials, signing requires the runtime service
 * account to hold `roles/iam.serviceAccountTokenCreator` on itself so the
 * IAM Service Account Credentials API can produce the signature without a
 * downloaded key file.
 */
export function createGcsUploadSigner(
  config: GcsSignerConfig,
): (input: UploadSignerInput) => Promise<UploadSignerResult> {
  const storage = new Storage();
  const bucket = storage.bucket(config.bucket);
  const ttlSeconds = config.uploadUrlTtlSeconds ?? DEFAULT_UPLOAD_TTL_SECONDS;

  return async (input) => {
    const storageKey = buildStorageKey(input);
    const expiresAtMs = Date.now() + ttlSeconds * 1000;

    const [uploadUrl] = await bucket.file(storageKey).getSignedUrl({
      version: "v4",
      action: "write",
      expires: expiresAtMs,
      contentType: input.mimeType,
    });

    return {
      uploadUrl,
      storageKey,
      expiresAt: new Date(expiresAtMs).toISOString(),
      requiredHeaders: {
        "content-type": input.mimeType,
      },
    };
  };
}

/**
 * Issues V4 signed URLs for short-lived browser GET reads against the same
 * Cloud Storage bucket. Bucket should be private (uniform bucket-level access)
 * and accessed only via these short-lived URLs.
 */
export function createGcsPlaybackSigner(
  config: GcsSignerConfig,
): (input: PlaybackSignerInput) => Promise<PlaybackSignerResult> {
  const storage = new Storage();
  const bucket = storage.bucket(config.bucket);
  const ttlSeconds = config.playbackUrlTtlSeconds ?? DEFAULT_PLAYBACK_TTL_SECONDS;

  return async (input) => {
    const expiresAtMs = Date.now() + ttlSeconds * 1000;

    const [readUrl] = await bucket.file(input.storageKey).getSignedUrl({
      version: "v4",
      action: "read",
      expires: expiresAtMs,
      responseType: input.mimeType,
    });

    return {
      readUrl,
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  };
}
