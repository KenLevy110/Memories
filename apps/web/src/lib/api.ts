import {
  apiErrorSchema,
  memoryDetailResponseSchema,
  memoryListResponseSchema,
  type MemoryDetailResponse,
  type MemoryListResponse,
} from "@memories/shared";

const devTokenStorageKey = "memories.devBearerToken";

const apiBase =
  import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "") ?? "http://localhost:3000";

type UploadSignResponse = {
  media_id: string;
  storage_key: string;
  upload_url: string;
  upload_method: "PUT";
  required_headers: Record<string, string>;
  expires_at: string;
};

type PlaybackSignResponse = {
  media_id: string;
  memory_id: string;
  read_url: string;
  read_method: "GET";
  mime_type: string;
  expires_at: string;
};

export type FinalizeMemoryRequest = {
  title: string;
  room: string | null;
  body: string | null;
  media: Array<{
    media_id: string;
    type: "image" | "audio";
    storage_key: string;
    mime_type: string;
    byte_size: number;
    sort_order: number;
  }>;
};

export class ApiClientError extends Error {
  public readonly statusCode: number | null;
  public readonly code: string;
  public readonly requestId: string | null;
  public readonly retryable: boolean;

  constructor(options: {
    message: string;
    statusCode: number | null;
    code: string;
    requestId: string | null;
    retryable: boolean;
  }) {
    super(options.message);
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.requestId = options.requestId;
    this.retryable = options.retryable;
  }
}

function normalizeToken(rawToken: string | null | undefined): string | null {
  if (!rawToken) {
    return null;
  }
  const trimmed = rawToken.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getDevBearerToken(): string | null {
  const envToken = normalizeToken(import.meta.env.VITE_DEV_BEARER_TOKEN);
  if (envToken) {
    return envToken;
  }

  if (typeof window === "undefined") {
    return null;
  }
  return normalizeToken(window.localStorage.getItem(devTokenStorageKey));
}

export function setDevBearerToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(devTokenStorageKey, token.trim());
}

export function clearDevBearerToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(devTokenStorageKey);
}

function isRetryableStatus(statusCode: number): boolean {
  return statusCode >= 500 || statusCode === 408 || statusCode === 429;
}

function parseUploadSignResponse(payload: unknown): UploadSignResponse {
  if (!payload || typeof payload !== "object") {
    throw new ApiClientError({
      message: "Upload signer response is invalid.",
      statusCode: null,
      code: "INVALID_RESPONSE",
      requestId: null,
      retryable: false,
    });
  }
  const candidate = payload as Record<string, unknown>;
  const requiredHeadersRaw = candidate["required_headers"];
  if (!requiredHeadersRaw || typeof requiredHeadersRaw !== "object") {
    throw new ApiClientError({
      message: "Upload signer response is missing required headers.",
      statusCode: null,
      code: "INVALID_RESPONSE",
      requestId: null,
      retryable: false,
    });
  }
  const requiredHeaders = Object.entries(requiredHeadersRaw as Record<string, unknown>).reduce(
    (accumulator, [key, value]) => {
      if (typeof value !== "string") {
        throw new ApiClientError({
          message: "Upload signer response required headers are invalid.",
          statusCode: null,
          code: "INVALID_RESPONSE",
          requestId: null,
          retryable: false,
        });
      }
      accumulator[key] = value;
      return accumulator;
    },
    {} as Record<string, string>,
  );

  const mediaId = candidate["media_id"];
  const storageKey = candidate["storage_key"];
  const uploadUrl = candidate["upload_url"];
  const uploadMethod = candidate["upload_method"];
  const expiresAt = candidate["expires_at"];
  if (
    typeof mediaId !== "string" ||
    typeof storageKey !== "string" ||
    typeof uploadUrl !== "string" ||
    uploadMethod !== "PUT" ||
    typeof expiresAt !== "string"
  ) {
    throw new ApiClientError({
      message: "Upload signer response fields are invalid.",
      statusCode: null,
      code: "INVALID_RESPONSE",
      requestId: null,
      retryable: false,
    });
  }

  return {
    media_id: mediaId,
    storage_key: storageKey,
    upload_url: uploadUrl,
    upload_method: "PUT",
    required_headers: requiredHeaders,
    expires_at: expiresAt,
  };
}

