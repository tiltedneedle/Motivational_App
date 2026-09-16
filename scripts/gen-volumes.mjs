/**
 * Emit packages/core/src/content/volumes.ts from the drafted copy, with the
 * Past volume rewritten for the epoch structure the source actually uses.
 */
import fs from 'node:fs';

const d = JSON.parse(fs.readFileSync('C:/Users/HP/AppData/Local/Temp/claude/C--Users-HP-Downloads-JOB2-Motivation-APP/a856f6cd-d120-4f6c-945b-92f95af58ee2/scratchpad/drafts.json', 'utf8'));
const faults = d['draft:faults-deck'];
const virtues = d['draft:virtues-deck'];
const chooser = Object.fromEntries(d['draft:chooser'].strings.map((s) => [s.key, s.text]));
const explainer = Object.fromEntries(d['draft:explainer'].strings.map((s) => [s.key, s.text]));
const past = Object.fromEntries(d['draft:past-copy'].strings.map((s) => [s.key, s.text]));

// ---- the Past volume, rewritten for periods rather than two memories.
const PAST = {
  'door.title': 'Past',
  // The critic's catch: a flagged line never reaches the Book, so the promise
  // "you choose" has one exception and the app has to say it rather than
  // quietly override the choice.
  'join.crisisNote': 'This one stays on your phone and out of the Book. It is still yours, and it still exports.',
  'door.body': 'Your life in periods, the events in each that still matter, and what each one made of you.',
  'door.time': 'Two or three sittings. The longest of the three.',
  'doorway.title': 'This one asks about things that happened.',
  'doorway.body':
    past['doorway.body']
      .replace(
        'You will write about two things that actually happened: how this started, and a time it came apart.',
        'You will cut your life into a few periods, name the events in each that still matter, and write about what a few of them made of you.',
      )
      .replace('whether a memory joins your Book', 'which of them join your Book'),
  'doorway.note': 'Morrow is not therapy. Need someone? sits on every screen here. The lines behind it are free and answered by people.',
  'doorway.begin': 'Begin',
  'doorway.later': past['doorway.later'],
  // the three moves
  'age.prompt': 'How old are you?',
  'age.note': 'Only so the periods below are yours and not a stranger’s. It is kept on this device.',
  'epochs.title': 'Your life, in periods.',
  'epochs.note': 'These are cut from your age. Rename any of them to what you would call it.',
  'events.prompt': 'What happened in this one that still matters?',
  'events.note': 'Short titles, the way you would say them out loud. One that helped or one that hurt — both count.',
  'events.helped': 'It helped',
  'events.hurt': 'It hurt',
  'events.add': 'Add an event',
  'events.empty': 'Nothing from this period is fine. Leave it and move on.',
  'events.needOne': 'Name at least one event before going on, or leave this for another time.',
  'events.needWords': 'Give it a few words first.',
  'choose.prompt': 'Which of these do you want to go into?',
  'choose.note': 'Pick the ones that still have weight. You write about these; the rest stay as titles.',
  'analyse.one.prompt': 'What happened?',
  'analyse.one.hint': 'Plainly, as it went. Not as you would defend it.',
  'analyse.two.prompt': 'What did it make of you?',
  'analyse.two.hint': 'How you are different now because that happened. Good and bad both count.',
  'analyse.three.prompt': past['close.prompt'],
  'analyse.three.hint': past['close.hint'],
  // Four, like every other framing set in the app: the fifth was two ideas
  // bolted together and overlapped the first.
  'analyse.framings': past['close.framings'].split(' | ').filter((x) => !/carried since/i.test(x)).join(' | '),
  'join.question': past['join.question'].replace('Does this memory join', 'Does this one join'),
  'join.yes': past['join.yes'],
  'join.no': past['join.no'],
  // The Book question decides on all three parts, so all three are printed.
  'join.parts': 'All three parts go in as they are written here.',
  'join.change': 'Change this',
  // Whether there is a Book for it to join, said plainly either way.
  'join.noBook': 'There is no Book yet. One is sealed at the end of Future, and what you let join goes into the first one.',
  'join.nextEdition': 'Your Book is sealed already, so what you let join waits for the next edition — one hold away.',
};

// the chooser's Past lines, for the epoch flow, and the client's own wording for door four
const CHOOSER = {
  ...chooser,
  'past.line': 'Your life in periods, the events that still matter, and what they made of you.',
  'past.time': 'Two or three sittings. The longest of the three.',
  // The client's own wording, kept.
  'explore.label': "Not sure? Let's explore.",
  'present.time': 'One or two sittings, about twenty minutes a deck.',
  'future.time': 'Three sittings over two days. Twenty-five minutes, then fifteen, then twenty.',
  'reentry': "You've written one. The other two are here when you want them, and what you wrote stays as it is.",
};

