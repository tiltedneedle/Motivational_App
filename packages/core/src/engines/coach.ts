/**
 * The Coach (PRD §7.9).
 *
 * The coach quotes before it suggests. Every brief carries at least one span of
 * the user's own writing, and every reply to a chip is built around the user's
 * own if-then or their own sentence. It never writes a goal or a plan line.
 */
import type { Brief, BookVersion, DaySummary, GoalAnalysis, Move, Persona } from '../types';
import { isReturning } from './consistency';
import { endSentence, formatDay, plural } from '../ids';
import { firstSentence } from './portrait';
import { SUPPORT_LINE, isQuotable, screen } from './safety';

export interface BriefInput {
  day: string;
  book: BookVersion | null;
  yesterday: DaySummary | null;
  moves: Move[];
  analyses: GoalAnalysis[];
  persona: Persona;
  score: number;
  previousScore: number;
  raining?: boolean;
  /**
   * The concern band (PRD 11.6). Softens the register whatever persona is set,
   * and takes the Consistency number off the brief.
   */
  soften?: boolean;
  /** The one time the app names professional support. See `shouldOfferSupport`. */
  offerSupport?: boolean;
}

const REGISTER: Record<Persona, { open: (s: string) => string; push: (s: string) => string }> = {
  gentle: {
    open: (s) => s,
    // A comma, and the sentence carried on rather than restarted. The colon
    // form printed "When you're ready: Start with Thursday: at 6:40" — two
    // colons and a capital mid-sentence, on the one register that is supposed
    // to read as somebody speaking gently.
    push: (s) => `When you're ready, ${lowerFirst(s)}`,
  },
  straight: {
    open: (s) => s,
    push: (s) => s,
  },
  fierce: {
    open: (s) => s,
    push: (s) => `${s} No negotiation with yourself this morning.`,
  },
};

/**
 * How Today says hello.
 *
 * This was the fixed string "Good morning." on every screen at every hour,
 * which is the sort of detail that quietly tells somebody the app is not
 * really looking at them: a person sealing the day at nine in the evening was
 * wished a good morning, and so was a person writing at half past midnight.
 *
 * The boundaries are the ordinary English ones and the small hours get their
 * own line rather than being rounded up into morning — somebody up at two is
 * not having a morning, and pretending otherwise reads worse than saying
 * nothing. App chrome, not the user's words: it is set in the sans.
 */
export function greeting(instant: Date, name?: string): string {
  const h = instant.getHours();
  const opener =
    h < 4 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const who = name?.trim();
  return who ? `${opener}, ${who}.` : `${opener}.`;
}

/** The line the day opens with: the user's own first sentence, in quotation marks. */
export function openingQuote(book: BookVersion | null): string | null {
  const s = book?.firstSentence?.trim();
  return s ? `“${s}”` : null;
}

