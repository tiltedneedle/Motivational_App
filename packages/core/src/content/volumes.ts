/**
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
  "heading": "Work on your:",
  "past.line": "Your life in periods, the events that still matter, and what they made of you.",
  "past.time": "Two or three sittings. The longest of the three.",
  "present.line": "What gets in your way, and what you're good at, in plain words.",
  "present.time": "One or two sittings, about twenty minutes a deck.",
  "future.line": "Three to five years out, then the goals, then the plan you live by.",
  "future.time": "Three sittings over two days. Twenty-five minutes, then fifteen, then twenty.",
  "future.badge": "Today comes from here",
  "explore.label": "Not sure? Let's explore.",
  "footer": "Start anywhere. The other two stay open when you're done.",
  "reentry": "You've written one. The other two are here when you want them, and what you wrote stays as it is.",
};

export const EXPLAINER_COPY: Record<string, string> = {
  "heading": "What each one is, and how long it takes.",
  "past.para": "Past cuts your life into a few periods and asks what happened in each that still matters. You choose a handful to go into properly: what happened, what it made of you, and one line you still believe. You decide which join your Book. It is the longest of the three, and the one most people leave until last.",
  "present.para": "Present is two decks of plain statements about how you work. One deck is what gets in your way, the other what you are good at. You pick what sounds like you, then write twice about each pick. About twenty minutes a deck.",
  "future.para": "Future is fifteen minutes of writing about life three to five years on, if things went well. Then you name the goals that are already in what you wrote, and answer five short questions about each one. Out of that comes a plan and a Book you seal. Three sittings over two days.",
  "order.title": "One way through, not the only one.",
  "order.steps": "Present · the faults → Future → Present · the virtues → Past",
  "order.why": "You get sharper about what stops you, then make the plan while that is fresh. Your strengths then have a plan to bring them to.",
  "order.exception": "If the past is what is on your mind, start there.",
  "anyorder": "Any order works. Nothing is locked, and doing one on its own is a whole thing.",
  "choose.title": "Start with whichever one you want.",
};

// ---------------------------------------------------------------- Present

export const FAULT_CARDS_STARTER: PresentCard[] = [
  { id: "f-start-and-drift", text: "I start things and drift.", group: "order" },
  { id: "f-night-before", text: "I leave it until the night before.", group: "order" },
  { id: "f-promise-and-forget", text: "I promise things and then forget them.", group: "order" },
  { id: "f-yes-when-i-mean-no", text: "I say yes when I mean no.", group: "people" },
  { id: "f-everyone-elses-week", text: "Everyone else's week gets planned before mine.", group: "people" },
  { id: "f-say-it-sharper", text: "I say it sharper than I mean it.", group: "people" },
  { id: "f-wait-to-be-asked", text: "I wait to be asked.", group: "drive" },
  { id: "f-run-myself-empty", text: "I keep going until there is nothing left.", group: "drive" },
  { id: "f-replay-conversations", text: "I replay conversations for days.", group: "nerve" },
  { id: "f-rehearse-the-worst", text: "I rehearse how it goes wrong until I stop.", group: "nerve" },
  { id: "f-bored-by-routine", text: "I get bored the moment it becomes routine.", group: "openness" },
  { id: "f-read-instead-of-do", text: "I read about it instead of doing it.", group: "openness" },
];

export const FAULT_CARDS_FULL: PresentCard[] = [
  { id: "f-wait-to-be-asked", text: "I wait to be asked.", group: "drive" },
  { id: "f-leave-without-saying", text: "I stop as soon as it stops being urgent.", group: "drive" },
  { id: "f-aim-low", text: "I aim low so I can't miss.", group: "drive" },
  { id: "f-only-when-watched", text: "I only move when someone is waiting on me.", group: "drive" },
  { id: "f-flat-by-midweek", text: "I run out of steam by Wednesday.", group: "drive" },
  { id: "f-quiet-when-loud", text: "I go quiet when the room gets loud.", group: "drive" },
  { id: "f-hand-it-over", text: "I let someone else take the thing I wanted.", group: "drive" },
  { id: "f-run-myself-empty", text: "I keep going until there is nothing left.", group: "drive" },
  { id: "f-start-and-drift", text: "I start things and drift.", group: "order" },
  { id: "f-night-before", text: "I leave it until the night before.", group: "order" },
  { id: "f-new-plan", text: "I make a new plan instead of finishing the old one.", group: "order" },
  { id: "f-interesting-half", text: "I do the interesting half and leave the rest.", group: "order" },
  { id: "f-ten-minutes-late", text: "I am ten minutes late to most things.", group: "order" },
  { id: "f-promise-and-forget", text: "I promise things and then forget them.", group: "order" },
  { id: "f-work-around-the-pile", text: "I work around the pile instead of clearing it.", group: "order" },
  { id: "f-tidy-instead-of-start", text: "I tidy the desk instead of starting.", group: "order" },
  { id: "f-replay-conversations", text: "I replay conversations for days.", group: "nerve" },
  { id: "f-look-for-bad-news", text: "I go looking for the bad news before bed.", group: "nerve" },
  { id: "f-one-comment", text: "One comment can take the rest of my day.", group: "nerve" },
  { id: "f-stop-at-first-no", text: "I stop at the first no.", group: "nerve" },
  { id: "f-rehearse-the-worst", text: "I rehearse how it goes wrong until I stop.", group: "nerve" },
  { id: "f-snap-when-tired", text: "I snap at people when I am tired.", group: "nerve" },
  { id: "f-dont-open-it", text: "I don't open the thing I'm dreading.", group: "nerve" },
  { id: "f-flat-after-a-win", text: "I go flat right after something goes well.", group: "nerve" },
  { id: "f-yes-when-i-mean-no", text: "I say yes when I mean no.", group: "people" },
  { id: "f-agree-then-resent", text: "I agree in the room and resent it afterwards.", group: "people" },
  { id: "f-everyone-elses-week", text: "Everyone else's week gets planned before mine.", group: "people" },
  { id: "f-say-it-sharper", text: "I say it sharper than I mean it.", group: "people" },
  { id: "f-keep-score", text: "I keep score and never say it out loud.", group: "people" },
  { id: "f-rather-do-it-alone", text: "I'd rather do it alone than ask for help.", group: "people" },
  { id: "f-go-cold", text: "I go cold instead of saying what's wrong.", group: "people" },
  { id: "f-take-over", text: "I take over instead of letting someone else learn.", group: "people" },
  { id: "f-next-idea-better", text: "I daydream through the part I am supposed to be doing.", group: "openness" },
  { id: "f-bored-by-routine", text: "I get bored the moment it becomes routine.", group: "openness" },
  { id: "f-read-instead-of-do", text: "I read about it instead of doing it.", group: "openness" },
  { id: "f-stay-with-known", text: "I pick the job I have already done before.", group: "openness" },
  { id: "f-finish-in-my-head", text: "I finish it in my head and never start it.", group: "openness" },
  { id: "f-no-to-untried", text: "I say no to things before I have tried them.", group: "openness" },
  { id: "f-lost-in-detail", text: "I get lost in the part nobody will notice.", group: "openness" },
  { id: "f-talk-not-decide", text: "I would rather talk it around than decide.", group: "openness" },
];

/** The earliest sign, tapped before the writing: this becomes the If of the if-then. */
export const FAULT_FRAMINGS: PresentFraming[] = [
  { id: "fs-night-before", label: "The night before" },
  { id: "fs-someone-asks", label: "The moment someone else needs something" },
  { id: "fs-time-of-day", label: "The time of day it usually goes" },
  { id: "fs-the-room", label: "The room I am in when it starts" },
];