const EXPLAINER = {
  ...explainer,
  'present.para':
    'Present is two decks of plain statements about how you work. One deck is what gets in your way, the other what you are good at. You pick what sounds like you, then write twice about each pick. About twenty minutes a deck.',
  'future.para':
    'Future is fifteen minutes of writing about life three to five years on, if things went well. Then you name the goals that are already in what you wrote, and answer five short questions about each one. Out of that comes a plan and a Book you seal. Three sittings over two days.',
  'order.why':
    'You get sharper about what stops you, then make the plan while that is fresh. Your strengths then have a plan to bring them to.',
  'order.exception': 'If the past is what is on your mind, start there.',
  'anyorder': 'Any order works. Nothing is locked, and doing one on its own is a whole thing.',
  'past.para':
    'Past cuts your life into a few periods and asks what happened in each that still matters. You choose a handful to go into properly: what happened, what it made of you, and one line you still believe. You decide which join your Book. It is the longest of the three, and the one most people leave until last.',
};

// ---- the critic's fixes, applied. Only those that survive the epoch design
// (the drafts were written before the source's real Past flow was read) and
// the client's own wording for the heading and door four.

// Four framings, never more: PRD §11.3's schema is 3..4 and every set in
// framings.ts is four. Seven turns a hand on the shoulder into a menu.
const KEEP_FAULT_FRAMINGS = ['fs-night-before', 'fs-someone-asks', 'fs-time-of-day', 'fs-the-room'];
const KEEP_VIRTUE_FRAMINGS = ['vs-quit', 'vs-nobody', 'vs-someone', 'vs-small'];
faults.framings = faults.framings.filter((f) => KEEP_FAULT_FRAMINGS.includes(f.id));
virtues.framings = virtues.framings.filter((f) => KEEP_VIRTUE_FRAMINGS.includes(f.id));

// Cards that were the same card twice, or dispositional enough to read like a
// questionnaire item rather than something a person says.
const CARD_FIXES = {
  'f-next-idea-better': 'I daydream through the part I am supposed to be doing.',
  'f-stay-with-known': 'I pick the job I have already done before.',
  'f-leave-without-saying': 'I stop as soon as it stops being urgent.',
  'v-dr-after': 'I get up early for it when I have to.',
  'v-or-early': 'I would rather be early and wait.',
  'v-nv-sleep': 'I can wait until morning to worry about it.',
};
const fixCards = (list) => list.map((c) => (CARD_FIXES[c.id] ? { ...c, text: CARD_FIXES[c.id] } : c));
faults.starter = fixCards(faults.starter);
faults.full = fixCards(faults.full);
virtues.starter = fixCards(virtues.starter);
virtues.full = fixCards(virtues.full);

// The app states what it is. It never defends itself against a charge nobody
// made — naming "diagnosis" or "assessment" is what puts the word in a
// reader's head.
faults.prompts.deckNote = 'Pick up to three. These are habits, not a verdict on you. A habit shows itself before it costs you.';
faults.prompts.writeOneHint = 'The day it cost you something';
faults.prompts.writeTwoHint = 'What you do instead';
virtues.prompts.deckNote = 'Pick up to three. Take the ones that are plainly true, not the ones that sound good.';
virtues.prompts.writeTwoPrompt = 'Pick the goal that needs this. Then write where you will use it next week.';
virtues.prompts.writeTwoHint = 'On ___ I use this to ___';

// Full's deck takes everything that is plainly true and the narrowing is its
// own step, as the source has it; Starter's deck stops at three, and that is
// the narrowing. The note has to say which it is doing.
faults.prompts.deckNoteFull = 'Tick everything that is plainly true; you narrow it to the nine that matter most next. These are habits, not a verdict on you.';
virtues.prompts.deckNoteFull = 'Tick everything that is plainly true, not what sounds good; you narrow it to the nine that matter most next.';
faults.prompts.narrowPrompt = 'Which of these matter most?';
virtues.prompts.narrowPrompt = 'Which of these matter most?';
faults.prompts.narrowNote = 'Keep up to nine. Take one off to let another through.';
virtues.prompts.narrowNote = 'Keep up to nine. Take one off to let another through.';

