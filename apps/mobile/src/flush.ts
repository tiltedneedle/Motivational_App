/**
 * `flushSync` where there is a DOM to flush to. On a phone there is none
 * and nothing needs it: the web file beside this one is the one Metro
 * picks for the browser.
 */
export function flushSync(fn: () => void): void {
  fn();
}