export const VIRTUE_CARDS_STARTER: PresentCard[] = [
  { id: "v-dr-boring", text: "I can do boring things for a long time.", group: "drive" },
  { id: "v-dr-unwatched", text: "I work the same when nobody is checking.", group: "drive" },
  { id: "v-dr-return", text: "I come back the day after it goes badly.", group: "drive" },
  { id: "v-or-when", text: "If I say a day, it is done by that day.", group: "order" },
  { id: "v-or-small", text: "I keep track of small things other people forget.", group: "order" },
  { id: "v-nv-quiet", text: "When something goes wrong, I get quieter, not louder.", group: "nerve" },
  { id: "v-nv-wrong", text: "I can be told I am wrong without it ruining the day.", group: "nerve" },
  { id: "v-nv-no", text: "I can say no and let someone be annoyed with me.", group: "nerve" },
  { id: "v-pe-told", text: "People tell me things they don't tell other people.", group: "people" },
  { id: "v-pe-listen", text: "I can listen for an hour without turning it back to me.", group: "people" },
  { id: "v-op-apart", text: "I understand things by taking them apart.", group: "openness" },
  { id: "v-op-make", text: "I make things nobody asked for.", group: "openness" },
];

export const VIRTUE_CARDS_FULL: PresentCard[] = [
  { id: "v-dr-boring", text: "I can do boring things for a long time.", group: "drive" },
  { id: "v-dr-after", text: "I get up early for it when I have to.", group: "drive" },
  { id: "v-dr-unwatched", text: "I work the same when nobody is checking.", group: "drive" },
  { id: "v-dr-finish", text: "I finish things nobody is waiting for.", group: "drive" },
  { id: "v-dr-daily", text: "I would rather do a little every day than a lot at once.", group: "drive" },
  { id: "v-dr-start", text: "I start before I feel ready.", group: "drive" },
  { id: "v-dr-worst", text: "I do the worst job on the list first.", group: "drive" },
  { id: "v-dr-return", text: "I come back the day after it goes badly.", group: "drive" },
  { id: "v-or-when", text: "If I say a day, it is done by that day.", group: "order" },
  { id: "v-or-early", text: "I would rather be early and wait.", group: "order" },
  { id: "v-or-small", text: "I keep track of small things other people forget.", group: "order" },
  { id: "v-or-night", text: "I set things out the night before.", group: "order" },
  { id: "v-or-tidy", text: "I leave a place tidier than I found it.", group: "order" },
  { id: "v-or-money", text: "I know roughly what is in my account without looking.", group: "order" },
  { id: "v-or-read", text: "I read the whole thing before I sign it.", group: "order" },
  { id: "v-or-list", text: "I can hold a long list in my head and not drop one.", group: "order" },
  { id: "v-nv-quiet", text: "When something goes wrong, I get quieter, not louder.", group: "nerve" },
  { id: "v-nv-next", text: "In an emergency I do the next thing instead of freezing.", group: "nerve" },
  { id: "v-nv-wrong", text: "I can be told I am wrong without it ruining the day.", group: "nerve" },
  { id: "v-nv-sleep", text: "I can wait until morning to worry about it.", group: "nerve" },
  { id: "v-nv-wait", text: "I can wait for an answer without checking every hour.", group: "nerve" },
  { id: "v-nv-stupid", text: "I can look stupid in front of people and carry on.", group: "nerve" },
  { id: "v-nv-no", text: "I can say no and let someone be annoyed with me.", group: "nerve" },
  { id: "v-nv-hour", text: "A bad hour does not turn into a bad week.", group: "nerve" },
  { id: "v-pe-told", text: "People tell me things they don't tell other people.", group: "people" },
  { id: "v-pe-listen", text: "I can listen for an hour without turning it back to me.", group: "people" },
  { id: "v-pe-quiet", text: "I notice when someone in the room has gone quiet.", group: "people" },
  { id: "v-pe-introduce", text: "I put two people in touch when they should know each other.", group: "people" },
  { id: "v-pe-absent", text: "I speak up for someone who is not in the room.", group: "people" },
  { id: "v-pe-first", text: "I say hello first.", group: "people" },
  { id: "v-pe-score", text: "I do not keep score of who owes me.", group: "people" },
  { id: "v-pe-dates", text: "I remember the dates that matter to other people.", group: "people" },
  { id: "v-op-could", text: "I can see how a thing could be, not just how it is.", group: "openness" },
  { id: "v-op-apart", text: "I understand things by taking them apart.", group: "openness" },
  { id: "v-op-useless", text: "I read about things that are no use to me.", group: "openness" },
  { id: "v-op-make", text: "I make things nobody asked for.", group: "openness" },
  { id: "v-op-mind", text: "I change my mind when the facts change.", group: "openness" },
  { id: "v-op-stop", text: "I stop for things other people walk past.", group: "openness" },
  { id: "v-op-settled", text: "I ask about the part everyone assumed was settled.", group: "openness" },
  { id: "v-op-two", text: "I can hold two ideas that disagree without picking yet.", group: "openness" },
];