// The closing lines say only what is true today: the picks join the Book.
// Nothing yet pairs a fault's answer with a goal, and the coach does not read
// these — the old lines claimed both.
faults.prompts.done = 'Each one has a sign to watch for and an answer to it now. They join your Book when it is next sealed, and each answer is offered on a goal\u2019s Obstacles stone, for you to put under the goal it belongs to.';
virtues.prompts.done = 'Each one has a time it mattered and a place to use it next week. They join your Book when it is next sealed, and each sits on the page of the goal you paired it with.';
// Which is one of two very different things, and the screen says which.
faults.prompts.doneNoBook = 'There is no Book yet. One is sealed at the end of Future, and these go into it.';
virtues.prompts.doneNoBook = faults.prompts.doneNoBook;
faults.prompts.doneNextEdition = 'Your Book is sealed already, so these wait for the next edition — one hold away.';
virtues.prompts.doneNextEdition = faults.prompts.doneNextEdition;
virtues.prompts.doneNoGoal = 'When you name your goals in Future, each of these can be paired with the one that needs it.';
// With no goals yet there is nothing to pick, so the prompt must not ask.
virtues.prompts.writeTwoPromptNoGoal = 'Where will you use this next week?';
// A line written in crisis is kept, and kept out of the Book, and the screen
// says so rather than announcing "Kept." as if nothing had happened.
faults.prompts.heldNote = 'This one stays on your phone and out of the Book. It is still yours, and it still exports.';
virtues.prompts.heldNote = faults.prompts.heldNote;

const q = (s) => JSON.stringify(s);
const cards = (list) => list.map((c) => `  { id: ${q(c.id)}, text: ${q(c.text)}, group: ${q(c.group)} },`).join('\n');
const framings = (list) => list.map((f) => `  { id: ${q(f.id)}, label: ${q(f.label)} },`).join('\n');
const strings = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `  ${q(k)}: ${q(v)},`)
    .join('\n');

const out = `/**
 * The words of the three volumes.
 *
 * Cards are plain first-person sentences a person would say about themselves.
 * No trait is named, no factor is named, nothing is scored, and none of this is
 * a questionnaire item: every line here is Morrow's own. The five groups are
 * internal, used only to section a long deck, and are never rendered.
 *
 * Kept apart from the engines so the rules can be read without wading through
 * copy, and so the copy can be read — and argued with — on its own.
 */
import type { PresentCard, PresentFraming } from '../engines/present';

// ---------------------------------------------------------------- the chooser

export const CHOOSER_COPY: Record<string, string> = {
${strings(CHOOSER)}
};

export const EXPLAINER_COPY: Record<string, string> = {
${strings(EXPLAINER)}
};

// ---------------------------------------------------------------- Present

export const FAULT_CARDS_STARTER: PresentCard[] = [
${cards(faults.starter)}
];

export const FAULT_CARDS_FULL: PresentCard[] = [
${cards(faults.full)}
];

/** The earliest sign, tapped before the writing: this becomes the If of the if-then. */
export const FAULT_FRAMINGS: PresentFraming[] = [
${framings(faults.framings)}
];

export const VIRTUE_CARDS_STARTER: PresentCard[] = [
${cards(virtues.starter)}
];

export const VIRTUE_CARDS_FULL: PresentCard[] = [
${cards(virtues.full)}
];

export const VIRTUE_FRAMINGS: PresentFraming[] = [
${framings(virtues.framings)}
];

export const FAULT_COPY: Record<string, string> = {
${strings({ ...faults.prompts, writeTwoPrompt: 'Tap the earliest sign you could catch. Then write what you do instead.', writeTwoHint: 'The sign, then the answer to it' })}
};

export const VIRTUE_COPY: Record<string, string> = {
${strings(virtues.prompts)}
};

// ---------------------------------------------------------------- Past

export const PAST_COPY: Record<string, string> = {
${strings(PAST)}
};

/** The ways in to the last line of an analysed event. */
export const PAST_FRAMINGS: PresentFraming[] = (PAST_COPY['analyse.framings'] ?? '')
  .split(' | ')
  .map((label, i) => ({ id: \`pf-\${i}\`, label }));
`;

fs.mkdirSync('packages/core/src/content', { recursive: true });
fs.writeFileSync('packages/core/src/content/volumes.ts', out.replace(/\n/g, '\r\n'));
console.log('wrote packages/core/src/content/volumes.ts');
console.log('faults', faults.starter.length, '/', faults.full.length, '| virtues', virtues.starter.length, '/', virtues.full.length);
