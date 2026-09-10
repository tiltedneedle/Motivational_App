/**
 * What is free, what is Pro, and the four moments the paywall is allowed to
 * appear (PRD §7.13, §13.3).
 *
 * The list of moments is short and closed on purpose. "Once after the
 * Blueprint, soft, dismissible; then only at free limits. Never timers, fake
 * discounts, interstitials or paywalled trivialities." A paywall that can
 * appear anywhere is a paywall that will, so the only way to raise one is to
 * name a moment here and have `paywallMoment` agree that it has arrived.
 *
 * Nothing in this file talks to a store. Whether a person is entitled is a fact
 * the app is told; this decides what follows from it.
 */

export type PaywallMoment =
  /** Once, right after the first Blueprint is built. Soft and dismissible. */
  | 'after-blueprint'
  /** A second goal wants a Blueprint, and free is one. */
  | 'second-blueprint'
  /** Re-authoring on day 90. */
  | 'reauthor'
  /** The Bench doorway. */
  | 'bench'
  /** The coach's daily turn cap. */
  | 'coach-cap';

/** PRD §13.3. Free is a whole product, not a demo. */
export const FREE = {
  /** Goals that get a full Blueprint. */
  blueprints: 1,
  /** Replans a month. */
  replansPerMonth: 1,
  /** Scene sets, ever. */
  sceneSets: 1,
  /** Coach turns a day. */
  coachTurnsPerDay: 20,
} as const;

export const PRO = {
  blueprints: Infinity,
  replansPerMonth: Infinity,
  sceneSets: Infinity,
  coachTurnsPerDay: 200,
} as const;

export function limits(entitled: boolean): typeof FREE | typeof PRO {
  return entitled ? PRO : FREE;
}

/**
 * A subscription plan. Not `Plan`: that name already means the thing built out
 * of somebody's own lines, and this is a price — two very different objects to
 * confuse in a file that decides what somebody is allowed to do.
 */
export interface PricePlan {
  id: 'monthly' | 'annual' | 'lifetime';
  label: string;
  /** In cents, US. Localized prices come from the store at runtime. */
  cents: number;
  /** What to print under it, computed rather than written down twice. */
  note: string;
  trialDays?: number;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * The three plans, with the per-month maths done rather than asserted.
 *
 * PRD §8.9 asks for "a plan toggle with the annual highlighted and per-month
 * maths". Computing it here means the note cannot drift from the price, which
 * is the sort of drift that turns into a refund request.
 */
export const PLANS: PricePlan[] = [
  { id: 'monthly', label: 'Monthly', cents: 999, note: `${money(999)} a month` },
  {
    id: 'annual',
    label: 'Annual',
    cents: 4999,
    note: `${money(4999)} a year · ${money(Math.round(4999 / 12))} a month`,
    trialDays: 7,
  },
  { id: 'lifetime', label: 'Lifetime', cents: 14999, note: `${money(14999)} once` },
];

export const HIGHLIGHTED: PricePlan['id'] = 'annual';

/** The three lines on the paywall. App chrome; never set in the serif. */
export const BENEFITS = [
  'Every goal gets its own Blueprint, not just the first.',
  'Re-author the Book when it stops being true, and go deeper when you want to.',
  'The coach every day, with the whole Book in front of it.',
] as const;

export interface EntitlementContext {
  entitled: boolean;
  /** Goals that already have a plan built. */
  blueprintsBuilt: number;
  /** Coach turns taken today. */
  coachTurnsToday: number;
  /** Whether the once-ever post-Blueprint moment has already been shown. */
  afterBlueprintShown: boolean;
}

export type Gate =
  | { allowed: true }
  | { allowed: false; moment: PaywallMoment; reason: string };

/**
 * Whether a second goal may have a Blueprint built for it.
 *
 * Note what this does *not* gate: writing. Every goal can be authored, every
 * stone written, and the Book sealed with all of them in it, on the free plan.
 * What Pro buys is the plan the app builds out of those lines, not the right to
 * write them down — the writing is the person's and is never behind a price.
 */
export function canBuildBlueprint(ctx: EntitlementContext): Gate {
  const cap = limits(ctx.entitled).blueprints;
  if (ctx.blueprintsBuilt < cap) return { allowed: true };
  return {
    allowed: false,
    moment: 'second-blueprint',
    reason: 'The free plan builds one Blueprint. Everything you have written is still yours and still here.',
  };
}

export function canTakeCoachTurn(ctx: EntitlementContext): Gate {
  const cap = limits(ctx.entitled).coachTurnsPerDay;
  if (ctx.coachTurnsToday < cap) return { allowed: true };
  return {
    allowed: false,
    moment: 'coach-cap',
    reason: `That is ${cap} turns today. The coach comes back in the morning, and the brief is still here.`,
  };
}

/**
 * The one unprompted appearance: right after the first Blueprint, once ever.
 *
 * Returns null for somebody already entitled, for somebody who has seen it, and
 * before there is a Blueprint to have been pleased by — which is every moment
 * except exactly one.
 */
export function paywallMoment(ctx: EntitlementContext): PaywallMoment | null {
  if (ctx.entitled) return null;
  if (ctx.afterBlueprintShown) return null;
  if (ctx.blueprintsBuilt < 1) return null;
  return 'after-blueprint';
}

/** The line at the head of each moment. The person's own "I will" sits above it. */
export const MOMENT_HEADING: Record<PaywallMoment, string> = {
  'after-blueprint': 'Your Blueprint is ready.',
  'second-blueprint': 'A Blueprint for this one too.',
  reauthor: 'Ninety days. Time to write it again.',
  bench: 'The Bench.',
  'coach-cap': 'That is today’s turns.',
};

/**
 * Whether this moment may be dismissed and the person put back where they were
 * with nothing lost (PRD §7.13).
 *
 * All of them. There is no moment in this product where the only way forward is
 * to pay: the free plan is a whole product and every one of these leaves the
 * person's writing exactly where it was. The function exists so that a future
 * moment cannot be added without answering the question.
 */
export function isDismissible(_moment: PaywallMoment): boolean {
  return true;
}
