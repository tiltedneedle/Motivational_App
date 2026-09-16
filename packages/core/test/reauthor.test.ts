/**
 * Day-90 re-authoring (PRD §7.3).
 *
 * "The calendar is Morrow's: the dawn brief opens it on day 90 and every 90
 * after." Then two Books side by side, and the diff as the new edition's
 * first page. The calendar and the comparison are tested here; the screens
 * are walked by the e2e.
 */
import { describe, expect, it } from 'vitest';
import type { Goal, GoalAnalysis } from '../src/types';
import { sequentialIds } from '../src/ids';
import { bookPages, bookToText, buildBookVersion, diffBooks, diffLines } from '../src/engines/book';
import { bookToHtml } from '../src/engines/book-html';
import { REAUTHOR_EVERY, REAUTHOR_WINDOW, plusDays, reauthorDue, reauthorLabel, sideBySide } from '../src/engines/reauthor';

const IDEAL = `It's 6:40 and the kitchen is still blue. I lace the left shoe first, like always, and the door is already open before I've decided anything. Rent went out on the first and I didn't look at the balance, because I already knew. Sam is asleep upstairs and the guitar is on the wall where I can see it from the table.`;

function goal(over: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    title: 'Half marathon',
    domain: 'health',
    horizon: 'Six months',
    targetDate: '2027-03-01',
    status: 'active',
    rank: 0,
    createdAt: '2026-09-09T20:00:00.000Z',
    ...over,
  };
}

function analysis(over: Partial<GoalAnalysis> = {}): GoalAnalysis {
  return {
    id: 'a1',
    goalId: 'g1',
    kind: 'strategies',
    track: 'starter',
    framingId: 's-thrice',
    line: 'Tuesday, Thursday, Saturday at 6:40, out the back door before the kettle boils',
    specificity: 0.8,
    followupShown: false,
    writtenAt: '2026-09-09T20:05:00.000Z',
    ...over,
  };
}

const guitar = goal({ id: 'g2', title: 'Play the guitar on the wall', domain: 'craft', rank: 1 });
const guitarLine = analysis({ id: 'a3', goalId: 'g2', line: 'Ten minutes after dinner, before the plates' });
const obstacles = analysis({ id: 'a2', kind: 'obstacles', line: 'it rains', line2: 'stairwell' });

const first = buildBookVersion(
  {
    version: 1,
    title: 'A year of the back door',
    track: 'starter',
    ideal: IDEAL,
    shadow: null,
    iWill: 'I will be out the back door before the kettle boils',
    goals: [goal(), guitar],
    analyses: [analysis(), obstacles, guitarLine],
    sealedAt: '2026-09-16T21:00:00.000Z',
  },
  sequentialIds(),
);

describe('the calendar', () => {
  it('is quiet before day 90 and opens on it', () => {
    expect(reauthorDue([first], '2026-09-16')).toBeNull();
    expect(reauthorDue([first], plusDays('2026-09-16', REAUTHOR_EVERY - 1))).toBeNull();
    const due = reauthorDue([first], plusDays('2026-09-16', REAUTHOR_EVERY));
    expect(due).toEqual({ cycle: 1, daysSince: 90, dueOn: '2026-12-15', edition: 2 });
  });

  it('keeps offering it for a week, then waits for the next ninety', () => {
    expect(reauthorDue([first], plusDays('2026-09-16', 90 + REAUTHOR_WINDOW - 1))?.cycle).toBe(1);
    expect(reauthorDue([first], plusDays('2026-09-16', 90 + REAUTHOR_WINDOW))).toBeNull();
    expect(reauthorDue([first], plusDays('2026-09-16', 179))).toBeNull();
    expect(reauthorDue([first], plusDays('2026-09-16', 180))?.cycle).toBe(2);
    expect(reauthorDue([first], plusDays('2026-09-16', 270))?.cycle).toBe(3);
  });

  it('counts from the latest edition, so a Book just written again is not asked for again', () => {
    const second = { ...first, version: 2, sealedAt: '2026-12-15T21:00:00.000Z' };
    expect(reauthorDue([first, second], '2026-12-16')).toBeNull();
    expect(reauthorDue([first, second], '2027-03-15')?.edition).toBe(3);
  });

  it('honours the day boundary: a seal at half past midnight belongs to the evening before', () => {
    // 00:30 local on the 17th, boundary 3am: sealed on the 16th, so day 90 is
    // Dec 15 and not Dec 16.
    const late = { ...first, sealedAt: new Date(2026, 8, 17, 0, 30).toISOString() };
    expect(reauthorDue([late], '2026-12-15')?.cycle).toBe(1);
  });

  it('has nothing to say with no Book', () => {
    expect(reauthorDue([], '2027-01-01')).toBeNull();
  });

  it('names the day in words while there are words for it', () => {
    expect(reauthorLabel(1)).toBe('Day ninety');
    expect(reauthorLabel(2)).toBe('Day one hundred and eighty');
    expect(reauthorLabel(4)).toBe('Day three hundred and sixty');
    expect(reauthorLabel(5)).toBe('Day 450');
  });
});

