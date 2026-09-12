/**
 * A type size for a line of the person's own words in a fixed frame.
 *
 * The lock screen (PRD §7.8) sets the "I will" line in the serif on a
 * print the size of the phone. A ten-word line at 26 pt sits in the lower
 * third, under the clock and the widgets; a forty-word line at 26 pt climbs
 * into the clock. The size steps down with the length so the line stays
 * where a lock screen has room for it. Steps rather than a formula, so the
 * same line always gets the same size and a person can predict it.
 */
export function fitLine(chars: number): { fontSize: number; lineHeight: number } {
  if (chars <= 70) return { fontSize: 26, lineHeight: 34 };
  if (chars <= 130) return { fontSize: 22, lineHeight: 29 };
  if (chars <= 200) return { fontSize: 19, lineHeight: 25 };
  return { fontSize: 16, lineHeight: 22 };
}

/**
 * The first sentence of the Book, set as the chapter's opening. A sentence
 * of twelve words is a headline; one of forty is a paragraph wearing a
 * headline's size, so the size steps down with the length here too.
 */
export function fitSentence(chars: number): { fontSize: number; lineHeight: number } {
  if (chars <= 80) return { fontSize: 28, lineHeight: 35 };
  if (chars <= 160) return { fontSize: 24, lineHeight: 31 };
  return { fontSize: 21, lineHeight: 28 };
}
