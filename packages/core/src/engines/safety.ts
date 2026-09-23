/**
 * The safety layer (PRD §11.6).
 *
 * Runs on the raw text, on device, before anything is sent anywhere and before
 * anything is written to the coach's memory. A local screen cannot be perfect,
 * so it is deliberately over-sensitive on crisis and quiet on concern: the cost
 * of a false positive is a resources card the user can dismiss; the cost of a
 * false negative is unacceptable.
 */
import type { SafetyRisk } from '../types';

/**
 * Written to catch the way people actually write, not the dictionary form.
 *
 * Three things this list has to survive, because a person in trouble writes
 * quickly and in the past tense:
 *
 *  - Contractions. "I don't want to be here" is the ordinary phrasing and the
 *    earlier `\bnot want\b` could never match it, because the word in the
 *    sentence is "don't". The commonest form was the one that got through.
 *  - Inflection. "killing myself", "ended my life", "wanted to die".
 *  - The gap between "myself" and a body part: people write "cutting my arms".
 *
 * Negations are deliberately NOT excluded. "I don't want to kill myself" still
 * raises the card.
 *
 * That over-sensitivity used to be free: the cost of being wrong was a card
 * someone dismissed in one tap. It stopped being free the moment a crisis
 * verdict also started excluding the whole sitting from the Book for good, and
 * the two changes were each defensible alone and harmful together. Four
 * ordinary sentences were flagged by the widened patterns — "I hurt my wrists
 * in the gym again", "I want to kill my self-doubt", "this year I am taking my
 * life back", "I took my life savings and bought the van" — and each one would
 * have silently deleted nine hundred words of somebody's writing from their own
 * Book.
 *
 * So two things hold together now and neither is optional: the patterns below
 * mean what they say, and a person can tell the app the flag was wrong
 * (`reconsider` in the store). An automated judgement that is permanent,
 * destructive and unappealable is not a safety feature.
 */
/**
 * How a clause ends, for the patterns that must not fire on a sentence that
 * carries on into something ordinary: "don't want to wake up" is one thing
 * and "don't want to wake up at 5am" is another. A stop, the end of the
 * text, or one of the few continuations that keep the meaning.
 */
const CLAUSE_END = String.raw`(?=\s*(?:[.,;:!?)\]…—-]|$)|\s+(?:any\s?more|any\s+longer|at\s+all|like\s+this|tomorrow|tonight|today|this\s+(?:morning|afternoon|evening|week|weekend|month|year)|these\s+days|lately|again|because|if|so|honestly|really|sometimes|most\s+days|some\s+days|pretending|as\s+if|with\s+(?:any\s+of\s+)?(?:it|this|life|things))\b)`;

/**
 * The same, and a new clause after it counts as an ending: "and" or "but"
 * followed by a subject. Only for the phrases that mean one thing — "I do
 * not want to be here and I do not know what to do" returned nothing at all,
 * while "I do not want to wake up and I have to go to work" is a hard Monday
 * and must keep returning nothing. So the wide ending is spelled separately
 * and used only where the object of the sentence cannot be read two ways.
 */
const CLAUSE_END_WIDE = String.raw`(?=\s*(?:[.,;:!?)\]…—-]|$)|\s+(?:any\s?more|any\s+longer|at\s+all|like\s+this|tomorrow|tonight|today|this\s+(?:morning|afternoon|evening|week|weekend|month|year)|these\s+days|lately|again|because|if|so|honestly|really|sometimes|most\s+days|some\s+days|pretending|as\s+if|with\s+(?:any\s+of\s+)?(?:it|this|life|things))\b|\s+(?:and|but)\s+(?:i|we|it|there|that|this|nobody|no\s+one|nothing|everyone|everything)\b)`;

/**
 * "and" or "but" followed by a subject is a new clause, not the phrase
 * carrying on — "I do not want to be here and I do not know what to do"
 * returned nothing at all, because the list above had no way to say "the
 * sentence ended and another one began". A bare "and" cannot go in it:
 * "I do not want to wake up and go to work" is a hard Monday.
 *
 * And the same list without the three continuations that turn the end of a
 * relationship into a crisis. "We ended it because I could not carry it any
 * more" and "I ended it so I could breathe" both raised the suicide card.
 * "I want to end it because I cannot do this any more" still says what it
 * says, and keeps the loose ending through its own pattern below.
 * Nor a new clause after "and": "We ended it and I am fine" is a breakup
 * too, and the bare "end it" is the one pattern here weak enough to be
 * carried by whatever follows it.
 */
