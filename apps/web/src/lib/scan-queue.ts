'use client';

/**
 * Fila offline de scans - RNF03. Usa IndexedDB para persistir os scans enquanto
 * a empresa nao tem conexao. Ao voltar online o componente de scanner dispara
 * o flush via /scan/sync (idempotente via clientUuid).
 */

import type { ScanRequest } from '@eventpass/shared';

const DB_NAME = 'eventpass-scan-queue';
const STORE = 'queue';
const VERSION = 1;

type StoredScan = ScanRequest & {
  eventId: string;
  storedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'clientUuid' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const store = transaction.objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function enqueueScan(eventId: string, scan: ScanRequest): Promise<void> {
  const entry: StoredScan = { ...scan, eventId, storedAt: new Date().toISOString() };
  await tx('readwrite', (s) => s.put(entry));
}

export async function listScans(eventId: string): Promise<StoredScan[]> {
  const all = await tx<StoredScan[]>('readonly', (s) => s.getAll() as IDBRequest<StoredScan[]>);
  return all.filter((s) => s.eventId === eventId);
}

export async function removeScan(clientUuid: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(clientUuid));
}

export async function countScans(eventId: string): Promise<number> {
  const rows = await listScans(eventId);
  return rows.length;
}
