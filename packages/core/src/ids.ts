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

/**
 * The UTC calendar date. Not "today".
 *
 * Every "today" decision in the product goes through `dayOf`, which honours the
 * user's day boundary. This is kept only for stamping things that are genuinely
 * in UTC, and it is deliberately named for what it returns: using it as today
 * dated a move a day late for everyone west of UTC, and Today filters by the
 * local day, so the move never appeared at all.
 */
export function utcDate(now = new Date()): string {
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

const ORDINALS = [
  'Zeroth',
  'First',
  'Second',
  'Third',
  'Fourth',
  'Fifth',
  'Sixth',
  'Seventh',
  'Eighth',
  'Ninth',
  'Tenth',
];

/**
 * "First", "Second", "Twelfth". Used on the spine of the Book, which used to
 * say "First edition" whatever edition it was, so a re-authored Book was
 * indistinguishable from the original at a glance.
 */
export function ordinal(n: number): string {
  const i = Math.trunc(n);
  if (i >= 0 && i < ORDINALS.length) return ORDINALS[i] as string;
  const tens = i % 100;
  const suffix =
    tens >= 11 && tens <= 13 ? 'th' : i % 10 === 1 ? 'st' : i % 10 === 2 ? 'nd' : i % 10 === 3 ? 'rd' : 'th';
  return `${i}${suffix}`;
}
