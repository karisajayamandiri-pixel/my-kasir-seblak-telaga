/**
 * IndexedDB storage utility for storing high-resolution and compressed photos
 * Solves LocalStorage 5MB quota limit completely.
 */

const DB_NAME = 'seblak_juara_photo_db';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

interface PhotoRecord {
  id: string;
  dataUrl: string;
  hash: string;
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function getPhotoDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('hash', 'hash', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Save photo data URL to IndexedDB
 */
export async function savePhotoToIndexedDb(
  id: string,
  dataUrl: string,
  hash: string
): Promise<string> {
  const db = await getPhotoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: PhotoRecord = {
      id,
      dataUrl,
      hash,
      timestamp: Date.now(),
    };

    const request = store.put(record);

    request.onsuccess = () => {
      resolve(id);
    };

    request.onerror = () => {
      console.error('Error saving photo to IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Retrieve photo data URL by ID from IndexedDB
 */
export async function getPhotoFromIndexedDb(id: string): Promise<string | null> {
  if (!id) return null;
  try {
    const db = await getPhotoDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const record = request.result as PhotoRecord | undefined;
        resolve(record ? record.dataUrl : null);
      };

      request.onerror = () => {
        console.error('Error getting photo from IndexedDB:', request.error);
        resolve(null);
      };
    });
  } catch (e) {
    console.error('getPhotoFromIndexedDb exception:', e);
    return null;
  }
}

/**
 * Check if a photo with this hash already exists in IndexedDB
 */
export async function hasPhotoWithHash(hash: string): Promise<boolean> {
  if (!hash) return false;
  try {
    const db = await getPhotoDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('hash');
      const request = index.getKey(hash);

      request.onsuccess = () => {
        resolve(request.result !== undefined);
      };

      request.onerror = () => {
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}

/**
 * Delete a photo from IndexedDB
 */
export async function deletePhotoFromIndexedDb(id: string): Promise<void> {
  try {
    const db = await getPhotoDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('deletePhotoFromIndexedDb exception:', e);
  }
}
