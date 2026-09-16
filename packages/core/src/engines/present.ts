/**
 * The Present volume: what gets in your way, and what you are good at.
 *
 * The source program does this in three moves — pick from lists clustered by
 * personality factor, narrow the picks down to the ones that matter most, then
 * write twice about each survivor. We keep the three moves and drop the
 * personality model: no factor is ever named, no trait word appears, nothing is
 * scored, and every card is a plain sentence a person would say about
 * themselves. The groups below exist only so a long deck can be sectioned; they
 * are internal and never rendered.
 *
 * The two writes are theirs, made concrete:
 *   fault   — a time it cost you, then what you would do instead
 *   virtue  — a time it mattered, then the goal that needs it
 *
 * The second half of a fault is the reason this volume is not a personality
 * quiz: "I start things and drift" plus "put the shoes by the door the night
 * before" is an if-then, and an if-then is what the Future volume's Obstacles
 * stone already holds. The Present volume feeds the plan.
 */
import type { DepthTrack } from '../types';

export type PresentHalf = 'faults' | 'virtues';

/** Sections of a long deck. Internal: never shown, never named to the person. */
export type CardGroup = 'drive' | 'order' | 'nerve' | 'people' | 'openness';
export const CARD_GROUPS: CardGroup[] = ['drive', 'order', 'nerve', 'people', 'openness'];

export interface PresentCard {
  id: string;
  /** A sentence in the first person. Never a trait, never a judgement. */
  text: string;
  group: CardGroup;
}

/** A way in to the second write. A hand on the shoulder, not an answer. */
export interface PresentFraming {
  id: string;
  label: string;
}

export interface PresentPick {
  cardId: string;
  half: PresentHalf;
  /** Their own words: a time it cost, or a time it mattered. */
  storyLine: string;
  /** Fault: what you would do instead. Virtue: what using it looks like next week. */
  applyLine: string;
  framingId: string | null;
  /** The goal this pairs with, once one exists. */
  goalId: string | null;
  /** Position after narrowing; 0 is the one that matters most. */
  rank: number;
}

/**
 * How many survive the narrowing.
 *
 * Starter is an evening: three is enough to change a plan and few enough to
 * write properly about, so the deck itself stops at three and that is the
 * whole move. Full keeps the source's ceiling of nine; its deck takes
 * everything that is plainly true, and the narrowing is a step of its own.
 *
 * The floor is one on both. A floor of six made a person with four true
 * faults tick two false ones, which is the opposite of what a deck is for —
 * and it left a half that was honestly finished counted as unfinished.
 */
export function narrowTo(track: DepthTrack): { min: number; max: number } {
  return track === 'full' ? { min: 1, max: 9 } : { min: 1, max: 3 };
}

/**
 * Which half a bare door opens: the sitting is the screen's to resume, and
 * failing that the half not yet finished — faults first, the source's own
 * order for these two, with the Future volume between them.
 */
export function nextHalf(picks: PresentPick[], track: DepthTrack): PresentHalf {
  return halfComplete(picks, 'faults', track) && !halfComplete(picks, 'virtues', track) ? 'virtues' : 'faults';
}

/** How many cards the deck shows. The long deck is sectioned by group. */
export function deckSize(track: DepthTrack): number {
  return track === 'full' ? 40 : 12;
}

/**
 * A ceiling on each write, in characters.
 *
 * The source caps every answer so nobody exhausts themselves on one box, and
 * says so plainly. Ours is a soft ceiling: the field stops accepting more, and
 * the screen says how much is left rather than scolding.
 */
export const PRESENT_WRITE_CEILING = 600;

/** Whether this pick is finished: both halves written. */
export function pickComplete(p: Pick<PresentPick, 'storyLine' | 'applyLine'>): boolean {
  return p.storyLine.trim().length > 0 && p.applyLine.trim().length > 0;
}

