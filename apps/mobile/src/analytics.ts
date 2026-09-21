/**
 * Product analytics (PRD §11.6, §14): events with no free text in them.
 *
 * A seam rather than an SDK. PostHog's capture endpoint is one POST, which
 * is all this needs, and a native SDK is one more thing to break a build
 * on a machine that cannot test it. With no key the whole module is a
 * no-op, which is every build so far.
 *
 * The rule that matters is in the type: an event carries numbers, booleans
 * and short enums, never a string the person typed. Nothing in this file
 * has a way to send one, and every call site is a fixed name with fixed
 * fields. The person is an anonymous id minted on the device; the account's
 * user id is never sent, so the two cannot be joined from here.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

const KEY = (process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '').trim();
const HOST = (process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com').trim().replace(/\/+$/, '');

export const hasAnalytics = KEY.length > 0;

type Enumish =
  | 'ideal'
  | 'shadow'
  | 'addition'
  | 'memory_start'
  | 'memory_broke'
  | 'warmup'
  | 'type'
  | 'say'
  | 'walk'
  | 'starter'
  | 'full'
  | 'gentle'
  | 'straight'
  | 'fierce';

/** The whole vocabulary. A new event is a new line here, with its fields. */
export type Event =
  | { name: 'sitting_completed'; kind: Enumish; mode: Enumish; words: number; seconds: number; track: Enumish }
  | { name: 'book_sealed'; edition: number; goals: number; track: Enumish; authorship: number }
  | { name: 'blueprint_built'; moves: number; milestones: number }
  | { name: 'day_sealed'; planned: number; done: number; wrote_proof: boolean }
  | { name: 'paywall_shown'; moment: string }
  | { name: 'purchase'; plan: string; ok: boolean }
  | { name: 'notification_opened'; route: string }
  | { name: 'account_signed_in'; method: 'email' | 'apple' | 'google'; pulled: boolean }
  | { name: 'safety_card_shown'; source: string }
  | {
      name: 'first_run_step';
      step:
        | 'welcome'
        | 'setup'
        | 'first-write'
        | 'mirror'
        | 'choose'
        | 'explore'
        | 'consent'
        | 'interview'
        | 'doorway'
        | 'fifteen'
        | 'read_back'
        | 'order'
        | 'stone'
        | 'portrait'
        | 'seal'
        | 'present_deck'
        | 'present_write'
        | 'past_doorway'
        | 'past_events'
        | 'past_analyse'
        | 'declare';
    }
  /** The Declaration made (PRD §7.17): with a photo or the night ground, and whether a witness is named. No image, no name. */
  | { name: 'declaration_made'; with_photo: boolean; witness: boolean }
  /** Which door was taken from the chooser, and whether it was a first visit. */
  | { name: 'volume_opened'; volume: 'past' | 'present' | 'future'; first: boolean }
  | { name: 'volume_finished'; volume: 'past' | 'present' | 'future' }
  | { name: 'first_value'; kind: 'goals_named' | 'fifteen_closed' | 'book_sealed' | 'first_move_done' | 'first_day_sealed' | 'present_written' | 'past_written' };

const ID_KEY = 'morrow-analytics-id';
let id: string | null = null;
let queue: Record<string, unknown>[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

async function distinctId(): Promise<string> {
  if (id) return id;
  try {
    const stored = await AsyncStorage.getItem(ID_KEY);
    if (stored) {
      id = stored;
      return id;
    }
  } catch {
    // Storage is not readable; a per-launch id is the honest fallback.
  }
  id = `anon_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  try {
    await AsyncStorage.setItem(ID_KEY, id);
  } catch {
    // Kept for this launch only.
  }
  return id;
}

/** Record one event. Never throws, never blocks, nothing without a key. */
/**
 * One event per first-run step, once per mount of that step's screen. The
 * funnel — where people stop, and how long the path takes to the first
 * value — is the one measure the retention question needs (OFR-25). Names
 * and counts only, like every other event here.
 */
export function useFirstRunStep(step: Extract<Event, { name: 'first_run_step' }>['step']): void {
  useEffect(() => {
    track({ name: 'first_run_step', step });
  }, [step]);
}

export function track(event: Event): void {
  if (!hasAnalytics) return;
  const { name, ...props } = event;
  queue.push({
    event: name,
    properties: { ...props, $lib: 'morrow', platform: Platform.OS },
    timestamp: new Date().toISOString(),
  });
  if (queue.length >= 20) void flush();
  else if (!timer) timer = setTimeout(() => void flush(), 10_000);
}

/** Send what is queued. Called on a timer, on backgrounding, and when the queue is full. */
export async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!hasAnalytics || queue.length === 0) return;
  const batch = queue;
  queue = [];
  try {
    const who = await distinctId();
    const res = await fetch(`${HOST}/batch/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ api_key: KEY, batch: batch.map((e) => ({ ...e, distinct_id: who })) }),
    });
    if (!res.ok) queue = [...batch, ...queue].slice(-200);
  } catch {
    // No network. Kept for the next flush, capped so it cannot grow forever.
    queue = [...batch, ...queue].slice(-200);
  }
}

let armed = false;
/** Flush on backgrounding. Once. */
export function armAnalytics(): void {
  if (armed || !hasAnalytics) return;
  armed = true;
  AppState.addEventListener('change', (next) => {
    if (next !== 'active') void flush();
  });
}
