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
  | 'coach-cap'
  /** A second replan in the same month. */
  | 'replan';

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

/**
 * Why the annual is highlighted, as arithmetic rather than a claim. "Most
 * people choose this one" was on the paywall of a product with no customers
 * yet — a statistic nobody had measured, which is the kind of line §8.9's
 * "no fake discounts" is about. What is true is the maths: a year costs the
 * same as this many months of monthly.
 */
export function annualAgainstMonthly(plans: PricePlan[] = PLANS): string | null {
  const monthly = plans.find((p) => p.id === 'monthly');
  const annual = plans.find((p) => p.id === 'annual');
  if (!monthly || !annual || monthly.cents <= 0) return null;
  const months = Math.round(annual.cents / monthly.cents);
  if (months >= 12 || months < 1) return null;
  const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
  return `A year for the price of ${words[months - 1]} months.`;
}

/** The lines on the paywall. App chrome; never set in the serif. */
export const BENEFITS = [
  'Every goal gets its own Blueprint, not just the first.',
  'A scene for every goal, drawn from what you wrote about it.',
  'The coach every day, with the whole Book in front of it.',
  // What Pro gates in this build, and nothing it does not: this line waited
  // until the re-authoring was built, because a paywall that promises a
  // later release is a paywall that lies.
  'The Book written again every ninety days, the old line above the new.',
] as const;

export interface EntitlementContext {
  entitled: boolean;
  /** Goals that already have a plan built. */
  blueprintsBuilt: number;
  /** Coach turns taken today. */
  coachTurnsToday: number;
  /** Whether the once-ever post-Blueprint moment has already been shown. */
  afterBlueprintShown: boolean;
  /**
   * Whether a day has been sealed. The unprompted paywall comes once after
   * the Blueprint (PRD §7.13) — and after the first sealed day, so the first
   * Today is a Today and not a price. Nothing about the offer changes; only
   * that it waits for one real evening.
   */
  firstDaySealed: boolean;
  /** Replans applied, to any plan, since the first of this month. */
  replansThisMonth: number;
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

/**
 * Whether another replan may be applied this month (PRD §13.3: one a month
 * on the free plan). Proposing is never gated — reading what the app would
 * change costs nothing and is theirs to see — only applying is.
 */
/**
 * Day-90 re-authoring (PRD §7.3) is one of the free limits the PRD names
 * (§7.13): the brief opens it for everybody on day 90, and on the free plan
 * the door is the paywall. The Book itself, and sealing it again by walking
 * the stones, stay free; what Pro adds is the guided sitting — the two
 * Books side by side, the old line above the new, the diff as a first page.
 */
export function canReauthor(ctx: EntitlementContext): Gate {
  if (ctx.entitled) return { allowed: true };
  return {
    allowed: false,
    moment: 'reauthor',
    reason: 'Writing the Book again, side by side with the old one, is part of Morrow Pro. The Book you have is yours either way.',
  };
}

export function canReplan(ctx: EntitlementContext): Gate {
  const cap = limits(ctx.entitled).replansPerMonth;
  if (ctx.replansThisMonth < cap) return { allowed: true };
  return {
    allowed: false,
    moment: 'replan',
    reason: 'The free plan changes a plan once a month. The proposal is still here, and next month it can be taken.',
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
  if (!ctx.firstDaySealed) return null;
  return 'after-blueprint';
}

/** The line at the head of each moment. The person's own "I will" sits above it. */
export const MOMENT_HEADING: Record<PaywallMoment, string> = {
  'after-blueprint': 'Your Blueprint is ready.',
  'second-blueprint': 'A Blueprint for this one too.',
  reauthor: 'Ninety days. Time to write it again.',
  bench: 'The Bench.',
  'coach-cap': 'That is today’s turns.',
  replan: 'Change it again this month.',
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
