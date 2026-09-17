/**
 * The golden set (PRD §11.8): forty synthetic profiles, personas × domains ×
 * both tracks, each with enough of a Future volume to seal a Book.
 *
 * Four writers, five parts of a life, two depths. The four voices are
 * deliberately unlike one another — a nurse who writes in long commas, a
 * developer in short lines and numbers, a retired teacher in semicolons and
 * no contractions, a driver in run-ons and ellipses — because the engines
 * quote people, and the ways people write are the cases. Every word below is
 * invented; nothing here is anybody's.
 *
 * The Starter profile of each pair carries the lines alone; the Full profile
 * adds the paragraphs and the shadow, which is what the Full track adds.
 */
import type { AnalysisKind, DepthTrack, DomainId, Persona } from '../src/types';

export interface GoldenStone {
  kind: AnalysisKind;
  line: string;
  /** The "then I…" half, on obstacles. */
  line2?: string;
  /** The Full track's paragraph behind the line. */
  paragraph?: string;
}

export interface GoldenGoal {
  title: string;
  domain: DomainId;
  horizon: string;
  targetDate: string | null;
  stones: GoldenStone[];
}

export interface GoldenBase {
  id: string;
  writer: 'priya' | 'marcus' | 'rosalind' | 'tomas';
  /** The coach register this writer chose in Settings. */
  persona: Persona;
  firstName: string;
  domain: DomainId;
  ideal: string;
  shadow: string;
  iWill: string;
  title: string;
  goals: GoldenGoal[];
  /** Ledger lines in their own words: what they wrote at a seal, or captured. */
  evidence: { kind: 'seal' | 'capture'; text: string }[];
}

export interface GoldenProfile extends GoldenBase {
  track: DepthTrack;
}

const g = (
  title: string,
  domain: DomainId,
  horizon: string,
  targetDate: string | null,
  stones: [GoldenStone, GoldenStone, GoldenStone, GoldenStone, GoldenStone],
): GoldenGoal => ({ title, domain, horizon, targetDate, stones });

const motives = (line: string, paragraph?: string): GoldenStone => ({ kind: 'motives', line, ...(paragraph ? { paragraph } : {}) });
const impact = (line: string, paragraph?: string): GoldenStone => ({ kind: 'impact', line, ...(paragraph ? { paragraph } : {}) });
const strategies = (line: string, paragraph?: string): GoldenStone => ({ kind: 'strategies', line, ...(paragraph ? { paragraph } : {}) });
const obstacles = (line: string, line2: string, paragraph?: string): GoldenStone => ({ kind: 'obstacles', line, line2, ...(paragraph ? { paragraph } : {}) });
const monitoring = (line: string, paragraph?: string): GoldenStone => ({ kind: 'monitoring', line, ...(paragraph ? { paragraph } : {}) });

// ------------------------------------------------------------------ Priya
// 34, community nurse on rotating nights, two daughters. Long sentences,
// commas, British spellings, times with a dot.

