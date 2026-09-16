/**
 * What Morrow knows about me (PRD §7.9, §7.12): the memory profile, built
 * from the person's own material only, editable line by line, with edits
 * that lock and forgets that reach the coach.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE } from '../src/types';
import type { BookVersion, DaySummary, Goal, GoalAnalysis, MemoryEdit } from '../src/types';
import { sequentialIds } from '../src/ids';
import { buildBookVersion } from '../src/engines/book';
import { replyToChip } from '../src/engines/coach';
import { MEMORY_DOCUMENT_CHARS, applyMemoryEdits, buildMemory, forgottenLineIds, memoryDocument } from '../src/engines/memory';

const IDEAL = `It's 6:40 and the kitchen is still blue. I lace the left shoe first, like always, and the door is already open before I've decided anything. Rent went out on the first and I didn't look at the balance, because I already knew.`;

const goal: Goal = {
  id: 'g1',
  title: 'Half marathon',
  domain: 'health',
  horizon: 'Six months',
  targetDate: '2027-03-01',
  status: 'active',
  rank: 0,
  createdAt: '2026-09-09T20:00:00.000Z',
};
const strategies: GoalAnalysis = {
  id: 'a1',
  goalId: 'g1',
  kind: 'strategies',
  track: 'starter',
  framingId: 's-thrice',
  line: 'Tuesday, Thursday, Saturday at 6:40, out the back door',
  specificity: 0.8,
  followupShown: false,
  writtenAt: '2026-09-09T20:05:00.000Z',
};
const obstacles: GoalAnalysis = { ...strategies, id: 'a2', kind: 'obstacles', line: 'it rains', line2: 'take the stairwell' };
const flagged: GoalAnalysis = { ...strategies, id: 'a3', kind: 'motives', line: 'a line the screen flagged', safetyRisk: 'crisis' };

const book: BookVersion = buildBookVersion(
  { version: 1, title: 'A year of the back door', track: 'starter', ideal: IDEAL, shadow: null, iWill: 'I will be out before the kettle boils', goals: [goal], analyses: [strategies, obstacles], sealedAt: '2026-09-16T21:00:00.000Z' },
  sequentialIds(),
);

const day = (d: string, over: Partial<DaySummary> = {}): DaySummary => ({
  day: d,
  planned: 1,
  done: 1,
  skipped: 0,
  partial: 0,
  evidenceCount: 1,
  sealedAt: `${d}T21:00:00.000Z`,
  moodWord: 'Proud',
  proof: 'Out before the kettle.',
  gladOf: null,
  intentionMoveId: null,
  ...over,
});

const input = {
  profile: { ...DEFAULT_PROFILE, displayName: 'Sam', persona: 'straight' as const, witnessName: 'Jo' },
  goals: [goal],
  analyses: [strategies, obstacles, flagged],
  books: [book],
  days: {
    '2026-09-10': day('2026-09-10'),
    '2026-09-12': day('2026-09-12', { moodWord: 'Steady' }),
    '2026-09-15': day('2026-09-15', { proof: 'Cold, and I did not mind.' }),
  },
  today: '2026-09-17',
};

describe('what Morrow knows', () => {
  const lines = buildMemory(input);
  const keys = lines.map((l) => l.key);

  it('is built from the person and nothing else', () => {
    expect(keys).toContain('you.name');
    expect(lines.find((l) => l.key === 'you.name')?.quote).toBe('Sam');
    expect(lines.find((l) => l.key === 'you.witness')?.quote).toBe('Jo');
    expect(lines.find((l) => l.key === 'goal.g1')?.quote).toBe('Half marathon');
    expect(lines.find((l) => l.key === 'line.a1')?.quote).toContain('Tuesday, Thursday');
    // The if-then's two halves are theirs; "if" and "then I" are the app's and stay outside the quotes.
    const ifThen = lines.find((l) => l.key === 'line.a2')!;
    expect(ifThen.tail).toBe(': if');
    expect(ifThen.quote).toBe('it rains');
    expect(ifThen.quote2).toBe('take the stairwell');
    expect(ifThen.quote2Framing).toBe('then I');
    // A then-half that starts with "I'll" keeps its subject, and the framing drops its own.
    const contracted = buildMemory({ ...input, analyses: [{ ...obstacles, line2: "I'll take the stairwell" }] }).find((l) => l.key === 'line.a2')!;
    expect(contracted.quote2).toBe("I'll take the stairwell");
    expect(contracted.quote2Framing).toBe('then');
    expect(memoryDocument([contracted])).toContain('then “I\'ll take the stairwell”');
    expect(memoryDocument([contracted])).not.toContain('then I “I');
    // The goal's name travels beside the framing in its own face, not inside the app's sentence.
    expect(lines.find((l) => l.key === 'line.a1')?.text).toBe('How, for');
    expect(lines.find((l) => l.key === 'line.a1')?.tail).toBe(':');
    expect(lines.find((l) => l.key === 'line.a1')?.goal).toEqual({ name: 'Half marathon', authored: true });
    // A bank title is the app's words, and the line says so.
    const bank = buildMemory({ ...input, goals: [{ ...goal, titleAuthored: false }] });
    expect(bank.find((l) => l.key === 'goal.g1')?.quoteAuthored).toBe(false);
    expect(bank.find((l) => l.key === 'line.a1')?.goal?.authored).toBe(false);
    // The clock, not the stored form.
    expect(lines.find((l) => l.key === 'you.times')?.text).toContain('7:00');
    expect(lines.find((l) => l.key === 'you.times')?.text).not.toContain('07:00');
    expect(lines.find((l) => l.key === 'book.first')?.quote).toContain('kitchen is still blue');
    expect(lines.find((l) => l.key === 'book.iwill')?.quote).toContain('kettle boils');
    expect(lines.find((l) => l.key === 'days.sealed')?.text).toContain('3 days');
    expect(lines.find((l) => l.key === 'days.word')?.quote).toBe('Proud');
    expect(lines.find((l) => l.key === 'days.proof')?.quote).toBe('Cold, and I did not mind.');
  });

  it('never carries a line the safety screen flagged', () => {
    expect(keys).not.toContain('line.a3');
    expect(JSON.stringify(lines)).not.toContain('the screen flagged');
  });

  it('is the same document twice, so an edit lands on the same line tomorrow', () => {
    expect(buildMemory(input)).toEqual(lines);
  });

  it('leaves out what is not there', () => {
    const bare = buildMemory({ ...input, profile: { ...DEFAULT_PROFILE, displayName: '' }, goals: [], analyses: [], books: [], days: {} });
    expect(bare.map((l) => l.key)).toEqual(['you.register', 'you.track', 'you.times']);
  });

  it('names a goal let go, with what it turned out to be, unless the screen flagged the line', () => {
    const letGo = buildMemory({ ...input, goals: [{ ...goal, status: 'archived', lesson: 'It was the evenings.' }] });
    const row = letGo.find((l) => l.key === 'goal.g1.letgo')!;
    expect(row.text).toBe('You let go');
    expect(row.goal).toEqual({ name: 'Half marathon', authored: true });
    expect(row.tail).toBe('— it turned out to be:');
    expect(row.quote).toBe('It was the evenings.');
    const flagged = buildMemory({ ...input, goals: [{ ...goal, status: 'archived', lesson: 'a line the screen flagged', lessonRisk: 'crisis' }] });
    expect(flagged.find((l) => l.key === 'goal.g1.letgo')?.quote).toBeUndefined();
    expect(memoryDocument(flagged)).not.toContain('the screen flagged');
    expect(letGo.map((l) => l.key)).not.toContain('goal.g1');
    // Its stones are not listed either.
    expect(letGo.map((l) => l.key)).not.toContain('line.a1');
  });
});

describe('edits', () => {
  const lines = buildMemory(input);

  it('lock: the person’s words replace the line and survive the rebuild', () => {
    const edits: MemoryEdit[] = [{ key: 'you.name', text: 'Call me S.', editedAt: '2026-09-17T09:00:00.000Z' }];
    const after = applyMemoryEdits(lines, edits);
    const name = after.find((l) => l.key === 'you.name');
    expect(name?.quote).toBe('Call me S.');
    expect(name?.text).toBe('');
    // A rebuild changes nothing about it.
    expect(applyMemoryEdits(buildMemory({ ...input, profile: { ...input.profile, displayName: 'Samuel' } }), edits).find((l) => l.key === 'you.name')?.quote).toBe('Call me S.');
  });

  it('an edit the screen flagged is theirs to see and never a coach’s to be handed', () => {
    const edits: MemoryEdit[] = [{ key: 'you.name', text: 'a line the screen flagged', editedAt: 'x', risk: 'crisis' }];
    const after = applyMemoryEdits(lines, edits);
    expect(after.find((l) => l.key === 'you.name')?.quote).toBe('a line the screen flagged');
    expect(memoryDocument(after)).not.toContain('the screen flagged');
    // An edit whose line no longer builds keeps its group by its key.
    expect(applyMemoryEdits([], [{ key: 'line.gone', text: 'kept', editedAt: 'x' }])[0]?.about).toBe('your lines');
  });

  it('forget: the line is gone, and an edit whose line no longer builds is kept', () => {
    const edits: MemoryEdit[] = [
      { key: 'line.a2', text: null, editedAt: '2026-09-17T09:00:00.000Z' },
      { key: 'gone.key', text: 'Something I told it once.', editedAt: '2026-09-17T09:00:00.000Z' },
    ];
    const after = applyMemoryEdits(lines, edits);
    expect(after.map((l) => l.key)).not.toContain('line.a2');
    expect(after[after.length - 1]).toEqual({ key: 'gone.key', about: 'you', text: '', quote: 'Something I told it once.' });
  });

  it('forgetting a stone takes it out of the coach’s hands', () => {
    const edits: MemoryEdit[] = [{ key: 'line.a2', text: null, editedAt: '2026-09-17T09:00:00.000Z' }];
    const forgotten = forgottenLineIds(edits);
    expect([...forgotten]).toEqual(['a2']);
    const ctx = { book, analyses: [strategies, obstacles].filter((a) => !forgotten.has(a.id)), moves: [], days: [], today: '2026-09-17', returns: 0, persona: 'straight' as const };
    const reply = replyToChip('stuck', ctx);
    expect(reply.text).not.toContain('stairwell');
    // And with nothing forgotten, the coach quotes the if-then as written.
    expect(replyToChip('stuck', { ...ctx, analyses: [strategies, obstacles] }).text).toContain('stairwell');
  });

  it('only stone keys reach the coach filter', () => {
    expect([...forgottenLineIds([{ key: 'you.name', text: null, editedAt: 'x' }, { key: 'line.a1', text: 'kept', editedAt: 'x' }])]).toEqual([]);
  });
});

describe('the document', () => {
  it('is one line per line, quotes in quotation marks, and stops at the cap on a line boundary', () => {
    const lines = buildMemory(input);
    const doc = memoryDocument(lines);
    expect(doc.split('\n')).toHaveLength(lines.length);
    expect(doc).toContain('- You asked to be called “Sam”');
    expect(doc).toContain('- How, for “Half marathon”: “Tuesday, Thursday, Saturday at 6:40, out the back door”');
    expect(doc).toContain('- What gets in the way, for “Half marathon”: if “it rains” then I “take the stairwell”');
    // A bank title is the app's words and goes without quotation marks.
    const bankDoc = memoryDocument(buildMemory({ ...input, goals: [{ ...goal, titleAuthored: false }] }));
    expect(bankDoc).toContain('- Six months — Half marathon');
    expect(bankDoc).toContain('- How, for Half marathon: “Tuesday');
    const long = Array.from({ length: 400 }, (_, i) => ({ key: `k${i}`, about: 'you' as const, text: `Line ${i}`, quote: 'x'.repeat(40) }));
    const capped = memoryDocument(long);
    expect(capped.length).toBeLessThanOrEqual(MEMORY_DOCUMENT_CHARS);
    expect(capped.endsWith('”')).toBe(true);
  });
});
