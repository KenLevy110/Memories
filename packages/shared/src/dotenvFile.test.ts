import { describe, expect, it } from "vitest";
import {
  extractVitePrefixedKeys,
  parseDotenvKey,
  readMemoriesEnvProfileFromEnvContent,
} from "./dotenvFile.js";

describe("dotenvFile", () => {
  it("parseDotenvKey reads first match", () => {
    const raw = "# x\nMEMORIES_ENV_PROFILE=standalone\nFOO=1\n";
    expect(parseDotenvKey(raw, "MEMORIES_ENV_PROFILE")).toBe("standalone");
  });

  it("readMemoriesEnvProfileFromEnvContent defaults to dashboard", () => {
    expect(readMemoriesEnvProfileFromEnvContent("")).toBe("dashboard");
    expect(readMemoriesEnvProfileFromEnvContent("MEMORIES_ENV_PROFILE=dashboard\n")).toBe("dashboard");
    expect(readMemoriesEnvProfileFromEnvContent("MEMORIES_ENV_PROFILE=\n")).toBe("dashboard");
  });

  it("extractVitePrefixedKeys collects VITE_ entries", () => {
    const raw = "PORT=1\nVITE_API_URL=http://localhost:9090\n# c\nVITE_X= y \n";
    expect(extractVitePrefixedKeys(raw)).toEqual({
      VITE_API_URL: "http://localhost:9090",
      VITE_X: "y",
    });
  });
});
