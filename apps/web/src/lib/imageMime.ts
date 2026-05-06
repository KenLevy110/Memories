/** Keep aligned with `ALLOWED_IMAGE_MIME_TYPES` in `apps/api/src/app.ts`. */
export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/x-ms-bmp",
  "image/heic",
  "image/heif",
]);

function normalizeMimeBase(raw: string): string {
  const [base] = raw.split(";", 1);
  return (base ?? "").trim().toLowerCase();
}

function readFourCc(view: Uint8Array, offset: number): string {
  if (offset + 4 > view.length) {
    return "";
  }
  return String.fromCharCode(view[offset], view[offset + 1], view[offset + 2], view[offset + 3]);
}

/**
 * Best-effort detection from leading bytes. When this returns a value, it reflects file content
 * (works for IndexedDB-restored Blobs with unreliable `blob.type`).
 */
export function sniffImageMimeTypeFromBuffer(buffer: ArrayBuffer): string | null {
  const len = Math.min(64, buffer.byteLength);
  const view = new Uint8Array(len === 0 ? buffer : buffer.slice(0, len));
  if (view.length < 2) {
    return null;
  }

  if (view[0] === 0x42 && view[1] === 0x4d) {
    return "image/bmp";
  }

  if (view.length < 3) {
    return null;
  }

  if (view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    view.length >= 8 &&
    view[0] === 0x89 &&
    view[1] === 0x50 &&
    view[2] === 0x4e &&
    view[3] === 0x47 &&
    view[4] === 0x0d &&
    view[5] === 0x0a &&
    view[6] === 0x1a &&
    view[7] === 0x0a
  ) {
    return "image/png";
  }

  if (view.length >= 6 && view[0] === 0x47 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x38) {
    return "image/gif";
  }

  if (
    view.length >= 12 &&
    view[0] === 0x52 &&
    view[1] === 0x49 &&
    view[2] === 0x46 &&
    view[3] === 0x46 &&
    readFourCc(view, 8) === "WEBP"
  ) {
    return "image/webp";
  }

  if (view.length >= 12 && readFourCc(view, 4) === "ftyp") {
    const brand = readFourCc(view, 8);
    if (brand === "avif" || brand === "avis") {
      return "image/avif";
    }
    if (brand === "heic" || brand === "heix" || brand === "hevc" || brand === "hevx") {
      return "image/heic";
    }
    if (brand === "heif" || brand === "mif1" || brand === "msf1") {
      return "image/heif";
    }
  }

  return null;
}

export function guessImageMimeTypeFromFileName(fileName: string | undefined): string | null {
  if (!fileName) {
    return null;
  }
  const dot = fileName.lastIndexOf(".");
  const ext = dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";
  if (ext === "jpg" || ext === "jpeg") {
    return "image/jpeg";
  }
  if (ext === "png") {
    return "image/png";
  }
  if (ext === "webp") {
    return "image/webp";
  }
  if (ext === "avif") {
    return "image/avif";
  }
  if (ext === "bmp" || ext === "dib") {
    return "image/bmp";
  }
  if (ext === "heic") {
    return "image/heic";
  }
  if (ext === "heif") {
    return "image/heif";
  }
  return null;
}

function resolveImageMimeTypeFromFilePicker(file: File): string {
  const trimmed = file.type.trim();
  if (trimmed.length > 0 && trimmed !== "application/octet-stream") {
    return normalizeMimeBase(trimmed);
  }
  return guessImageMimeTypeFromFileName(file.name) ?? "image/jpeg";
}

/**
 * Resolves the MIME type sent to `POST /uploads/images/sign` and finalize. Prefer content sniffing
 * so IndexedDB drafts and `application/octet-stream` blobs still work.
 */
export async function resolveImageMimeForUpload(
  blob: Blob | null,
  storedMime: string | null,
): Promise<string> {
  if (!blob || blob.size === 0) {
    return "image/jpeg";
  }

  let sniffed: string | null = null;
  try {
    const buf = await blob.slice(0, 64).arrayBuffer();
    sniffed = sniffImageMimeTypeFromBuffer(buf);
  } catch {
    sniffed = null;
  }

  if (sniffed) {
    return sniffed;
  }

  const normalizedStored = normalizeMimeBase(storedMime ?? "");
  if (normalizedStored && ALLOWED_IMAGE_MIME_TYPES.has(normalizedStored)) {
    return normalizedStored;
  }

  if (blob instanceof File) {
    const fromPicker = resolveImageMimeTypeFromFilePicker(blob);
    if (ALLOWED_IMAGE_MIME_TYPES.has(fromPicker)) {
      return fromPicker;
    }
    if (fromPicker !== "image/jpeg") {
      return fromPicker;
    }
  }

  const blobType = normalizeMimeBase(blob.type);
  if (
    blobType &&
    blobType !== "application/octet-stream" &&
    ALLOWED_IMAGE_MIME_TYPES.has(blobType)
  ) {
    return blobType;
  }

  return "image/jpeg";
}