const CLAUSE_END_PLAIN = String.raw`(?=\s*(?:[.,;:!?)\]…—-]|$)|\s+(?:any\s?more|any\s+longer|at\s+all|like\s+this|tomorrow|tonight|today|this\s+(?:morning|afternoon|evening|week|weekend|month|year)|these\s+days|lately|again|honestly|really|sometimes|most\s+days|some\s+days|pretending|as\s+if|with\s+(?:any\s+of\s+)?(?:it|this|life|things))\b)`;
const re = (source: string) => new RegExp(source, 'i');

const CRISIS = [
  // Inflections only for "myself", which is unambiguous. "kill me" stays in
  // its bare form, and not after a modal: "it killed me", "this deadline is
  // killing me", "my mum will kill me" and "just kill me now" are ordinary
  // English, and a card that fires on those teaches people to dismiss it
  // without reading, which is the one way this screen can be made worse at
  // its job.
  /\bkill(?:ing|ed|s)?\s+my ?self(?![\w-])/i,
  // Nor with a thing for a subject: "the stairs kill me", "these hills
  // kill me" — a plural noun before "kill" is the gym or the commute.
  re(String.raw`(?<!\b(?:will|would|could|might|gonna|to|going\s+to|ll|['’]ll|can|may)\s)(?<!\b[a-z]+s\s)\bkill\s+me` + CLAUSE_END),
  /\b(?:end|ending|ended|ends)\s+(?:my|this)\s+(?:own\s+)?life\b/i,
  // "take" only with "own". "Taking my life back" and "took my life savings"
  // are ordinary sentences, and the idiom this list is for says "own life".
  /\b(?:take|taking|took|takes|taken)\s+(?:my|his|her|their)\s+own\s+life\b/i,
  // Without "own" too — "I am going to take my life tonight" says the same
  // thing — but not the idioms: "taking my life back", "took my life
  // savings", "take my life in my own hands", "take my life seriously".
  /\b(?:take|taking|took|takes|taken)\s+my\s+life\b(?!\s+(?:back|savings|into|in\s+(?:my|a\s+new)|seriously|as|one|story|lessons|less|more|for|off|on|by|to\s+the|apart|and\s+(?:make|turn|do)))/i,
  re(String.raw`\bend(?:ing|ed)?\s+it\s+all` + CLAUSE_END),
  // "end it", "ending things", "end everything" — when the clause stops
  // there. "End it with a party", "ending things with him" carry on — and so
  // do "ended it because" and "ended it so", which is how a person writes
  // about the end of a relationship.
  re(String.raw`\b(?:end|ending|ended)\s+(?:it|things|everything)` + CLAUSE_END_PLAIN),
  // Not "career suicide", "political suicide", "suicide doors", nor the
  // sprints a football coach calls suicides.
  /(?<!\b(?:career|financial|political|social|commercial|professional|brand|economic|electoral|did|do|doing|ran|run|running)\s)\bsuicid(?:e|al|es)?\b(?!\s+(?:squad|drills?|sprints?|runs?|hill|mission|doors?|pact\s+of|prevention|hotline|line|awareness|bombers?|attack))/i,
  /\bunalive\w*/i,
  // "die of embarrassment", "die of shame", "die laughing" are idioms, and
  // the card on them teaches people to dismiss it. "wanna" is how it is
  // typed at night.
  /\b(?:want(?:ed|ing|s)?\s+to|wanna)\s+(?:die(?!\s+(?:of\s+(?:embarrassment|shame|boredom|laughter|laughing|cringe|the\s+cold|hunger|thirst)|laughing|my\s+hair|the\s+wool|the\s+fabric)\b)|be\s+dead|not\s+exist|not\s+be\s+alive|not\s+wake\s+up|stop\s+existing|disappear\s+(?:forever|for\s+good|completely)|kill\s+my ?self(?![\w-]))\b/i,
  // "want to end it" when the clause stops there; "end it all on a high
  // note" carries on into something.
  re(String.raw`\b(?:want(?:ed|ing|s)?\s+to|wanna)\s+end\s+it(?:\s+all)?` + CLAUSE_END),
  // Any intent, not only "want to". Taking because/if/so off the bare "end
  // it" spared the breakups and took "I have decided to end it because I
  // cannot carry this any more" with them — which is the sentence this list
  // exists for. "We ended it because…" still has no intent verb in front of
  // it, so it still says nothing.
  re(
    String.raw`\b(?:going\s+to|gonna|about\s+to|plan(?:ning)?\s+to|decided\s+to|ready\s+to|will|should\s+just)\s+end\s+(?:it|things|everything)` +
      CLAUSE_END,
  ),
  re(String.raw`\bwant\s+(?:it\s+all|everything|all\s+of\s+it)\s+to\s+(?:be\s+over|end|stop)` + CLAUSE_END),
  // "there is no point anymore" with nothing it is the point of.
  re(String.raw`\b(?:no\s+point|there(?:['’]s|\s+is)\s+no\s+point)\s+(?:any\s?more|any\s+longer|in\s+anything|to\s+anything)` + CLAUSE_END),
  // "kms" is how it is typed at night, and it is also how a runner writes
  // kilometres — "I want to run 10 kms this month", "kms twice a week" and
  // "5 kms before work" all raised the card, in an app whose own example goal
  // is a five kilometre race.
  //
  // Guarding it by what follows was worse than the fault: "this week" matched
  // inside "this weekend", and "to", "before" and "after" are the ordinary
  // next words of the disclosure, so "I might kms this weekend" and "I am
  // going to kms after work" returned nothing at all. It is the verb sense
  // that is wanted, so the verb sense is what is written down: said of
  // oneself, with the intent in front of it — or the word on its own, which
  // is how it is usually sent.
  re(String.raw`\b(?:i|we)\s+(?:want(?:ed)?\s+to|wanna|(?:am|are|is)\s+going\s+to|going\s+to|gonna|might|may|will|should|just|maybe|nearly|almost)?\s*kms\b`),
  /^\s*kms\b(?:\s+(?:rn|right\s+now|fr|tbh|honestly|today|tonight|already|again))?\s*[.!?]*\s*$/i,
  // "rather die than wear that" is hyperbole; "rather die" alone, and
  // "rather be dead" however it goes on, are not.
  /\brather\s+(?:not\s+(?:exist|be\s+alive|be\s+here|wake\s+up)|be\s+dead|die(?!\s+than))\b/i,
  // Methods. Thought about, or stated.
  /\b(?:think(?:ing|s)?|thought)\s+(?:about|of)\s+(?:stepping|jumping|walking|driving)\s+(?:out\s+)?(?:in\s+front\s+of|into\s+(?:traffic|the\s+(?:road|river|sea|canal|water))|off\s+(?:a|the)\s+(?:bridge|roof|cliff|balcony|building))\b/i,
  // Stated, not only thought about: "I am going to step in front of a train"
  // returned nothing at all, because only the thinking form had been written
  // down. The clause has to stop there, so the charity jump off the bridge
  // into the river, and the swimmer who walks into the sea at dawn, are left
  // alone.
  // Said of oneself: without that, "my son is nearly going to step in front of
  // a bus" and "he is about to walk into traffic" — a parent writing about a
  // toddler — raised the card and held that writing out of their own Book.
  // And without the sea and the cliff, which cannot be told from a swimmer and
  // a coasteer in a product full of them; the thought-about form above still
  // carries both.
  re(
    String.raw`\b(?:i|we)\b(?:['’]m|['’]re|\s+am|\s+are)?\s+(?:going\s+to|gonna|about\s+to|plan(?:ning)?\s+to)\s+(?:step|jump|walk|drive)\s+(?:out\s+)?(?:in\s+front\s+of(?:\s+(?:a|the)\s+(?:train|bus|lorry|truck|car|van|tram))?|into\s+traffic|off\s+(?:a|the)\s+(?:bridge|roof|balcony|building))` +
      CLAUSE_END,
  ),
  // The water is the one a swimmer writes too, so there the sentence has to
  // stop dead: "I am going to walk into the sea." is this, and "… into the
  // sea tomorrow" or "… at dawn every morning this year" is a swim. The
  // thought-about form above keeps the loose ending for all of them.
  re(
    String.raw`\b(?:i|we)\b(?:['’]m|['’]re|\s+am|\s+are)?\s+(?:going\s+to|gonna|about\s+to|plan(?:ning)?\s+to)\s+(?:step|jump|walk|drive)\s+(?:out\s+)?into\s+the\s+(?:sea|water|river|canal|road)(?=\s*(?:[.!?]|$))`,
  ),
  /\b(?:hang|hanging|hung|shoot|shooting|drown|drowning|burn|burning|burnt|burned)\s+my ?self(?![\w-])(?!\s+(?:out\s+to\s+dry|on\s+the\s+(?:oven|iron|pan|hob|stove|kettle)|with\s+the\s+(?:iron|kettle|oven|pan)|making|cooking))/i,
  /\b(?:took|take|taking|taken)\s+(?:all|too\s+many)\s+(?:of\s+)?(?:my|the)\s+(?:pills|tablets|meds|medication)\b/i,
  /\bod['’]d\b|\bod['’]?ed\b/i,
  /\boverdos(?:e|ed|es|ing)?\b(?!\s+(?:on|of)\s+(?:coffee|caffeine|sugar|chocolate|cake|netflix|tv|telly|news|it|the\s+news|cheese|carbs|screen))/i,
  // "do not want", "don't want", "didn't want", "doesn't want" — and only when
  // the clause ends there: "don't want to wake up at 5am", "didn't want to go
  // on the trip", "don't want to live in this flat" are a hard week, not this.
  // Split by how many ways the object can be read. "Be here", "be alive",
  // "be around", "exist" mean one thing, and a new clause after them is still
  // that thing; "live", "wake up", "go on", "carry on" are all ordinary in a
  // hard week, so for those the clause has to actually stop.
  re(String.raw`\b(?:do|does|did)(?:\s+not|n['’]?t)\s+(?:want\s+to|wanna)\s+(?:be\s+here|be\s+alive|be\s+around|exist)` + CLAUSE_END_WIDE),
  re(String.raw`\b(?:do|does|did)(?:\s+not|n['’]?t)\s+(?:want\s+to|wanna)\s+(?:live|wake\s+up|go\s+on|carry\s+on)` + CLAUSE_END),
  re(String.raw`\bnot\s+want(?:ing)?\s+to\s+(?:be\s+here|be\s+alive|be\s+around|live|wake\s+up|exist)` + CLAUSE_END),
  // Wishes. "wish I was here when the kids were small" and "wish I was born in
  // the 90s" are ordinary; the wish that counts is not to be.
  /\bwish(?:ed|ing)?\s+(?:that\s+)?(?:i|I)(?:['’]d\s+never\s+been\s+born|\s+(?:(?:was|were)\s+(?:dead|never\s+born|not\s+(?:alive|here|around))|(?:wasn['’]?t|weren['’]?t|was\s+not|were\s+not)\s+(?:here|alive|born|around)|(?:didn['’]?t|did\s+not|don['’]?t|do\s+not)\s+exist|(?:hadn['’]?t|had\s+not|had\s+never|had)\s+(?:never\s+)?been\s+born|had\s+died|(?:would|could)\s+(?:just\s+)?(?:die|disappear|not\s+wake\s+up)))\b/i,
  /\bbetter\s+(?:off\s+)?(?:without\s+me|dead|if\s+(?:i|I)\s+(?:(?:was|were)(?:n['’]?t)?\s+(?:gone|here|around|dead|alive|born)|wasn['’]?t\s+(?:here|around|alive|born)|died|disappeared))\b/i,
  /\bhappier\s+(?:without\s+me|if\s+(?:i|I)\s+(?:was|were)\s+(?:gone|dead|not\s+(?:here|around)))\b/i,
  /\bself[- ]?harm\w*/i,
  // A body part in the plural, or the reflexive without an accident after it:
  // "cutting my arms" is this; "cut my arm on the rose bush", "cut myself
  // shaving" are not.
  /\b(?:cut|cutting|cuts|harm|harming|harms|harmed)\s+(?:my ?self(?![\w-])(?!\s+(?:shaving|chopping|slicing|cooking|opening|gardening|on\s+the|with\s+the|at\s+work|in\s+the\s+(?:kitchen|garden|garage|workshop)|doing\s+the))|my\s+(?:arms|legs|wrists|thighs|arm|leg|wrist|thigh|skin)\b(?!\s+(?:on|to\s+(?:ribbons|shreds|pieces|bits)|shaving|while|when|with|at|in|chopping|cooking|gardening|falling|climbing|playing|doing|during|again\s+on|open\s+on|up\s+on|badly\s+on)))/i,
  // "hurt my legs" is a gym sentence; so is "hurt myself deadlifting".
  // "Hurt myself" with nothing after it is not.
  // "hurt my legs" is a gym sentence; so is "hurt myself deadlifting" and
  // "hurt myself pretty badly at the gym". "Hurt myself" with nothing
  // after it, or with "when it gets bad", is not.
  /\b(?:hurt|hurting|hurts)\s+my ?self(?![\w-])(?!\s+(?:deadlifting|squatting|lifting|running|training|playing|skiing|climbing|falling|cycling|skating|slipping|tripping|at\s+(?:the\s+)?(?:gym|work|football|rugby|training|five-a-side|practice)|in\s+the\s+(?:gym|garden|kitchen)|on\s+the\s+(?:bike|stairs|ice|pitch|court|slopes)|doing\s+(?:the|a|my)|laughing|getting|(?:pretty|quite|really|so|very)\s+badly\s+(?:at|in|on|playing|doing|falling|skiing|when)|badly\s+(?:at|in|on|playing|doing|falling|skiing|when)|last\s+(?:week|month|year|night|time)|yesterday|when\s+i\s+(?:fell|slipped|tripped|crashed|landed)))/i,
  // "no point in going on holiday", "no point in living in London" carry on
  // into something; the sentence this is for stops.
  re(String.raw`\b(?:no\s+(?:reason|point)\s+(?:to|in)|what(?:['’]s|\s+is)\s+the\s+point\s+(?:of|in))\s+(?:go(?:ing)?\s+on|carry(?:ing)?\s+on|liv(?:e|ing)|be(?:ing)?\s+here|be(?:ing)?\s+alive|stay(?:ing)?\s+alive|any\s+of\s+it|it\s+all)` + CLAUSE_END),
  /\bnothing\s+(?:left\s+)?to\s+live\s+for\b/i,
  /\blife\s+(?:isn['’]?t|is\s+not|is\s+no\s+longer|ain['’]?t)\s+worth\s+living\b/i,
  /\bnot\s+worth\s+(?:living|being\s+alive|going\s+on|staying\s+alive)\b/i,
  re(String.raw`\btired\s+of\s+(?:being\s+alive|living|life)` + CLAUSE_END),
  /\bwant\s+(?:my\s+)?life\s+to\s+(?:end|be\s+over)\b/i,
  /\b(?:hope|hoping|hoped|pray|praying|prayed)\s+(?:that\s+)?(?:i|I)\s+(?:don['’]?t|do\s+not|never|won['’]?t|will\s+not)\s+wake\s+up\b/i,
  re(String.raw`\bnever\s+wake\s+up` + CLAUSE_END),
  // "I want to go to sleep and not wake up" is the commonest way this is
  // written and it returned nothing: "not wake up" was on the list of things
  // a person can not want to do, and only directly after "want to". Not after
  // a modal, so "I did not wake up." stays a late morning.
  // The modal is not always the word before "not" ("would simply not wake
  // up"), it is not always on the list ("must not", "had better not"), and
  // "to not wake up" is the split infinitive of an ordinary sleep sentence.
  // With the loose ending this read "I am trying to not wake up so much in
  // the night" as a crisis, which is a person's first line about their sleep.
  re(
    String.raw`(?<!\b(?:did|does|do|could|would|will|shall|can|must|might|may|should|better|to)\s(?:just\s|simply\s|really\s|still\s|ever\s)?)\bnot\s+wake\s+up` +
      CLAUSE_END_PLAIN,
  ),
];

