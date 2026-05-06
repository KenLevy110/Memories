import { describe, expect, it } from "vitest";
import {
  resolveImageMimeForUpload,
  sniffImageMimeTypeFromBuffer,
} from "./imageMime";

describe("imageMime", () => {
  it("sniffs JPEG magic bytes", () => {
    const buf = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]).buffer;
    expect(sniffImageMimeTypeFromBuffer(buf)).toBe("image/jpeg");
  });

  it("sniffs PNG magic bytes", () => {
    const buf = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]).buffer;
    expect(sniffImageMimeTypeFromBuffer(buf)).toBe("image/png");
  });

  it("sniffs BMP magic bytes (BM)", () => {
    const buf = new Uint8Array([0x42, 0x4d, 0x00, 0x00]).buffer;
    expect(sniffImageMimeTypeFromBuffer(buf)).toBe("image/bmp");
  });

  it("uses sniffed JPEG when Blob.type is application/octet-stream (IndexedDB restore)", async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], {
      type: "application/octet-stream",
    });
    await expect(resolveImageMimeForUpload(blob, "application/octet-stream")).resolves.toBe(
      "image/jpeg",
    );
  });
});
