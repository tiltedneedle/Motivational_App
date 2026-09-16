/**
 * A link to nowhere (PRD §9.3). The router's own page for this says
 * "Unmatched Route" to a person who only tapped what they were sent; this
 * resolves the PRD's link shapes to the app's routes and sends anything
 * else to Today. A redirect, not a screen: there is nothing here to read.
 */
import { Redirect, usePathname } from 'expo-router';
import { resolveLink } from '@morrow/core';

export default function NotFound() {
  const pathname = usePathname();
  const to = resolveLink(pathname) ?? '/today';
  return <Redirect href={to as never} />;
}
