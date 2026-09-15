/**
 * The Past volume: where you came from, in periods.
 *
 * The source program divides a life into seven epochs, asks for the most
 * significant events in each, and then asks how each one shaped who you are
 * today. We keep that shape exactly, because it is the shape that makes a
 * structured autobiography rather than a diary: the periods come first, the
 * events hang on them, and the analysis is the third move, not the first.
 *
 * Two things we do differently, on purpose.
 *
 * The first is dose. The source calls this the hardest and longest of its
 * programs and recommends leaving it until last. Starter is four periods and
 * three events analysed — an evening, not a weekend — and Full is their seven
 * and ten. The app suggests the same order they do, and never forces it.
 *
 * The second is consent, everywhere. Each analysed event is the person's to
 * keep out of the Book, the helplines are one tap from every screen, and
 * stopping part way keeps what was written. Nothing here is a treatment and
 * the copy never suggests it is.
 */
import type { DepthTrack } from '../types';

export interface Epoch {
  id: string;
  /** What the person calls this period, in plain words. */
  label: string;
  /** Inclusive age bounds; the last one runs to the person's age now. */
  fromAge: number;
  toAge: number;
}

export interface PastEvent {
  id: string;
  epochId: string;
  /** Their own short title for it. */
  title: string;
  /** One that helped, or one that hurt. Never "good" and "bad". */
  weight: 'helped' | 'hurt';
  /** Chosen for the third move. */
  analysed: boolean;
}

export interface PastAnalysis {
  eventId: string;
  /** What happened, in their words. Ceilinged. */
  whatHappened: string;
  /** The source's third move: how it shaped who you are today. */
  shapedMe: string;
  /** One line they still believe, or would say to that version of themselves. */
  stillBelieve: string;
  /** Their choice, per event. Nothing joins the Book without it. */
  joinsBook: boolean;
}

/** Seven on the long track, as the source has it; four on an evening. */
export function epochCount(track: DepthTrack): number {
  return track === 'full' ? 7 : 4;
}

/** How many events to analyse. The source's ten, or three. */
export function analyseTarget(track: DepthTrack): number {
  return track === 'full' ? 10 : 3;
}

/** How many events one period may hold. */
export function eventsPerEpoch(track: DepthTrack): number {
  return track === 'full' ? 6 : 2;
}

/** A ceiling per box, as the source has: enough to say it, not enough to drown in. */
export const PAST_WRITE_CEILING = 900;
export const PAST_LINE_CEILING = 200;

/**
 * The periods of a life, cut by age.
 *
 * Before school, school, and the years after are the same for everyone; the
 * rest are cut evenly from where school ends to the age they are now, so a
 * person of nineteen is not asked about their forties. Under-sixteens get the
 * periods that exist for them and no more.
 */
export function epochsFor(age: number, track: DepthTrack): Epoch[] {
  const want = epochCount(track);
  const now = Math.max(6, Math.min(110, Math.round(age)));
  const fixed: Epoch[] = [
    { id: 'ep-early', label: 'Before school', fromAge: 0, toAge: 5 },
    { id: 'ep-school', label: 'School', fromAge: 6, toAge: 12 },
    { id: 'ep-teens', label: 'The teenage years', fromAge: 13, toAge: 18 },
  ];
  const early = fixed.filter((e) => e.fromAge < now);
  if (now <= 18) {
    return early.slice(0, want).map((e, i, all) => (i === all.length - 1 ? { ...e, toAge: now } : e));
  }
  const remaining = Math.max(1, want - early.length);
  const span = now - 18;
  const step = Math.max(1, Math.ceil(span / remaining));
  const later: Epoch[] = [];
  for (let from = 19; from <= now && later.length < remaining; from += step) {
    const to = Math.min(now, from + step - 1);
    later.push({
      id: `ep-${from}-${to}`,
      label: to >= now ? `${from} to now` : `${from} to ${to}`,
      fromAge: from,
      toAge: to,
    });
  }
  return [...early, ...later];
}

/** Whether this event is finished: all three boxes, and a decision about the Book. */
export function analysisComplete(a: Pick<PastAnalysis, 'whatHappened' | 'shapedMe' | 'stillBelieve'>): boolean {
  return a.whatHappened.trim().length > 0 && a.shapedMe.trim().length > 0 && a.stillBelieve.trim().length > 0;
}

/** Only the lines they chose to keep may be quoted anywhere else in the app. */
export function quotableLines(events: PastEvent[], analyses: PastAnalysis[]): string[] {
  const kept = new Set(events.filter((e) => e.analysed).map((e) => e.id));
  return analyses
    .filter((a) => kept.has(a.eventId) && a.joinsBook && a.stillBelieve.trim())
    .map((a) => a.stillBelieve.trim());
}

export type PastStep =
  | { step: 'age' }
  | { step: 'events'; epochId: string; listed: number }
  | { step: 'choose'; listed: number; target: number }
  | { step: 'analyse'; eventId: string; done: number; total: number }
  | { step: 'done' };

/**
 * Where the person is, so the screen can be resumed and the path card can say
 * what is next. The three moves in order: the periods, the events, the
 * analysis.
 */
export function pastStep(
  epochs: Epoch[],
  events: PastEvent[],
  analyses: PastAnalysis[],
  track: DepthTrack,
  /**
   * Whether the person has walked all the periods and said they are done
   * listing. Without this the walk ended at the first period that happened to
   * have an event in it, so a second event could never be added to it — and a
   * period a person deliberately left empty pulled them back to it forever.
   */
  listed = false,
): PastStep {
  if (epochs.length === 0) return { step: 'age' };
  const empty = listed ? undefined : epochs.find((e) => !events.some((v) => v.epochId === e.id));
  if (empty) return { step: 'events', epochId: empty.id, listed: events.length };
  if (!listed && events.length === 0) return { step: 'events', epochId: epochs[0]!.id, listed: 0 };
  const target = Math.min(analyseTarget(track), events.length);
  const chosen = events.filter((e) => e.analysed);
  if (chosen.length < target) return { step: 'choose', listed: events.length, target };
  const byId = new Map(analyses.map((a) => [a.eventId, a]));
  const next = chosen.find((e) => {
    const a = byId.get(e.id);
    return !a || !analysisComplete(a);
  });
  if (next) {
    return {
      step: 'analyse',
      eventId: next.id,
      done: chosen.filter((e) => {
        const a = byId.get(e.id);
        return a && analysisComplete(a);
      }).length,
      total: chosen.length,
    };
  }
  return { step: 'done' };
}
