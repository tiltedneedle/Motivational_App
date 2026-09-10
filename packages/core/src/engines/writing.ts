/**
 * The Fifteen (PRD §7.2): fifteen minutes of continuous writing.
 *
 * The room protects the writing. It has no toolbar, no back button and no
 * spell-check; the only help is the user's own earlier words in the margin and
 * a nudge that is always a question and never contains a noun from their text.
 */
import type { DepthTrack, WritingKind, WritingMode } from '../types';

export const IDEAL_SECONDS = 15 * 60;
export const SHADOW_SECONDS_STARTER = 8 * 60;
export const SHADOW_SECONDS_FULL = 15 * 60;
/** Starter counts a Fifteen as complete at ten minutes; Full wants the whole floor. */
export const STARTER_MIN_SECONDS = 10 * 60;
export const IDLE_NUDGE_AFTER_MS = 8_000;
export const DRAFT_LOCK_HOURS = 24;

export const NUDGES: string[] = [
  'Keep going. Say the next true thing.',
  'What is on the table in front of you?',
  'Who notices the change first?',
  'What did you stop apologising for?',
  'What does your body know how to do now?',
  'What do you not have to think about any more?',
  'Where is the money, and how does it feel?',
  "What did you make that didn't exist before?",
];

/** Never the same one twice in a row. */
export function nextNudge(previous: string | null): string {
  const pool = previous ? NUDGES.filter((n) => n !== previous) : NUDGES;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick ?? NUDGES[0]!;
}

export const DOORWAY: Record<WritingKind, { eyebrow: string; prompt: string; note: string }> = {
  ideal: {
    eyebrow: 'The Fifteen · the ideal',
    prompt:
      "It is three to five years from now and things went as well as they could. You looked after yourself. Tell me what a Tuesday looks like: where you wake, what you do, who is there, what you have made, what is no longer a problem.",
    note: "Write or talk. Don't fix spelling. Don't go back. If you run out, say the next true thing.",
  },
  shadow: {
    eyebrow: 'The other road',
    prompt:
      'Same distance ahead, but your worst habits won. The excuses you already know, the things you told yourself, what it cost and who paid.',
    note: 'Be specific, and unkind to the version of you that let it happen. You will not have to read this often.',
  },
  addition: {
    eyebrow: 'Add to it',
    prompt: 'Yesterday you stopped mid-thought. Pick it up where it was; this is appended, never overwritten.',
    note: 'Same rules. No editing what is already there.',
  },
  memory_start: {
    eyebrow: 'The moment it started',
    prompt:
      'Tell me the moment this became something you wanted. Where you were, how old you were, who was there, what was said or not said.',
    note: 'Then one line: what that moment taught you that you still believe.',
  },
  memory_broke: {
    eyebrow: "The time it didn't hold",
    prompt: 'A time you tried this, or something like it, and it did not last. What happened, honestly, and what you decided about yourself afterwards.',
    note: 'Then one line: what you would tell that version of you, now that you know more.',
  },
};

export function targetSeconds(kind: WritingKind, track: DepthTrack): number {
  if (kind === 'shadow') return track === 'full' ? SHADOW_SECONDS_FULL : SHADOW_SECONDS_STARTER;
  if (kind === 'memory_start' || kind === 'memory_broke') return 10 * 60;
  return IDEAL_SECONDS;
}

export function minSecondsToCount(kind: WritingKind, track: DepthTrack): number {
  if (kind === 'ideal') return track === 'full' ? IDEAL_SECONDS : STARTER_MIN_SECONDS;
  return Math.round(targetSeconds(kind, track) * 0.6);
}

