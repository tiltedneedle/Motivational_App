/**
 * The Book as a document (PRD §7.3).
 *
 * Two things matter about the HTML and neither is how it looks. The serif
 * lands on exactly the words the person wrote and nowhere else — the rule the
 * whole product runs on, carried into the one artefact that leaves the app.
 * And nothing they wrote is trusted as markup, because a Book that can run a
 * script is a Book that can be made to.
 */
import { describe, expect, it } from 'vitest';
import { bookToHtml, escapeHtml } from '../src/engines/book-html';
import type { BookVersion } from '../src/types';

const book = {
  version: 2,
  title: 'the back door',
  titleAuthored: true,
  titleFraming: 'A year of',
  track: 'starter',
  sealedAt: '2026-09-11T05:40:00.000Z',
  firstSentence: 'It is 6:40 and the kitchen is still blue.',
  ideal: 'It is 6:40 and the kitchen is still blue. Sam is still asleep.',
  shadow: null,
  iWill: 'I will be out the back door before the kettle boils',
  chapters: [
    {
      goalId: 'g1',
      name: '5 km race',
      nameAuthored: false,
      horizon: 'Three months',
      lines: [
        { kind: 'motives', text: 'Because I said I would.', framingLabel: 'Mine' },
        { kind: 'obstacles', text: 'I stay up too late', text2: 'put the phone in the hall' },
      ],
    },
    { goalId: 'g2', name: 'out the door before the kettle', nameAuthored: true, horizon: 'No deadline', lines: [] },
  ],
} as unknown as BookVersion;

describe('the Book as a document', () => {
  const html = bookToHtml(book);

  it('is a whole document with no outside dependencies', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).not.toMatch(/<link\b/);
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/@import/);
  });

  it('sets their words in the serif and the chrome in the sans', () => {
    // Theirs.
    expect(html).toContain('<p class="first theirs">It is 6:40 and the kitchen is still blue.</p>');
    expect(html).toContain('<p class="iwill theirs">I will be out the back door before the kettle boils</p>');
    expect(html).toContain('<h1 class="spine theirs">the back door</h1>');
    expect(html).toContain('<p class="theirs">Because I said I would.</p>');
    // The app's, and a name that came from the bank.
    expect(html).toContain('<div class="spine-framing">A year of</div>');
    expect(html).toContain('<span>5 km race</span>');
    expect(html).not.toContain('<span class="theirs">5 km race</span>');
    expect(html).toContain('<span class="theirs">out the door before the kettle</span>');
  });

  it('keeps the printed order', () => {
    const at = (s: string) => html.indexOf(s);
    expect(at('the Fifteen')).toBeLessThan(at('Contents'));
    expect(at('Contents')).toBeLessThan(at('<section class="chapter">'));
    expect(at('<section class="chapter">')).toBeLessThan(at('I will'));
  });

  it('carries the framing labels small and grey, and the if-then as two lines', () => {
    expect(html).toContain('Motives · Mine');
    expect(html).toContain('…then I put the phone in the hall');
  });

  it('gives the other road its own page only when it was written', () => {
    expect(html).not.toContain('The other road');
    const withShadow = bookToHtml({ ...book, shadow: 'The mornings go by.' } as BookVersion);
    expect(withShadow).toContain('The other road');
    expect(withShadow).toContain('<p class="body theirs shadow">The mornings go by.</p>');
  });

  it('prints the edition, the count and the seal date', () => {
    expect(html).toContain('Second edition · 2 goals');
    expect(html).toContain('Sealed 11 Sep');
  });

  it('never trusts what they wrote as markup', () => {
    const hostile = bookToHtml({
      ...book,
      title: '<script>alert(1)</script>',
      firstSentence: 'A "quoted" line & <b>bold</b>.',
      ideal: 'A "quoted" line & <b>bold</b>. More.',
      iWill: "I will <img src=x onerror='x'>",
    } as BookVersion);
    expect(hostile).not.toContain('<script>');
    expect(hostile).not.toContain('<b>bold</b>');
    expect(hostile).not.toContain('<img');
    expect(hostile).toContain('&lt;script&gt;');
    expect(hostile).toContain('&amp; &lt;b&gt;bold&lt;/b&gt;');
  });

  it('escapes the five characters that matter', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  });
});
