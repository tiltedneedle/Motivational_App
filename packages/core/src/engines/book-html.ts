/**
 * The Book as a document (PRD §7.3: "Exports: PDF … a one-page print").
 *
 * The same page as the screen, in HTML, so a PDF can be made of it with the
 * platform's own renderer. The typographic rule carries over exactly: the
 * serif means "these are your words", the sans is everything the app wrote,
 * and nothing here decides which is which — `BookVersion` already knows, and
 * this only sets it.
 *
 * Self-contained on purpose: no stylesheet to fetch, no font to download. A
 * print that depends on a network is a print that fails on the one evening it
 * is wanted, and the fallback faces (Georgia, the system sans) are the ones
 * every PDF viewer has.
 */
import type { BookVersion } from '../types';
import { ANALYSIS_TITLES } from './framings';
import { formatDay, ordinal, plural, sealedOn, thenHalf } from '../ids';
import { diffLines } from './book';
import { restOfIdeal } from './portrait';

/** The one place text meets markup. Nothing the person wrote is trusted as HTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CSS = `
  @page { margin: 22mm 20mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: #15181F;
    background: #FBF8F2;
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
  }
  .page { max-width: 640pt; margin: 0 auto; padding: 24pt 0; }
  .theirs { font-family: Georgia, "Times New Roman", Times, serif; }
  .label {
    font-size: 8.5pt; letter-spacing: 0.08em; text-transform: uppercase; color: #6F6552;
    margin: 18pt 0 4pt;
  }
  .spine-framing { font-size: 11pt; color: #6F6552; margin-bottom: 2pt; }
  .spine { font-size: 22pt; line-height: 1.25; margin: 0 0 14pt; }
  .first { font-size: 20pt; line-height: 1.3; margin: 0 0 10pt; }
  .body { font-size: 12pt; line-height: 1.6; margin: 0; white-space: pre-wrap; }
  .shadow { color: #5A5750; }
  .rule { border: 0; border-top: 1px solid rgba(21,24,31,0.12); margin: 18pt 0; }
  .contents { list-style: none; margin: 0; padding: 0; }
  .contents li { display: flex; justify-content: space-between; gap: 12pt; padding: 3pt 0; }
  .chapter { page-break-inside: avoid; margin-top: 8pt; }
  .chapter h2 { font-size: 16pt; font-weight: normal; margin: 0 0 6pt; }
  .line { margin: 0 0 8pt; }
  .line p { margin: 0; font-size: 12pt; line-height: 1.55; }
  .line .then { font-style: italic; color: #5A5750; }
  /* The card the person picked: the app's sentence, in the second ink, at reading size — not a label. */
  .line .card { margin: 0; font-size: 12pt; line-height: 1.55; color: #5A5750; }
  /* The line they still believe: italic, and in full ink, as the paper has it. */
  .line .believe { font-style: italic; }
  .line .more { font-size: 10.5pt; line-height: 1.55; color: #5A5750; margin: 4pt 0 0; }
  /* The app's framing, not their words: the sans, upright, small. */
  .line .then .framing { font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-style: normal; font-size: 9.5pt; color: #6F6552; }
  .iwill { font-size: 17pt; line-height: 1.4; margin: 0; }
  .colophon { margin-top: 24pt; }
`;

function chapterName(name: string, authored: boolean): string {
  const safe = escapeHtml(name);
  return authored ? `<span class="theirs">${safe}</span>` : `<span>${safe}</span>`;
}

/**
 * The whole Book as one HTML document.
 *
 * The order is the printed order — `bookPages` and the Book screen agree with
 * it — because an export that reorders somebody's own document is a different
 * document.
 */
export function bookToHtml(book: BookVersion, boundaryHour = 3): string {
  const rest = restOfIdeal(book.ideal, book.firstSentence);
  const authoredTitle = book.titleAuthored !== false;

  const contents = book.chapters
    .map(
      (c) =>
        `<li>${chapterName(c.name, c.nameAuthored !== false)}<span class="label" style="margin:0">${escapeHtml(
          c.horizon,
        )}</span></li>`,
    )
    .join('');

  const chapters = book.chapters
    .map((c) => {
      const lines = c.lines
        .map((l) => {
          const label = `${ANALYSIS_TITLES[l.kind]}${l.framingLabel ? ` · ${escapeHtml(l.framingLabel)}` : ''}`;
          const half = l.text2 ? thenHalf(l.text2) : null;
          const then = half ? `<p class="theirs then"><span class="framing">${half.framing}</span> ${escapeHtml(half.act)}</p>` : '';
          const paragraph = l.paragraph ? `<p class="theirs more">${escapeHtml(l.paragraph)}</p>` : '';
          return `<div class="line"><div class="label">${label}</div><p class="theirs">${escapeHtml(l.text)}</p>${then}${paragraph}</div>`;
        })
        .join('');
      return `<section class="chapter"><hr class="rule" /><h2>${chapterName(c.name, c.nameAuthored !== false)}</h2>${lines}</section>`;
    })
    .join('');

  // The other two volumes, printed the way the screen prints them: the app's
  // sentence for a card is a heading in the sans, and everything the person
  // wrote is theirs, in the serif.
  const presentEntries = book.volumes?.present?.entries ?? [];
  const pastEntries = book.volumes?.past?.entries ?? [];
  const present = presentEntries.length
    ? `<section class="chapter"><hr class="rule" /><h2>What I am like</h2>${presentEntries
        .map((e) => {
          const label = `${e.half === 'faults' ? 'What gets in the way' : 'What I am good at'}${e.goalName ? ` · ${escapeHtml(e.goalName)}` : ''}`;
          const framing = e.framing ? `<span class="framing">${escapeHtml(e.framing)}</span> ` : '';
          return `<div class="line"><div class="label">${label}</div><p class="card">${escapeHtml(e.card)}</p><p class="theirs">${escapeHtml(
            e.story,
          )}</p><p class="theirs then">${framing}${escapeHtml(e.apply)}</p></div>`;
        })
        .join('')}</section>`
    : '';
  const past = pastEntries.length
    ? `<section class="chapter"><hr class="rule" /><h2>Where I came from</h2>${pastEntries
        .map(
          (e) =>
            `<div class="line"><div class="label">${escapeHtml(e.period)}</div><p class="theirs">${escapeHtml(
              e.title,
            )}</p><p class="theirs">${escapeHtml(e.whatHappened)}</p><p class="theirs more">${escapeHtml(
              e.shapedMe,
            )}</p><p class="theirs believe">${escapeHtml(e.stillBelieve)}</p></div>`,
        )
        .join('')}</section>`
    : '';
  const volumes = present + past;

  const shadow = book.shadow
    ? `<hr class="rule" /><div class="label">The other road</div><p class="body theirs shadow">${escapeHtml(book.shadow)}</p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(book.title)}</title>
<style>${CSS}</style>
</head>
<body>
<main class="page">
  ${book.titleFraming ? `<div class="spine-framing">${escapeHtml(book.titleFraming)}</div>` : ''}
  <h1 class="spine ${authoredTitle ? 'theirs' : ''}">${escapeHtml(book.title)}</h1>
  <div class="label" style="margin-top:0">${ordinal(book.version)} edition · ${plural(
    book.chapters.length,
    'goal',
  )} · ${book.track === 'full' ? 'Full' : 'Starter'}</div>
  <hr class="rule" />

${
    book.diff && book.version > 1
      ? `<div class="label">Since the ${escapeHtml(ordinal(book.version - 1).toLowerCase())} edition</div>
  ${diffLines(book.diff)
    .map((row) => `<p class="line"><span class="label">${escapeHtml(row.label)}</span> ${escapeHtml(row.names.join(', '))}</p>`)
    .join('\n  ')}
  ${(book.diff.lessons ?? []).map((l) => `<p class="line theirs"><em>${escapeHtml(l.name)}</em> — ${escapeHtml(l.line)}</p>`).join('\n  ')}
  <hr class="rule" />`
      : ''
  }
  <div class="label">Chapter one · your future</div>
  <p class="first theirs">${escapeHtml(book.firstSentence)}</p>
  <p class="body theirs">${escapeHtml(rest)}</p>
  ${shadow}

  <hr class="rule" />
  <div class="label">Contents</div>
  <ul class="contents">${contents}</ul>

  ${chapters}
  ${volumes}

  <hr class="rule" />
  <div class="label">I will</div>
  <p class="iwill theirs">${escapeHtml(book.iWill)}</p>
  <div class="label colophon">Finished ${escapeHtml(formatDay(sealedOn(book.sealedAt, boundaryHour)))} · written by you</div>
</main>
</body>
</html>`;
}
