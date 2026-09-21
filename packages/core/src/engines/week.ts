/**
 * The week strip and the streak (the rebuild, 2026-09-21): the two small
 * numbers the home screen shows so that a day has a shape and a run of
 * days has a count. Neither is ever nagged about (PRD §7.7 keeps the
 * Returns letter free of streaks); they are there to be looked at.
 *
 * Everything here works on `YYYY-MM-DD` day keys as `dayOf` makes them, so
 * the app's day boundary is honoured by whoever calls this.
 */

/** `day` shifted by `n` calendar days, as a day key. */
export function shiftDay(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Consecutive sealed days ending today or yesterday. A run that ended two
 * days ago is over; today unsealed does not break a run that ended
 * yesterday, because the evening has not happened yet.
 */
export function streakOf(sealed: ReadonlySet<string> | readonly string[], today: string): number {
  const set = sealed instanceof Set ? sealed : new Set(sealed);
  let day = set.has(today) ? today : shiftDay(today, -1);
  let n = 0;
  while (set.has(day)) {
    n += 1;
    day = shiftDay(day, -1);
  }
  return n;
}

export interface WeekCell {
  key: string;
  /** M T W T F S S */
  letter: string;
  state: 'sealed' | 'today' | 'todaySealed' | 'empty' | 'future';
  /** For a screen reader: "Tuesday 15 September, sealed". */
  label: string;
}

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** The seven days of the week `today` is in, Monday first. */
export function weekOf(today: string, sealed: ReadonlySet<string> | readonly string[]): WeekCell[] {
  const set = sealed instanceof Set ? sealed : new Set(sealed);
  const t = new Date(`${today}T12:00:00`);
  const dow = t.getDay(); // 0 = Sunday
  const monday = shiftDay(today, dow === 0 ? -6 : 1 - dow);
  const out: WeekCell[] = [];
  for (let i = 0; i < 7; i++) {
    const key = shiftDay(monday, i);
    const d = new Date(`${key}T12:00:00`);
    const isToday = key === today;
    const isSealed = set.has(key);
    const future = key > today;
    const state: WeekCell['state'] = isToday ? (isSealed ? 'todaySealed' : 'today') : isSealed ? 'sealed' : future ? 'future' : 'empty';
    out.push({
      key,
      letter: LETTERS[d.getDay()]!,
      state,
      label: `${NAMES[d.getDay()]} ${d.getDate()}${isToday ? ', today' : ''}${isSealed ? ', closed' : future ? '' : isToday ? '' : ', not closed'}`,
    });
  }
  return out;
}
