import type { ApiCall, AlertRule, ActiveAlert } from './types';

// ── IndexedDB for calls (can be thousands of records) ────────────────────

const DB_NAME = 'opscommand';
const DB_VERSION = 1;
const CALLS_STORE = 'calls';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CALLS_STORE)) {
        const store = db.createObjectStore(CALLS_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Write a batch of new calls to IndexedDB. */
export async function persistCalls(calls: ApiCall[]): Promise<void> {
  if (!calls.length) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CALLS_STORE, 'readwrite');
    const store = tx.objectStore(CALLS_STORE);
    calls.forEach(c => store.put(c));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load all calls from the last `windowMs` milliseconds. */
export async function loadCalls(windowMs = 86_400_000): Promise<ApiCall[]> {
  const db = await openDB();
  const cutoff = Date.now() - windowMs;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CALLS_STORE, 'readonly');
    const index = tx.objectStore(CALLS_STORE).index('timestamp');
    const range = IDBKeyRange.lowerBound(cutoff);
    const req = index.getAll(range);
    req.onsuccess = () => resolve(req.result as ApiCall[]);
    req.onerror = () => reject(req.error);
  });
}

/** Purge calls older than `windowMs` to keep storage lean. */
export async function purgeStaleCalls(windowMs = 86_400_000): Promise<void> {
  const db = await openDB();
  const cutoff = Date.now() - windowMs;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CALLS_STORE, 'readwrite');
    const index = tx.objectStore(CALLS_STORE).index('timestamp');
    const range = IDBKeyRange.upperBound(cutoff);
    const req = index.openCursor(range);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── localStorage for rules and alerts (small, JSON-safe) ─────────────────

const RULES_KEY = 'opscommand:rules';
const ALERTS_KEY = 'opscommand:alerts';

export function saveRules(rules: AlertRule[]): void {
  try { localStorage.setItem(RULES_KEY, JSON.stringify(rules)); } catch { /* quota exceeded */ }
}

export function loadRules(): AlertRule[] | null {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    return raw ? (JSON.parse(raw) as AlertRule[]) : null;
  } catch { return null; }
}

export function saveAlerts(alerts: ActiveAlert[]): void {
  // Only persist the last 100 alerts to keep storage small
  try {
    const trimmed = alerts.slice(-100);
    localStorage.setItem(ALERTS_KEY, JSON.stringify(trimmed));
  } catch { /* quota exceeded */ }
}

export function loadAlerts(): ActiveAlert[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? (JSON.parse(raw) as ActiveAlert[]) : [];
  } catch { return []; }
}
