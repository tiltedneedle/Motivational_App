/**
 * What Morrow knows about me (PRD §7.9, §7.12).
 *
 * "The memory profile, editable line by line … user edits are locked."
 * "Memory editable and deletable" is also the product's answer to the
 * companion-chatbot scrutiny row in §3.5.
 *
 * The profile is a document of lines, each one built from something the
 * person wrote or did and nothing else: their name, their register, their
 * goals and the lines under them, what the Book opens with, how their days
 * have gone. No line is inferred. Where a line quotes them, the quote
 * travels separately from the app's framing of it, so the screen can set
 * their words in the serif and the app's in the sans, the same rule as
 * everywhere else.
 *
 * Every line has a stable key. An edit is stored against the key and wins
 * over the rebuilt line for as long as the edit stands; a forget removes the
 * line and, through `forgottenLineIds`, takes the underlying material out of
 * the coach's hands as well — forgetting the if-then means the coach stops
 * quoting it, not only that the screen stops listing it.
 */
import type { BookVersion, DaySummary, Goal, GoalAnalysis, MemoryEdit, Profile } from '../types';
import { formatDay, ordinal, plural, sealedOn } from '../ids';
import { ANALYSIS_TITLES } from './framings';
import { detectReturns } from './consistency';
import { isQuotable } from './safety';

export type MemoryAbout = 'you' | 'your goals' | 'your lines' | 'the Book' | 'your days';

export interface MemoryLine {
  /** Stable across rebuilds; what an edit or a forget is stored against. */
  key: string;
  about: MemoryAbout;
  /** The app's framing, in the sans. */
  text: string;
  /** Their own words, if the line quotes any, in the serif. */
  quote?: string;
}

export interface MemoryInput {
  profile: Profile;
  goals: readonly Goal[];
  analyses: readonly GoalAnalysis[];
  books: readonly BookVersion[];
  days: Readonly<Record<string, DaySummary>>;
  today: string;
}

