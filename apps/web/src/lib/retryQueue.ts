import {
  ApiClientError,
  finalizeMemory,
  isRetryableApiError,
  type FinalizeMemoryRequest,
} from "./api";
import {
  deleteFinalizeJob,
  enqueueFinalizeJob,
  listDueFinalizeJobs,
  updateFinalizeJob,
  type FinalizeQueueRecord,
} from "./idb";

const baseRetryDelayMs = 3_000;
const maxRetryDelayMs = 5 * 60 * 1_000;

function computeRetryDelayMs(attemptCount: number): number {
  return Math.min(baseRetryDelayMs * 2 ** Math.max(0, attemptCount), maxRetryDelayMs);
}

export async function addFinalizeJob(input: {
  clientId: string;
  idempotencyKey: string;
  request: FinalizeMemoryRequest;
}): Promise<void> {
  const now = Date.now();
  await enqueueFinalizeJob({
    queueId: crypto.randomUUID(),
    clientId: input.clientId,
    idempotencyKey: input.idempotencyKey,
    request: input.request,
    attemptCount: 0,
    nextAttemptAt: now,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  });
}

type FlushQueueOptions = {
  onSuccess?: (result: { clientId: string; memoryId: string }) => void;
  onFailure?: (result: { clientId: string; error: string }) => void;
};

async function processFinalizeJob(
  job: FinalizeQueueRecord,
  options: FlushQueueOptions,
): Promise<void> {
  try {
    const detail = await finalizeMemory(job.clientId, job.request, job.idempotencyKey);
    await deleteFinalizeJob(job.queueId);
    options.onSuccess?.({
      clientId: job.clientId,
      memoryId: detail.memory.memory_id,
    });
  } catch (error) {
    if (!isRetryableApiError(error)) {
      await deleteFinalizeJob(job.queueId);
      const message =
        error instanceof ApiClientError ? `${error.code}: ${error.message}` : "Non-retryable error";
      options.onFailure?.({ clientId: job.clientId, error: message });
      return;
    }

    const attemptCount = job.attemptCount + 1;
    await updateFinalizeJob({
      ...job,
      attemptCount,
      nextAttemptAt: Date.now() + computeRetryDelayMs(attemptCount),
      lastError: error instanceof Error ? error.message : "Retryable finalize error",
      updatedAt: Date.now(),
    });
  }
}

let flushInFlight = false;

export async function flushFinalizeQueue(options: FlushQueueOptions = {}): Promise<void> {
  if (flushInFlight) {
    return;
  }
  flushInFlight = true;
  try {
    const dueJobs = await listDueFinalizeJobs();
    for (const job of dueJobs) {
      await processFinalizeJob(job, options);
    }
  } finally {
    flushInFlight = false;
  }
}
