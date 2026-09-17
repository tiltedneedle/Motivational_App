/**
 * The demo build (PRD §14.7: "Client demo script … cold open on Today at the
 * demo's real time … a seeded account's sealed Book").
 *
 * Two things a demonstration needs that the product must not have. Short
 * clocks: the Fifteen is fifteen minutes because fifteen minutes is the
 * studied mechanism, and a room is not shown in a meeting at that length.
 * Lived-in stores: a Book sealed months ago, a ledger with a missed week in
 * it, a day-ninety morning — none of which can be reached from an empty
 * phone inside an hour.
 *
 * Both exist only when `EXPO_PUBLIC_DEMO=1` was set when the bundle was
 * built (`pnpm build:web:demo`). In every other build `hasDemo` is false,
 * the clocks are the product's, the fixtures are not bundled, and `/demo`
 * is a redirect to Today.
 *
 * The fixtures are the ones the screenshots and the axe pass use
 * (`scripts/fixtures/`), so the demo shows stores the tests have already
 * walked. Every date in a fixture is fixed; loading one shifts every date by
 * the same number of days so that the fixture's own "today" is the day of
 * the demo — a Book "sealed ninety days ago" is sealed ninety days before
 * whatever day it is.
 */
import { WRITING_CLOCK, dayOf } from '@morrow/core';

export const hasDemo = (process.env.EXPO_PUBLIC_DEMO ?? '').trim() === '1';

/** Fifteen minutes becomes two; the ten-minute minimum to count, eighty seconds. */
export const DEMO_CLOCK_SCALE = 2 / 15;

/** Called once at launch. A no-op outside a demo build. */
export function installDemoClock(): void {
  if (hasDemo) WRITING_CLOCK.scale = DEMO_CLOCK_SCALE;
}

export interface DemoScenario {
  id: string;
  title: string;
  /** What the person will see, in one line. */
  shows: string;
  /** The fixture's own "today"; every date shifts so this lands on the demo's day. */
  anchor: string;
  /** Where to land after loading. */
  route: string;
  load: () => Promise<Record<string, unknown>>;
}

/**
 * The fixtures are not in the bundle: a product build carries no synthetic
 * people. The demo build's export copies them beside the site
 * (`scripts/build-web.mjs --demo` puts them under `/demo/`), and they are
 * fetched when a scenario is chosen. A server without them says so.
 */
async function fixture(name: string): Promise<Record<string, unknown>> {
  const res = await fetch(`/demo/${name}.json`);
  if (!res.ok) throw new Error(`The demo fixtures are not on this server (${res.status}).`);
  const json = (await res.json()) as { state?: Record<string, unknown> };
  if (!json.state) throw new Error('That fixture holds no store.');
  return json.state;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'first-morning',
    title: 'The first morning',
    shows: 'The Book sealed last night, the plan built, the dawn brief quoting the first sentence, the Now card on Today.',
    anchor: '2026-09-12',
    route: '/today',
    load: () => fixture('seeded-state'),
  },
  {
    id: 'five-goals',
    title: 'Five goals, one morning',
    shows: 'The same first morning with five goals ranked: the top three with all five stones, the rest with two.',
    anchor: '2026-09-12',
    route: '/today',
    load: () => fixture('many-goals'),
  },
  {
    id: 'three-months',
    title: 'Three months in',
    shows: 'Eighty sealed days, two gaps come back from, Progress with a history behind it, the Sunday reading, the Horizon Review.',
    anchor: '2026-09-10',
    route: '/today',
    load: () => fixture('long-game'),
  },
  {
    id: 'return',
    title: 'A week away',
    shows: 'Nothing sealed for eight days: Today opens on the return, and the Returns letter is waiting.',
    anchor: '2026-09-19',
    route: '/today',
    load: () => fixture('seeded-state'),
  },
  {
    id: 'day-ninety',
    title: 'Day ninety',
    shows: 'The Book sealed ninety days ago: the morning brief opens the re-authoring, and every goal is kept, rewritten or let go.',
    anchor: '2026-09-12',
    route: '/today',
    load: () => fixture('long-game'),
  },
  {
    id: 'three-volumes',
    title: 'All three volumes',
    shows: 'Past and Present written as well as Future, and a second edition of the Book carrying them.',
    anchor: '2026-09-16',
    route: '/book',
    load: () => fixture('filled'),
  },
];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT = /^(\d{4}-\d{2}-\d{2})(T\d{2}:\d{2}.*)$/;

function shiftDay(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The fixture with every date moved by the same number of days, so its
 * "today" is `today`. Days and instants in values, and days used as keys
 * (the ledger's days, the coach's turns). Everything else is left alone.
 */
export function shifted<T>(value: T, days: number): T {
  if (days === 0) return value;
  if (typeof value === 'string') {
    if (DAY.test(value)) return shiftDay(value, days) as T;
    const m = value.match(INSTANT);
    if (m) return `${shiftDay(m[1]!, days)}${m[2]}` as T;
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => shifted(v, days)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[DAY.test(k) ? shiftDay(k, days) : k] = shifted(v, days);
    }
    return out as T;
  }
  return value;
}

/** The days between the fixture's own today and the demo's. */
export function shiftFor(anchor: string, boundaryHour: number, now = new Date()): number {
  const today = dayOf(now, boundaryHour);
  const a = new Date(`${anchor}T00:00:00Z`).getTime();
  const t = new Date(`${today}T00:00:00Z`).getTime();
  return Math.round((t - a) / 86_400_000);
}
