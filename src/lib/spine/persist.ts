const DB_NAME = "boneview";
const STORE = "kv";
const LAST_KEY = "last-pack";

type StoredPack = {
  savedAt: number;
  files: { name: string; type: string; buffer: ArrayBuffer }[];
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB 打开失败"));
  });
}

export async function saveLastPack(files: File[]): Promise<void> {
  if (typeof indexedDB === "undefined" || !files.length) return;
  const stored: StoredPack = {
    savedAt: Date.now(),
    files: await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        type: file.type,
        buffer: await file.arrayBuffer(),
      })),
    ),
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(stored, LAST_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadLastPack(): Promise<File[] | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    const stored = await new Promise<StoredPack | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(LAST_KEY);
      req.onsuccess = () => resolve(req.result as StoredPack | undefined);
      req.onerror = () => reject(req.error);
    });
    if (!stored?.files?.length) return null;
    return stored.files.map((item) => new File([item.buffer], item.name, { type: item.type }));
  } catch {
    return null;
  }
}

export async function clearLastPack(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(LAST_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}
