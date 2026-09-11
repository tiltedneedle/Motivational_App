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

/**
 * The person's if-then as one sentence, without a full stop.
 *
 * The stone shows the framing — "If ___ happens" above the first field,
 * "…then I" above the second — and the person completes both. So the halves
 * arrive without the framing words, mostly: some people type the "if" and
 * some type "then I" and a few type "I'll", and printed naively that came out
 * as "then I I'll put the phone in the hall". The framing is supplied here,
 * once, and whatever of it they typed themselves is not supplied twice.
 *
 * `spans` are the parts of the sentence that are theirs, verbatim, for the
 * screens that set their words in their face: their half with its own
 * framing words and trailing stop trimmed is still a substring of what they
 * wrote, so it still passes the guard.
 */
export function ifThenOf(line: string, line2: string): { sentence: string; spans: string[] } {
  const cond = line
    .trim()
    .replace(/^if\s+/i, '')
    .replace(/[\s,;.!?]+$/, '');
  let act = line2
    .trim()
    .replace(/^,?\s*then\s+/i, '')
    .replace(/[\s.!?]+$/, '');
  // They typed the subject the framing supplies. "I put …" loses its "I" to
  // the framing's; "I'll put …" keeps its contraction and the framing stops
  // at "then".
  let then: string;
  if (/^I\s+/.test(act)) {
    act = act.replace(/^I\s+/, '');
    then = `then I ${act}`;
  } else if (/^I['’]/.test(act)) {
    then = `then ${act}`;
  } else {
    then = `then I ${act}`;
  }
  return { sentence: `if ${cond}, ${then}`, spans: [cond, act].filter((s) => s.length > 0) };
}

/**
 * The day something was sealed, as the app counts days.
 *
 * A seal is an instant; the label on it is a day, and the day is the one the
 * person was living in when they pressed — a Book sealed at half past
 * midnight is sealed on the evening it was written, not the calendar date
 * that has just ticked over. `sealedAt.slice(0, 10)` gave the UTC date,
 * which east of Greenwich is a different day for most of every evening.
 */
export function sealedOn(sealedAt: string, boundaryHour = 3): string {
  const at = new Date(sealedAt);
  if (Number.isNaN(at.getTime())) return (sealedAt ?? '').slice(0, 10);
  return dayOf(at, boundaryHour);
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

/**
 * "1 goal", "2 goals". The plural is only ever an "s" away in this product's
 * copy, and where it is not, pass the irregular form.
 *
 * Worth a helper rather than a ternary at each site: the Settings screen read
 * "1 pieces of writing, 1 goals, 5 lines, 1 edition of the Book", which is the
 * kind of sentence that quietly tells someone nobody looked at this screen.
 */
export function plural(n: number, one: string, many?: string): string {
  return `${n} ${n === 1 ? one : (many ?? `${one}s`)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * A date the way a person says it: "10 Oct", or "Thu 10 Oct" when the day of
 * the week is the useful part.
 *
 * Screens were printing the stored form — "MILESTONE 1 · BY 2026-10-10", "back
 * on 2026-09-08" — which is a database value on a page about somebody's life.
 * The year is added only when it is not the current one, because on a plan that
 * runs twelve weeks it is noise.
 */
/**
 * Close a sentence without doubling punctuation the person already wrote.
 *
 * The app's prose ends a great many sentences with a quotation of theirs, and
 * theirs usually ends in a full stop already: `…the whole way.".` was the
 * app's punctuation landing on top of the person's. Looks past a closing
 * quote mark, so `way.”` is already finished.
 */
export function endSentence(s: string): string {
  const t = s.trimEnd();
  if (!t) return t;
  const meaningful = t.replace(/["'\u201d\u2019]+$/, '');
  return /[.!?]$/.test(meaningful) ? t : `${t}.`;
}

export function formatDay(iso: string, opts: { weekday?: boolean; today?: string } = {}): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso ?? '').trim());
  if (!m) return iso ?? '';
  const [, y, mo, d] = m;
  const month = MONTHS[Number(mo) - 1] ?? mo;
  const day = String(Number(d));
  const thisYear = (opts.today ?? new Date().toISOString().slice(0, 10)).slice(0, 4);
  const year = y === thisYear ? '' : ` ${y}`;
  if (!opts.weekday) return `${day} ${month}${year}`;
  const dow = WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()] ?? '';
  return `${dow} ${day} ${month}${year}`;
}
