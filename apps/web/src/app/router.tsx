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
import { LoginPage } from "./LoginPage";
import {
  ApiClientError,
  clearDevBearerToken,
  finalizeMemory,
  getDevBearerToken,
  getMemories,
  getMemoryDetail,
  isDevTokenInputEnabled,
  setDevBearerToken,
  signAudioUpload,
  signImageUpload,
  signReadPlayback,
  uploadSignedMedia,
  type FinalizeMemoryRequest,
} from "../lib/api";
import { addFinalizeJob, flushFinalizeQueue } from "../lib/retryQueue";
import { resolveImageMimeForUpload } from "../lib/imageMime";
import {
  clearCaptureDraft,
  loadCaptureDraft,
  saveCaptureDraft,
  type CaptureStep,
} from "../lib/idb";
import { useFirebaseSession } from "../lib/useFirebaseSession";

const captureSteps: CaptureStep[] = ["photo", "meta", "prompt", "record", "review", "done"];

function isCaptureStep(value: string): value is CaptureStep {
  return captureSteps.includes(value as CaptureStep);
}

const ROOM_SUGGESTIONS = ["Living room", "Kitchen", "Bedroom", "Dining room", "Office", "Hallway"] as const;

function formatClientLabel(clientId: string): string {
  if (clientId.length <= 16) {
    return clientId;
  }
  return `${clientId.slice(0, 8)}…${clientId.slice(-4)}`;
}

function captureStepProgress(step: CaptureStep): { stepNum: number; label: string; pct: number } | null {
  switch (step) {
    case "photo":
      return { stepNum: 1, label: "Photograph", pct: 25 };
    case "meta":
      return { stepNum: 2, label: "Name and room", pct: 50 };
    case "prompt":
      return { stepNum: 3, label: "Story", pct: 75 };
    case "record":
      return { stepNum: 3, label: "Recording", pct: 75 };
    case "review":
      return { stepNum: 4, label: "Review and save", pct: 100 };
    default:
      return null;
  }
}

function previousCaptureStep(current: CaptureStep): CaptureStep | null {
  switch (current) {
    case "meta":
      return "photo";
    case "prompt":
      return "meta";
    case "record":
      return "prompt";
    case "review":
      return "record";
    default:
      return null;
  }
}

function ComingSoonBanner({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p role="status" aria-live="polite" className="coming-soon-banner">
      {message}
    </p>
  );
}

function useComingSoonNotice(durationMs = 4800): {
  comingSoonMessage: string | null;
  flashComingSoon: (detail: string) => void;
} {
  const [comingSoonMessage, setComingSoonMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!comingSoonMessage) {
      return;
    }
    const id = window.setTimeout(() => setComingSoonMessage(null), durationMs);
    return () => window.clearTimeout(id);
  }, [comingSoonMessage, durationMs]);

  const flashComingSoon = (detail: string) => {
    setComingSoonMessage(`Coming Soon — ${detail}`);
  };

  return { comingSoonMessage, flashComingSoon };
}

