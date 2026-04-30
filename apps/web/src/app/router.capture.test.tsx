import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppRouter } from "./router";

function buildFinalizeResponse() {
  return {
    memory: {
      memory_id: "77777777-7777-4777-8777-777777777777",
      client_id: "00000000-0000-4000-8000-000000000001",
      practice_id: "11111111-1111-4111-8111-111111111111",
      title: "Photo + audio memory",
      room: "Living room",
      body: null,
      tags: [],
      created_at: "2026-04-30T00:00:00.000Z",
      updated_at: "2026-04-30T00:00:00.000Z",
      deleted_at: null,
    },
    media: [
      {
        media_id: "88888888-8888-4888-8888-888888888888",
        memory_id: "77777777-7777-4777-8777-777777777777",
        type: "image",
        storage_key: "practice/uploads/images/88888888-8888-4888-8888-888888888888",
        mime_type: "image/jpeg",
        byte_size: 3,
        sort_order: 0,
        created_at: "2026-04-30T00:00:00.000Z",
      },
      {
        media_id: "99999999-9999-4999-8999-999999999999",
        memory_id: "77777777-7777-4777-8777-777777777777",
        type: "audio",
        storage_key: "practice/uploads/audio/99999999-9999-4999-8999-999999999999",
        mime_type: "audio/webm",
        byte_size: 3,
        sort_order: 1,
        created_at: "2026-04-30T00:00:00.000Z",
      },
    ],
    transcript: null,
  };
}

describe("capture flow smoke", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("completes photo->meta->prompt->record->review->done and sends idempotency header", async () => {
    window.localStorage.setItem("memories.devBearerToken", "token-for-capture-test");
    window.history.pushState({}, "", "/clients/00000000-0000-4000-8000-000000000001/capture?step=photo");

    const fetchCalls: Array<{ url: string; headers: Headers }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      fetchCalls.push({
        url,
        headers: new Headers(init?.headers),
      });

      if (url.endsWith("/api/v1/uploads/images/sign")) {
        return new Response(
          JSON.stringify({
            media_id: "88888888-8888-4888-8888-888888888888",
            storage_key: "practice/uploads/images/88888888-8888-4888-8888-888888888888",
            upload_url: "https://uploads.example.com/image",
            upload_method: "PUT",
            required_headers: {
              "content-type": "image/jpeg",
            },
            expires_at: "2026-04-30T00:05:00.000Z",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.endsWith("/api/v1/uploads/audio/sign")) {
        return new Response(
          JSON.stringify({
            media_id: "99999999-9999-4999-8999-999999999999",
            storage_key: "practice/uploads/audio/99999999-9999-4999-8999-999999999999",
            upload_url: "https://uploads.example.com/audio",
            upload_method: "PUT",
            required_headers: {
              "content-type": "audio/webm",
            },
            expires_at: "2026-04-30T00:05:00.000Z",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.includes("/api/v1/clients/00000000-0000-4000-8000-000000000001/memories")) {
        return new Response(JSON.stringify(buildFinalizeResponse()), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      throw new Error(`Unexpected fetch request: ${url}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    const router = createAppRouter();

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    const user = userEvent.setup();

    const photoInput = await screen.findByLabelText("Photo");
    await user.upload(photoInput, new File(["img"], "photo.jpg", { type: "image/jpeg" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await user.type(await screen.findByLabelText("Object title"), "Grandpa's watch");
    await user.type(screen.getByLabelText("Room"), "Living room");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await user.click(screen.getByRole("button", { name: "Continue to recording" }));

    const audioInput = await screen.findByLabelText("Audio fallback");
    await user.upload(audioInput, new File(["aud"], "clip.webm", { type: "audio/webm" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await user.click(screen.getByRole("button", { name: "Save memory" }));

    await screen.findByRole("heading", { name: "Memory saved" });

    await waitFor(() => {
      const finalizeCall = fetchCalls.find((call) =>
        call.url.includes("/api/v1/clients/00000000-0000-4000-8000-000000000001/memories"),
      );
      expect(finalizeCall).toBeDefined();
      expect(finalizeCall?.headers.get("idempotency-key")).toBeTruthy();
      expect(finalizeCall?.headers.get("authorization")).toBe("Bearer token-for-capture-test");
    });
  });
});