describe('two Books side by side', () => {
  it('reads every sealed line against the stone as it stands now', () => {
    const rows = sideBySide(first, [goal(), guitar], [analysis(), obstacles, guitarLine]);
    expect(rows.map((r) => r.name)).toEqual(['Half marathon', 'Play the guitar on the wall']);
    expect(rows[0]!.lines.map((l) => l.kind)).toEqual(['strategies', 'obstacles']);
    expect(rows[0]!.lines.every((l) => !l.rewritten)).toBe(true);
    expect(rows[0]!.letGo).toBeNull();
  });

  it('marks a stone as written again the moment its text differs from the sealed line', () => {
    const rewritten = analysis({ line: 'Every morning, out the door at 6:40, and the kettle can wait' });
    const rows = sideBySide(first, [goal(), guitar], [rewritten, obstacles, guitarLine]);
    const s = rows[0]!.lines.find((l) => l.kind === 'strategies')!;
    expect(s.rewritten).toBe(true);
    expect(s.before.text).toContain('Tuesday, Thursday, Saturday');
    expect(s.now?.text).toContain('Every morning');
    // The other stone is untouched.
    expect(rows[0]!.lines.find((l) => l.kind === 'obstacles')!.rewritten).toBe(false);
  });

  it('reads a changed then-half or paragraph as written again, the same as the diff will', () => {
    const thenChanged = { ...obstacles, line2: 'the gym at the end of the road' };
    const rows = sideBySide(first, [goal(), guitar], [analysis(), thenChanged, guitarLine]);
    const o = rows[0]!.lines.find((l) => l.kind === 'obstacles')!;
    expect(o.rewritten).toBe(true);
    expect(o.now).toEqual({ text: 'it rains', text2: 'the gym at the end of the road' });
    // And the seal agrees.
    const next = buildBookVersion(
      { version: 2, title: 'A year of the back door', track: 'starter', ideal: IDEAL, shadow: null, iWill: 'I will be out the back door before the kettle boils', goals: [goal(), guitar], analyses: [analysis(), thenChanged, guitarLine], sealedAt: '2026-12-15T21:00:00.000Z' },
      sequentialIds(),
    );
    expect(diffBooks(first, next).rewritten).toEqual(['Half marathon']);
    // A stone emptied since the seal is neither kept nor rewritten: there is nothing to compare.
    const emptied = sideBySide(first, [goal(), guitar], [analysis(), guitarLine]);
    expect(emptied[0]!.lines.find((l) => l.kind === 'obstacles')!.now).toBeNull();
  });

  it('shows a goal let go with the line written about it', () => {
    const letGo = { ...guitar, status: 'archived' as const, lesson: 'It was never the guitar I wanted; it was the evenings.', letGoAt: '2026-12-15T09:00:00.000Z' };
    const rows = sideBySide(first, [goal(), letGo], [analysis(), obstacles, guitarLine]);
    expect(rows[1]!.letGo?.lesson).toContain('the evenings');
  });

  it('leaves out a goal dropped outright since the seal', () => {
    const rows = sideBySide(first, [goal()], [analysis(), obstacles]);
    expect(rows.map((r) => r.goalId)).toEqual(['g1']);
  });
});

