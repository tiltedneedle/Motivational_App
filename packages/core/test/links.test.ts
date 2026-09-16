/**
 * Deep links (PRD §9.3) and the inventory's paths (§9.2) resolve to routes
 * the app has; a link to nowhere resolves to Today; a sign-in link is left
 * exactly as it came.
 */
import { describe, expect, it } from 'vitest';
import { APP_ROUTES, isAuthLink, resolveLink } from '../src/engines/links';

describe('the PRD’s deep links', () => {
  it('each lands on a real screen', () => {
    expect(resolveLink('morrow://today')).toBeNull();
    expect(resolveLink('morrow://goal/goal_abc')).toBe('/goal?id=goal_abc');
    expect(resolveLink('morrow://book')).toBeNull();
    expect(resolveLink('morrow://authoring/2')).toBe('/authoring');
    expect(resolveLink('morrow://practice/pr_1/run')).toBe('/run?id=pr_1');
    expect(resolveLink('morrow://letter/letter_9')).toBe('/letters');
    expect(resolveLink('morrow://brief/2026-09-17')).toBe('/coach');
    expect(resolveLink('morrow://capture')).toBe('/new-move');
  });

  it('and the inventory’s paths do too', () => {
    expect(resolveLink('/welcome')).toBe('/?intro=1');
    expect(resolveLink('/welcome/consent')).toBe('/consent');
    expect(resolveLink('/interview/3')).toBe('/interview');
    expect(resolveLink('/interview/heard')).toBe('/heard');
    expect(resolveLink('/authoring/write/ideal')).toBe('/write?kind=ideal');
    expect(resolveLink('/authoring/rank')).toBe('/rank');
    expect(resolveLink('/authoring/seal')).toBe('/seal-book');
    expect(resolveLink('/authoring/bench')).toBe('/present');
    expect(resolveLink('/authoring/quarry/goal_abc')).toBe('/past');
    expect(resolveLink('/goals/goal_abc/stone/obstacles')).toBe('/stone?goal=goal_abc&kind=obstacles');
    expect(resolveLink('/goals/goal_abc/portrait')).toBe('/portrait?goal=goal_abc');
    expect(resolveLink('/goals/goal_abc/plan')).toBe('/goal?id=goal_abc');
    expect(resolveLink('/goals/goal_abc/replan')).toBe('/replan?goal=goal_abc');
    expect(resolveLink('/book/sunday')).toBe('/reading');
    expect(resolveLink('/book/reauthor')).toBe('/reauthor');
    expect(resolveLink('/book/declare')).toBe('/declare');
    expect(resolveLink('/book/2')).toBe('/book');
    expect(resolveLink('/seal')).toBe('/seal-day');
    expect(resolveLink('/you/ledger')).toBe('/progress');
    expect(resolveLink('/envision/letters')).toBe('/letters');
    expect(resolveLink('/coach/review/3')).toBe('/reading');
    expect(resolveLink('/settings/memory')).toBe('/memory');
    expect(resolveLink('/settings/export')).toBe('/settings');
    expect(resolveLink('/auth')).toBe('/account');
  });

  it('leaves the app’s own routes alone, query and all', () => {
    for (const r of APP_ROUTES) expect(resolveLink(r)).toBeNull();
    expect(resolveLink('/stone?goal=g&kind=motives')).toBeNull();
    expect(resolveLink('https://morrow.app/today')).toBeNull();
    expect(resolveLink('exp://192.168.1.2:8081/--/goal?id=g')).toBeNull();
  });

  it('sends a link to nowhere to Today, never to an unmatched-route page', () => {
    expect(resolveLink('/no-such-screen')).toBe('/today');
    expect(resolveLink('morrow://nothing/here/at/all')).toBe('/today');
    expect(resolveLink('/goals')).toBe('/today');
  });

  it('never touches a sign-in link', () => {
    expect(isAuthLink('morrow://account#access_token=abc&refresh_token=def&type=magiclink')).toBe(true);
    expect(isAuthLink('morrow://?token_hash=abc&type=magiclink')).toBe(true);
    expect(isAuthLink('morrow://goal/abc')).toBe(false);
    expect(resolveLink('morrow://account#access_token=abc&type=magiclink')).toBeNull();
    expect(resolveLink('morrow://anything#access_token=abc')).toBeNull();
  });

  it('keeps an id as it was given, encoded once', () => {
    expect(resolveLink('/goal/a%20b')).toBe('/goal?id=a%20b');
    expect(resolveLink('/goal/a b')).toBe('/goal?id=a%20b');
  });

  it('does not throw on rubbish', () => {
    expect(resolveLink('')).toBeNull();
    // The bare scheme is the app's own front door, which routes itself.
    expect(resolveLink('morrow:')).toBeNull();
    expect(resolveLink('morrow://')).toBeNull();
    expect(resolveLink('%E0%A4%A')).toBe('/today');
  });
});
