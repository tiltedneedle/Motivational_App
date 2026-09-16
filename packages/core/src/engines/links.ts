/**
 * Deep links (PRD §9.3) and the screen inventory's paths (§9.2), resolved to
 * the routes this app actually has.
 *
 * The PRD writes its links the way a document does — `morrow://goal/{id}`,
 * `/goals/[id]/stone/[kind]`, `/book/sunday` — and the app's routes are flat
 * with query strings: `/goal?id=`, `/stone?goal=&kind=`, `/reading`. Either
 * shape may arrive: from a notification, a widget, an email, a stale link in
 * somebody's notes. Every one of them lands on a real screen, and a link
 * that names nothing lands on Today rather than on a page that says
 * "Unmatched Route" to a person who only tapped what they were sent.
 *
 * A sign-in link is not a route. It carries the session in its fragment
 * (or a `token_hash`) and the root layout takes it from there; this leaves
 * it exactly as it came.
 */

/** Every route the app has, so a link to one is left alone. */
export const APP_ROUTES = new Set([
  '/',
  '/account',
  '/authoring',
  '/book',
  '/choose',
  '/coach',
  '/consent',
  '/declare',
  '/envision',
  '/explore',
  '/goal',
  '/heard',
  '/interview',
  '/letters',
  '/memory',
  '/new-move',
  '/past',
  '/paywall',
  '/portrait',
  '/practice',
  '/present',
  '/progress',
  '/rank',
  '/reading',
  '/reauthor',
  '/replan',
  '/run',
  '/seal-book',
  '/seal-day',
  '/settings',
  '/stone',
  '/title',
  '/today',
  '/wallpaper',
  '/write',
]);

export function isAuthLink(input: string): boolean {
  return /(^|[#?&])(access_token|refresh_token|token_hash|code)=/.test(input) || /[?&]type=(magiclink|recovery|signup|email)/.test(input);
}

/** The path and query of a link, whatever scheme or host it came with. */
function pathOf(input: string): { path: string; search: string } {
  let s = input.trim();
  // exp://host/--/goal/x: the dev client's own prefix.
  const dev = s.indexOf('/--/');
  if (dev >= 0) s = s.slice(dev + 3);
  // morrow://goal/x has no host: everything after the scheme is the path.
  // https://host/goal/x does, and the host is not part of the route.
  else if (/^morrow:\/\//i.test(s)) s = s.slice('morrow://'.length);
  else if (/^morrow:/i.test(s)) s = s.slice('morrow:'.length);
  else {
    const m = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i.exec(s);
    if (m) s = s.slice(m[0].length);
  }
  if (!s.startsWith('/')) s = '/' + s;
  const hash = s.indexOf('#');
  if (hash >= 0) s = s.slice(0, hash);
  const q = s.indexOf('?');
  const path = (q >= 0 ? s.slice(0, q) : s).replace(/\/+$/, '') || '/';
  const search = q >= 0 ? s.slice(q) : '';
  return { path, search };
}

const enc = (s: string) => encodeURIComponent(decodeURIComponent(s));

/**
 * Where a link goes. Null when it already names one of the app's routes (no
 * redirect), otherwise the route to send it to — Today, if nothing fits.
 */
export function resolveLink(input: string): string | null {
  if (!input || isAuthLink(input)) return null;
  const { path } = pathOf(input);
  if (APP_ROUTES.has(path)) return null;
  const parts = path.split('/').filter(Boolean);
  const [a, b, c, d] = parts;

  if (!a) return null;
  switch (a) {
    case 'welcome':
      return b === 'consent' ? '/consent' : '/?intro=1';
    case 'interview':
      return b === 'heard' ? '/heard' : '/interview';
    case 'authoring':
      if (b === 'write') return c ? `/write?kind=${enc(c)}` : '/write';
      if (b === 'heard') return '/heard';
      if (b === 'rank') return '/rank';
      if (b === 'seal') return '/seal-book';
      if (b === 'bench') return '/present';
      if (b === 'quarry') return '/past';
      return '/authoring';
    case 'goals':
    case 'goal':
      if (!b) return '/today';
      if (c === 'portrait') return `/portrait?goal=${enc(b)}`;
      if (c === 'replan') return `/replan?goal=${enc(b)}`;
      if (c === 'stone') return d ? `/stone?goal=${enc(b)}&kind=${enc(d)}` : `/stone?goal=${enc(b)}`;
      return `/goal?id=${enc(b)}`;
    case 'book':
      if (b === 'sunday') return '/reading';
      if (b === 'reauthor') return '/reauthor';
      if (b === 'declare') return '/declare';
      return '/book';
    case 'practice':
    case 'practices':
      if (b && c === 'run') return `/run?id=${enc(b)}`;
      // The builder takes a goal, not a practice; a practice by id is the runner's business.
      return '/practice';
    case 'letter':
      return '/letters';
    case 'envision':
      return b === 'letters' ? '/letters' : '/envision';
    case 'brief':
      return '/coach';
    case 'coach':
      return b === 'review' ? '/reading' : '/coach';
    case 'capture':
      return '/new-move';
    case 'seal':
      return '/seal-day';
    case 'you':
      return '/progress';
    case 'settings':
      return b === 'memory' ? '/memory' : '/settings';
    case 'auth':
      return '/account';
    default:
      return '/today';
  }
}
