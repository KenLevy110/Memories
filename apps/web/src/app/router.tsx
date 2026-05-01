/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { getMemories, getMemoryDetail, signReadPlayback } from "../lib/api";
import {
  ApiClientError,
  clearDevBearerToken,
  finalizeMemory,
  getDevBearerToken,
  isDevTokenInputEnabled,
  setDevBearerToken,
  signAudioUpload,
  signImageUpload,
  uploadSignedMedia,
  type FinalizeMemoryRequest,
} from "../lib/api";
import { addFinalizeJob, flushFinalizeQueue } from "../lib/retryQueue";
import {
  clearCaptureDraft,
  loadCaptureDraft,
  saveCaptureDraft,
  type CaptureStep,
} from "../lib/idb";

const captureSteps: CaptureStep[] = ["photo", "meta", "prompt", "record", "review", "done"];

function isCaptureStep(value: string): value is CaptureStep {
  return captureSteps.includes(value as CaptureStep);
}

function AppShell() {
  const [tokenInput, setTokenInput] = useState(getDevBearerToken() ?? "");
  const [tokenStatus, setTokenStatus] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const showDevTokenInput = isDevTokenInputEnabled();

  useEffect(() => {
    const runQueue = () => {
      void flushFinalizeQueue({
        onSuccess: ({ clientId }) => {
          void queryClient.invalidateQueries({ queryKey: ["memories", clientId] });
        },
      });
    };

    runQueue();
    const intervalId = window.setInterval(runQueue, 15_000);
    window.addEventListener("online", runQueue);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("online", runQueue);
    };
  }, [queryClient]);

  const onSaveToken = () => {
    const trimmed = tokenInput.trim();
    if (trimmed.length === 0) {
      clearDevBearerToken();
      setTokenStatus("Dev bearer token cleared.");
      return;
    }

    setDevBearerToken(trimmed);
    setTokenStatus("Dev bearer token saved.");
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Legacy memories</h1>
          <p>Facilitator flow: list, detail playback, capture, and queued finalize retry.</p>
        </div>
        {showDevTokenInput ? (
          <div className="token-controls">
            <label htmlFor="devToken">Dev bearer token</label>
            <textarea
              id="devToken"
              rows={3}
              value={tokenInput}
              onChange={(event) => {
                setTokenInput(event.target.value);
                setTokenStatus(null);
              }}
              placeholder="Paste token from /dev/token"
            />
            <button type="button" onClick={onSaveToken}>
              Save token
            </button>
            {tokenStatus ? <span className="hint">{tokenStatus}</span> : null}
          </div>
        ) : null}
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState("00000000-0000-4000-8000-000000000001");

  return (
    <section className="panel">
      <h2>Open a client workspace</h2>
      <p>Enter the target client id and continue to the memories list route.</p>
      <label htmlFor="clientIdInput">Client id</label>
      <input
        id="clientIdInput"
        value={clientId}
        onChange={(event) => setClientId(event.target.value)}
      />
      <button
        type="button"
        onClick={() => {
          void navigate({
            to: "/clients/$clientId/memories",
            params: { clientId },
          });
        }}
      >
        Open memories list
      </button>
    </section>
  );
}

function MemoriesListPage() {
  const { clientId } = memoriesRoute.useParams();
  const [cursor, setCursor] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["memories", clientId, cursor],
    queryFn: () => getMemories(clientId, cursor),
  });

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Memories</h2>
          <p>Facilitating for {clientId}</p>
        </div>
        <Link
          className="button-link"
          to="/clients/$clientId/capture"
          params={{ clientId }}
          search={{ step: "photo" }}
        >
          + Capture memory
        </Link>
      </div>

      {listQuery.isLoading ? <p>Loading memories...</p> : null}
      {listQuery.isError ? (
        <p role="alert">Failed to load memories: {(listQuery.error as Error).message}</p>
      ) : null}

      {listQuery.data && listQuery.data.items.length === 0 ? (
        <p>No memories found yet. Start with a guided capture.</p>
      ) : null}

      <ul className="memory-list">
        {listQuery.data?.items.map((item) => (
          <li key={item.memory_id} className="memory-list-item">
            <Link
              to="/clients/$clientId/memories/$memoryId"
              params={{ clientId, memoryId: item.memory_id }}
            >
              <strong>{item.title}</strong>
              <span>{item.room ?? "No room set"}</span>
              <span>{new Date(item.created_at).toLocaleString()}</span>
            </Link>
          </li>
        ))}
      </ul>

      {listQuery.data?.next_cursor ? (
        <button
          type="button"
          onClick={() => {
            setCursor(listQuery.data?.next_cursor ?? null);
          }}
        >
          Load next page
        </button>
      ) : null}
    </section>
  );
}

