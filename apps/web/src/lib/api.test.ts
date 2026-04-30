import { afterEach, describe, expect, it, vi } from "vitest";
import { finalizeMemory } from "./api";

function buildMemoryDetailResponse() {
  return {
    memory: {
      memory_id: "11111111-1111-4111-8111-111111111111",
      client_id: "22222222-2222-4222-8222-222222222222",
      practice_id: "33333333-3333-4333-8333-333333333333",
      title: "Saved memory",
      room: "Kitchen",
      body: null,
      tags: [],
      created_at: "2026-04-30T00:00:00.000Z",
      updated_at: "2026-04-30T00:00:00.000Z",
      deleted_at: null,
    },
    media: [],
    transcript: null,
  };
}

describe("api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("sends idempotency and authorization headers on finalize", async () => {
    window.localStorage.setItem("memories.devBearerToken", "token-for-tests");

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify(buildMemoryDetailResponse()), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    await finalizeMemory(
      "22222222-2222-4222-8222-222222222222",
      {
        title: "Saved memory",
        room: "Kitchen",
        body: null,
        media: [],
      },
      "idem-123",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init).toBeDefined();
    const headers = new Headers(init?.headers);
    expect(headers.get("idempotency-key")).toBe("idem-123");
    expect(headers.get("authorization")).toBe("Bearer token-for-tests");
  });
});
