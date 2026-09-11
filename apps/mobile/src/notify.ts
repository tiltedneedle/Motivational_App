/**
 * The edge between the notification rules and the operating system.
 *
 * Everything worth arguing about lives in `@morrow/core`'s notification
 * planner, where it can be tested. This file does one thing: hand what the
 * planner decided to whichever scheduler the platform has, and hand back what
 * is already scheduled so nothing is scheduled twice.
 *
 * `expo-notifications` is loaded lazily and behind a try/catch on purpose.
 * There is no scheduler on the web build, the module is not in the dependency
 * tree until a native build needs it, and a person's Book must not fail to open
 * because a notification library is missing. Absent means the app is quieter,
 * not broken.
 */
import { Platform } from 'react-native';
import { toSchedule, withoutMuted, type Moment, type Notice } from '@morrow/core';

/** What a scheduler has to be able to do. Deliberately tiny. */
export interface Scheduler {
  ids(): Promise<string[]>;
  /** Whether the person has said yes, asking once if they have not been asked. */
  allowed(): Promise<boolean>;
  schedule(notice: Notice): Promise<void>;
  cancel(id: string): Promise<void>;
}

/** The one that does nothing, and says so. */
export const noScheduler: Scheduler = {
  async ids() {
    return [];
  },
  async allowed() {
    return false;
  },
  async schedule() {},
  async cancel() {},
};

let resolved: Scheduler | null = null;

/**
 * The platform's scheduler, or the one that does nothing.
 *
 * Resolved once and cached, including the failure: retrying a missing module on
 * every launch is a stack trace in the console every launch, and the answer
 * will not have changed.
 */
export async function scheduler(): Promise<Scheduler> {
  if (resolved) return resolved;
  if (Platform.OS === 'web') {
    resolved = noScheduler;
    return resolved;
  }
  try {
    const mod: any = await import('expo-notifications');
    if (!mod?.scheduleNotificationAsync) {
      resolved = noScheduler;
      return resolved;
    }
    resolved = {
      async ids() {
        const all = await mod.getAllScheduledNotificationsAsync();
        return (all ?? []).map((n: { identifier: string }) => n.identifier);
      },
      async allowed() {
        // Asked once, and only here — which is to say only when the planner
        // has produced something worth asking for. A permission prompt on
        // first launch, before the person has written a word, is the app
        // asking for attention it has not earned yet; asking on the morning
        // the first plan exists is asking for exactly the thing it will use.
        const current = await mod.getPermissionsAsync();
        if (current?.granted) return true;
        if (current?.canAskAgain === false) return false;
        const asked = await mod.requestPermissionsAsync();
        return Boolean(asked?.granted);
      },
      async schedule(notice) {
        await mod.scheduleNotificationAsync({
          identifier: notice.id,
          content: { title: notice.title, body: notice.body, data: { route: notice.route } },
          // A wall-clock date, in the device's own zone, which is what the
          // planner produces and what "07:30 on the 14th" has to mean whatever
          // zone the person is in that morning.
          trigger: { type: 'date', date: new Date(notice.at) },
        });
      },
      async cancel(id) {
        await mod.cancelScheduledNotificationAsync(id);
      },
    };
    return resolved;
  } catch {
    resolved = noScheduler;
    return resolved;
  }
}

/**
 * The routes a notification is allowed to open: the app's own screens, by
 * name, with at most a query string of plain characters. A route is data
 * that came back from the OS, and the OS got it from whatever scheduled the
 * notification, so it is checked against this shape rather than followed.
 */
const ROUTE_SHAPE = /^\/[a-z-]+(\?[a-z0-9_=&-]*)?$/i;

export function routeFrom(data: unknown): string | null {
  const route = (data as { route?: unknown } | null | undefined)?.route;
  return typeof route === 'string' && ROUTE_SHAPE.test(route) ? route : null;
}

/**
 * What happens when the person taps a notification (PRD §7.11: each one
 * "deep-links to its screen").
 *
 * Two cases, because the OS has two: the app was running and the tap is an
 * event, or the app was closed and the tap is the reason it opened, in
 * which case the response is waiting to be asked for. Both go through the
 * same shape check and the same handler. Returns the unsubscribe.
 */
export async function onNotificationOpened(handler: (route: string) => void): Promise<() => void> {
  if (Platform.OS === 'web') return () => {};
  try {
    const mod: any = await import('expo-notifications');
    if (!mod?.addNotificationResponseReceivedListener) return () => {};

    // A notification that arrives while the app is open is still shown —
    // the planner only schedules for moments the person is not expected to
    // be in the app, but a morning line that arrives while Today is open is
    // not a reason to swallow it.
    mod.setNotificationHandler?.({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    const sub = mod.addNotificationResponseReceivedListener((response: any) => {
      const route = routeFrom(response?.notification?.request?.content?.data);
      if (route) handler(route);
    });

    // Cold start: the tap that opened the app.
    const last = await mod.getLastNotificationResponseAsync?.();
    const route = routeFrom(last?.notification?.request?.content?.data);
    if (route) handler(route);

    return () => sub?.remove?.();
  } catch {
    return () => {};
  }
}

export interface SyncResult {
  scheduled: string[];
  cancelled: string[];
  /** True when the platform has no scheduler at all. */
  silent: boolean;
}

/**
 * Make what is scheduled match what the planner decided.
 *
 * Idempotent by construction: `toSchedule` drops anything already scheduled and
 * anything whose time has passed, so calling this on every launch is safe and
 * is how the schedule survives a reboot (PRD §7.11).
 *
 * Muted moments are cancelled rather than merely not scheduled. Turning the
 * evening line off in Settings has to silence the one that was already sitting
 * in the OS queue, or "Fewer" does nothing until tomorrow.
 */
export async function syncNotices(
  planned: Notice[],
  muted: readonly Moment[],
  now: Date = new Date(),
): Promise<SyncResult> {
  const sched = await scheduler();
  const silent = sched === noScheduler;
  const wanted = withoutMuted(planned, muted);
  const wantedIds = new Set(wanted.map((n) => n.id));

  let existing: string[] = [];
  try {
    existing = await sched.ids();
  } catch {
    // A scheduler that cannot say what it holds is one we cannot reconcile
    // against. Schedule nothing rather than risk doubling what is already there.
    return { scheduled: [], cancelled: [], silent };
  }

  const cancelled: string[] = [];
  for (const id of existing) {
    // Only ours, and only the ones no longer wanted. An id shaped `day:moment`
    // is this app's; anything else belongs to something we did not put there.
    if (!/^\d{4}-\d{2}-\d{2}:[a-z]+$/.test(id)) continue;
    if (wantedIds.has(id)) continue;
    try {
      await sched.cancel(id);
      cancelled.push(id);
    } catch {
      // Nothing to do about it, and it is not worth failing a launch over.
    }
  }

  const due = toSchedule(wanted, now, existing);
  // Only ask when there is something to schedule. On iOS a schedule call
  // without permission is silently dropped, so without this the app would
  // have looked like it was scheduling and never shown a single one.
  if (due.length > 0 && !(await sched.allowed().catch(() => false))) {
    return { scheduled: [], cancelled, silent };
  }

  const scheduled: string[] = [];
  for (const notice of due) {
    try {
      await sched.schedule(notice);
      scheduled.push(notice.id);
    } catch {
      // Permission refused, or a platform limit. The app is quieter; it works.
    }
  }

  return { scheduled, cancelled, silent };
}