interface ConcernPattern {
  re: RegExp;
  category: 'despair' | 'disordered-eating' | 'substance';
}

const CONCERN: ConcernPattern[] = [
  // ---- despair
  { re: /\bhat(?:e|ed|ing)\s+my ?self(?![\w-])/i, category: 'despair' },
  // "worthless" of themselves: "the warranty is worthless" is not this.
  { re: /(?:\b(?:i(?:['’]| a)?m|i\s+am|i\s+feel|i\s+felt|feel(?:ing)?|felt|am)\s+(?:so\s+|totally\s+|completely\s+|utterly\s+|just\s+)?worthless\b|^\s*worthless\b)/i, category: 'despair' },
  { re: /\bi(?:['’]| a)?m\s+(?:such\s+a|just\s+a|a)\s+(?:(?:complete|total|utter|absolute)\s+)?failure\b/i, category: 'despair' },
  { re: /\b(?:feel|feels|felt|feeling)\s+like\s+(?:such\s+)?a\s+(?:(?:complete|total|utter|absolute)\s+)?failure\b/i, category: 'despair' },
  // "can't cope" is the emotional sentence; "can't go on" and "can't carry
  // on" only when the clause ends there ("can't carry on with the diploma"
  // is a course), "can't take it" and "can't do it" only with "any more".
  { re: /\bcan(?:['’]?t|not)\s+cope\b/i, category: 'despair' },
  // "can't carry on with this job" softens the morning; "can't face it" is
  // the washing up, and stays out.
  { re: re(String.raw`\bcan(?:['’]?t|not)\s+(?:go\s+on|carry\s+on|keep\s+going)(?:\s+with\s+(?:this|the|my|our|it|them))?` + CLAUSE_END), category: 'despair' },
  { re: /\bcan(?:['’]?t|not)\s+(?:take\s+(?:it|this)|do\s+(?:it|this)|keep\s+(?:it|this)\s+up)\s+(?:any\s?more|any\s+longer|much\s+longer)\b/i, category: 'despair' },
  { re: /\bpanic\s+attacks?\b/i, category: 'despair' },
  { re: /\bhopeless(?:ness)?\b(?!\s+(?:at|with|romantic)\b)/i, category: 'despair' },
  // "nobody would even notice" is the shape people actually write. "no one
  // will notice the typo" is a typo.
  { re: /\b(?:nobody|no\s?one)\s+(?:would|will|even|really)\s+(?:even\s+|really\s+|actually\s+)?(?:care|cares|notice|notices|miss|misses)\b(?!\s+(?:the|a|an|that|it|this|my|about|(?:if|whether)\s+(?:it|the|we|you|they|he|she|there))\b)/i, category: 'despair' },
  { re: /\bnumb\s+(?:all\s+the\s+time|most\s+days|most\s+of\s+the\s+time|inside)\b/i, category: 'despair' },
  { re: /\b(?:i(?:['’]| a)?m|i\s+am)\s+(?:just\s+)?a\s+burden\b/i, category: 'despair' },
  { re: /\bcry(?:ing)?\s+(?:every\s+(?:day|night)|my ?self\s+to\s+sleep)\b/i, category: 'despair' },
  // ---- disordered eating
  // "Starving" on its own is hungry after a swim; it counts with "myself",
  // "all day" or a reason. "bingeing" keeps its e, and it is the spelling
  // people use; a binge of a series is a Sunday. "purged my wardrobe" is a
  // tidy-up.
  { re: /\bstarv(?:e|es|ed|ing)\s+(?:my ?self|all\s+day|on\s+(?:weekdays|purpose)|to\s+(?:fit|lose|get|look)|for\s+(?:a|the)\s+(?:dress|wedding|photo|weigh))/i, category: 'disordered-eating' },
  { re: /\bpurg(?:e|es|ed|ing)\b(?!\s+(?:the|old|files|data|my|our|your|his|her|their|a|an|through)\b)/i, category: 'disordered-eating' },
  { re: /\bbing(?:e|es|ed|ing|eing)\b(?![-\s]?watch)(?!\s+(?:\w+\s+){0,4}(?:series|seasons?|episodes?|show|box\s*set|netflix|telly|tv)\b)/i, category: 'disordered-eating' },
  { re: /\b(?:make|making|made)\s+my ?self\s+(?:sick|throw\s+up)\b/i, category: 'disordered-eating' },
  { re: /\brestrict(?:ing|ed)?\s+(?:my\s+)?(?:food|calories|intake)\b/i, category: 'disordered-eating' },
  { re: /\b\d{2,4}\s?(?:kg|lbs?|pounds|kcal|calories)\b(?!\s+(?:squat|deadlift|bench|press|lift|clean|snatch|row|total|pull|for\s+\d))(?:.{0,24})\b(?:lose|lost|losing|target|goal|under|max|fail\w*)\b/i, category: 'disordered-eating' },
  // ---- substance
  { re: /\b(?:drink|drinking|drank|drunk)\s+(?:way\s+|far\s+|much\s+)?(?:too\s+much(?!\s+(?:coffee|tea|water|caffeine|milk|juice|pop|soda|red\s+bull|energy))|every\s?(?:day|night)|to\s+forget|to\s+(?:get\s+)?(?:sleep|numb|cope))\b/i, category: 'substance' },
  { re: /\bdrunk\s+(?:every|most)\s+(?:night|day|evening)s?\b/i, category: 'substance' },
  { re: /\brelapsed?\b(?!\s+(?:into\s+(?:old\s+)?(?:habits|ways)|on\s+the\s+(?:diet|sugar|snooze)))/i, category: 'substance' },
  { re: /\ba\s+bottle\s+(?:of\s+\w+\s+)?(?:a|every|each|per)\s+(?:night|day|evening)\b/i, category: 'substance' },
];

export interface SafetyResult {
  risk: SafetyRisk;
  /** Never the matched text: we log the category, not the person's words. */
  category: 'self-harm' | 'despair' | 'disordered-eating' | 'substance' | null;
  action: 'continue' | 'soften' | 'resources';
}

const RANK: Record<SafetyRisk, number> = { none: 0, concern: 1, crisis: 2 };

/** The stricter of two verdicts. A second opinion may only ever tighten. */
export function worseRisk(a: SafetyRisk, b: SafetyRisk): SafetyRisk {
  return RANK[a] >= RANK[b] ? a : b;
}

export function isWorse(candidate: SafetyRisk, current: SafetyRisk): boolean {
  return RANK[candidate] > RANK[current];
}

export function actionFor(risk: SafetyRisk): SafetyResult['action'] {
  return risk === 'crisis' ? 'resources' : risk === 'concern' ? 'soften' : 'continue';
}

/**
 * What the concern band actually does (PRD 11.6).
 *
 * For a long time it did nothing: the verdict was computed, stored on the row,
 * and then every screen treated it exactly like `none`. Three concrete things
 * are owed to somebody whose writing lands here, and they are small enough to
 * say in one place:
 *
 * 1. the next prompt is softer — the fierce register does not get to push;
 * 2. no numeric targets — the Consistency figure comes off the brief, because
 *    a number is the last thing a flat week needs to be scored with;
 * 3. professional support is named once, not every morning.
 *
 * The window is how long "next" lasts. A day is the honest reading: the brief
 * is written each morning out of the night before.
 */
export const SOFTEN_WINDOW_DAYS = 1;

/**
 * The support line. App prose, deliberately plain, and it names nothing the
 * app cannot deliver — the helplines it points at are the ones in HELPLINES,
 * already on the resources card.
 */
export const SUPPORT_LINE =
  'If the last few days have been heavier than usual, talking to someone — a doctor, a therapist, one of the lines under You, the last tab — is a reasonable thing to do. It is there whenever you want it.';

/** Whether a day is inside the soften window of a flagged day. */
export function withinSoftenWindow(flaggedDay: string, today: string, windowDays = SOFTEN_WINDOW_DAYS): boolean {
  if (!flaggedDay || !today) return false;
  const a = Date.parse(`${flaggedDay}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  const gap = Math.round((b - a) / 86_400_000);
  return gap >= 0 && gap <= windowDays;
}

/**
 * Whether the app may name professional support this morning: only in the
 * concern band, and only if it has not already done so.
 */
export function shouldOfferSupport(soften: boolean, supportOfferedAt: string | null): boolean {
  return soften && !supportOfferedAt;
}

/** One screened thing and the day it was written. Category and text stay out. */
export interface RiskStamp {
  risk: SafetyRisk | null | undefined;
  day: string;
}

/**
 * Whether this morning is inside the concern band.
 *
 * Takes a flat list rather than the store, for the same reason the day
 * accounting does: the rule is worth testing on its own, and the store cannot
 * be imported into a test without React Native coming with it. The store's job
 * is to collect the stamps — a sitting, an analysis line, a proof, a day, and
 * the one date the chat leaves behind — and this decides.
 *
 * Crisis is deliberately not in the band. Crisis has its own path: the sitting
 * pauses, the resources card comes up, and the writing never reaches the Book.
 * A softened brief is what the *next* morning owes somebody, and after a crisis
 * the app has already said considerably more than a softened brief would.
 */
export function softenFrom(stamps: readonly RiskStamp[], today: string, windowDays = SOFTEN_WINDOW_DAYS): boolean {
  return stamps.some((st) => st.risk === 'concern' && withinSoftenWindow(st.day, today, windowDays));
}

export function screen(text: string): SafetyResult {
  const t = text ?? '';
  if (!t.trim()) return { risk: 'none', category: null, action: 'continue' };

  for (const re of CRISIS) {
    if (re.test(t)) return { risk: 'crisis', category: 'self-harm', action: 'resources' };
  }
  for (const { re, category } of CONCERN) {
    // The category is the pattern's, not a second guess at the text: a
    // "kg" in a sentence about the gym, or "bingo", used to file a despair
    // line under disordered eating.
    if (re.test(t)) return { risk: 'concern', category, action: 'soften' };
  }
  return { risk: 'none', category: null, action: 'continue' };
}

export interface Helpline {
  region: string;
  name: string;
  contact: string;
}

export const HELPLINES: Helpline[] = [
  { region: 'US', name: '988 Suicide & Crisis Lifeline', contact: '988' },
  { region: 'UK & IE', name: 'Samaritans', contact: '116 123' },
  { region: 'PK', name: 'Umang', contact: '0311 7786264' },
  { region: 'Anywhere', name: 'Find a helpline', contact: 'findahelpline.com' },
];

export const RESOURCES_COPY = {
  title: 'Let’s stop here for a moment.',
  body: 'What you wrote sounds heavy, and it deserves a person, not an app. If you are in danger right now, contact your local emergency number. Otherwise these lines are free and answered by people:',
  dismiss: "I'm okay to continue",
  note: 'Nothing you wrote was added to what Morrow remembers.',
  /**
   * The same sentence for a build with a remote screen. The verdict came
   * back from a service, so "sent nowhere" would be untrue; what is true is
   * that the service keeps nothing, and that Morrow does not either.
   */
  noteRemote: 'Nothing you wrote was added to what Morrow remembers. It was read once by the AI service named under You, which keeps it under its own retention policy; Morrow keeps none of it.',
  /** The same card, asked for from "Need someone?" rather than raised by the screen. */
  askedTitle: 'Someone to talk to.',
  askedBody: 'These lines are free and answered by people. If you are in danger right now, contact your local emergency number.',
  askedDismiss: 'Back to what I was doing',
};

/** Content rules the coach obeys regardless of what was asked (PRD §11.6). */
export function contentGuard(text: string): { allowed: boolean; redirect?: string } {
  // Two shapes. "Keep me under 1200 kcal" names a number; "how many calories
  // should I eat to lose 5 kg" asks for one. The guard only knew the first,
  // so the second — the commoner way to ask — got the generic reply.
  const namesTarget = /\b(\d{3,4})\s?(kcal|calories)\b/i.test(text) && /\b(under|below|max|limit)\b/i.test(text);
  const asksForTarget =
    /\b(calories?|kcal|deficit|macros?)\b/i.test(text) && /\b(how many|how much|should i|what should|target|to lose|lose\s+\d)\b/i.test(text);
  if (namesTarget || asksForTarget) {
    return {
      allowed: false,
      redirect: 'Morrow does not set calorie targets. It can coach the behaviour: book the appointment, track for a week, ask a professional what number is right for you.',
    };
  }
  if (/\b(mg|dose|dosage|prescription|prescribe)\b/i.test(text)) {
    return {
      allowed: false,
      redirect: 'That is a question for a doctor or a pharmacist, not for me. I can help with the part you control: getting the appointment into this week.',
    };
  }
  if (/\b(invest|stock|crypto|shares?|portfolio returns?)\b/i.test(text) && /\b(should i|recommend|which)\b/i.test(text)) {
    return {
      allowed: false,
      redirect: 'I am not able to recommend financial products. The behaviour I can help with is the one you wrote down: move the money on the day you said.',
    };
  }
  return { allowed: true };
}

/**
 * Whether a piece of writing may be handed back to the person.
 *
 * Writing done in crisis stays on the device — it is theirs, it exports with
 * everything else, and deleting it is their decision, not ours. What must never
 * happen is the app returning it to them as material: quoted in the read-back,
 * sealed into the Book, mined for a Portrait, or read out in the morning. A
 * person who wrote the worst sentence of their life at 2am should not meet it
 * again over breakfast in a serif face, presented as the life they want.
 */
export function isQuotable(text: { safetyRisk?: SafetyRisk | null } | null | undefined): boolean {
  return !!text && text.safetyRisk !== 'crisis';
}

/** The same rule over a list, for the places that seal or read back in bulk. */
export function quotable<T extends { safetyRisk?: SafetyRisk | null }>(texts: readonly T[]): T[] {
  return texts.filter(isQuotable);
}