describe('the diff, which is the new edition’s first page', () => {
  const rewritten = analysis({ line: 'Every morning, out the door at 6:40, and the kettle can wait' });
  const rowing = goal({ id: 'g3', title: 'Row on the river', domain: 'health', rank: 2 });
  const rowingLine = analysis({ id: 'a4', goalId: 'g3', line: 'Saturday at seven, the club boat' });
  const second = buildBookVersion(
    {
      version: 2,
      title: 'A year of the back door',
      track: 'starter',
      ideal: IDEAL,
      shadow: null,
      iWill: 'I will be out the back door before the kettle boils',
      // The guitar has been let go; rowing is new.
      goals: [goal(), rowing],
      analyses: [rewritten, obstacles, rowingLine],
      sealedAt: '2026-12-15T21:00:00.000Z',
    },
    sequentialIds(),
  );
  const lessons = [
    { name: 'Play the guitar on the wall', line: 'It was never the guitar I wanted; it was the evenings.' },
    // A line for a goal this diff does not list is not carried.
    { name: 'Something else', line: 'stale' },
  ];
  const diff = diffBooks(first, second, lessons);

  it('tells kept from written again from new from let go', () => {
    expect(diff.kept).toEqual([]);
    expect(diff.rewritten).toEqual(['Half marathon']);
    expect(diff.added).toEqual(['Row on the river']);
    expect(diff.letGo).toEqual(['Play the guitar on the wall']);
    expect(diff.lessons).toEqual([{ name: 'Play the guitar on the wall', line: 'It was never the guitar I wanted; it was the evenings.' }]);
  });

  it('calls a chapter kept when every line is the same, including the then-half', () => {
    const same = buildBookVersion(
      { ...second, version: 2, goals: [goal(), guitar], analyses: [analysis(), obstacles, guitarLine] },
      sequentialIds(),
    );
    const d = diffBooks(first, same);
    expect(d.kept).toEqual(['Half marathon', 'Play the guitar on the wall']);
    expect(d.rewritten).toEqual([]);
    expect(d.added).toBeUndefined();
    expect(d.lessons).toBeUndefined();
    // A changed then-half alone is a rewrite.
    const thenChanged = buildBookVersion(
      { ...second, goals: [goal(), guitar], analyses: [analysis(), { ...obstacles, line2: 'the gym at the end of the road' }, guitarLine] },
      sequentialIds(),
    );
    expect(diffBooks(first, thenChanged).rewritten).toEqual(['Half marathon']);
  });

  it('is the first page of the reading, and only for an edition after the first', () => {
    const withDiff = { ...second, diff };
    expect(bookPages(withDiff)[0]).toEqual({ kind: 'diff', diff, previous: 1 });
    expect(bookPages(first)[0]!.kind).toBe('opening');
    // An edition numbered 1 never opens on a diff, whatever is in the field.
    expect(bookPages({ ...first, diff })[0]!.kind).toBe('opening');
  });

  it('prints in both exports, lines and lessons, under the previous edition’s name', () => {
    const withDiff = { ...second, diff };
    const text = bookToText(withDiff);
    expect(text).toContain('SINCE THE FIRST EDITION');
    expect(text).toContain('Written again: Half marathon');
    expect(text).toContain('New: Row on the river');
    expect(text).toContain('Let go: Play the guitar on the wall');
    expect(text).toContain('it was the evenings');
    const html = bookToHtml(withDiff);
    expect(html).toContain('Since the first edition');
    expect(html).toContain('it was the evenings');
    // And neither export mentions it on a first edition.
    expect(bookToText(first)).not.toContain('SINCE THE');
    expect(bookToHtml(first)).not.toContain('Since the');
  });

  it('lists only the parts that have something in them', () => {
    expect(diffLines({ kept: ['a'], rewritten: [], letGo: [] })).toEqual([{ label: 'Kept', names: ['a'] }]);
    expect(diffLines(diff).map((r) => r.label)).toEqual(['Written again', 'New', 'Let go']);
  });
});
