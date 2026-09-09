/**
 * Ids. Sortable, offline-safe, and stable enough to be a sync key.
 * Time prefix + randomness so records created offline keep their order.
 */
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

function randomChars(n: number): string {
  const bytes = new Uint8Array(n);
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
  let out = '';
  for (let i = 0; i < n; i++) out += ALPHABET[(bytes[i] ?? 0) % ALPHABET.length];
  return out;
}

export function newId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${randomChars(6)}`;
}

/** A deterministic id factory, for tests and for reproducible fixtures. */
export function sequentialIds(seed = 0): (prefix?: string) => string {
  let n = seed;
  return (prefix = 'id') => `${prefix}_${(n++).toString(36).padStart(4, '0')}`;
}

export function todayISO(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * The day a moment belongs to, honouring the user's day boundary
 * (default 3am, so a night owl's 1am still belongs to yesterday).
 */
export function dayOf(instant: Date, boundaryHour = 3): string {
  const d = new Date(instant);
  if (d.getHours() < boundaryHour) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
