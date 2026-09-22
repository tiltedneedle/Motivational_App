/**
 * The app's entry, ahead of the router's.
 *
 * `platform-back` answers the browser's Back by taking the popstate before
 * expo-router's own listener sees it, and "before" is nothing more than the
 * order the two listeners were added in. Imported from `app/_layout.tsx`
 * that order was a coin toss: with async routes the router mounts its
 * container — and subscribes — while the layout's chunk is still being
 * fetched, so on some loads the router was first, answered the pop by
 * resetting the navigator, and the screen that had promised an undo was
 * already unmounted two milliseconds later when our handler ran. Measured:
 * three loads in twelve, on this machine, and the same shape of failure on
 * CI four times in a row (`screens: []`, `since: {armed: false, msAgo: 3}`).
 *
 * From here there is no race to lose: this module is the entry bundle, and
 * nothing of the router's exists yet.
 *
 * Named `entry.js` on purpose: the exported chunk takes this file's name, and
 * three places — the first-load size ceiling, the service worker's build
 * stamp and the worker's own check — look for `entry-<hash>.js`. Called
 * `index.js` it shipped as one of eight `index-*.js` chunks and none of them
 * could be told from the others.
 */
import './src/platform-back';

import 'expo-router/entry';