export const VIRTUE_FRAMINGS: PresentFraming[] = [
  { id: "vs-quit", label: "A time I nearly quit and didn't" },
  { id: "vs-nobody", label: "A day nobody saw it" },
  { id: "vs-someone", label: "When it was for someone else" },
  { id: "vs-small", label: "A small thing that mattered later" },
];

export const FAULT_COPY: Record<string, string> = {
  "deckQuestion": "What gets in your way?",
  "deckNote": "Pick up to three. These are habits, not a verdict on you. A habit shows itself before it costs you.",
  "writeOnePrompt": "Tell me the time this cost you most. What happened, and what it cost.",
  "writeOneHint": "The day it cost you something",
  "writeTwoPrompt": "Tap the earliest sign you could catch. Then write what you do instead.",
  "writeTwoHint": "The sign, then the answer to it",
  "deckNoteFull": "Tick everything that is plainly true; you narrow it to the nine that matter most next. These are habits, not a verdict on you.",
  "narrowPrompt": "Which of these matter most?",
  "narrowNote": "Keep up to nine. Take one off to let another through.",
  "done": "Each one has a sign to watch for and an answer to it now. They join your Book when it is next sealed.",
  "doneNoBook": "There is no Book yet. One is sealed at the end of Future, and these go into it.",
  "doneNextEdition": "Your Book is sealed already, so these wait for the next edition — one hold away.",
  "heldNote": "This one stays on your phone and out of the Book. It is still yours, and it still exports.",
};

