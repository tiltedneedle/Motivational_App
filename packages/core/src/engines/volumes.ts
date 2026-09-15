/**
 * Which of the three volumes a person has touched, and what each door should
 * say when they come back to it.
 *
 * The source sells four programs and tells you to pick: "You should do it in
 * the order that you think will benefit you the most." The chooser is that
 * sentence made into a screen, so this engine never returns a "next" — only
 * where each door stands. The one opinion it holds is the source's own
 * suggested route, offered on the explainer and nowhere else.
 */
import type { DepthTrack } from '../types';
import { halfComplete, type PresentPick } from './present';
import { pastStep, type Epoch, type PastAnalysis, type PastEvent } from './past';

export type VolumeName = 'past' | 'present' | 'future';
export type VolumeState = 'untouched' | 'started' | 'done';

export interface VolumesInput {
  track: DepthTrack;
  /** Future: goals named, the Fifteen written, a Book sealed. */
  goals: number;
  hasIdeal: boolean;
  books: number;
  /** Present: what survived the narrowing, in both halves. */
  presentPicks: PresentPick[];
  /** Past: the periods, the events, and what was written about them. */
  pastEpochs: Epoch[];
  pastEvents: PastEvent[];
  pastAnalyses: PastAnalysis[];
  /** Whether the periods have been walked to the end. */
  pastListed?: boolean;
}

export interface VolumeStanding {
  name: VolumeName;
  state: VolumeState;
}

export function volumeStates(input: VolumesInput): Record<VolumeName, VolumeState> {
  const future: VolumeState = input.books > 0 ? 'done' : input.goals > 0 || input.hasIdeal ? 'started' : 'untouched';

  const bothHalves = halfComplete(input.presentPicks, 'faults', input.track) && halfComplete(input.presentPicks, 'virtues', input.track);
  const present: VolumeState = bothHalves ? 'done' : input.presentPicks.length > 0 ? 'started' : 'untouched';

  const step = pastStep(input.pastEpochs, input.pastEvents, input.pastAnalyses, input.track, input.pastListed ?? false);
  const past: VolumeState = step.step === 'done' ? 'done' : input.pastEpochs.length > 0 || input.pastEvents.length > 0 ? 'started' : 'untouched';

  return { past, present, future };
}

/** True the first time the chooser is seen: nothing anywhere has been written. */
export function firstVisit(states: Record<VolumeName, VolumeState>): boolean {
  return (['past', 'present', 'future'] as VolumeName[]).every((v) => states[v] === 'untouched');
}

/**
 * The source's suggested route, as four steps. Offered on the explainer,
 * never enforced, and never shown as a checklist with ticks — a route that
 * scores you for following it is a rule wearing a suggestion's clothes.
 */
export const SUGGESTED_ROUTE: { volume: VolumeName; half?: 'faults' | 'virtues' }[] = [
  { volume: 'present', half: 'faults' },
  { volume: 'future' },
  { volume: 'present', half: 'virtues' },
  { volume: 'past' },
];