function MemoryDetailPage() {
  const { clientId, memoryId } = memoryDetailRoute.useParams();
  const [playbackByMediaId, setPlaybackByMediaId] = useState<Record<string, string>>({});

  const detailQuery = useQuery({
    queryKey: ["memory", clientId, memoryId],
    queryFn: () => getMemoryDetail(clientId, memoryId),
  });

  const signReadMutation = useMutation({
    mutationFn: (mediaId: string) => signReadPlayback(mediaId),
    onSuccess: (result) => {
      setPlaybackByMediaId((prior) => ({
        ...prior,
        [result.media_id]: result.read_url,
      }));
    },
  });

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Memory detail</h2>
        <Link to="/clients/$clientId/memories" params={{ clientId }}>
          Back to list
        </Link>
      </div>

      {detailQuery.isLoading ? <p>Loading detail...</p> : null}
      {detailQuery.isError ? (
        <p role="alert">Failed to load detail: {(detailQuery.error as Error).message}</p>
      ) : null}

      {detailQuery.data ? (
        <div className="memory-detail">
          <h3>{detailQuery.data.memory.title}</h3>
          <p>{detailQuery.data.memory.room ?? "No room provided"}</p>
          <p>{detailQuery.data.memory.body ?? "No transcript body saved yet."}</p>

          <h4>Media</h4>
          <ul className="memory-list">
            {detailQuery.data.media.map((mediaItem) => (
              <li key={mediaItem.media_id} className="memory-list-item">
                <span>
                  {mediaItem.type} · {mediaItem.mime_type} · {mediaItem.byte_size.toLocaleString()} bytes
                </span>
                {mediaItem.type === "audio" ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        signReadMutation.mutate(mediaItem.media_id);
                      }}
                      disabled={signReadMutation.isPending}
                    >
                      Get signed playback URL
                    </button>
                    {playbackByMediaId[mediaItem.media_id] ? (
                      <audio
                        aria-label={`${mediaItem.type} playback`}
                        controls
                        src={playbackByMediaId[mediaItem.media_id]}
                      />
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {signReadMutation.isError ? (
            <p role="alert">Failed to sign playback URL: {signReadMutation.error.message}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function CapturePage() {
  const navigate = useNavigate({ from: captureRoute.fullPath });
  const queryClient = useQueryClient();
  const { clientId } = captureRoute.useParams();
  const { step } = captureRoute.useSearch();

  const [draftLoaded, setDraftLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [room, setRoom] = useState("");
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [lastSavedMemoryId, setLastSavedMemoryId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const imagePreviewUrl = useMemo(
    () => (imageBlob ? URL.createObjectURL(imageBlob) : null),
    [imageBlob],
  );
  const audioPreviewUrl = useMemo(
    () => (audioBlob ? URL.createObjectURL(audioBlob) : null),
    [audioBlob],
  );

  useEffect(() => {
    let cancelled = false;
    void loadCaptureDraft(clientId)
      .then((draft) => {
        if (!draft || cancelled) {
          return;
        }
        setTitle(draft.title);
        setRoom(draft.room);
        setImageBlob(draft.imageBlob);
        setImageMimeType(draft.imageMimeType);
        setAudioBlob(draft.audioBlob);
        setAudioMimeType(draft.audioMimeType);
        setIdempotencyKey(draft.idempotencyKey);
      })
      .finally(() => {
        if (!cancelled) {
          setDraftLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (!draftLoaded) {
      return;
    }
    void saveCaptureDraft({
      clientId,
      step,
      title,
      room,
      imageBlob,
      imageMimeType,
      audioBlob,
      audioMimeType,
      idempotencyKey,
      updatedAt: Date.now(),
    });
  }, [
    audioBlob,
    audioMimeType,
    clientId,
    draftLoaded,
    idempotencyKey,
    imageBlob,
    imageMimeType,
    room,
    step,
    title,
  ]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function goToStep(nextStep: CaptureStep): void {
    void navigate({ search: { step: nextStep } });
  }

  async function startRecording(): Promise<void> {
    if (typeof MediaRecorder === "undefined") {
      setRecordingError("MediaRecorder is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });
      recorder.addEventListener("stop", () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        setAudioMimeType(blob.type || "audio/webm");
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      });

      recorder.start();
      setRecordingError(null);
      setIsRecording(true);
    } catch (error) {
      setRecordingError((error as Error).message);
    }
  }

  function stopRecording(): void {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function saveMemory(): Promise<void> {
    if (!imageBlob || !audioBlob) {
      setSaveError("Both a photo and an audio recording are required.");
      return;
    }
    if (!title.trim()) {
      setSaveError("Title is required before save.");
      return;
    }

    const resolvedIdempotencyKey = idempotencyKey ?? crypto.randomUUID();
    if (!idempotencyKey) {
      setIdempotencyKey(resolvedIdempotencyKey);
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const [signedImage, signedAudio] = await Promise.all([
        signImageUpload(imageBlob),
        signAudioUpload(audioBlob),
      ]);
      await Promise.all([
        uploadSignedMedia(imageBlob, signedImage),
        uploadSignedMedia(audioBlob, signedAudio),
      ]);

      const finalizeRequest: FinalizeMemoryRequest = {
        title: title.trim(),
        room: room.trim() || null,
        body: null,
        media: [
          {
            media_id: signedImage.media_id,
            type: "image",
            storage_key: signedImage.storage_key,
            mime_type: imageMimeType ?? "image/jpeg",
            byte_size: imageBlob.size,
            sort_order: 0,
          },
          {
            media_id: signedAudio.media_id,
            type: "audio",
            storage_key: signedAudio.storage_key,
            mime_type: audioMimeType ?? "audio/webm",
            byte_size: audioBlob.size,
            sort_order: 1,
          },
        ],
      };

      try {
        const detail = await finalizeMemory(clientId, finalizeRequest, resolvedIdempotencyKey);
        setLastSavedMemoryId(detail.memory.memory_id);
        setSaveMessage("Memory saved.");
        await clearCaptureDraft(clientId);
        await queryClient.invalidateQueries({ queryKey: ["memories", clientId] });
        goToStep("done");
      } catch (error) {
        if (error instanceof ApiClientError && error.retryable) {
          await addFinalizeJob({
            clientId,
            idempotencyKey: resolvedIdempotencyKey,
            request: finalizeRequest,
          });
          setSaveMessage("Offline-safe queue: save will retry automatically.");
          goToStep("done");
          return;
        }
        throw error;
      }
    } catch (error) {
      setSaveError((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Capture flow</h2>
        <Link to="/clients/$clientId/memories" params={{ clientId }}>
          Back to list
        </Link>
      </div>
      <p>Facilitating for {clientId}</p>
      <p className="hint">Step: {step}</p>

      {!draftLoaded ? <p>Loading draft...</p> : null}

      {step === "photo" ? (
        <div className="step-card">
          <h3>Step 1 of 5 · Photograph</h3>
          <input
            aria-label="Photo"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              setImageBlob(file);
              setImageMimeType(file?.type ?? "image/jpeg");
            }}
          />
          {imagePreviewUrl ? <img className="preview" src={imagePreviewUrl} alt="Photo preview" /> : null}
          <button type="button" disabled={!imageBlob} onClick={() => goToStep("meta")}>
            Continue
          </button>
        </div>
      ) : null}

      {step === "meta" ? (
        <div className="step-card">
          <h3>Step 2 of 5 · Name and room</h3>
          <label htmlFor="titleInput">Object title</label>
          <input
            id="titleInput"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
          />
          <label htmlFor="roomInput">Room</label>
          <input
            id="roomInput"
            value={room}
            maxLength={80}
            onChange={(event) => setRoom(event.target.value)}
          />
          <div className="row">
            <button type="button" onClick={() => goToStep("photo")}>
              Back
            </button>
            <button type="button" disabled={!title.trim()} onClick={() => goToStep("prompt")}>
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === "prompt" ? (
        <div className="step-card">
          <h3>Step 3 of 5 · Story prompt</h3>
          <p>
            Ask: “What story comes to mind when you look at this object in {room.trim() || "this room"}?”
          </p>
          <div className="row">
            <button type="button" onClick={() => goToStep("meta")}>
              Back
            </button>
            <button type="button" onClick={() => goToStep("record")}>
              Continue to recording
            </button>
          </div>
        </div>
      ) : null}

      {step === "record" ? (
        <div className="step-card">
          <h3>Step 4 of 5 · Recording</h3>
          <p>Use MediaRecorder when available. A file picker fallback is available for unsupported environments.</p>
          <div className="row">
            {isRecording ? (
              <button type="button" onClick={stopRecording}>
                Stop recording
              </button>
            ) : (
              <button type="button" onClick={() => void startRecording()}>
                Start recording
              </button>
            )}
          </div>
          <label htmlFor="audioFileInput">Fallback audio file</label>
          <input
            id="audioFileInput"
            aria-label="Audio fallback"
            type="file"
            accept="audio/*"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              setAudioBlob(file);
              setAudioMimeType(file?.type ?? "audio/webm");
            }}
          />
          {recordingError ? <p role="alert">{recordingError}</p> : null}
          {audioPreviewUrl ? (
            <audio aria-label="Audio recording preview" controls src={audioPreviewUrl} />
          ) : null}
          <div className="row">
            <button type="button" onClick={() => goToStep("prompt")}>
              Back
            </button>
            <button type="button" disabled={!audioBlob} onClick={() => goToStep("review")}>
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === "review" ? (
        <div className="step-card">
          <h3>Step 5 of 5 · Review and save</h3>
          <p>Title: {title || "(missing)"}</p>
          <p>Room: {room || "(optional)"}</p>
          <p>Image: {imageBlob ? `${imageBlob.size.toLocaleString()} bytes` : "missing"}</p>
          <p>Audio: {audioBlob ? `${audioBlob.size.toLocaleString()} bytes` : "missing"}</p>
          {saveError ? <p role="alert">{saveError}</p> : null}
          {saveMessage ? <p>{saveMessage}</p> : null}
          <div className="row">
            <button type="button" onClick={() => goToStep("record")}>
              Back
            </button>
            <button type="button" disabled={isSaving} onClick={() => void saveMemory()}>
              {isSaving ? "Saving..." : "Save memory"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="step-card">
          <h3>Memory saved</h3>
          <p>{saveMessage ?? "Save completed. Replay-safe idempotency header was used."}</p>
          {lastSavedMemoryId ? (
            <Link
              to="/clients/$clientId/memories/$memoryId"
              params={{ clientId, memoryId: lastSavedMemoryId }}
            >
              View saved memory
            </Link>
          ) : null}
          <div className="row">
            <button
              type="button"
              onClick={async () => {
                setTitle("");
                setRoom("");
                setImageBlob(null);
                setImageMimeType(null);
                setAudioBlob(null);
                setAudioMimeType(null);
                setIdempotencyKey(null);
                await clearCaptureDraft(clientId);
                goToStep("photo");
              }}
            >
              Capture another memory
            </button>
            <Link to="/clients/$clientId/memories" params={{ clientId }}>
              Return to list
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}

const rootRoute = createRootRoute({
  component: AppShell,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const memoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/clients/$clientId/memories",
  component: MemoriesListPage,
});

const memoryDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/clients/$clientId/memories/$memoryId",
  component: MemoryDetailPage,
});

const captureRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/clients/$clientId/capture",
  validateSearch: (search): { step: CaptureStep } => {
    const rawStep = typeof search.step === "string" ? search.step : "photo";
    return { step: isCaptureStep(rawStep) ? rawStep : "photo" };
  },
  component: CapturePage,
});

const routeTree = rootRoute.addChildren([homeRoute, memoriesRoute, memoryDetailRoute, captureRoute]);

export function createAppRouter() {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
  });
}

export const router = createAppRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