function AppShell() {
  const [tokenInput, setTokenInput] = useState(getDevBearerToken() ?? "");
  const [tokenStatus, setTokenStatus] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const showDevTokenInput = isDevTokenInputEnabled();
  const { configured: firebaseConfigured, user: firebaseUser, signOut: firebaseSignOut } =
    useFirebaseSession();

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
        <div className="header-actions">
          {firebaseConfigured ? (
            <div className="firebase-session-controls">
              {firebaseUser ? (
                <>
                  <span className="hint">Signed in</span>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => {
                      void firebaseSignOut();
                    }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link className="button-link" to="/login">
                  Sign in
                </Link>
              )}
            </div>
          ) : null}
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
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

// Matches DEFAULT_CLAIMS.client_id in apps/api/scripts/local-auth-dev.ts (dev bearer token).
const DEFAULT_HOME_CLIENT_ID = "8f9512d8-e88f-4f82-a8e9-6cb19a43ad52";

function HomePage() {
  const navigate = useNavigate();
  const { configured: firebaseConfigured, user: firebaseUser, loading, defaultClientId } =
    useFirebaseSession();
  const [clientIdOverride, setClientIdOverride] = useState<string | null>(null);
  const clientId =
    (clientIdOverride ?? defaultClientId ?? DEFAULT_HOME_CLIENT_ID).trim() || DEFAULT_HOME_CLIENT_ID;

  return (
    <section className="panel">
      <h2>Open a client workspace</h2>
      {firebaseConfigured && loading ? <p>Checking sign-in…</p> : null}
      {firebaseConfigured && !loading && !firebaseUser ? (
        <p>
          <Link className="button-link" to="/login">
            Sign in with Google
          </Link>{" "}
          to load your workspace, or continue with a manual client id below if you are using a dev token.
        </p>
      ) : null}
      <p>Enter the target client id and continue to the memories list route.</p>
      <label htmlFor="clientIdInput">Client id</label>
      <input
        id="clientIdInput"
        value={clientId}
        onChange={(event) => setClientIdOverride(event.target.value)}
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
  const { comingSoonMessage, flashComingSoon } = useComingSoonNotice();

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
      <ComingSoonBanner message={comingSoonMessage} />
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
          <p>{detailQuery.data.memory.body ?? "No description saved yet."}</p>

          <section className="detail-transcript-placeholder" aria-labelledby="detail-transcript-heading">
            <h4 id="detail-transcript-heading">Transcript</h4>
            <p className="hint">
              Automatic captions from recorded audio will appear here once transcription is enabled.
            </p>
            <button type="button" className="button-secondary" onClick={() => flashComingSoon("Transcript refresh")}>
              Refresh transcript
            </button>
          </section>

          <section className="detail-tags-placeholder" aria-labelledby="detail-tags-heading">
            <h4 id="detail-tags-heading">Tags</h4>
            <p className="hint">Curator tags.</p>
            <div className="row wrap capture-placeholder-actions">
              <button type="button" className="button-secondary" onClick={() => flashComingSoon("Add tag")}>
                Add tag
              </button>
              <button type="button" className="button-secondary" onClick={() => flashComingSoon("Suggested tags (AI)")}>
                Suggest tags
              </button>
            </div>
          </section>

          <h4>Media</h4>
          <ul className="memory-list">
            {detailQuery.data.media.map((mediaItem) => (
              <li key={mediaItem.media_id} className="memory-list-item">
                <span>
                  {mediaItem.type} · {mediaItem.mime_type} · {mediaItem.byte_size.toLocaleString()} bytes
                </span>
                {mediaItem.type === "image" ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        signReadMutation.mutate(mediaItem.media_id);
                      }}
                      disabled={signReadMutation.isPending}
                    >
                      Load image preview
                    </button>
                    {playbackByMediaId[mediaItem.media_id] ? (
                      <img
                        className="detail-image-preview"
                        src={playbackByMediaId[mediaItem.media_id]}
                        alt={`Memory image ${mediaItem.media_id}`}
                      />
                    ) : null}
                  </div>
                ) : null}
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
  const { comingSoonMessage, flashComingSoon } = useComingSoonNotice();

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
      .then(async (draft) => {
        if (!draft || cancelled) {
          return;
        }
        setTitle(draft.title);
        setRoom(draft.room);
        setImageBlob(draft.imageBlob);
        if (draft.imageBlob) {
          const mime = await resolveImageMimeForUpload(draft.imageBlob, draft.imageMimeType);
          if (!cancelled) {
            setImageMimeType(mime);
          }
        } else if (!cancelled) {
          setImageMimeType(null);
        }
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
      const resolvedImageMime = await resolveImageMimeForUpload(imageBlob, imageMimeType);
      const [signedImage, signedAudio] = await Promise.all([
        signImageUpload(imageBlob, resolvedImageMime),
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
            mime_type: resolvedImageMime,
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

  const progress = captureStepProgress(step);
  const clientLabel = formatClientLabel(clientId);

  return (
    <section className="panel capture-panel">
      <ComingSoonBanner message={comingSoonMessage} />

      <header className="capture-shell-header">
        <div className="capture-shell-top">
          <button
            type="button"
            className="button-secondary capture-shell-back capture-icon-btn"
            onClick={() => {
              const prev = previousCaptureStep(step);
              if (prev) {
                goToStep(prev);
              } else {
                void navigate({ to: "/clients/$clientId/memories", params: { clientId } });
              }
            }}
          >
            Back
          </button>
          <h2 className="capture-shell-title">Capture Memory</h2>
          <button
            type="button"
            className="button-secondary capture-shell-close capture-icon-btn"
            onClick={() => {
              void navigate({ to: "/clients/$clientId/memories", params: { clientId } });
            }}
          >
            Close
          </button>
        </div>
        <p className="capture-context-bar">
          <span className="capture-context-pill">Facilitating for {clientLabel}</span>
        </p>
        {progress ? (
          <>
            <p className="capture-step-heading">
              Step {progress.stepNum} of 4 · {progress.label}
            </p>
            <div className="capture-progress-track" aria-hidden="true">
              <div className="capture-progress-fill" style={{ width: `${progress.pct}%` }} />
            </div>
          </>
        ) : null}
      </header>

      {!draftLoaded ? <p>Loading draft...</p> : null}

      {step === "photo" ? (
        <div className="step-card capture-step-card">
          <p className="capture-lead">Let&apos;s capture something meaningful in the home.</p>
          <div className="capture-photo-well">
            <label htmlFor="photoFileInput" className="capture-photo-label">
              Add photo
            </label>
            <input
              id="photoFileInput"
              aria-label="Photo"
              className="capture-photo-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                setImageBlob(file);
                void resolveImageMimeForUpload(file, null).then((mime) => {
                  setImageMimeType(mime);
                });
              }}
            />
            <p className="capture-photo-hint">Use the camera or choose a photo from your device.</p>
          </div>
          <div className="row capture-placeholder-actions">
            <button type="button" className="button-secondary" onClick={() => flashComingSoon("Choose from Library")}>
              Choose from Library
            </button>
            <button type="button" className="button-secondary" onClick={() => flashComingSoon("Add another photo")}>
              Add another photo
            </button>
          </div>
          {imagePreviewUrl ? <img className="preview capture-photo-preview" src={imagePreviewUrl} alt="Photo preview" /> : null}
          <div className="capture-footer-actions">
            <button type="button" className="capture-primary" disabled={!imageBlob} onClick={() => goToStep("meta")}>
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === "meta" ? (
        <div className="step-card capture-step-card">
          {imagePreviewUrl ? (
            <div className="capture-meta-thumb">
              <img className="preview" src={imagePreviewUrl} alt="" />
              <button type="button" className="button-secondary" onClick={() => goToStep("photo")}>
                Retake photo
              </button>
            </div>
          ) : null}
          <label htmlFor="titleInput">Object name</label>
          <input
            id="titleInput"
            aria-label="Object title"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
          />
          <p className="hint" id="roomChipsHint">
            Tap a suggestion or enter a custom room.
          </p>
          <div className="chip-row" role="group" aria-labelledby="roomChipsHint">
            {ROOM_SUGGESTIONS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`chip ${room === preset ? "chip-selected" : ""}`}
                aria-pressed={room === preset}
                onClick={() => setRoom(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
          <label htmlFor="roomInput">Room (custom)</label>
          <input
            id="roomInput"
            aria-label="Room"
            value={room}
            maxLength={80}
            onChange={(event) => setRoom(event.target.value)}
          />
          <div className="capture-footer-actions capture-footer-actions--split">
            <button type="button" className="button-secondary" onClick={() => goToStep("photo")}>
              Back
            </button>
            <button type="button" className="capture-primary" disabled={!title.trim()} onClick={() => goToStep("prompt")}>
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === "prompt" ? (
        <div className="step-card capture-step-card">
          <div className="memory-summary-card">
            <strong>{title.trim() || "Untitled object"}</strong>
            <span className="memory-summary-room">{room.trim() || "Room not set"}</span>
          </div>
          <div className="guide-prompt-card">
            <p className="guide-prompt-label">Ohana Guide suggests</p>
            <p>
              Ask: &ldquo;What story comes to mind when you look at this object
              {room.trim() ? ` in ${room.trim()}` : ""}?&rdquo;
            </p>
          </div>
          <div className="row capture-placeholder-actions wrap">
            <button type="button" className="button-secondary" onClick={() => flashComingSoon("Suggested prompt (AI)")}>
              Refresh suggestion
            </button>
            <button type="button" className="button-secondary" onClick={() => flashComingSoon("Record video")}>
              Record video
            </button>
            <button type="button" className="button-secondary" onClick={() => flashComingSoon("Type or transcribe")}>
              Type or transcribe
            </button>
          </div>
          <div className="capture-footer-actions capture-footer-actions--split">
            <button type="button" className="button-secondary" onClick={() => goToStep("meta")}>
              Back
            </button>
            <button type="button" className="capture-primary" onClick={() => goToStep("record")}>
              Continue to recording
            </button>
          </div>
        </div>
      ) : null}

      {step === "record" ? (
        <div className="step-card capture-step-card">
          <div className="memory-summary-card memory-summary-compact">
            <strong>{title.trim() || "Untitled object"}</strong>
            <span>{room.trim() || "Room not set"}</span>
          </div>
          <div className="guide-prompt-card guide-prompt-quiet">
            <p className="guide-prompt-label">Story prompt</p>
            <p>
              &ldquo;What story comes to mind when you look at this object
              {room.trim() ? ` in ${room.trim()}` : ""}?&rdquo;
            </p>
          </div>
          <p className={`hint ${isRecording ? "capture-listening" : ""}`}>
            {isRecording
              ? "Listening… tap stop when the story is complete."
              : "Tap the microphone when you are ready to record."}
          </p>
          <div className="capture-mic-area">
            {isRecording ? (
              <button type="button" className="capture-mic-btn capture-mic-btn--stop" onClick={stopRecording}>
                Stop
              </button>
            ) : (
              <button type="button" className="capture-mic-btn" onClick={() => void startRecording()}>
                <span className="capture-mic-icon" aria-hidden="true" />
                <span className="visually-hidden">Start recording</span>
              </button>
            )}
          </div>
          <div className="row capture-placeholder-actions wrap">
            <button type="button" className="button-secondary" onClick={() => flashComingSoon("Upload audio from library")}>
              Upload audio from library
            </button>
            <button type="button" className="button-secondary" onClick={() => flashComingSoon("Record video")}>
              Record video
            </button>
            <button type="button" className="button-secondary" onClick={() => flashComingSoon("Type or transcribe")}>
              Type or transcribe
            </button>
          </div>
          <label htmlFor="audioFileInput" className="visually-hidden">
            Audio fallback
          </label>
          <input
            id="audioFileInput"
            aria-label="Audio fallback"
            className="visually-hidden"
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
            <div className="capture-audio-well">
              <audio aria-label="Audio recording preview" controls src={audioPreviewUrl} />
            </div>
          ) : null}
          <div className="capture-footer-actions capture-footer-actions--split">
            <button type="button" className="button-secondary" onClick={() => goToStep("prompt")}>
              Back
            </button>
            <button type="button" className="capture-primary" disabled={!audioBlob} onClick={() => goToStep("review")}>
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === "review" ? (
        <div className="step-card capture-step-card">
          <p className="capture-review-summary">
            <strong>{title || "(missing title)"}</strong>
            <span>{room || "Room optional"}</span>
          </p>
          <p>Photo: {imageBlob ? `${imageBlob.size.toLocaleString()} bytes` : "missing"}</p>
          <p>Audio: {audioBlob ? `${audioBlob.size.toLocaleString()} bytes` : "missing"}</p>
          {audioPreviewUrl ? (
            <div className="capture-audio-well">
              <audio aria-label="Review recording" controls src={audioPreviewUrl} />
            </div>
          ) : null}
          <div className="review-tags-placeholder">
            <p className="hint">Optional tags</p>
            <div className="row capture-placeholder-actions wrap">
              <button type="button" className="button-secondary" onClick={() => flashComingSoon("Tags")}>
                Add tag
              </button>
              <button type="button" className="button-secondary" onClick={() => flashComingSoon("Suggested tags (AI)")}>
                Suggest tags
              </button>
            </div>
          </div>
          {saveError ? <p role="alert">{saveError}</p> : null}
          {saveMessage ? <p>{saveMessage}</p> : null}
          <div className="capture-footer-actions capture-footer-actions--split">
            <button type="button" className="button-secondary" onClick={() => goToStep("record")}>
              Re-record
            </button>
            <button type="button" className="capture-primary" disabled={isSaving} onClick={() => void saveMemory()}>
              {isSaving ? "Saving..." : `Save to ${clientLabel}'s Archive`}
            </button>
          </div>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="step-card capture-done-card capture-step-card">
          <h3 className="capture-done-title">
            <span className="capture-done-check" aria-hidden="true">
              ✓
            </span>{" "}
            Memory saved
          </h3>
          <p>{saveMessage ?? "Saved to the archive. Replay-safe idempotency header was used."}</p>
          {lastSavedMemoryId ? (
            <Link
              className="button-link capture-primary-link"
              to="/clients/$clientId/memories/$memoryId"
              params={{ clientId, memoryId: lastSavedMemoryId }}
            >
              View in Archive
            </Link>
          ) : null}
          <div className="capture-footer-actions capture-footer-actions--stack">
            <button
              type="button"
              className="capture-primary"
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
            <Link className="button-link capture-secondary-link" to="/clients/$clientId/memories" params={{ clientId }}>
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

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  memoriesRoute,
  memoryDetailRoute,
  captureRoute,
]);

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
