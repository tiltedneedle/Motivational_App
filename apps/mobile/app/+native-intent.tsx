/**
 * Deep links on native (PRD §9.3). `morrow://goal/{id}`, `morrow://book`,
 * `morrow://practice/{id}/run`, and the inventory's own paths, resolved to
 * the routes this app has before the router sees them. Null leaves a link
 * alone: one that already names a route, or a sign-in link, whose fragment
 * the root layout reads.
 */
import { resolveLink } from '@morrow/core';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  try {
    return resolveLink(path);
  } catch {
    return null;
  }
}