const REGISTER: Record<Profile['persona'], string> = {
  gentle: 'gently',
  straight: 'straight',
  fierce: 'fiercely',
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function hourInWords(h: number): string {
  if (h === 0) return 'midnight';
  return `${h} in the morning`;
}

/**
 * The profile as it stands from the person's own material. Deterministic:
 * the same store builds the same lines, so an edit stored against a key
 * lands on the same line tomorrow.
 */
export function buildMemory(input: MemoryInput): MemoryLine[] {
  const { profile, goals, analyses, books, days, today } = input;
  const lines: MemoryLine[] = [];
  const you = (key: string, text: string, quote?: string) => lines.push({ key, about: 'you', text, ...(quote ? { quote } : {}) });

  // ---- you
  if (profile.displayName.trim()) you('you.name', 'You asked to be called', profile.displayName.trim());
  you('you.register', `You asked to be spoken to ${REGISTER[profile.persona]}.`);
  you('you.track', `You write on the ${profile.track === 'full' ? 'Full' : 'Starter'} track.`);
  you(
    'you.times',
    `Your morning is ${profile.wakeTime}, your evening ${profile.eveningTime}, and a day ends at ${hourInWords(profile.dayBoundaryHour)}.`,
  );
  if (profile.witnessName?.trim()) you('you.witness', 'Your witness is', profile.witnessName.trim());

  // ---- your goals, and the lines under each
  const active = goals.filter((g) => g.status !== 'archived').sort((a, b) => a.rank - b.rank);
  for (const g of active) {
    lines.push({ key: `goal.${g.id}`, about: 'your goals', text: `${g.horizon} —`, quote: g.title });
    for (const a of analyses.filter((x) => x.goalId === g.id && isQuotable(x))) {
      const text = a.line.trim() || a.paragraph?.trim() || '';
      if (!text) continue;
      const quote = a.kind === 'obstacles' && a.line2?.trim() ? `${text} — then ${a.line2.trim()}` : text;
      lines.push({ key: `line.${a.id}`, about: 'your lines', text: `${ANALYSIS_TITLES[a.kind]}, for ${g.title}:`, quote });
    }
  }
  for (const g of goals.filter((x) => x.status === 'archived')) {
    lines.push({ key: `goal.${g.id}.letgo`, about: 'your goals', text: `You let go “${g.title}”${g.lesson?.trim() ? ':' : '.'}`, ...(g.lesson?.trim() ? { quote: g.lesson.trim() } : {}) });
  }

  // ---- the Book
  const latest = books[books.length - 1];
  if (latest) {
    lines.push({ key: 'book.edition', about: 'the Book', text: `${ordinal(latest.version)} edition of your Book, sealed ${formatDay(sealedOn(latest.sealedAt, profile.dayBoundaryHour))}.` });
    if (latest.firstSentence.trim()) lines.push({ key: 'book.first', about: 'the Book', text: 'It opens:', quote: latest.firstSentence.trim() });
    if (latest.iWill.trim()) lines.push({ key: 'book.iwill', about: 'the Book', text: 'It closes:', quote: latest.iWill.trim() });
  }

  // ---- your days
  const sealed = Object.values(days)
    .filter((d) => d.sealedAt)
    .sort((a, b) => (a.day < b.day ? -1 : 1));
  if (sealed.length) {
    lines.push({ key: 'days.sealed', about: 'your days', text: `You have sealed ${plural(sealed.length, 'day')}; the first was ${formatDay(sealed[0]!.day)}.` });
    const returns = detectReturns(Object.values(days), today).length;
    if (returns > 0) lines.push({ key: 'days.returns', about: 'your days', text: `You have come back ${plural(returns, 'time')} after a gap.` });
    const byWeekday = new Map<number, number>();
    for (const d of sealed) {
      const dow = new Date(`${d.day}T00:00:00Z`).getUTCDay();
      byWeekday.set(dow, (byWeekday.get(dow) ?? 0) + 1);
    }
    const best = [...byWeekday.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    if (best && sealed.length >= 3) lines.push({ key: 'days.weekday', about: 'your days', text: `Your sealed days fall most often on a ${WEEKDAYS[best[0]]}.` });
    const words = new Map<string, number>();
    for (const d of sealed) if (d.moodWord?.trim()) words.set(d.moodWord.trim(), (words.get(d.moodWord.trim()) ?? 0) + 1);
    const word = [...words.entries()].sort((a, b) => b[1] - a[1])[0];
    if (word) lines.push({ key: 'days.word', about: 'your days', text: 'The word you close a day with most often:', quote: word[0] });
    const last = [...sealed].reverse().find((d) => d.proof?.trim() && isQuotable(d));
    if (last) lines.push({ key: 'days.proof', about: 'your days', text: `Your last proof, ${formatDay(last.day)}:`, quote: last.proof!.trim() });
  }

  return lines;
}

/**
 * The person's edits laid over the rebuilt lines. An edited line keeps
 * their text whatever the rebuild says; a forgotten line is gone; an edit
 * whose line no longer builds is kept anyway, at the end, because a line
 * they wrote themselves is not the rebuild's to drop.
 */
export function applyMemoryEdits(lines: readonly MemoryLine[], edits: readonly MemoryEdit[]): MemoryLine[] {
  const byKey = new Map(edits.map((e) => [e.key, e]));
  const out: MemoryLine[] = [];
  for (const line of lines) {
    const e = byKey.get(line.key);
    if (!e) {
      out.push(line);
      continue;
    }
    if (e.text === null) continue;
    // Their words replace the whole line, framing and quote both.
    out.push({ key: line.key, about: line.about, text: '', quote: e.text });
  }
  const seen = new Set(lines.map((l) => l.key));
  for (const e of edits) {
    if (e.text !== null && !seen.has(e.key)) out.push({ key: e.key, about: 'you', text: '', quote: e.text });
  }
  return out;
}

/** Whether a line has been edited by the person (locked) or forgotten. */
export function memoryEditOf(edits: readonly MemoryEdit[], key: string): MemoryEdit | null {
  return edits.find((e) => e.key === key) ?? null;
}

/**
 * The analyses the person has told the coach to forget. A forgotten `line.*`
 * key names the analysis id, and the coach's context is filtered by it, so
 * forgetting the if-then really does stop the coach quoting it.
 */
export function forgottenLineIds(edits: readonly MemoryEdit[]): Set<string> {
  return new Set(edits.filter((e) => e.text === null && e.key.startsWith('line.')).map((e) => e.key.slice('line.'.length)));
}

/** ≈1,500 tokens (PRD §7.9): the cap on what a coach is handed. */
export const MEMORY_DOCUMENT_CHARS = 6000;

/**
 * The document a model coach would be handed, and what the sync stores on
 * `memory_profiles`. One line per line; the person's words in quotation
 * marks; cut at the cap on a line boundary so no quote is torn.
 */
export function memoryDocument(lines: readonly MemoryLine[]): string {
  const out: string[] = [];
  let length = 0;
  for (const l of lines) {
    const row = `- ${[l.text.trim(), l.quote ? `“${l.quote}”` : ''].filter(Boolean).join(' ')}`;
    if (length + row.length + 1 > MEMORY_DOCUMENT_CHARS) break;
    out.push(row);
    length += row.length + 1;
  }
  return out.join('\n');
}

export const MEMORY_ABOUT_ORDER: MemoryAbout[] = ['you', 'your goals', 'your lines', 'the Book', 'your days'];
