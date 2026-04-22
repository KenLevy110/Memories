import { describe, it, expect } from "vitest";
import { serviceName, healthResponseSchema } from "./index.js";

describe("shared", () => {
  it("exports service name", () => {
    expect(serviceName).toBe("memories");
  });

  it("validates health response", () => {
    const parsed = healthResponseSchema.parse({
      status: "ok",
      service: "test",
    });
    expect(parsed.status).toBe("ok");
  });
});
