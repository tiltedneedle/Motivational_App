/**
 * What Morrow is allowed to send, and when (PRD §7.11).
 *
 * The rules are short and every one of them is a promise not to be the kind of
 * app people mute:
 *
 *   - at most one notification per moment (wake, evening, Sunday, milestone);
 *   - quiet hours 22:00–07:00 by default, and nothing is sent inside them;
 *   - copy in the person's chosen register, and never shaming;
 *   - a missed notification is not resent;
 *   - after a gap, one gentle nudge on day three and none after.
 *
 * This is a pure planner: it decides what should exist and hands back a list.
 * Scheduling those with the OS is the adapter's job, so the rules can be tested
 * without a device — which is the only way they can be tested at all here.
 *
 * Like the coach, it quotes rather than invents. Where a line of the person's
 * own fits, it goes in the body verbatim and its span is listed in `quotes`.
 */
import type { BookVersion, DaySummary, Move, Persona } from '../types';
import { endSentence, formatDay } from '../ids';

export type Moment = 'wake' | 'evening' | 'sunday' | 'milestone' | 'return';

export interface Notice {
  /** Stable per moment per day, so scheduling twice cannot double-send. */
  id: string;
  moment: Moment;
  /** Local wall-clock ISO, no zone: the OS schedules it in the device's own. */
  at: string;
  title: string;
  body: string;
  /**
   * Where tapping it should land. A notification that opens the app to
   * wherever it happened to be is a notification that wasted somebody's tap:
   * the Sunday line is about the reading view and should open it.
   */
  route: string;
  /** Substrings of the person's own writing that appear in `body`. */
  quotes: string[];
}

export interface QuietHours {
  /** Inclusive hour the quiet begins, 0–23. */
  from: number;
  /** Exclusive hour the quiet ends, 0–23. */
  to: number;
}

export const DEFAULT_QUIET: QuietHours = { from: 22, to: 7 };

/** The day a gap becomes worth one gentle word, and the only one there is. */
export const RETURN_NUDGE_DAY = 3;

export interface NoticeInput {
  /** The day being planned for, `YYYY-MM-DD`. */
  day: string;
  /** `HH:MM`. */
  wakeTime: string;
  /** `HH:MM`. */
  eveningTime: string;
  /** Hour of the Sunday reading, 0–23. */
  sundayHour: number;
  persona: Persona;
  quiet?: QuietHours;
  book: BookVersion | null;
  /** Everything open or closed today, so the evening word knows which it is. */
  moves: Move[];
  /** Yesterday's summary, for the wake line. */
  yesterday: DaySummary | null;
  /** Days since anything at all was logged. 0 means today. */
  daysSinceAnything: number;
  /** A milestone falling due today, if one does. */
  milestone?: { title: string; proof: string } | null;
  /** Off entirely. Everything below returns nothing. */
  muted?: boolean;
}

/**
 * Whether an hour falls inside the quiet window, which may wrap midnight.
 *
 * Both ends are taken modulo 24, and equal ends mean no quiet window at all.
 * There is deliberately no way to spell "quiet every hour of the day" here:
 * that is what muting is for, and a quiet window that swallows the whole clock
 * silently cancels everything while the settings screen still says
 * notifications are on.
 */
export function isQuiet(hour: number, quiet: QuietHours = DEFAULT_QUIET): boolean {
  const from = ((quiet.from % 24) + 24) % 24;
  const to = ((quiet.to % 24) + 24) % 24;
  if (from === to) return false;
  return from < to ? hour >= from && hour < to : hour >= from || hour < to;
}

/**
 * Push a time out of the quiet window rather than cancelling it.
 *
 * Somebody whose wake time is 06:30 has told the app when their morning is;
 * dropping the one line it had for them because the default quiet hours have
 * not ended yet would be the app's preference beating theirs. It waits until
 * the window opens instead. Null means the time itself was unreadable, or the
 * window has no opening — see `isQuiet` for why the second cannot happen with
 * a well-formed window.
 */
