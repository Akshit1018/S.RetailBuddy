const KEY = "stockscan_offline_sales_v1";

export type OfflineSalePayload = {
  id: string;
  createdAt: string;
  payload: unknown;
};

export function isOnline() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function readQueue(): OfflineSalePayload[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as OfflineSalePayload[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: OfflineSalePayload[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function enqueueSale(payload: unknown): OfflineSalePayload {
  const item: OfflineSalePayload = {
    id: `off_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    payload,
  };
  writeQueue([...readQueue(), item]);
  return item;
}

export function clearQueue() {
  writeQueue([]);
}

export function bindOnlineFlush(flush: (items: OfflineSalePayload[]) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    const q = readQueue();
    if (q.length) flush(q);
  };
  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}
