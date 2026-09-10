/**
 * Buying and restoring, behind an adapter.
 *
 * No store keys exist in this build, and the honest consequence is that the
 * Continue button cannot complete a purchase. That is said plainly rather than
 * hidden behind a spinner that never resolves or a success that did not happen:
 * a paywall that pretends to have charged somebody is worse than one that says
 * it is not wired up yet.
 *
 * `configured` is what the app checks before claiming otherwise. When the
 * RevenueCat keys arrive, `revenueCat()` is the only thing that changes.
 */
import { Platform } from 'react-native';

export type PlanId = 'monthly' | 'annual' | 'lifetime';

export type BillingResult = { ok: true } | { ok: false; error: string };

export interface Billing {
  configured: boolean;
  purchase(plan: PlanId): Promise<BillingResult>;
  restore(): Promise<BillingResult>;
}

/** Set at build time. Absent in every build so far. */
const KEY =
  Platform.OS === 'ios'
    ? (process.env.EXPO_PUBLIC_RC_IOS ?? '')
    : Platform.OS === 'android'
      ? (process.env.EXPO_PUBLIC_RC_ANDROID ?? '')
      : '';

const UNCONFIGURED =
  'Purchases are not set up in this build, so nothing was charged. Everything free is still free and everything you have written is still here.';

export const localBilling: Billing = {
  configured: false,
  async purchase() {
    return { ok: false, error: UNCONFIGURED };
  },
  async restore() {
    return { ok: false, error: UNCONFIGURED };
  },
};

/**
 * The real one, when there is a key for it.
 *
 * Left as a single seam on purpose: the screen, the gates and the tests all go
 * through `Billing`, so wiring the store SDK is a change to this function and
 * nothing else.
 */
export function billing(): Billing {
  if (!KEY) return localBilling;
  return localBilling;
}

export const hasBilling = KEY.length > 0;