export function outOfQuiet(hhmm: string, quiet: QuietHours = DEFAULT_QUIET): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  if (!isQuiet(hour, quiet)) return `${String(hour).padStart(2, '0')}:${m[2]}`;
  // The first minute the quiet is over. Checked rather than assumed: a window
  // whose ends are equal has no "over", and returning its start would put the
  // notification back inside the hours it was moved out of.
  const opens = ((quiet.to % 24) + 24) % 24;
  if (isQuiet(opens, quiet)) return null;
  return `${String(opens).padStart(2, '0')}:00`;
}

/**
 * The register the morning line is written in.
 *
 * Only the morning has one. The evening line asks them to seal the day and the
 * Sunday line asks them to read; neither is a push, and a fierce evening
 * notification is just a stranger being sharp with somebody who has already
 * decided the day is over.
 */
const REGISTER: Record<Persona, (s: string) => string> = {
  // The same shape the coach uses ("When you're ready, start with…"): a
  // sentence, not a label with a colon after it.
  gentle: (s) => `When you're ready, ${lower(s)}`,
  straight: (s) => s,
  fierce: (s) => s,
};

function at(day: string, hhmm: string): string {
  return `${day}T${hhmm}:00`;
}

function lower(s: string): string {
  if (/^(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\b|^I\b/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * Everything Morrow may send on one day. Never more than one per moment, and
 * never anything it cannot say in the person's own words or in plain chrome.
 */
export function planNotices(input: NoticeInput): Notice[] {
  if (input.muted) return [];
  const quiet = input.quiet ?? DEFAULT_QUIET;
  const wakeLine = REGISTER[input.persona];
  const out: Notice[] = [];

  // ---- a gap. One word on day three, and none after, whatever else is due.
  //
  // Somebody who has been away a week does not need the morning line, the
  // evening line and a nudge on top; they need one sentence and the door left
  // open. This returns early on purpose.
  if (input.daysSinceAnything >= RETURN_NUDGE_DAY) {
    if (input.daysSinceAnything !== RETURN_NUDGE_DAY) return [];
    const time = outOfQuiet(input.wakeTime, quiet);
    if (!time) return [];
    const line = input.book?.iWill?.trim() ?? '';
    return [
      {
        id: `${input.day}:return`,
        moment: 'return',
        at: at(input.day, time),
        title: 'Still here',
        route: '/today',
        body: line
          ? `Nothing reset. The Book still says ${endSentence(`“${line}”`)}`
          : 'Nothing reset while you were away. It is all still here.',
        quotes: line ? [line] : [],
      },
    ];
  }

  // ---- wake: the first open move, in their words
  const first = [...input.moves].filter((m) => m.status === 'todo').sort((a, b) => a.order - b.order)[0];
  const wakeAt = outOfQuiet(input.wakeTime, quiet);
  if (wakeAt && first) {
    out.push({
      id: `${input.day}:wake`,
      moment: 'wake',
      at: at(input.day, wakeAt),
      title: 'This morning',
      route: '/today',
      body: wakeLine(endSentence(`Start with ${lower(first.title)}`)),
      quotes: [first.title],
    });
  }

  // ---- evening: seal the day, or say it is already sealed and stay quiet
  const sealed = Boolean(input.yesterday && input.yesterday.day === input.day && input.yesterday.sealedAt);
  const eveningAt = outOfQuiet(input.eveningTime, quiet);
  if (eveningAt && !sealed) {
    const done = input.moves.filter((m) => m.status === 'done').length;
    out.push({
      id: `${input.day}:evening`,
      moment: 'evening',
      at: at(input.day, eveningAt),
      title: 'Seal the day',
      route: '/seal-day',
      // Never a count of what is missing. A quiet day goes in the ledger as a
      // quiet day, and the notification says the same thing the screen does.
      body: done > 0 ? 'Put it in the ledger before you sleep.' : 'Quiet day or not, it goes in the ledger.',
      quotes: [],
    });
  }

  // ---- Sunday reading
  const isSunday = new Date(`${input.day}T00:00:00Z`).getUTCDay() === 0;
  const sundayAt = outOfQuiet(`${String(input.sundayHour).padStart(2, '0')}:00`, quiet);
  if (isSunday && sundayAt && input.book) {
    out.push({
      id: `${input.day}:sunday`,
      moment: 'sunday',
      at: at(input.day, sundayAt),
      title: 'Sunday reading',
      route: '/reading',
      body: input.book.firstSentence?.trim()
        ? `Ten minutes with what you wrote. It opens: “${input.book.firstSentence.trim()}”`
        : 'Ten minutes with what you wrote.',
      quotes: input.book.firstSentence?.trim() ? [input.book.firstSentence.trim()] : [],
    });
  }

  // ---- a milestone falling due
  if (input.milestone && wakeAt) {
    out.push({
      id: `${input.day}:milestone`,
      moment: 'milestone',
      // Not on top of the wake line: an hour later, so the day has one voice at
      // a time. PRD: at most one notification per moment.
      at: at(input.day, shiftHour(wakeAt, 1, quiet) ?? wakeAt),
      title: `Milestone · ${formatDay(input.day)}`,
      route: '/progress',
      body: input.milestone.proof.trim()
        ? `${input.milestone.title}. Your rule: “${input.milestone.proof.trim()}”`
        : input.milestone.title,
      quotes: input.milestone.proof.trim() ? [input.milestone.proof.trim()] : [],
    });
  }

  return dedupeByMoment(out);
}

function shiftHour(hhmm: string, by: number, quiet: QuietHours): string | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const hour = (Number(m[1]) + by) % 24;
  return outOfQuiet(`${String(hour).padStart(2, '0')}:${m[2]}`, quiet);
}

/** One per moment. The first one wins, because it is the one that was chosen. */
export function dedupeByMoment(notices: Notice[]): Notice[] {
  const seen = new Set<Moment>();
  const out: Notice[] = [];
  for (const n of notices) {
    if (seen.has(n.moment)) continue;
    seen.add(n.moment);
    out.push(n);
  }
  return out;
}

/**
 * What to schedule, given what is already scheduled.
 *
 * A missed notification is not resent (PRD §7.11), so anything whose time has
 * passed is dropped rather than fired late — a phone that was off overnight
 * must not deliver yesterday's morning line at breakfast. Anything already
 * scheduled under the same id is left alone, which is what makes calling this
 * on every launch safe.
 */
export function toSchedule(notices: Notice[], now: Date, alreadyScheduled: readonly string[] = []): Notice[] {
  const have = new Set(alreadyScheduled);
  return notices.filter((n) => {
    if (have.has(n.id)) return false;
    const when = Date.parse(n.at);
    return Number.isFinite(when) && when > now.getTime();
  });
}

/**
 * The "Fewer" action on every notification (PRD §7.11).
 *
 * One step at a time rather than an all-or-nothing switch: the evening line
 * goes first because it is the one that arrives when somebody has already
 * decided the day is over, then the morning, and only then everything.
 */
export const FEWER_STEPS: readonly (Moment[])[] = [
  ['evening'],
  ['evening', 'wake'],
  ['evening', 'wake', 'sunday', 'milestone', 'return'],
];

export function fewer(muted: readonly Moment[]): Moment[] {
  const current = new Set(muted);
  for (const step of FEWER_STEPS) {
    if (step.some((m) => !current.has(m))) return [...step];
  }
  return [...FEWER_STEPS[FEWER_STEPS.length - 1]!];
}

export function withoutMuted(notices: Notice[], muted: readonly Moment[]): Notice[] {
  const off = new Set(muted);
  return notices.filter((n) => !off.has(n.moment));
}
