/**
 * Where the person's words are, inside a string the app wrote.
 *
 * Every span is located against the whole body and laid out in the order it
 * appears there. Walking the body once per quote and consuming as it went
 * meant a short quotation that happened to sit *before* a longer one was
 * swallowed into the unhighlighted run and silently lost its face. Longest
 * first so that when two overlap, the larger claim wins.
 *
 * Pure, and exported, so the rule can be tested without a renderer.
 */
export function splitQuoted(body: string, spans: readonly string[]): { text: string; theirs: boolean }[] {
  const found = spans
    .map((q) => q.trim())
    .filter((q) => q.length > 0)
    .flatMap((q) => {
      // Every occurrence, not just the first: a brief quotes the same line in
      // two sentences and both of them are theirs.
      const out: { q: string; at: number }[] = [];
      let from = 0;
      for (;;) {
        const at = body.indexOf(q, from);
        if (at < 0) break;
        out.push({ q, at });
        from = at + q.length;
      }
      return out;
    })
    .sort((a, b) => b.q.length - a.q.length);

  const taken: { from: number; to: number; q: string }[] = [];
  for (const m of found) {
    const to = m.at + m.q.length;
    if (taken.some((t) => m.at < t.to && t.from < to)) continue;
    taken.push({ from: m.at, to, q: m.q });
  }
  taken.sort((a, b) => a.from - b.from);

  const parts: { text: string; theirs: boolean }[] = [];
  let cursor = 0;
  for (const t of taken) {
    if (t.from > cursor) parts.push({ text: body.slice(cursor, t.from), theirs: false });
    parts.push({ text: t.q, theirs: true });
    cursor = t.to;
  }
  if (cursor < body.length) parts.push({ text: body.slice(cursor), theirs: false });
  return parts;
}

