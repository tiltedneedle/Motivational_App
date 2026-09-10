/**
 * The Coach (PRD §7.9).
 *
 * The coach quotes before it suggests. Every brief carries at least one span of
 * the user's own writing, and every reply to a chip is built around the user's
 * own if-then or their own sentence. It never writes a goal or a plan line.
 */
import type { Brief, BookVersion, DaySummary, GoalAnalysis, Move, Persona } from '../types';
import { isReturning } from './consistency';
import { isQuotable, screen } from './safety';

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
}

const REGISTER: Record<Persona, { open: (s: string) => string; push: (s: string) => string }> = {
  gentle: {
    open: (s) => s,
    push: (s) => `When you're ready: ${s}`,
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

/** The line the day opens with: the user's own first sentence, in quotation marks. */
export function openingQuote(book: BookVersion | null): string | null {
  const s = book?.firstSentence?.trim();
  return s ? `“${s}”` : null;
}

export function buildDawnBrief(input: BriefInput, newId: (p: string) => string): Brief {
  const { yesterday, moves, analyses, persona, book } = input;
  const reg = REGISTER[persona];
  const quotes: string[] = [];

  const quote = openingQuote(book);
  if (book?.firstSentence) quotes.push(book.firstSentence);

  // Yesterday: evidence, never blame.
  let yesterdayLine: string;
  if (!yesterday || (yesterday.done === 0 && yesterday.evidenceCount === 0)) {
    yesterdayLine = 'Quiet day yesterday. It is still in the ledger as a quiet day, not a failure.';
  } else {
    const bits: string[] = [];
    bits.push(`${yesterday.done} of ${Math.max(yesterday.planned, yesterday.done)} moves`);
    // Only if the screen did not flag it. The dawn brief is read over
    // breakfast, and this is exactly the sentence that must not come back.
    if (yesterday.proof?.trim() && isQuotable(yesterday)) {
      bits.push(`and you wrote “${yesterday.proof.trim()}”`);
      quotes.push(yesterday.proof.trim());
    }
    const delta = input.score - input.previousScore;
    const trend = delta > 0 ? `Consistency ${input.score}, up from ${input.previousScore}.` : `Consistency ${input.score}.`;
    yesterdayLine = `${bits.join(' ')}. ${trend}`;
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
    createdAt: new Date().toISOString(),
  };
}

function lowerFirst(s: string): string {
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
  action: {
    kind: 'add-move';
    goalId: string;
    title: string;
    minVersion: string | null;
    sourceLineId: string;
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
        return {
          text: `You already wrote the answer: if ${obstacle.line.trim().replace(/^if\s+/i, '')}, then you ${obstacle.line2.trim().replace(/^then i\s+/i, '')}. Do that version, not the big one.`,
          quotedSpans: [obstacle.line.trim(), obstacle.line2.trim()],
          action: next
            ? {
                kind: 'add-move',
                goalId: next.goalId,
                title: next.title,
                minVersion: next.minVersion,
                sourceLineId: next.sourceLineId,
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
      const wentAnyway = ctx.days
        .filter((d) => d.done > 0 && d.proof?.trim() && isQuotable(d))
        .sort((a, b) => (a.day < b.day ? 1 : -1))[0];
      if (wentAnyway?.proof) {
        return {
          text: `On ${wentAnyway.day} you did not feel like it either, and you wrote “${wentAnyway.proof.trim()}”. Same size today.`,
          quotedSpans: [wentAnyway.proof.trim()],
          action: next
            ? {
                kind: 'add-move',
                goalId: next.goalId,
                title: next.title,
                minVersion: next.minVersion,
                sourceLineId: next.sourceLineId,
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
          text: `${days} sealed days${returns}. You wrote “${line}”. Say it out loud; that is the whole exercise.`,
          quotedSpans: [line],
          action: null,
        };
      }
      return { text: `${days} sealed days. Name one thing that is true now that was not in January.`, quotedSpans: [], action: null };
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
  return {
    text: 'Say more about that. What would have to be true for the next hour to go differently?',
    quotedSpans: [],
    action: null,
  };
}

/** The Returns letter (PRD §7.7): quotes the user, never mentions a streak. */
export function returnsLetter(book: BookVersion | null, gapDays: number, returnNumber: number): { body: string; quotes: string[] } {
  const line = book?.iWill?.trim() || book?.firstSentence?.trim();
  const quotes = line ? [line] : [];
  const body = line
    ? `${gapDays} days. Nothing reset while you were gone, and the Book still says “${line}”. Return #${returnNumber}. Most people never come back once. Start with the smallest thing on the list.`
    : `${gapDays} days, and you opened it again. Return #${returnNumber}. Start with the smallest thing on the list.`;
  return { body, quotes };
}

/** The single invitation to the Full track, after the first sealed Book. */
export function fullTrackInvitation(longestLine: string): { text: string; quotes: string[] } {
  const trimmed = longestLine.trim();
  return {
    text: `You wrote this much about it: “${trimmed.slice(0, 120)}${trimmed.length > 120 ? '…' : ''}”. Want to go that deep on the rest?`,
    quotes: [trimmed],
  };
}