/** Whether the half is finished: narrowed, and every survivor written twice. */
export function halfComplete(picks: PresentPick[], half: PresentHalf, track: DepthTrack): boolean {
  const mine = picks.filter((p) => p.half === half);
  const { min } = narrowTo(track);
  return mine.length >= min && mine.every(pickComplete);
}

/** A sitting still open on one half: the cards put into it, written or not. */
export interface PresentOpen {
  half: PresentHalf;
  selected: string[];
}

/**
 * Whether the half is written: every card the person put into it has been
 * written about, and at least the floor of them.
 *
 * `halfComplete` knows only the picks, and a pick is a card already written
 * about — so with a floor of one it said "written" the moment the first of
 * three was kept, and the chooser's door, Today and the route all believed
 * it. The cards still to write live in the sitting, which is why this takes
 * one: a half with an open sitting is not finished until the sitting is.
 */
export function halfDone(picks: PresentPick[], half: PresentHalf, track: DepthTrack, open?: PresentOpen | null): boolean {
  if (!halfComplete(picks, half, track)) return false;
  if (!open || open.half !== half) return true;
  const written = new Set(picks.filter((p) => p.half === half && pickComplete(p)).map((p) => p.cardId));
  return open.selected.every((id) => written.has(id));
}

/**
 * The if-then a fault becomes.
 *
 * The source asks, after the story, what you could have done differently. A
 * different action is only half an implementation intention; the other half is
 * the moment you would do it. So the screen asks for both in one move: tap the
 * earliest sign you could catch — that is the If — then write what you do
 * instead — that is the then. Where no sign was tapped the card itself is the
 * If, which is weaker but still true.
 *
 * Nothing here is generated. The framing is one the person chose from a bank,
 * the action is their sentence, and the Obstacles stone that receives it keeps
 * the same two fields it always had.
 */
export function ifThenFromFault(
  card: PresentCard,
  pick: Pick<PresentPick, 'applyLine' | 'framingId'>,
  framings: PresentFraming[] = [],
): { line: string; line2: string } | null {
  const then = pick.applyLine.trim();
  if (!then) return null;
  const sign = framings.find((f) => f.id === pick.framingId)?.label;
  return { line: (sign ?? card.text).replace(/\.$/, ''), line2: then };
}

/** The picks that name a goal, newest first — what the coach may bring up on a hard day. */
export function virtuesForGoal(picks: PresentPick[], goalId: string): PresentPick[] {
  return picks.filter((p) => p.half === 'virtues' && p.goalId === goalId).sort((a, b) => a.rank - b.rank);
}

/** The deck, sectioned, for the long track. Starter shows one list and no sections. */
export function sections(cards: PresentCard[], track: DepthTrack): { group: CardGroup; cards: PresentCard[] }[] {
  if (track !== 'full') return [];
  return CARD_GROUPS.map((group) => ({ group, cards: cards.filter((c) => c.group === group) })).filter((s) => s.cards.length > 0);
}

/**
 * Where the person is in this half, so a screen can be resumed and the path
 * card can say what is next.
 */
export type PresentStep =
  | { step: 'deck'; half: PresentHalf }
  | { step: 'narrow'; half: PresentHalf; picked: number }
  | { step: 'write'; half: PresentHalf; cardId: string; done: number; total: number }
  | { step: 'done'; half: PresentHalf };

export function presentStep(picks: PresentPick[], half: PresentHalf, track: DepthTrack, selectedCount = 0): PresentStep {
  const mine = picks.filter((p) => p.half === half);
  const { min, max } = narrowTo(track);
  if (mine.length === 0) {
    return selectedCount > max ? { step: 'narrow', half, picked: selectedCount } : { step: 'deck', half };
  }
  if (mine.length < min) return { step: 'deck', half };
  const unwritten = [...mine].sort((a, b) => a.rank - b.rank).find((p) => !pickComplete(p));
  if (unwritten) {
    return { step: 'write', half, cardId: unwritten.cardId, done: mine.filter(pickComplete).length, total: mine.length };
  }
  return { step: 'done', half };
}