export function buildDawnBrief(input: BriefInput, newId: (p: string) => string): Brief {
  const { yesterday, moves, analyses, persona, book } = input;
  // Concern outranks the persona. Somebody who chose "fierce" in Settings on a
  // good week did not choose to be pushed on this one, and "No negotiation
  // with yourself this morning" is the exact sentence not to print at them.
  const reg = input.soften ? REGISTER.gentle : REGISTER[persona];
  const quotes: string[] = [];

  const quote = openingQuote(book);
  if (book?.firstSentence) quotes.push(book.firstSentence);

  // Yesterday: evidence, never blame.
  let yesterdayLine: string;
  if (!yesterday || (yesterday.done === 0 && yesterday.evidenceCount === 0)) {
    yesterdayLine = 'Quiet day yesterday. It is still in the ledger as a quiet day, not a failure.';
  } else {
    const bits: string[] = [];
    bits.push(`${yesterday.done} of ${plural(Math.max(yesterday.planned, yesterday.done), 'move')}`);
    // Only if the screen did not flag it. The dawn brief is read over
    // breakfast, and this is exactly the sentence that must not come back.
    if (yesterday.proof?.trim() && isQuotable(yesterday)) {
      bits.push(`and you wrote “${yesterday.proof.trim()}”`);
      quotes.push(yesterday.proof.trim());
    }
    const delta = input.score - input.previousScore;
    // "avoids numeric targets" (PRD 11.6). The score is still computed and
    // still on Progress if they go looking; it just does not lead the morning.
    const trend = input.soften
      ? ''
      : delta > 0
        ? `Consistency ${input.score}, up from ${input.previousScore}.`
        : `Consistency ${input.score}.`;
    // Their sentence usually ends in a full stop already, and appending another
    // gave `Rained the whole way.". Consistency 86` — the app's punctuation
    // landing on top of theirs.
    yesterdayLine = trend ? `${endSentence(bits.join(' '))} ${trend}` : endSentence(bits.join(' '));
  }

  // Today: the first move, and why it is first.
  const first = [...moves]
    .filter((m) => m.status === 'todo')
    .sort((a, b) => a.order - b.order)[0];
  const todayLine = first
    ? reg.push(`Start with ${lowerFirst(first.title)}.`)
    : 'Nothing is scheduled. One small thing, chosen by you, is a whole day.';

  // If: the user's own if-then, quoted.
  const obstacle = analyses.find((a) => a.kind === 'obstacles' && a.line.trim());
  let ifLine: string;
  if (obstacle?.line2?.trim()) {
    const written = `if ${obstacle.line.trim().replace(/^if\s+/i, '')}, then I ${obstacle.line2.trim().replace(/^then i\s+/i, '')}`;
    quotes.push(obstacle.line.trim());
    ifLine = input.raining
      ? `You wrote: ${written}. It is raining.`
      : `You wrote: ${written}.`;
  } else if (first?.minVersion) {
    ifLine = `If today gets away from you: ${lowerFirst(first.minVersion)}`;
  } else {
    ifLine = 'If today gets away from you, two minutes of it still counts.';
  }

  return {
    id: newId('brief'),
    day: input.day,
    kind: 'dawn',
    yesterday: yesterdayLine,
    today: quote ? `${quote} Your line. ${todayLine}` : todayLine,
    ifThen: ifLine,
    quotedSpans: quotes,
    firstMoveId: first?.id ?? null,
    support: input.offerSupport ? SUPPORT_LINE : null,
    soften: Boolean(input.soften),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Lowercase the first letter so a quoted line reads inside a sentence — but
 * never a proper noun.
 *
 * A move cut from "Tuesday, Thursday, Saturday at 6:40" is titled "Tuesday:
 * at 6:40, out the back door", and this turned the brief into "Start with
 * tuesday: at 6:40". These are the person's own words being mangled by a
 * typographic convenience, which is the wrong way round.
 */
const PROPER_START =
  /^(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\b|^(?:January|February|March|April|May|June|July|August|September|October|November|December)\b|^I\b/;

function lowerFirst(s: string): string {
  if (PROPER_START.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// ---------------------------------------------------------------- chips

export type ChipId = 'stuck' | 'dont-feel' | 'changed' | 'celebrate';

export interface Chip {
  id: ChipId;
  label: string;
}

export const CHIPS: Chip[] = [
  { id: 'stuck', label: "I'm stuck" },
  { id: 'dont-feel', label: "I don't feel like it" },
  { id: 'changed', label: 'Something changed' },
  { id: 'celebrate', label: 'Celebrate with me' },
];

export interface ChipContext {
  book: BookVersion | null;
  analyses: GoalAnalysis[];
  moves: Move[];
  days: DaySummary[];
  today: string;
  returns: number;
  persona: Persona;
}

export interface CoachReply {
  text: string;
  quotedSpans: string[];
  /**
   * When the reply ends in something the user can accept onto Today.
   *
   * `goalId` is not optional and is not the first goal. The next move is the
   * soonest across every plan, so it routinely belongs to a goal that is not
   * ranked first; filing it under `goals[0]` put a guitar move on the running
   * plan and stamped it with the running Strategies line.
   *
   * `title` is the user's own line. The two-minute version travels beside it
   * in `minVersion`, because that sentence is the app's, and a move titled
   * with app prose is a plan line the person did not write.
   */
  /**
   * What the reply offers to do, if anything.
   *
   * `shrink-move` points at the move the person is already stuck on and offers
   * its smaller version. It used to be an `add-move` carrying that same move's
   * title, which created a byte-identical duplicate on Today: two rows saying
   * the same sentence, and the second one counted against them in the
   * Consistency Score for not being done.
   */
  action: {
    kind: 'shrink-move';
    moveId: string;
    goalId: string;
    /** Their own title, for the confirmation. Never written anywhere. */
    title: string;
    minVersion: string | null;
  } | null;
}

/**
 * Replies are assembled from the user's own material. If there is nothing of
 * theirs to quote, the coach asks a question instead of inventing encouragement.
 */
export function replyToChip(chip: ChipId, ctx: ChipContext): CoachReply {
  const obstacle = ctx.analyses.find((a) => a.kind === 'obstacles' && a.line.trim());
  const strategy = ctx.analyses.find((a) => a.kind === 'strategies' && a.line.trim());
  const next = [...ctx.moves].filter((m) => m.status === 'todo').sort((a, b) => a.order - b.order)[0];

  switch (chip) {
    case 'stuck': {
      if (obstacle?.line2?.trim()) {
        // Their if-then, as written. This used to print "then you put the
        // phone in the hall" — the coach rewriting the person's own sentence
        // into the second person, which is the app editing their words and
        // then quoting the edit back as theirs. The Book and the brief both
        // print "then I …", and so does this.
        const written = `if ${obstacle.line.trim().replace(/^if\s+/i, '')}, then I ${obstacle.line2
          .trim()
          .replace(/^then i\s+/i, '')}`;
        return {
          text: `You already wrote the answer: ${endSentence(written)} Do that version, not the big one.`,
          quotedSpans: [obstacle.line.trim(), obstacle.line2.trim()],
          action: next
            ? {
                kind: 'shrink-move',
                moveId: next.id,
                goalId: next.goalId,
                title: next.title,
                minVersion: next.minVersion,
              }
            : null,
        };
      }
      return {
        text: 'Then make it smaller than feels serious. What is the two-minute version you would still be willing to do?',
        quotedSpans: [],
        action: null,
      };
    }
    case 'dont-feel': {
      // A *past* day. Quoting today's own proof line back as "you did not feel
      // like it either" made no sense — they have not had today yet — and the
      // date was printed in its stored form.
      const wentAnyway = ctx.days
        .filter((d) => d.day < ctx.today && d.done > 0 && d.proof?.trim() && isQuotable(d))
        .sort((a, b) => (a.day < b.day ? 1 : -1))[0];
      if (wentAnyway?.proof) {
        const when = formatDay(wentAnyway.day, { weekday: true, today: ctx.today });
        return {
          text: `On ${when} you did not feel like it either, and you wrote ${endSentence(
            `“${wentAnyway.proof.trim()}”`,
          )} Same size today.`,
          quotedSpans: [wentAnyway.proof.trim()],
          action: next
            ? {
                kind: 'shrink-move',
                moveId: next.id,
                goalId: next.goalId,
                title: next.title,
                minVersion: next.minVersion,
              }
            : null,
        };
      }
      return {
        text: 'Feeling like it was never the requirement. What is the smallest piece you would not resent?',
        quotedSpans: [],
        action: null,
      };
    }
    case 'changed':
      return {
        text: 'Tell me what changed and I will lay the week out again tonight. Nothing you built is lost, and nothing you wrote gets overwritten.',
        quotedSpans: [],
        action: null,
      };
    case 'celebrate': {
      const line = ctx.book?.iWill?.trim() || ctx.book?.firstSentence?.trim() || strategy?.line.trim();
      const days = ctx.days.filter((d) => d.sealedAt).length;
      // A return is a gap the person came back from, counted by
      // `detectReturns`. The screen used to pass the sealed-day count in as
      // `returns` too, so this sentence read "12 sealed days and 12 returns"
      // every time, which is not a fact about anybody.
      const returns = ctx.returns > 0 ? ` and ${ctx.returns} ${ctx.returns === 1 ? 'return' : 'returns'}` : '';
      if (line) {
        return {
          text: `${plural(days, 'sealed day')}${returns}. You wrote ${endSentence(`“${line}”`)} Say it out loud; that is the whole exercise.`,
          quotedSpans: [line],
          action: null,
        };
      }
      return {
        text: `${plural(days, 'sealed day')}. Name one thing that is true now that was not in January.`,
        quotedSpans: [],
        action: null,
      };
    }
  }
}

/** Free text: acknowledge, ask, and only then offer. Six turns maximum. */
export function replyToText(text: string, ctx: ChipContext): CoachReply {
  const risk = screen(text);
  if (risk.risk === 'crisis') {
    return { text: '', quotedSpans: [], action: null };
  }
  const { returning, gapDays } = isReturning(ctx.days, ctx.today);
  if (returning) {
    return {
      text: `You have been away ${gapDays} days and you came back, which is the part most people never do. One small thing today.`,
      quotedSpans: [],
      action: null,
    };
  }
  // Without a model behind it the coach can still do the two things it is
  // allowed to do: quote and ask. If what they typed touches a line they wrote
  // — a word of four letters or more in common with a stone — that line comes
  // back to them before the question. Otherwise one of four questions, chosen
  // by the text rather than at random, so the same message gets the same
  // reply and the coach does not look like it is shuffling cards.
  const words = new Set(
    text
      .toLowerCase()
      .split(/[^a-z']+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
  const touched = ctx.analyses.find((a) =>
    a.line
      .toLowerCase()
      .split(/[^a-z']+/)
      .some((w) => w.length >= 4 && words.has(w)),
  );
  const ask = QUESTIONS[hash(text) % QUESTIONS.length]!;
  if (touched && isQuotable(touched)) {
    const line = touched.line.trim();
    return {
      text: `You wrote ${endSentence(`“${line}”`)} ${ask}`,
      quotedSpans: [line],
      action: null,
    };
  }
  return { text: `Say more about that. ${ask}`, quotedSpans: [], action: null };
}

const QUESTIONS = [
  'What would have to be true for the next hour to go differently?',
  'What is the two-minute version of it?',
  'When did it last go the way you wanted, and what was different that day?',
  'What would you tell a friend who said exactly that?',
] as const;

/** Words too common to mean the message is about a particular stone. */
const STOP = new Set([
  'that',
  'this',
  'with',
  'have',
  'just',
  'about',
  'really',
  'want',
  'like',
  'know',
  'think',
  'feel',
  'today',
  'been',
  'will',
  'would',
  'could',
  'should',
  'what',
  'when',
  'there',
  'their',
  'they',
  'them',
  'from',
  'into',
  'some',
  'more',
  'much',
  'very',
  'then',
  'than',
  'also',
  'dont',
  "don't",
  'cant',
  "can't",
]);

/** Small and stable: the same text always lands on the same question. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** The Returns letter (PRD §7.7): quotes the user, never mentions a streak. */
export function returnsLetter(book: BookVersion | null, gapDays: number, returnNumber: number): { body: string; quotes: string[] } {
  const line = book?.iWill?.trim() || book?.firstSentence?.trim();
  const quotes = line ? [line] : [];
  const body = line
    ? `${gapDays} days. Nothing reset while you were gone, and the Book still says ${endSentence(
        `“${line}”`,
      )} Return #${returnNumber}. Most people never come back once. Start with the smallest thing on the list.`
    : `${gapDays} days, and you opened it again. Return #${returnNumber}. Start with the smallest thing on the list.`;
  return { body, quotes };
}

/**
 * The single invitation to the Full track, after the first sealed Book
 * (PRD 7.10). The argument is their own longest line: they already went that
 * deep on one thing, in their own words.
 *
 * Three fields rather than one string, because the screen sets the quotation in
 * the serif and the app's sentence in the sans, and a `slice(0, 120)` cut
 * somebody's word in half - a quotation that ends mid-word reads as a bug in
 * the app rather than as their sentence.
 */
export function fullTrackInvitation(longestLine: string): {
  text: string;
  /** The quotation as it should be printed: their words, cut at a word. */
  quoted: string;
  /** The app's half, which is never set in the serif. */
  ask: string;
  quotes: string[];
} {
  const trimmed = (longestLine ?? '').trim();
  const quoted = firstSentence(trimmed, 120);
  const ask = 'You wrote that much about one of them. Want to go that deep on the rest?';
  return {
    text: `You wrote this much about it: ${endSentence(`“${quoted}”`)} ${ask}`,
    quoted,
    ask,
    quotes: [trimmed],
  };
}
