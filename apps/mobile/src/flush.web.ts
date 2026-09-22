/**
 * The DOM renderer's `flushSync`: a state change committed before the
 * function returns, so a focus() on the next line lands on a mounted input
 * inside the same tap — which is the only focus iOS Safari raises a
 * keyboard for. Typed by hand: the app carries no @types/react-dom.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dom = require('react-dom') as { flushSync: (fn: () => void) => void };
export const flushSync: (fn: () => void) => void = dom.flushSync;