const PRIYA: GoldenBase[] = [
  {
    id: 'priya-health',
    writer: 'priya',
    persona: 'gentle',
    firstName: 'Priya',
    domain: 'health',
    ideal:
      "It's a Sunday in March and I'm home from the long run before the girls are awake, wet through and pleased about it. I want to be someone who runs three mornings a week without negotiating, the way I make my tea. My knees don't ache on the stairs at work any more. I've stopped saying I'm too tired after nights, because I sleep properly now, in the dark, with the phone in the kitchen. The half marathon is done and the number from my bib is on the fridge. I want the girls to see their mum do a hard thing on purpose. Money is calmer too, but that's another page. Mostly I want the mornings back.",
    shadow:
      "The version I'm afraid of is the one where I keep saying next year. The knees go properly, the girls learn that tired is a reason, and I'm forty-five and out of breath on the ward stairs, telling patients to look after themselves.",
    iWill: 'I will lace the left shoe first.',
    title: 'The mornings back',
    goals: [
      g('Half marathon in March', 'health', 'Six months', '2027-03-14', [
        motives(
          "Because I've said next year four years running and my knees are not getting younger.",
          'I keep a list of reasons in my head and they are all excuses with a uniform on. The truth is that I liked who I was when I ran, and I have not been her since the girls were small.',
        ),
        impact("If it works, the girls see me lace up on a wet Tuesday and go anyway; if it doesn't, I keep telling them to be brave from the sofa."),
        strategies(
          'Tuesday, Thursday and Saturday at 6.40, out the back door before the kettle boils',
          'Tuesday and Thursday are the short ones, thirty minutes round the reservoir loop from the back door. Saturday is the long one, and it gets ten minutes longer every fortnight until March. I lay the kit out on the landing the night before so there is nothing to decide at 6.40.',
        ),
        obstacles("it's raining at 6.40", 'then I put the kit on anyway and walk the first five minutes'),
        monitoring('Three runs logged in the ledger each week, with the distance, checked on Sunday night'),
      ]),
      g('Sleep after nights', 'mind', 'Three months', '2026-12-17', [
        motives('Because a night shift is survivable and a week of them on four hours is not.'),
        impact('If it works I stop snapping at the girls on my first day off.'),
        strategies('After a night shift, blackout blind down and the phone in the kitchen by 9.15 am, every time'),
        obstacles('I lie there replaying the shift', 'then I write the three worst bits on the pad by the bed and turn over'),
        monitoring('Hours slept after each night shift, written on the calendar the same day'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: "Ran the loop in the rain and didn't hate it." },
      { kind: 'capture', text: 'Left the phone in the kitchen. Slept till two.' },
    ],
  },
  {
    id: 'priya-money',
    writer: 'priya',
    persona: 'gentle',
    firstName: 'Priya',
    domain: 'money',
    ideal:
      "It's the first of the month and I don't flinch when the rent goes out, because there is a separate account with three months of it sitting quietly. I want to be someone who knows the balance without checking, who says no to the extra shift because the sums already work. I've stopped buying the girls things to make up for the nights. We go to my mum's on Sundays instead. I want to open the banking app on a Tuesday and feel nothing at all. That's the whole dream, honestly: a boring Tuesday with money in it.",
    shadow:
      "If I keep going as I am, I'm fifty and still picking up bank shifts to cover a boiler, still buying peace with things from the big shop, and the girls have learnt that money is something you worry about in the car.",
    iWill: 'I will look at the balance on Tuesdays.',
    title: 'A boring Tuesday',
    goals: [
      g('Three months of rent put by', 'money', 'A year', '2027-09-01', [
        motives("Because the boiler went in January and I took six extra nights to pay for it, and I don't want to do that again."),
        impact("If it works, an emergency is an inconvenience; if it doesn't, every broken thing costs me a week of sleep."),
        strategies(
          'On payday, £250 goes to the rent account by standing order at 7 am before I can see it',
          'The standing order is set for the morning of payday so the money is gone before I have looked. On the last Sunday of the month I sit at the kitchen table with a cup of tea and the app and write the new balance on the calendar, and that is the whole ritual.',
        ),
        obstacles('the big shop comes to more than £90', 'then I put the girls’ treats back and buy the same thing at the market on Saturday'),
        monitoring('The rent account balance written on the calendar on the last Sunday of every month'),
      ]),
      g('No extra shifts this winter', 'mind', 'Three months', '2026-12-20', [
        motives('Because I say yes to the bank shift before I have thought about it, and then I am tired for a week.'),
        impact('If it works I have Sundays; if not, the winter goes past in a uniform.'),
        strategies('When the bank shift text comes, I wait until the next morning at 8 am before answering, at the kitchen table'),
        obstacles('the text says they are desperate', 'then I say I will check the rota and answer tomorrow, and I do'),
        monitoring('Extra shifts counted on the calendar each month; the number I want is zero'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Standing order went out. Did not look until Sunday.' },
      { kind: 'capture', text: 'Said no to the Saturday night shift. Felt sick, then fine.' },
    ],
  },
  {
    id: 'priya-craft',
    writer: 'priya',
    persona: 'gentle',
    firstName: 'Priya',
    domain: 'craft',
    ideal:
      "It's next summer and the quilt is on the girls' bed, all the squares from their old school dresses and my mum's saris, finished and washed and slightly crooked. I want to be someone who makes things with her hands again, who has a Wednesday evening that is hers. The sewing machine lives on the table in the box room, not in the loft. I've learnt to piece the corners properly from the videos, and I've stopped starting things I never finish. I want to give the quilt to them and say I made this while you were asleep.",
    shadow:
      "The other road is the loft. The machine stays in its box, the squares stay in a bag, and one day the girls find them and I have to explain that I meant to.",
    iWill: 'I will thread the machine on Wednesdays.',
    title: 'While you were asleep',
    goals: [
      g('Finish the quilt', 'craft', 'A year', '2027-07-01', [
        motives(
          'Because the squares have been in a bag since 2022 and my mum asks about them every visit.',
          'She gave me the saris to cut, which she did not have to do, and every time she asks I feel the bag in the cupboard like a stone. I want to answer her with the quilt.',
        ),
        impact("If it works, the girls sleep under their own childhood; if it doesn't, the bag goes in the loft with everything else I meant to do."),
        strategies(
          'Wednesday evenings from 8 pm at the box-room table, one row of squares pieced before bed',
          'Wednesday at 8 pm, after the girls are down, at the table in the box room with the machine already threaded from the week before. One row of nine squares, pressed and pinned, and I stop when the row is done even if I want to go on, so that I want to come back.',
        ),
        obstacles('the girls are still up at 8', 'then I cut squares at the kitchen table instead and sew on Thursday'),
        monitoring('Rows finished, counted on the pad taped inside the machine lid, one tick a row'),
      ]),
      g('Play the guitar again', 'craft', 'Six months', '2027-03-01', [
        motives('Because it is on the wall where I can see it from the table and I have not tuned it since the wedding.'),
        impact('If it works there is music in the house that is not from a phone.'),
        strategies('Ten minutes on the guitar on Sunday mornings at 8 am, at the kitchen table, before anyone is down'),
        obstacles("my fingers hurt after two minutes", 'then I play the one song I know slowly and stop at the end of it'),
        monitoring('Sundays played, ticked on the fridge calendar with a G'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'One row done. The corners nearly meet.' },
      { kind: 'capture', text: 'Tuned the guitar. It sounded terrible and I loved it.' },
    ],
  },
  {
    id: 'priya-mind',
    writer: 'priya',
    persona: 'gentle',
    firstName: 'Priya',
    domain: 'mind',
    ideal:
      "It's a Tuesday in the autumn and I sit in the car for ten minutes before the shift with the engine off and nothing playing. I want to be someone who is not already spiralling by the time she swipes in. My phone is not in my hand at the traffic lights. I've stopped reading the handover on the toilet. I sleep in the dark and I wake up before the alarm, and the first thing I think is not the rota. I want the girls to have a mum who is in the room when she is in the room. Calm, mostly. Not always. Mostly would be enough.",
    shadow:
      "The other version is the one where I am forty and my jaw hurts from clenching and I have shouted at the girls for something that was the rota's fault, and I still cannot say what I was worrying about.",
    iWill: 'I will sit in the car for ten minutes.',
    title: 'In the room',
    goals: [
      g('Ten quiet minutes before every shift', 'mind', 'Three months', '2026-12-17', [
        motives('Because I arrive at the ward already at the end of my rope and the shift has not started.'),
        impact("If it works, the first patient gets the nurse I meant to be; if it doesn't, they get the one from the car park."),
        strategies(
          'In the staff car park at 6.45 am, engine off, phone in the glove box, ten minutes of breathing before I swipe in',
          'I park in the far corner by the hedge at 6.45 where nobody knocks on the window. Phone in the glove box, seat back a notch, ten breaths counted on my fingers and then just sitting until the clock says 6.55. The rule is that the shift does not exist until I open the door.',
        ),
        obstacles('I am running late and want to skip it', 'then I do three minutes instead of ten and still put the phone away'),
        monitoring('Ten-minute sits ticked on the rota printout in my locker, one tick a shift'),
      ]),
      g('Walk the reservoir on days off', 'health', 'Three months', '2026-12-17', [
        motives('Because a day off on the sofa is not a day off, it is a longer shift with the telly on.'),
        impact('If it works I come back to the ward with something to say that is not about the ward.'),
        strategies('Every day off, out of the door by 10 am for the reservoir loop, 40 minutes, with the girls on weekends'),
        obstacles('it is pouring', 'then I walk to the corner shop and back with the big umbrella'),
        monitoring('Loops walked, written on the fridge calendar with the time out and the time back'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Sat in the car. Ten minutes felt like an hour and then it felt like nothing.' },
      { kind: 'capture', text: 'Walked the loop with the girls. Nobody cried, including me.' },
    ],
  },
  {
    id: 'priya-people',
    writer: 'priya',
    persona: 'gentle',
    firstName: 'Priya',
    domain: 'people',
    ideal:
      "It's a Sunday next spring and we are at my mum's, all of us, and I am not looking at my phone under the table. I want to be someone who calls her mum on Wednesdays because she wants to, not because she feels bad. The girls know their cousins' names. My sister and I have stopped keeping score. I want to be at the table for the whole meal, and to drive home slowly, and to remember what everyone said. I've learnt to leave work at work. I want my mum to say I have been around more, and for it to be true.",
    shadow:
      "The other road is that my mum gets older on the phone in short calls I make in the car, and the girls grow up thinking family is something you visit at Christmas, and my sister and I say we must do this more often at a funeral.",
    iWill: 'I will call Mum on Wednesdays.',
    title: 'At the table',
    goals: [
      g('Sunday dinners at Mum’s', 'people', 'Six months', '2027-03-21', [
        motives('Because she is seventy-one and I count the Sundays I have missed more than the ones I made.'),
        impact("If it works, the girls remember her kitchen; if it doesn't, they remember the car."),
        strategies(
          'Every Sunday I am not on shift, at Mum’s by 1 pm with a pudding, phone in the coat pocket in the hall',
          'The rota comes out on a Friday, and that afternoon I text Mum the Sundays I am off so they are hers before anything else claims them. We leave the house at 12.30 with a pudding from the freezer. My phone goes in my coat in her hall, and the coat stays in the hall.',
        ),
        obstacles('I have had a run of nights and want to hide', 'then I go for the meal and leave straight after, and that still counts'),
        monitoring('Sundays at Mum’s, ticked on her calendar in her kitchen, by her'),
      ]),
      g('Christmas paid for by November', 'money', 'Three months', '2026-11-30', [
        motives('Because last January was paid for in February and March and I resented every present.'),
        impact('If it works, December is a month and not a bill.'),
        strategies('£60 into the Christmas pot on the 1st and 15th of every month, moved from the kitchen table on payday morning'),
        obstacles('the girls ask for something big', 'then I write it on the list on the fridge and we look at the pot together on the 15th'),
        monitoring('The pot balance written on the fridge list on the 15th of each month'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Went to Mum’s. Stayed for the washing up.' },
      { kind: 'capture', text: 'Called Mum on the Wednesday. She told me about the neighbour’s cat for twenty minutes.' },
    ],
  },
];

// ------------------------------------------------------------------ Marcus
// 27, junior developer, first proper salary, rents with two friends. Short
// sentences, contractions, numbers everywhere, a semicolon when he's sure.

const MARCUS: GoldenBase[] = [
  {
    id: 'marcus-health',
    writer: 'marcus',
    persona: 'straight',
    firstName: 'Marcus',
    domain: 'health',
    ideal:
      "It's March. I deadlift 140 kg for a clean single and I don't post about it. I want to be someone who trains three mornings a week at 7 am before standup, not someone who talks about it. I cook on weeknights; the freezer has actual food in it. I sleep by 11. My back doesn't go when I pick up a box. I've stopped ordering food at midnight because the fridge is empty. I want to look at my body in a year and think: that's what consistent looks like. Not big. Consistent.",
    shadow:
      "Other road: I'm 32, I still say I'm going to start in January, my back goes every time I move flat, and I eat from the same three apps. The gym membership is a direct debit I pay to feel better about not going.",
    iWill: 'I will train before standup.',
    title: 'Consistent',
    goals: [
      g('Deadlift 140 kg', 'health', 'Six months', '2027-03-15', [
        motives("Because I've been 'about to start' since I graduated and my back went carrying a monitor.", "I don't want to be strong for the photos. I want to be the guy who can move a sofa without a two-day recovery, and who keeps a promise to himself for six months in a row, which I have never done."),
        impact("If it works, I'm someone who does what he said; if it doesn't, I'm someone who buys programmes."),
        strategies(
          'Monday, Wednesday and Friday at 7 am at the gym on Bell Street, 45 minutes, the 5x5 programme',
          'Monday, Wednesday and Friday at 7 am at Bell Street, 45 minutes and out. Bag packed Sunday night with the belt in it. The programme is 5x5 and I add 2.5 kg a session until it stalls twice, then I drop 10% and go again. Standup is at 9.30 so there is no excuse about time.',
        ),
        obstacles("I stayed up past 1 am", 'then I go anyway and do the warm-up sets only'),
        monitoring('Sessions logged in the app with the top set weight, three a week, checked Friday night'),
      ]),
      g('Cook four weeknights', 'home', 'Three months', '2026-12-17', [
        motives("Because I spent £412 on delivery in August and I can't remember one meal."),
        impact('If it works there is money and there is a fridge with things in it.'),
        strategies('Sunday at 4 pm, batch cook two meals for the week at the flat; Monday to Thursday, eat from the fridge at 7 pm'),
        obstacles('I open the delivery app on autopilot', 'then I close it and eat whatever is in the fridge, even if it is eggs'),
        monitoring('Weeknights cooked or eaten from the fridge, four a week, ticked on the whiteboard in the kitchen'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Trained. 100 kg for 5. Back is fine.' },
      { kind: 'capture', text: 'Cooked Sunday. Six boxes in the fridge. Felt like an adult.' },
    ],
  },
  {
    id: 'marcus-money',
    writer: 'marcus',
    persona: 'straight',
    firstName: 'Marcus',
    domain: 'money',
    ideal:
      "It's next September. The credit card is at zero and has been for six months. I want to be someone who knows what he earns and what he spends, to the pound, without the app telling him. I've asked for the raise and got most of it. I have three months of rent in a savings account I don't touch. I don't buy things at 1 am. I want my mum to stop asking if I'm alright for money, because I'll have told her the number. Boring, solvent, calm. That's the whole thing.",
    shadow:
      "Other road: the card is at £4k, then £6k, the raise never gets asked for because I don't want to seem grabby, and I move back to my mum's at 31 and call it a reset.",
    iWill: 'I will pay the card on the 28th.',
    title: 'Solvent',
    goals: [
      g('Credit card at zero', 'money', 'A year', '2027-09-01', [
        motives("Because it's £2,850 and I've been paying the minimum for 14 months, which is £400 of nothing."),
        impact("If it works, I'm free of a thing I've been carrying since uni; if it doesn't, it's £5k by next year."),
        strategies(
          'On the 28th of every month, £300 to the card by bank transfer at the kitchen table before anything else',
          'Payday is the 27th. On the 28th at 8 am, at the kitchen table before work, £300 goes to the card, and then the fun money is whatever is left after rent and the bills. I have deleted the card from the phone and the browser, so paying for something with it means finding it in the drawer.',
        ),
        obstacles("a mate suggests a weekend away", 'then I say yes if the fun money covers it and no if it does not, and I say the number out loud'),
        monitoring('Card balance written in the notes app on the 28th, going down by £300 a month'),
      ]),
      g('Ask for the raise', 'craft', 'Three months', '2026-12-01', [
        motives("Because I've shipped two features that made the team look good and I'm on the same money as day one."),
        impact('If it works, the card clears three months sooner.'),
        strategies('Book 30 minutes with Dana on the first Tuesday of November at 2 pm; bring the list of the two features and the number'),
        obstacles('I bottle it in the meeting', 'then I say the number anyway, even if my voice goes, and stop talking'),
        monitoring('The meeting booked and held, and the number asked for, written down the same day'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Paid £300 to the card. Balance £2,550.' },
      { kind: 'capture', text: 'Wrote the list of features for the raise meeting. It is longer than I thought.' },
    ],
  },
  {
    id: 'marcus-craft',
    writer: 'marcus',
    persona: 'straight',
    firstName: 'Marcus',
    domain: 'craft',
    ideal:
      "It's June. The side project is live. Not perfect; live. Twelve people use it and one of them pays. I want to be someone who ships, not someone with a folder of half-finished repos. I write on Saturday mornings at the cafe on Ash Road, 9 to 11, and I've read twelve books this year, actual books. I want to be able to say what I'm working on without a caveat. I've stopped rebuilding the thing from scratch every time I learn a new framework. Done is a feature.",
    shadow:
      "Other road: seven repos, none deployed, all with a README that says 'WIP'. I know every framework and I've built nothing. At 35 I'm the guy at the meetup who has opinions.",
    iWill: 'I will ship on Saturdays.',
    title: 'Done is a feature',
    goals: [
      g('Ship the side project', 'craft', 'Six months', '2027-06-01', [
        motives("Because I've started it three times and the third version is good enough if I stop touching it.", "Every rewrite was really a way of not showing it to anyone. If it is live, someone can say it's bad, and I have decided that is better than it being perfect in a private repo forever."),
        impact("If it works, I have a thing with my name on it; if it doesn't, I have a folder."),
        strategies(
          'Saturday 9 to 11 am at the cafe on Ash Road, one issue closed per session, deploy every session',
          "Saturday 9 to 11 at the cafe on Ash Road, laptop, no phone. One issue from the board, closed and deployed before I leave, even if it's a copy change. Then I write the next issue so Monday-me can't add scope. No new frameworks until it has ten users.",
        ),
        obstacles('I want to rewrite it in the new thing', 'then I write the idea in the someday file and close the tab'),
        monitoring('Deploys counted on the board every Saturday, one a week, and the live URL checked'),
      ]),
      g('Twelve books this year', 'mind', 'A year', '2027-09-01', [
        motives("Because I read 60 tabs a day and no books, and I can feel my attention going."),
        impact('If it works, I can follow an argument for longer than a thread.'),
        strategies('20 pages every night at 10.30 pm in bed, phone charging in the kitchen, one book at a time'),
        obstacles('I reach for the phone instead', 'then I read one page and see if I want the second'),
        monitoring('Pages read each night written on the bookmark, and books finished counted on the shelf'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Closed the login issue. Deployed. It works.' },
      { kind: 'capture', text: 'Read 30 pages instead of 20. First time in a year.' },
    ],
  },
  {
    id: 'marcus-mind',
    writer: 'marcus',
    persona: 'straight',
    firstName: 'Marcus',
    domain: 'mind',
    ideal:
      "It's next spring. The phone charges in the kitchen and I sleep. I want to be someone who wakes up and lies there for a minute, not someone who wakes up scrolling. I run twice a week on the canal path and I don't track my pace. My head is quieter; I'm not refreshing anything. I've stopped checking Slack at the weekend. I want to be present when my friends are talking, not half in a thread. I want to feel bored sometimes. I can't remember the last time I was bored, and I think that's the problem.",
    shadow:
      "Other road: I'm 30 with a 9-hour screen time average, I can't read a page, I've never had a thought that lasted longer than a notification, and I tell people I'm 'just wired that way'.",
    iWill: 'I will charge the phone in the kitchen.',
    title: 'Bored sometimes',
    goals: [
      g('Phone out of the bedroom', 'mind', 'Three months', '2026-12-17', [
        motives("Because my screen time says 7h 40m a day and 2 hours of that is in bed."),
        impact("If it works I sleep and I think; if it doesn't, I'm a feed with a body."),
        strategies(
          'Every night at 10.45 pm, phone on the charger in the kitchen, alarm clock from the drawer by the bed',
          "The £8 alarm clock from the drawer goes by the bed, so the phone has no job in the bedroom. At 10.45 the phone goes on the kitchen charger and I don't touch it until I've made coffee. Weekends too, especially weekends.",
        ),
        obstacles("I tell myself I need it for the alarm", 'then I set the actual alarm clock and put the phone in the kitchen anyway'),
        monitoring('Nights with the phone in the kitchen, ticked on the fridge, seven a week, and screen time checked Sundays'),
      ]),
      g('Run twice a week', 'health', 'Three months', '2026-12-17', [
        motives('Because my head is quietest after the one run I did in July, and I have not done it since.'),
        impact('If it works there are two hours a week where nothing pings.'),
        strategies('Tuesday and Saturday at 8 am on the canal path from the lock, 25 minutes, no watch'),
        obstacles("it's dark and cold in November", 'then I run 10 minutes to the bridge and back and call it done'),
        monitoring('Runs logged with the date only, no pace, two a week, checked on Sunday'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Phone in the kitchen. Woke up before the alarm.' },
      { kind: 'capture', text: 'Ran to the bridge. Saw a heron. No idea of the pace.' },
    ],
  },
  {
    id: 'marcus-people',
    writer: 'marcus',
    persona: 'straight',
    firstName: 'Marcus',
    domain: 'people',
    ideal:
      "It's Christmas next year. I call my dad on Sundays and we talk about nothing for 20 minutes and it's fine. I want to be someone who shows up for people before it's an emergency. I've been to see my nan twice this year, not once in the car park of a hospital. The trip to Lisbon with Tom and Jay happened, because I saved for it instead of talking about it. I want to have people, not contacts. I want my dad to know what I do at work, roughly, and to have asked him about his.",
    shadow:
      "Other road: I text my dad on his birthday, my nan dies and I find out I hadn't seen her in two years, and the group chat with Tom and Jay is memes and 'we should do something' for a decade.",
    iWill: 'I will call Dad on Sundays.',
    title: 'People, not contacts',
    goals: [
      g('Call Dad on Sundays', 'people', 'Three months', '2026-12-20', [
        motives("Because he's 63 and we talk four times a year, and every time I think we should do this more.", "He's not a phone person and neither am I, which is the excuse we both use. I don't need a big conversation. I want twenty minutes a week where we both know the other one is there."),
        impact("If it works, we know each other; if it doesn't, we're two men who share a surname."),
        strategies(
          'Sunday at 6 pm, call Dad from the sofa, 20 minutes, phone on the arm of the chair so I am not doing anything else',
          'Sunday at 6, after he has eaten and before his programme. I call him, not the other way round, because he never will. Twenty minutes, sofa, no laptop open. I ask one thing about his week and tell him one thing about mine, and that is the whole format.',
        ),
        obstacles("I don't know what to say", 'then I ask about the allotment and let him talk'),
        monitoring('Sunday calls ticked in the calendar, four a month, with one thing he said written down'),
      ]),
      g('Lisbon with Tom and Jay', 'money', 'Six months', '2027-04-10', [
        motives("Because we've said 'next year' three years running and Jay is moving to Leeds."),
        impact('If it works we have a week we will talk about for ten years.'),
        strategies('£120 on the 1st of every month into the Lisbon pot, transferred from the kitchen table on the morning of the 1st; flights booked by 1 December'),
        obstacles('the pot looks like spare money', 'then I move it to the account with no card and leave it there'),
        monitoring('Pot balance checked on the 1st and written in the group chat, going up by £120 a month'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Called Dad. He talked about the allotment for 25 minutes. It was good.' },
      { kind: 'capture', text: 'Put £120 in the Lisbon pot. Told the chat. Jay sent a plane emoji.' },
    ],
  },
];

// ------------------------------------------------------------------ Rosalind
// 56, retired head of English, widowed two years, lives alone with a garden.
// Formal, no contractions, semicolons and dashes, a fierce register by choice.

const ROSALIND: GoldenBase[] = [
  {
    id: 'rosalind-health',
    writer: 'rosalind',
    persona: 'fierce',
    firstName: 'Rosalind',
    domain: 'health',
    ideal:
      'It is a Thursday in April and I have swum forty lengths before nine, as I do three mornings a week now. I want to be a woman who is still strong at seventy; I have watched what the alternative costs. My blood pressure is where the doctor wanted it without the second tablet. I walk to the shops rather than drive. The garden is dug over by hand each autumn and I do not need to sit down halfway. I want to climb the hill at Malham with my granddaughter and not be the reason we stop. I have stopped saying that I am too old for things; it was never true, only convenient.',
    shadow:
      'The other road is a chair by the window, a stick I resent, and a granddaughter who visits out of duty because I can no longer go to her. I have seen it. I refuse it.',
    iWill: 'I will swim before nine.',
    title: 'Still strong at seventy',
    goals: [
      g('Forty lengths, three mornings a week', 'health', 'Six months', '2027-03-31', [
        motives('Because my mother stopped moving at sixty and spent twenty years regretting it aloud.', 'I nursed her through the last of those years and I know the exact shape of what I am refusing. It is not vanity; it is the difference between a life and a waiting room.'),
        impact('If it works, I am the grandmother on the hill; if it does not, I am the one in the car park with the flask.'),
        strategies(
          'Monday, Wednesday and Friday at 7.30 am at the Kingsway baths, forty lengths, the bag packed the night before',
          'Monday, Wednesday and Friday: at the baths for 7.30 when the lane is quiet, forty lengths of breaststroke without stopping, and a coffee in the cafe afterwards as the reward. The bag is packed and by the front door before bed, so that the only decision in the morning is the coat.',
        ),
        obstacles('my hip complains on waking', 'then I go and swim twenty lengths slowly, and stretch in the warm pool afterwards'),
        monitoring('Lengths swum, entered in the diary on the kitchen dresser after each swim, with the date'),
      ]),
      g('The vegetable beds dug by hand', 'home', 'Three months', '2026-11-30', [
        motives('Because paying a man to dig my own garden would be an admission I am not prepared to make.'),
        impact('If it works, the spring beds are mine; if not, they are a service I purchased.'),
        strategies('Tuesday and Saturday mornings from 9 am, one bed dug over before lunch, in the garden with the radio'),
        obstacles('the ground is frozen', 'then I turn the compost instead and dig on the next mild day'),
        monitoring('Beds finished, four in all, marked on the garden plan pinned in the shed'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Forty lengths. The hip was quiet after the tenth.' },
      { kind: 'capture', text: 'Dug the first bed. Found the old fork Peter lost in 2019.' },
    ],
  },
  {
    id: 'rosalind-money',
    writer: 'rosalind',
    persona: 'fierce',
    firstName: 'Rosalind',
    domain: 'money',
    ideal:
      'It is next spring and I understand my own money for the first time in my life. Peter handled it; I let him; and for two years I have been afraid of the folder. I want to be a woman who opens the letters the day they arrive. The pension is consolidated into one scheme I can name. I know what the house costs to run each month, to the pound. I volunteer two mornings a week at the library and I do not worry about the petrol. I want my daughter never to have to untangle a drawer of envelopes for me, as I did for my mother.',
    shadow:
      'The other road is the folder growing thicker on the hall table, a pension I cannot name, and my daughter discovering the state of it when it is her problem and not mine.',
    iWill: 'I will open the letters on Mondays.',
    title: 'The folder',
    goals: [
      g('The pension in one place', 'money', 'Six months', '2027-03-31', [
        motives('Because there are four schemes in the folder and I can explain none of them.', 'Peter would have said that it is only arithmetic and paper, and he would have been right. The fear is not of numbers; it is of finding out that I have been careless, and that fear is worth less than the knowing.'),
        impact('If it works, I know what I will live on; if it does not, I guess, and guessing at seventy is not a plan.'),
        strategies(
          'Monday mornings at 10 am at the dining table, one scheme’s paperwork read and one telephone call made, until all four are done',
          'Every Monday at ten, at the dining table with tea and my reading glasses, one scheme from the folder: read the last statement, write the three numbers that matter on the index card, and make the one telephone call. Four Mondays, four schemes. Then the transfer forms, one a week, in the same chair.',
        ),
        obstacles('the telephone menu defeats me', 'then I write the question on the card and ring again on Tuesday at 10'),
        monitoring('Schemes understood and transferred, four in all, ticked on the index card in the folder'),
      ]),
      g('Two mornings at the library', 'people', 'Three months', '2026-12-17', [
        motives('Because a week alone with the radio is not a life, and they need someone who can read aloud.'),
        impact('If it works there are children who know my name; if not, there is the radio.'),
        strategies('Tuesday and Thursday mornings from 9.30 am to 12 at the Carr Lane library, the reading hour and the returns trolley'),
        obstacles('I feel I am not wanted', 'then I go for the reading hour only and leave after it, which is still a morning'),
        monitoring('Mornings attended, written in the diary, eight a month'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Read the teachers’ pension statement. It is not as bad as the folder made it look.' },
      { kind: 'capture', text: 'The reading hour: eleven children, one of whom corrected my pronunciation of a dinosaur.' },
    ],
  },
  {
    id: 'rosalind-craft',
    writer: 'rosalind',
    persona: 'fierce',
    firstName: 'Rosalind',
    domain: 'craft',
    ideal:
      'It is a year from now and the memoir has twelve chapters in a box file, printed, one for each year of the marriage that mattered. I want to be a woman who writes every morning as she once marked essays: without ceremony, at the desk by the window, for an hour. I have stopped calling it a hobby. I play the piano again in the evenings, badly and with pleasure. I want my daughter to read the chapters and meet her father at thirty. I have finished something of my own for the first time since the thesis; that is the whole point of it.',
    shadow:
      'The other road is the notebook of first lines, the piano as a shelf for photographs, and a daughter who knows her father only from my anecdotes at Christmas, which grow shorter each year.',
    iWill: 'I will write at the window until the clock strikes.',
    title: 'Twelve chapters',
    goals: [
      g('Twelve chapters of the memoir', 'craft', 'A year', '2027-09-01', [
        motives('Because I taught four hundred children to finish an essay and have not finished one of my own since 1994.', 'A teacher who cannot do the thing she taught is a hypocrite, and I have been one for thirty years in the kindest possible way. The chapters are also the only place Peter still speaks, and I would like my daughter to hear him.'),
        impact('If it works, my daughter has her father in twelve chapters; if it does not, she has my anecdotes.'),
        strategies(
          'Every morning at 8 am at the desk by the window, one hour of writing, 500 words before the second cup of tea',
          'At eight, after the first cup of tea, at the desk by the window in the front room, with the door shut and the telephone in the hall. Five hundred words, whatever they are, before the second cup. On the first Sunday of each month I print the chapter, read it aloud once, and put it in the box file. I do not revise until all twelve are in the box.',
        ),
        obstacles('I read yesterday’s pages and despair', 'then I do not read them; I write the next five hundred words and put the pages in the box'),
        monitoring('Words written each morning, noted in the margin of the diary, and chapters in the box file, one a month'),
      ]),
      g('The piano in the evenings', 'craft', 'Six months', '2027-03-31', [
        motives('Because it was Peter’s and it has been a shelf for two years.'),
        impact('If it works there is music in the house again; if not, there are photographs on a piano.'),
        strategies('Tuesday, Thursday and Sunday evenings at 7 pm, twenty minutes at the piano, the Bach from the green book'),
        obstacles('my hands are stiff and it sounds dreadful', 'then I play scales for the twenty minutes and count that as the practice'),
        monitoring('Evenings played, marked with a small P in the diary, three a week'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Five hundred and twelve words. The chapter about the tent in Wales.' },
      { kind: 'capture', text: 'Played the first Bach prelude through, slowly. Wept a little; continued.' },
    ],
  },
  {
    id: 'rosalind-mind',
    writer: 'rosalind',
    persona: 'fierce',
    firstName: 'Rosalind',
    domain: 'mind',
    ideal:
      'It is a winter evening next year and I turn the radio off at nine and sit in the quiet without dread. I want to be a woman who can be alone in her own house without narrating it. I sleep without the World Service on; I wake at seven and not at four. I walk every day, in any weather, to the top of the lane and back. I have stopped rehearsing conversations with a man who is not here. I want the quiet to be company again, as it was before, and I believe it can be if I practise it as I practised everything else.',
    shadow:
      'The other road is the radio on all night for the voices, four o’clock waking as a habit rather than a grief, and a woman who cannot sit in her own front room without the television for fear of what the silence says.',
    iWill: 'I will turn the radio off at nine.',
    title: 'The quiet as company',
    goals: [
      g('Sleep without the radio', 'mind', 'Three months', '2026-12-17', [
        motives('Because I have not had a night’s sleep in silence since the funeral, and I am tired in a way sleep does not touch.', 'The radio was for the first weeks, when the house was too loud with its own quiet. Two years is not the first weeks. It has become a way of not being here, and I would like to be here.'),
        impact('If it works, I wake at seven a person; if it does not, I wake at four a listener.'),
        strategies(
          'Radio off at 9 pm every evening, a chapter of a novel in the armchair, and the lamp off at 10.30 with the radio in the kitchen',
          'At nine the radio goes off and is carried to the kitchen, where it stays. A chapter of a novel in the armchair, nothing on a screen, and a glass of water. Lamp off at half past ten. If I wake at four I do not turn anything on; I lie and listen to the house, which has never once said anything unkind.',
        ),
        obstacles('I wake at 4 am and reach for it', 'then I lie still and name ten things in the room instead, and I do not get up before six'),
        monitoring('Nights without the radio ticked in the diary, seven a week, and the waking hour written beside each'),
      ]),
      g('The lane every day', 'health', 'Three months', '2026-12-17', [
        motives('Because a day in which I do not leave the house is a day I have given to the grief.'),
        impact('If it works I see the neighbours and the weather; if not, I see the window.'),
        strategies('Every day at 2 pm, to the top of the lane and back, 30 minutes, in the green coat whatever the weather'),
        obstacles('it is sleeting and I cannot face it', 'then I walk to the gate and back three times, which is still outside'),
        monitoring('Days walked ticked on the calendar in the hall, with the weather written beside each'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Radio off at nine. Woke at five, not four. Lay and listened.' },
      { kind: 'capture', text: 'The lane in sleet. Met Mr Adeyemi and his terrier; we agreed it was foul.' },
    ],
  },
  {
    id: 'rosalind-people',
    writer: 'rosalind',
    persona: 'fierce',
    firstName: 'Rosalind',
    domain: 'people',
    ideal:
      'It is next summer and my granddaughter has stayed for a week of the holidays without her parents, and asked to come again. I want to be a grandmother who is a place, not a visit. I sing in the choir on Thursdays and know the names of the altos. I have friends who are mine and not Peter’s. I write to my sister in Perth every fortnight, by hand, and she writes back. I have stopped waiting to be invited; I do the inviting. I want a house that people come to because they want to, and I believe that is built one Thursday at a time.',
    shadow:
      'The other road is Christmas as the only visit, a choir I meant to join, a sister I lost to time zones, and a house that is tidy because nobody comes to it.',
    iWill: 'I will do the inviting.',
    title: 'A place, not a visit',
    goals: [
      g('Ellie for a week in the summer', 'people', 'A year', '2027-08-01', [
        motives('Because she is nine, and there are perhaps five summers left before she would rather be anywhere else.', 'My own grandmother was a place: a kitchen, a smell of bread, a rule about shoes. I should like to be that for Ellie, and it is not built at Christmas. It is built by her knowing the house.'),
        impact('If it works she has a second home; if it does not, she has an address for a card.'),
        strategies(
          'Ring Ellie every Sunday at 5 pm and have her to stay one weekend a month from October, the spare room made hers by the first visit',
          'Sunday at five, when she is home from swimming, a telephone call of her length and not mine. One weekend a month from October, collected from school on the Friday. The spare room is hers: her drawings on the wall, her mug, her own key on a ribbon. In June I ask her parents for the week in August, and I ask her first.',
        ),
        obstacles('her parents are hard to pin down', 'then I propose two dates by text on the first of the month and take whichever they answer'),
        monitoring('Sunday calls and weekends stayed, written in the diary, with what she asked for next time'),
      ]),
      g('The choir on Thursdays', 'people', 'Three months', '2026-12-17', [
        motives('Because I have sung alone in the kitchen for two years and there is a choir four streets away.'),
        impact('If it works I have Thursdays and altos; if not, I have the kitchen.'),
        strategies('Thursday at 7.30 pm at St Mark’s hall, every week from the 1st of October, arriving early enough to speak to someone'),
        obstacles('I sit in the car and cannot go in', 'then I go in for the first half only and leave at the break, having spoken to one person'),
        monitoring('Thursdays attended, ticked in the diary, and one name learnt written beside each'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Rang Ellie. She told me the plot of a film for eleven minutes; I understood none of it and all of it.' },
      { kind: 'capture', text: 'Choir. The alto beside me is called Dorothy and disapproves of the conductor. We shall be friends.' },
    ],
  },
];

// ------------------------------------------------------------------ Tomás
// 41, delivery driver on a four-on four-off pattern, two boys, a van he does
// not own. Run-on sentences joined with "and", ellipses, the odd lowercase
// start. Chose the straight register; his week has been a hard one, so his
// brief is written in the concern band.

const TOMAS: GoldenBase[] = [
  {
    id: 'tomas-health',
    writer: 'tomas',
    persona: 'straight',
    firstName: 'Tomás',
    domain: 'health',
    ideal:
      "its next summer and I can run about with the boys in the park without stopping to breathe... I want to be a dad who is there, not a dad on the bench with his phone. I eat lunch out of a box I packed, not the garage. I walk 20 minutes at every break, round the depot or wherever I've parked. I've lost the belly, not all of it but enough that the seatbelt doesn't dig in. I want to get to the top of the stairs at my mum's and not pretend I'm looking at the pictures. I sleep on my days off instead of lying there and I cook on Sundays and the boys help and it's a mess and it's ours.",
    shadow:
      "the other road is me at 50 with the doctor saying the word tablets and the boys grown up remembering me as the shape on the sofa... I know it because it's my dad and I'm not doing it.",
    iWill: 'I will walk at every break.',
    title: 'Not the shape on the sofa',
    goals: [
      g('Twenty minutes at every break', 'health', 'Three months', '2026-12-17', [
        motives("Because I sit for ten hours and then I sit at home and my knees have started clicking on the stairs.", "my dad sat in a cab for thirty years and then sat in a chair for ten and that was that... I've got his shape and I'm not having his ending, the boys deserve better than a dad who watches."),
        impact("If it works I can chase the boys round the park in June; if it doesn't, I watch them from the bench and call it resting."),
        strategies(
          'Every break, 20 minutes walking round wherever I have parked, the timer on the phone, before I eat',
          "first break is at 10.30 and second at 2 and the walk comes before the food, twenty minutes on the timer round the block or the retail park or the lay-by, doesn't matter. Trainers in the cab, not the work boots. On days off it's the park with the boys at 10 and they can go on the bikes and I walk the loop.",
        ),
        obstacles("it's lashing down at the break", 'then I walk the depot yard under the canopy for ten and still eat after'),
        monitoring('Walks done ticked on the clipboard in the cab, two a shift, and the belt notch checked on the 1st'),
      ]),
      g('Sunday cooking with the boys', 'home', 'Three months', '2026-12-17', [
        motives("Because they'll eat anything they've stirred and nothing I put in front of them."),
        impact('If it works there is one meal a week that is ours and not a box.'),
        strategies('Sunday at 4 pm in the kitchen with both boys, one big pot for the week, aprons on, the radio loud'),
        obstacles("I'm shattered from the four on", 'then we do beans on toast together and still call it Sunday cooking'),
        monitoring('Sundays cooked, a photo of the pot in the family chat each week'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Walked at both breaks. Rained at the second one. Did it anyway.' },
      { kind: 'capture', text: 'Sunday pot. Kai put the whole jar of paprika in. Ate it anyway.' },
    ],
  },
  {
    id: 'tomas-money',
    writer: 'tomas',
    persona: 'straight',
    firstName: 'Tomás',
    domain: 'money',
    ideal:
      "its two years from now and the van is mine, my name on the logbook, not the firm's and not the finance company's... I want to be someone who knows where the money goes and has said no to the overtime that costs more than it pays. There's a pot for the van and a pot for the boys' trip and I don't move money between them at midnight. I want to look Ana in the eye at the end of the month and say we're fine and it be true. I've stopped doing the extra Saturdays that pay for the takeaways that I only get because I did the Saturdays.",
    shadow:
      "the other road is me at 50 still on the firm's van, still doing Saturdays, still telling Ana it's fine and her not believing me, and the boys learning that dads are tired and money is a fight.",
    iWill: 'I will put the van money away first.',
    title: 'My name on the logbook',
    goals: [
      g('The van fund', 'money', 'A year', '2027-09-30', [
        motives("Because I've paid the firm's van off twice over in rent and I own nothing."),
        impact("If it works I'm my own boss on the days I choose; if it doesn't, I'm renting my own job."),
        strategies(
          'On payday Friday, £200 to the van account by 8 am from the kitchen table before the shopping, every fortnight',
          "payday is the Friday every two weeks and the first thing before anything else, before the shopping, before Ana even asks, is £200 to the van pot from my phone at the kitchen table at 8. It's an account with no card. I check it on the last Sunday of the month with Ana and we write it on the whiteboard by the fridge so the boys see it going up.",
        ),
        obstacles('something breaks and I want to raid the pot', 'then I use the little emergency pot first and put the van money back before I touch it'),
        monitoring('The van pot balance written on the fridge whiteboard on the last Sunday of the month, going up by £400 a month'),
      ]),
      g('No extra Saturdays', 'mind', 'Three months', '2026-12-17', [
        motives("Because the Saturday money goes on the takeaway I only want because I did the Saturday."),
        impact('If it works I get my four off; if not, I get three and a bad mood.'),
        strategies('When the Saturday text comes, I answer no by 6 pm the same day from the sofa, before Ana has to ask'),
        obstacles("they say they're short and I feel bad", 'then I say no once, kindly, and put the phone in the drawer'),
        monitoring('Saturdays worked counted on the whiteboard each month; the number I want is zero'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: '£200 in the van pot before the shopping. Ana saw me do it.' },
      { kind: 'capture', text: 'Said no to the Saturday. Went to the park instead. No takeaway.' },
    ],
  },
  {
    id: 'tomas-craft',
    writer: 'tomas',
    persona: 'straight',
    firstName: 'Tomás',
    domain: 'craft',
    ideal:
      "its 18 months from now and I've passed the electrics course, the real one, the one with the certificate that means I can do the work and not just watch the videos... I want to be a bloke who finishes what he starts. I do the coursework on my four off, at the library, not on the sofa. I've played the guitar with the boys every week, badly, and Kai can do three chords now. I want to be able to say I'm an electrician, or nearly, and not a driver who was going to be. I want the boys to see me revise, so they know it's normal.",
    shadow:
      "the other road is the course login I paid for and never used, and the guitar in the cupboard with one string, and the boys thinking dads have jobs, not things they're becoming.",
    iWill: 'I will do the coursework at the library.',
    title: 'Nearly an electrician',
    goals: [
      g('Pass the electrics course', 'craft', 'A year', '2027-09-30', [
        motives("Because I've paid for it twice and done two modules and I'm forty-one, not twenty-one.", "I'm not clever on paper, never was, but I can do things with my hands and I understand the stuff when it's in front of me... the boys need to see that you can start something late and finish it, because nobody showed me."),
        impact("If it works I've got a trade at 43; if it doesn't, I've got a login."),
        strategies(
          'On every day off, at the library on Market Street from 10 am to 12, one module unit done, then the boys at 12.30',
          "days off are the four in the pattern and on each one I'm at the library on Market Street at 10 when it opens with the laptop and the folder, until 12 and no later, because I pick the boys up at 12.30 from Ana's mum. One unit of the module per session, the practice questions done before I leave. Then the practical bits on the bench in the garage on the Sunday.",
        ),
        obstacles("I don't understand a unit and want to quit", 'then I watch the video for it twice and do the questions wrong and email the tutor'),
        monitoring('Units done ticked on the course page and the module number written on the fridge, one module a month'),
      ]),
      g('Guitar with the boys', 'people', 'Six months', '2027-03-31', [
        motives('Because Kai asked me to teach him and I said when I have time, and there is never time.'),
        impact('If it works the three of us have a thing; if not, the guitar has one string.'),
        strategies('Saturday at 5 pm in the front room with both boys, 20 minutes, the three chords from the sheet, new strings by this Saturday'),
        obstacles("they lose interest after five minutes", 'then I play the one song they like and let them sing it and stop while it is still fun'),
        monitoring('Saturdays played, ticked on the sheet on the wall, and chords Kai can play counted'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Unit 3 done at the library. Got the questions right second time.' },
      { kind: 'capture', text: 'Kai played G to C without stopping. Leo sang. Twenty minutes was thirty.' },
    ],
  },
  {
    id: 'tomas-mind',
    writer: 'tomas',
    persona: 'straight',
    firstName: 'Tomás',
    domain: 'mind',
    ideal:
      "its next spring and I sleep on my days off, actual sleep, in bed, phone downstairs... I want to be someone who's not wound up all the time, who can sit in the garden with a coffee for ten minutes and not check the app for the next shift. I run with the boys on the field on Sunday mornings, or jog, or whatever it is, and they laugh at me and I don't mind. I've stopped scrolling in the cab at the lights. I want Ana to say I'm easier to be around and I want it to be because I am, not because I'm hiding it better.",
    shadow:
      "the other road is me lying there at 3 am on my days off with the phone lighting up the ceiling, snapping at the boys over nothing, and Ana going quiet, and me not knowing why I'm like this because I've never once sat still long enough to find out.",
    iWill: 'I will leave the phone downstairs.',
    title: 'Easier to be around',
    goals: [
      g('Phone downstairs at night', 'mind', 'Three months', '2026-12-17', [
        motives("Because I'm awake till 2 looking at nothing and then I'm a nightmare with the boys.", "I know it's the phone because the one week it broke I slept like a kid... I'm not proud of needing a rule for it at 41 but I need a rule for it."),
        impact("If it works I sleep on my days off; if it doesn't, I lose two of the four to being knackered."),
        strategies(
          'Every night at 10.30 pm, the phone on the charger by the kettle, the old alarm clock by the bed',
          "10.30 and the phone goes on the charger by the kettle, work days and days off both, and the old alarm clock from the loft goes by the bed. If I need the shift app I look at it at 10.25 and that's the last look. Ana's doing the same so it's not just me.",
        ),
        obstacles("I tell myself I need to check the shift app", 'then I check it at 10.25 and put the phone by the kettle at 10.30 anyway'),
        monitoring('Nights the phone was by the kettle ticked on the whiteboard, seven a week'),
      ]),
      g('Sunday run with the boys', 'health', 'Three months', '2026-12-17', [
        motives("Because the only time my head goes quiet is when I'm moving and the boys are shouting."),
        impact('If it works the boys think running is a normal thing dads do.'),
        strategies('Sunday at 9 am on the school field with both boys, 20 minutes jogging the edge, then the swings'),
        obstacles("I'm on the Sunday shift", 'then we do it Saturday at 9 instead, same field, same swings'),
        monitoring('Sundays run, a photo at the swings in the family chat each week'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Phone by the kettle. Slept till 8. Boys woke me up jumping on the bed.' },
      { kind: 'capture', text: 'Ran the field. Leo beat me. Leo is six.' },
    ],
  },
  {
    id: 'tomas-people',
    writer: 'tomas',
    persona: 'straight',
    firstName: 'Tomás',
    domain: 'people',
    ideal:
      "its next winter and I read to the boys every night I'm home, the same books over and over, and they know the voices... I want to be the dad they remember reading to them, not the one who was on shift. Me and Ana go out once a month, just us, and we don't talk about money for the whole evening. The trip to see my brother in Porto happened, all four of us, and the boys met their cousins. I want to be someone the boys come to when they're older, because I was there when they were small. I ring my mum on Wednesdays and she doesn't have to ask when I'm coming.",
    shadow:
      "the other road is the boys grown up and polite to me, and Ana and me two people who run a house, and my brother's kids strangers, and my mum saying you never ring and me saying I've been busy, which is true and no excuse.",
    iWill: 'I will read to the boys every night I am home.',
    title: 'The one who read to them',
    goals: [
      g('Bedtime stories every night home', 'people', 'Three months', '2026-12-17', [
        motives("Because Kai asked Ana why I don't do the voices any more, and I didn't know I'd stopped.", "I used to do all the voices and then the shifts got longer and I started saying tomorrow... he's eight and he noticed, and that's the worst thing anyone's said to me this year, and he didn't even say it to me."),
        impact("If it works they remember the voices; if it doesn't, they remember the door shutting."),
        strategies(
          'Every night I am home, 7.30 pm on the boys’ beds, two books with the voices, phone downstairs by the kettle',
          "7.30 on the nights I'm home, up on Kai's bed with Leo squashed in, two books, the voices, no skipping pages even the boring ones. Phone's by the kettle already because of the other rule. On shift nights I record one book on Ana's phone before I go so they still get the voices.",
        ),
        obstacles("I get in late and they're nearly asleep", 'then I do one page in the doorway with the voices, and that counts'),
        monitoring('Nights read, ticked by the boys on the chart on their door, one tick a night'),
      ]),
      g('Porto with the boys', 'money', 'A year', '2027-08-15', [
        motives("Because my brother's kids are ten and twelve and mine have never met them."),
        impact('If it works the boys have cousins; if not, they have names in a group chat.'),
        strategies('£80 into the Porto pot on payday Friday every fortnight, from the kitchen table before the shopping, flights booked by March'),
        obstacles("the pot looks like takeaway money on a bad week", 'then I move it to the no-card account the same night and leave it'),
        monitoring('Porto pot balance written on the whiteboard on the last Sunday of the month, going up by £160 a month'),
      ]),
    ],
    evidence: [
      { kind: 'seal', text: 'Read two books. Did the dragon voice. Kai did it back.' },
      { kind: 'capture', text: 'Recorded the bear book on Ana’s phone for the shift nights. Leo listened to it twice.' },
    ],
  },
];

export const GOLDEN_BASES: GoldenBase[] = [...PRIYA, ...MARCUS, ...ROSALIND, ...TOMAS];

/** The Starter cut of a base: the lines alone, no paragraphs, no shadow. */
function starterOf(base: GoldenBase): GoldenProfile {
  return {
    ...base,
    id: `${base.id}-starter`,
    track: 'starter',
    shadow: '',
    goals: base.goals.map((goal) => ({
      ...goal,
      stones: goal.stones.map(({ paragraph: _paragraph, ...stone }) => stone),
    })),
  };
}

/** The Full cut: everything the writer wrote. */
function fullOf(base: GoldenBase): GoldenProfile {
  return { ...base, id: `${base.id}-full`, track: 'full' };
}

/** Forty profiles: twenty writers-by-domain, each on both tracks. */
export const GOLDEN: GoldenProfile[] = GOLDEN_BASES.flatMap((base) => [starterOf(base), fullOf(base)]);
