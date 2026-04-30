import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

if (typeof window !== "undefined") {
  window.scrollTo = vi.fn();
}

const urlApi = URL as unknown as {
  createObjectURL?: (input: Blob | MediaSource) => string;
  revokeObjectURL?: (url: string) => void;
};

if (!urlApi.createObjectURL) {
  urlApi.createObjectURL = vi.fn(() => "blob:mock-url");
}

if (!urlApi.revokeObjectURL) {
  urlApi.revokeObjectURL = vi.fn();
}
