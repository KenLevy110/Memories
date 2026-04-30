import type { FinalizeMemoryRequest } from "./api";

const databaseName = "memories-web";
const databaseVersion = 1;
const captureDraftStoreName = "capture_drafts";
const finalizeQueueStoreName = "finalize_queue";
const finalizeQueueByAttemptIndexName = "by_next_attempt";

export type CaptureStep = "photo" | "meta" | "prompt" | "record" | "review" | "done";

export type CaptureDraftRecord = {
  clientId: string;
  step: CaptureStep;
  title: string;
  room: string;
  imageBlob: Blob | null;
  imageMimeType: string | null;
  audioBlob: Blob | null;
  audioMimeType: string | null;
  idempotencyKey: string | null;
  updatedAt: number;
};

export type FinalizeQueueRecord = {
  queueId: string;
  clientId: string;
  idempotencyKey: string;
  request: FinalizeMemoryRequest;
  attemptCount: number;
  nextAttemptAt: number;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
};

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment."));
  }

  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB failed to open."));
    };
    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(captureDraftStoreName)) {
        database.createObjectStore(captureDraftStoreName, { keyPath: "clientId" });
      }

      if (!database.objectStoreNames.contains(finalizeQueueStoreName)) {
        const store = database.createObjectStore(finalizeQueueStoreName, { keyPath: "queueId" });
        store.createIndex(finalizeQueueByAttemptIndexName, "nextAttemptAt", { unique: false });
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
  });

  return databasePromise;
}

async function readRecord<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  const database = await openDatabase();
  return new Promise<T | null>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve((request.result as T | undefined) ?? null);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB read failed."));
    };
  });
}

async function writeRecord(storeName: string, value: unknown): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    store.put(value);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => {
      reject(transaction.error ?? new Error("IndexedDB write failed."));
    };
  });
}

async function deleteRecord(storeName: string, key: IDBValidKey): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    store.delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => {
      reject(transaction.error ?? new Error("IndexedDB delete failed."));
    };
  });
}

export async function loadCaptureDraft(clientId: string): Promise<CaptureDraftRecord | null> {
  try {
    return await readRecord<CaptureDraftRecord>(captureDraftStoreName, clientId);
  } catch {
    return null;
  }
}

export async function saveCaptureDraft(record: CaptureDraftRecord): Promise<void> {
  try {
    await writeRecord(captureDraftStoreName, record);
  } catch {
    // Ignore persistence failures so capture can continue in memory.
  }
}

export async function clearCaptureDraft(clientId: string): Promise<void> {
  try {
    await deleteRecord(captureDraftStoreName, clientId);
  } catch {
    // Ignore persistence failures so capture can continue in memory.
  }
}

export async function enqueueFinalizeJob(record: FinalizeQueueRecord): Promise<void> {
  try {
    await writeRecord(finalizeQueueStoreName, record);
  } catch {
    // Ignore persistence failures so online-save behavior still works.
  }
}

export async function updateFinalizeJob(record: FinalizeQueueRecord): Promise<void> {
  await enqueueFinalizeJob(record);
}

export async function deleteFinalizeJob(queueId: string): Promise<void> {
  try {
    await deleteRecord(finalizeQueueStoreName, queueId);
  } catch {
    // Ignore persistence failures so online-save behavior still works.
  }
}

export async function listDueFinalizeJobs(now = Date.now()): Promise<FinalizeQueueRecord[]> {
  try {
    const database = await openDatabase();
    return await new Promise<FinalizeQueueRecord[]>((resolve, reject) => {
      const transaction = database.transaction(finalizeQueueStoreName, "readonly");
      const store = transaction.objectStore(finalizeQueueStoreName);
      const range = IDBKeyRange.upperBound(now);
      const request = store.index(finalizeQueueByAttemptIndexName).getAll(range);

      request.onsuccess = () => {
        const jobs = (request.result as FinalizeQueueRecord[] | undefined) ?? [];
        resolve(jobs.sort((left, right) => left.nextAttemptAt - right.nextAttemptAt));
      };
      request.onerror = () => {
        reject(request.error ?? new Error("IndexedDB query failed."));
      };
    });
  } catch {
    return [];
  }
}
