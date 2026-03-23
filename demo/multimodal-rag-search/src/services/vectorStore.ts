import { openDB, IDBPDatabase } from 'idb';
import { EmbeddedFile } from './types';

const DB_NAME = 'multimodal-rag-db';
const STORE_NAME = 'files';

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function saveFile(file: EmbeddedFile) {
  const db = await initDB();
  await db.put(STORE_NAME, file);
}

export async function getAllFiles(): Promise<EmbeddedFile[]> {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

export async function deleteFile(id: string) {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
}

export function cosineSimilarity(a: number[], b: number[]) {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    mA += a[i] * a[i];
    mB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}
