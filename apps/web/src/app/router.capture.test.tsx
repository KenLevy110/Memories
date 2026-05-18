import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppRouter } from "./router";

const CAPTURE_FLOW_TIMEOUT_MS = 12_000;
const TEST_CLIENT_ID = "8f9512d8-e88f-4f82-a8e9-6cb19a43ad52";

function isClientMemoriesEndpoint(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname === `/api/v1/clients/${TEST_CLIENT_ID}/memories`;
  } catch {
    return false;
  }
}

function primeCaptureEntryRoute(): void {
  window.localStorage.setItem("memories.devBearerToken", "token-for-capture-test");
  window.history.pushState({}, "", `/clients/${TEST_CLIENT_ID}/capture?step=photo`);
}

function createCaptureHarness() {
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
}

function buildFinalizeResponse() {
  return {
    memory: {
      memory_id: "77777777-7777-4777-8777-777777777777",
      client_id: "8f9512d8-e88f-4f82-a8e9-6cb19a43ad52",
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

function buildMemoriesListResponse() {
  return {
    items: [
      {
        memory_id: "77777777-7777-4777-8777-777777777777",
        client_id: "8f9512d8-e88f-4f82-a8e9-6cb19a43ad52",
        practice_id: "11111111-1111-4111-8111-111111111111",
        title: "Photo + audio memory",
        room: "Living room",
        created_at: "2026-04-30T00:00:00.000Z",
        updated_at: "2026-04-30T00:00:00.000Z",
        thumbnail_media_id: "88888888-8888-4888-8888-888888888888",
      },
    ],
    next_cursor: null,
    page_size: 20,
  };
}

describe("capture flow smoke", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    cleanup();
  });

  it(
    "completes photo->meta->prompt->record->review->done and sends idempotency header",
    async () => {
    primeCaptureEntryRoute();

    const fetchCalls: Array<{ url: string; method: string; headers: Headers; body?: string }> =
      [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      fetchCalls.push({
        url,
        method,
        headers: new Headers(init?.headers),
        body: typeof init?.body === "string" ? init.body : undefined,
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

      if (url === "https://uploads.example.com/image") {
        return new Response(null, { status: 200 });
      }

      if (url === "https://uploads.example.com/audio") {
        return new Response(null, { status: 200 });
      }

      if (method === "POST" && isClientMemoriesEndpoint(url)) {
        return new Response(JSON.stringify(buildFinalizeResponse()), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (method === "GET" && isClientMemoriesEndpoint(url)) {
        return new Response(JSON.stringify(buildMemoriesListResponse()), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      throw new Error(`Unexpected fetch request: ${url}`);
    });

    createCaptureHarness();

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

    await user.click(screen.getByRole("button", { name: /Save to .+'s Archive/ }));

    await screen.findByRole("heading", { name: "Memory saved" });

    await waitFor(() => {
      const imageSignCall = fetchCalls.find((call) =>
        call.url.endsWith("/api/v1/uploads/images/sign"),
      );
      expect(imageSignCall).toBeDefined();
      expect(JSON.parse(imageSignCall?.body ?? "{}") as { mime_type: string }).toMatchObject({
        mime_type: "image/jpeg",
      });

      const finalizeCall = fetchCalls.find(
        (call) => call.method === "POST" && isClientMemoriesEndpoint(call.url),
      );
      const imageUploadCall = fetchCalls.find(
        (call) => call.url === "https://uploads.example.com/image",
      );
      const audioUploadCall = fetchCalls.find(
        (call) => call.url === "https://uploads.example.com/audio",
      );
      expect(finalizeCall).toBeDefined();
      expect(imageUploadCall).toBeDefined();
      expect(imageUploadCall?.method).toBe("PUT");
      expect(imageUploadCall?.headers.get("content-type")).toBe("image/jpeg");
      expect(audioUploadCall).toBeDefined();
      expect(audioUploadCall?.method).toBe("PUT");
      expect(audioUploadCall?.headers.get("content-type")).toBe("audio/webm");
      expect(finalizeCall?.headers.get("idempotency-key")).toBeTruthy();
      expect(finalizeCall?.headers.get("authorization")).toBe("Bearer token-for-capture-test");
    });
    },
    CAPTURE_FLOW_TIMEOUT_MS,
  );

  it("shows Coming Soon when a deferred capture control is used", async () => {
    primeCaptureEntryRoute();
    createCaptureHarness();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Choose from Library" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Coming Soon — Choose from Library");
  });

  it(
    "starts a new capture with cleared fields after saving and returning to the list",
    async () => {
    primeCaptureEntryRoute();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

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

      if (url === "https://uploads.example.com/image" || url === "https://uploads.example.com/audio") {
        return new Response(null, { status: 200 });
      }

      if (method === "POST" && isClientMemoriesEndpoint(url)) {
        return new Response(JSON.stringify(buildFinalizeResponse()), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (method === "GET" && isClientMemoriesEndpoint(url)) {
        return new Response(JSON.stringify(buildMemoriesListResponse()), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      throw new Error(`Unexpected fetch request: ${url} (${method})`);
    });

    createCaptureHarness();

    const user = userEvent.setup();

    const firstPhotoInput = await screen.findByLabelText("Photo");
    await user.upload(firstPhotoInput, new File(["img"], "photo.jpg", { type: "image/jpeg" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(await screen.findByLabelText("Object title"), "Grandpa's watch");
    await user.type(screen.getByLabelText("Room"), "Living room");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue to recording" }));
    const audioInput = await screen.findByLabelText("Audio fallback");
    await user.upload(audioInput, new File(["aud"], "clip.webm", { type: "audio/webm" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: /Save to .+'s Archive/ }));
    await screen.findByRole("heading", { name: "Memory saved" });

    await user.click(screen.getByRole("link", { name: "Return to list" }));
    await screen.findByRole("heading", { name: "Memories" });
    await user.click(screen.getByRole("link", { name: /\+ Capture memory/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    });

    const secondPhotoInput = await screen.findByLabelText("Photo");
    await user.upload(secondPhotoInput, new File(["img2"], "photo-2.jpg", { type: "image/jpeg" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByLabelText("Object title")).toHaveValue("");
    expect(screen.getByLabelText("Room")).toHaveValue("");
    },
    CAPTURE_FLOW_TIMEOUT_MS,
  );
});