function parsePlaybackSignResponse(payload: unknown): PlaybackSignResponse {
  if (!payload || typeof payload !== "object") {
    throw new ApiClientError({
      message: "Playback signer response is invalid.",
      statusCode: null,
      code: "INVALID_RESPONSE",
      requestId: null,
      retryable: false,
    });
  }
  const candidate = payload as Record<string, unknown>;
  const mediaId = candidate["media_id"];
  const memoryId = candidate["memory_id"];
  const readUrl = candidate["read_url"];
  const readMethod = candidate["read_method"];
  const mimeType = candidate["mime_type"];
  const expiresAt = candidate["expires_at"];
  if (
    typeof mediaId !== "string" ||
    typeof memoryId !== "string" ||
    typeof readUrl !== "string" ||
    readMethod !== "GET" ||
    typeof mimeType !== "string" ||
    typeof expiresAt !== "string"
  ) {
    throw new ApiClientError({
      message: "Playback signer response fields are invalid.",
      statusCode: null,
      code: "INVALID_RESPONSE",
      requestId: null,
      retryable: false,
    });
  }

  return {
    media_id: mediaId,
    memory_id: memoryId,
    read_url: readUrl,
    read_method: "GET",
    mime_type: mimeType,
    expires_at: expiresAt,
  };
}

async function parseApiError(response: Response): Promise<ApiClientError> {
  const rawPayload = await response.json().catch(() => null);
  const parsed = apiErrorSchema.safeParse(rawPayload);
  if (parsed.success) {
    return new ApiClientError({
      message: parsed.data.message,
      statusCode: response.status,
      code: parsed.data.code,
      requestId: parsed.data.request_id,
      retryable: isRetryableStatus(response.status),
    });
  }

  return new ApiClientError({
    message: `Request failed (${response.status})`,
    statusCode: response.status,
    code: "HTTP_ERROR",
    requestId: null,
    retryable: isRetryableStatus(response.status),
  });
}

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  const headers = new Headers(init?.headers);
  headers.set("accept", "application/json");

  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const bearerToken = getDevBearerToken();
  if (bearerToken) {
    headers.set("authorization", `Bearer ${bearerToken}`);
  }

  try {
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      throw await parseApiError(response);
    }

    if (response.status === 204) {
      return null;
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError({
      message: "Network request failed.",
      statusCode: null,
      code: "NETWORK_ERROR",
      requestId: null,
      retryable: true,
    });
  }
}

export function isRetryableApiError(error: unknown): boolean {
  return error instanceof ApiClientError && error.retryable;
}

export async function getMemories(
  clientId: string,
  cursor?: string | null,
): Promise<MemoryListResponse> {
  const search = new URLSearchParams();
  if (cursor) {
    search.set("cursor", cursor);
  }
  const query = search.size > 0 ? `?${search.toString()}` : "";
  const payload = await requestJson(`/api/v1/clients/${clientId}/memories${query}`);
  return memoryListResponseSchema.parse(payload);
}

export async function getMemoryDetail(
  clientId: string,
  memoryId: string,
): Promise<MemoryDetailResponse> {
  const payload = await requestJson(`/api/v1/clients/${clientId}/memories/${memoryId}`);
  return memoryDetailResponseSchema.parse(payload);
}

export async function signImageUpload(file: Blob): Promise<UploadSignResponse> {
  const mimeType = file.type || "image/jpeg";
  const payload = await requestJson("/api/v1/uploads/images/sign", {
    method: "POST",
    body: JSON.stringify({
      mime_type: mimeType,
      byte_size: file.size,
    }),
  });
  return parseUploadSignResponse(payload);
}

export async function signAudioUpload(file: Blob): Promise<UploadSignResponse> {
  const mimeType = file.type || "audio/webm";
  const payload = await requestJson("/api/v1/uploads/audio/sign", {
    method: "POST",
    body: JSON.stringify({
      mime_type: mimeType,
      byte_size: file.size,
    }),
  });
  return parseUploadSignResponse(payload);
}

export async function uploadSignedMedia(file: Blob, signedUpload: UploadSignResponse): Promise<void> {
  const headers = new Headers();
  for (const [name, value] of Object.entries(signedUpload.required_headers)) {
    headers.set(name, value);
  }
  if (!headers.has("content-type") && file.type) {
    headers.set("content-type", file.type);
  }

  try {
    const response = await fetch(signedUpload.upload_url, {
      method: signedUpload.upload_method,
      headers,
      body: file,
    });
    if (!response.ok) {
      throw new ApiClientError({
        message: `Upload failed (${response.status})`,
        statusCode: response.status,
        code: "UPLOAD_FAILED",
        requestId: null,
        retryable: isRetryableStatus(response.status),
      });
    }
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError({
      message: "Upload request failed.",
      statusCode: null,
      code: "UPLOAD_NETWORK_ERROR",
      requestId: null,
      retryable: true,
    });
  }
}

export async function signReadPlayback(mediaId: string): Promise<PlaybackSignResponse> {
  const payload = await requestJson(`/api/v1/memory-media/${mediaId}/sign-read`, {
    method: "POST",
  });
  return parsePlaybackSignResponse(payload);
}

export async function finalizeMemory(
  clientId: string,
  request: FinalizeMemoryRequest,
  idempotencyKey: string,
): Promise<MemoryDetailResponse> {
  const payload = await requestJson(`/api/v1/clients/${clientId}/memories`, {
    method: "POST",
    headers: {
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify(request),
  });
  return memoryDetailResponseSchema.parse(payload);
}