export const VIRTUE_COPY: Record<string, string> = {
  "deckQuestion": "Which of these are true about you?",
  "deckNote": "Pick up to three. Take the ones that are plainly true, not the ones that sound good.",
  "writeOnePrompt": "One time this was true and it mattered. Where you were, what was at stake, and what you did.",
  "writeOneHint": "Two lines: where you were, and what you did",
  "writeTwoPrompt": "Pick the goal that needs this. Then write where you will use it next week.",
  "writeTwoHint": "On ___ I use this to ___",
  "deckNoteFull": "Tick everything that is plainly true, not what sounds good; you narrow it to the nine that matter most next.",
  "narrowPrompt": "Which of these matter most?",
  "narrowNote": "Keep up to nine. Take one off to let another through.",
  "done": "Each one has a time it mattered and a place to use it next week. They join your Book when it is next sealed.",
  "doneNoBook": "There is no Book yet. One is sealed at the end of Future, and these go into it.",
  "doneNextEdition": "Your Book is sealed already, so these wait for the next edition — one hold away.",
  "doneNoGoal": "When you name your goals in Future, each of these can be paired with the one that needs it.",
  "writeTwoPromptNoGoal": "Where will you use this next week?",
  "heldNote": "This one stays on your phone and out of the Book. It is still yours, and it still exports.",
};

// ---------------------------------------------------------------- Past

export const PAST_COPY: Record<string, string> = {
  "door.title": "Past",
  "join.crisisNote": "This one stays on your phone and out of the Book. It is still yours, and it still exports.",
  "door.body": "Your life in periods, the events in each that still matter, and what each one made of you.",
  "door.time": "Two or three sittings. The longest of the three.",
  "doorway.title": "This one asks about things that happened.",
  "doorway.body": "You will cut your life into a few periods, name the events in each that still matter, and write about what a few of them made of you. Some of it may be hard to be near. You choose afterwards which of them join your Book. You can stop at any point, and nothing you have written is lost.",
  "doorway.note": "Morrow is not therapy. Need someone? sits on every screen here. The lines behind it are free and answered by people.",
  "doorway.begin": "Begin",
  "doorway.later": "Another time",
  "age.prompt": "How old are you?",
  "age.note": "Only so the periods below are yours and not a stranger’s. It is kept on this device.",
  "epochs.title": "Your life, in periods.",
  "epochs.note": "These are cut from your age. Rename any of them to what you would call it.",
  "events.prompt": "What happened in this one that still matters?",
  "events.note": "Short titles, the way you would say them out loud. One that helped or one that hurt — both count.",
  "events.helped": "It helped",
  "events.hurt": "It hurt",
  "events.add": "Add an event",
  "events.empty": "Nothing from this period is fine. Leave it and move on.",
  "events.needOne": "Name at least one event before going on, or leave this for another time.",
  "events.needWords": "Give it a few words first.",
  "choose.prompt": "Which of these do you want to go into?",
  "choose.note": "Pick the ones that still have weight. You write about these; the rest stay as titles.",
  "analyse.one.prompt": "What happened?",
  "analyse.one.hint": "Plainly, as it went. Not as you would defend it.",
  "analyse.two.prompt": "What did it make of you?",
  "analyse.two.hint": "How you are different now because that happened. Good and bad both count.",
  "analyse.three.prompt": "One line to close it. What you took from that and still believe, or what you would say to the version of you who was there.",
  "analyse.three.hint": "One sentence, in your own words — it does not have to be tidy.",
  "analyse.framings": "What that moment taught me | What I decided about myself that day | What I would tell the person I was | What I know now that would have helped then",
  "join.question": "Does this one join your Book? It stays yours either way, and you can change this before the Book is sealed.",
  "join.yes": "Let it join the Book",
  "join.no": "Keep this one to myself",
  "join.parts": "All three parts go in as they are written here.",
  "join.change": "Change this",
  "join.noBook": "There is no Book yet. One is sealed at the end of Future, and what you let join goes into the first one.",
  "join.nextEdition": "Your Book is sealed already, so what you let join waits for the next edition — one hold away.",
};

/** The ways in to the last line of an analysed event. */
export const PAST_FRAMINGS: PresentFraming[] = (PAST_COPY['analyse.framings'] ?? '')
  .split(' | ')
  .map((label, i) => ({ id: `pf-${i}`, label }));