export function wordCount(text: string): number {
  const t = (text ?? '').trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/** Depth becomes polish, never a counter the user can game. */
export function polish(words: number): number {
  if (words <= 0) return 0;
  // 350 words is the median we want; 700 is fully polished.
  return Math.max(0.15, Math.min(1, Number((words / 700).toFixed(3))));
}

export interface WritingSessionState {
  kind: WritingKind;
  mode: WritingMode;
  track: DepthTrack;
  body: string;
  /** Seconds of the ring that have actually elapsed while the room was open. */
  elapsed: number;
  idleMs: number;
  nudge: string | null;
  nudgeCount: number;
  /** A session may be paused and resumed once; a second leave ends the sitting. */
  pausedOnce: boolean;
  closed: boolean;
}

export function startWriting(kind: WritingKind, track: DepthTrack, mode: WritingMode = 'type'): WritingSessionState {
  return {
    kind,
    mode,
    track,
    body: '',
    elapsed: 0,
    idleMs: 0,
    nudge: null,
    nudgeCount: 0,
    pausedOnce: false,
    closed: false,
  };
}

/**
 * What survives the app being killed mid-sitting.
 *
 * Fifteen minutes of writing is the most expensive thing a person gives this
 * product, and a backgrounded phone must never be able to take it. The room
 * writes one of these to disk as it goes; nothing else in the app reads it.
 */
export interface WritingDraft {
  kind: WritingKind;
  mode: WritingMode;
  track: DepthTrack;
  body: string;
  elapsed: number;
  /** True once the sitting has already been picked back up. */
  pausedOnce: boolean;
  updatedAt: string;
}

export function draftOf(s: WritingSessionState, updatedAt = new Date().toISOString()): WritingDraft {
  return {
    kind: s.kind,
    mode: s.mode,
    track: s.track,
    body: s.body,
    elapsed: s.elapsed,
    pausedOnce: s.pausedOnce,
    updatedAt,
  };
}

/**
 * A sitting may be picked up once. The second interruption ends it, and what
 * was written still counts — the person is taken to the read-back with their
 * words rather than back to an empty room.
 */
export function resumeWriting(d: WritingDraft): WritingSessionState {
  return {
    kind: d.kind,
    mode: d.mode,
    track: d.track,
    body: d.body,
    elapsed: d.elapsed,
    idleMs: 0,
    nudge: null,
    nudgeCount: 0,
    pausedOnce: true,
    closed: d.elapsed >= targetSeconds(d.kind, d.track),
  };
}

export function canResume(d: WritingDraft | null | undefined): boolean {
  return !!d && !d.pausedOnce;
}

/** Enough of a sitting to be worth offering back. Below this it is a stray tap. */
export const DRAFT_WORTH_KEEPING_SECONDS = 20;

export function draftWorthKeeping(d: WritingDraft | null | undefined): boolean {
  if (!d) return false;
  return d.elapsed >= DRAFT_WORTH_KEEPING_SECONDS || wordCount(d.body) >= 15;
}

export function tick(s: WritingSessionState, deltaMs: number, typing: boolean): WritingSessionState {
  if (s.closed) return s;
  const elapsed = s.elapsed + deltaMs / 1000;
  const idleMs = typing ? 0 : s.idleMs + deltaMs;
  let nudge = s.nudge;
  let nudgeCount = s.nudgeCount;
  if (typing) {
    nudge = null;
  } else if (idleMs >= IDLE_NUDGE_AFTER_MS && !s.nudge) {
    nudge = nextNudge(s.nudge);
    nudgeCount += 1;
  }
  const done = elapsed >= targetSeconds(s.kind, s.track);
  return { ...s, elapsed, idleMs, nudge, nudgeCount, closed: done };
}

export function canClose(s: WritingSessionState): boolean {
  return s.elapsed >= minSecondsToCount(s.kind, s.track) || s.closed;
}

export function remaining(s: WritingSessionState): number {
  return Math.max(0, Math.round(targetSeconds(s.kind, s.track) - s.elapsed));
}

export function ringFraction(s: WritingSessionState): number {
  return Math.max(0, Math.min(1, s.elapsed / targetSeconds(s.kind, s.track)));
}

export function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Read-only for 24 hours after closing, so the draft is not tinkered into
 * safety.
 *
 * Twenty-four hours of elapsed time, not "the same clock time tomorrow".
 * Adding to the local hour field crosses a daylight-saving boundary as 23 or
 * 25 real hours, which is not the promise the copy on screen makes.
 */
export function draftLockUntil(closedAt = new Date()): string {
  return new Date(closedAt.getTime() + DRAFT_LOCK_HOURS * 60 * 60 * 1000).toISOString();
}

export function isLocked(sealedUntil: string | null, now = new Date()): boolean {
  if (!sealedUntil) return false;
  return new Date(sealedUntil).getTime() > now.getTime();
}
