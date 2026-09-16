/**
 * Deep links on native (PRD §9.3). `morrow://goal/{id}`, `morrow://book`,
 * `morrow://practice/{id}/run`, and the inventory's own paths, resolved to
 * the routes this app has before the router sees them. A link that already
 * names a route, or a sign-in link (whose fragment the root layout reads),
 * goes through unchanged.
 */
import { resolveLink } from '@morrow/core';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  // `resolveLink` answers null for a link that needs no rewriting — one of
  // the app's own routes, or a sign-in link. expo-router reads a null return
  // here as "no URL at all" and drops the link (getLinkingConfig replaces the
  // initial URL with it; the subscribe path only fires on a truthy href), so
  // the path itself goes back whenever there is nothing to change.
  try {
    return resolveLink(path) ?? path;
  } catch {
    return path;
  }
}
