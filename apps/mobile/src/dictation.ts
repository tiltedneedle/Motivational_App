/**
 * Talking as writing (PRD §7.2: "say it" is the Fifteen's default mode).
 *
 * Two recognisers, one interface. On a phone it is `expo-speech-recognition`
 * — on-device where the phone has it — loaded lazily and behind a try/catch
 * like every other native edge in this app: a build without the module, or a
 * device that refuses the microphone, is a room where the person types, not
 * a room that fails to open. In a browser it is the Web Speech API, driven
 * directly: the module's web shim creates a fresh recogniser on every
 * `start()` without stopping the last, so each restart aborted the one
 * before it, the abort fired an `end`, the `end` started another, and the
 * room stopped hearing after its first sentence.
 *
 * What comes out is text and only text. Nothing here stores audio, and with
 * `requiresOnDeviceRecognition` the words never leave the phone on a device
 * that can do it locally; where it cannot, the OS recogniser is used and
 * the consent screen says so under "What is sent, and when".
 *
 * The transcript arrives as the running text of the *current* stretch and
 * grows with it, and the caller is told when a stretch is final. Each final
 * stretch is committed by the caller; the next one starts clean. A
 * recogniser that stops on its own — silence, an interruption, the
 * browser's own limit — is started again for as long as the caller wants it
 * listening, so a pause for breath is not the end of the room.
 */
import { Platform } from 'react-native';

export interface DictationHandlers {
  /** The running text of the current stretch, and whether it is finished. */
  onText: (text: string, final: boolean) => void;
  /** One plain sentence. Nothing here is a stack trace. */
  onProblem: (message: string) => void;
  /**
   * How loud the room is, 0 to 1, a few times a second — for the one sign
   * that the room is hearing. Not every recogniser can say; then it is
   * never called.
   */
  onLevel?: (level: number) => void;
}

export interface Dictation {
  /** Whether this build and device can listen at all. */
  available(): Promise<boolean>;
  /**
   * Ask for the microphone before anything else is running. The doorway
   * asks here, so the OS dialog comes before the clock, not on it.
   */
  permission(): Promise<'granted' | 'refused' | 'unavailable'>;
  /** Ask for the microphone (once) and start listening. Resolves false when it cannot. */
  start(handlers: DictationHandlers): Promise<boolean>;
  /** Stop listening. The last stretch is delivered as final if there is one. */
  stop(): void;
}

const NO_MIC = 'This device cannot listen, so the room is a typed one.';
const REFUSED = 'The microphone was not allowed. You can type instead, or allow it in Settings.';
const NO_NETWORK = 'No connection for the recogniser just now. Type for a moment; it will try again.';

export function dictation(): Dictation {
  return Platform.OS === 'web' ? webDictation() : nativeDictation();
}

// ---------------------------------------------------------------- the browser

/** The Web Speech API, as Chrome, Edge and Safari spell it. */
type WebRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  /** Chrome 139+: keep the sound on the device. Unknown to older browsers. */
  processLocally?: boolean;
  onresult: ((ev: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0?: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type WebRecognitionClass = (new () => WebRecognition) & {
  /** Chrome 139+: whether the language can be recognised, and where. */
  available?: (opts: { langs: string[]; processLocally?: boolean; quality?: 'command' | 'dictation' | 'conversation' }) => Promise<string>;
};

/**
 * The recogniser's language: the browser's own English where it has one —
 * en-GB, en-IN, en-AU hear their own vowels better than en-US does — and
 * en-US otherwise. A browser that turns the regional one down
 * (`language-not-supported`) is asked again in en-US, once.
 */
const FALLBACK_LANG = 'en-US';
function browserEnglish(): string {
  const tag = (globalThis as unknown as { navigator?: { language?: string } }).navigator?.language ?? '';
  return /^en-[A-Za-z]{2}$/.test(tag) ? tag : FALLBACK_LANG;
}
let lang = browserEnglish();

/**
 * Whether this browser can recognise the language on the device itself.
 * Asked once per page, on the doorway; `null` until then. Where it can,
 * the sound never leaves the phone or the laptop — the same rule the phone
 * app keeps with `requiresOnDeviceRecognition`. Nothing is downloaded to
 * make it so: a language pack the browser offers but has not fetched is
 * left where it is.
 */
let onDevice: boolean | null = null;

async function checkOnDevice(): Promise<void> {
  if (onDevice !== null) return;
  const R = webRecognitionClass();
  if (!R?.available) {
    onDevice = false;
    return;
  }
  try {
    onDevice = (await R.available({ langs: [lang], processLocally: true, quality: 'dictation' })) === 'available';
  } catch {
    onDevice = false;
  }
}

/**
 * Whether the page is on an address a browser will let listen: https, or
 * localhost. Over plain http on a Wi-Fi address the recogniser and the
 * microphone are both refused before anyone is asked, and the room should
 * say so on the doorway rather than after Begin.
 */
export function secureEnough(): boolean {
  const w = globalThis as unknown as { isSecureContext?: boolean };
  return w.isSecureContext !== false;
}

function webRecognitionClass(): WebRecognitionClass | null {
  const w = globalThis as unknown as { webkitSpeechRecognition?: WebRecognitionClass; SpeechRecognition?: WebRecognitionClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * A level meter on the web: the microphone through an analyser, read a few
 * times a second, nothing kept. Chromium only — WebKit's recogniser does
 * not share the microphone with a second listener gracefully.
 */
type Meter = { stop(): void };
async function meter(onLevel: (level: number) => void): Promise<Meter | null> {
  const w = globalThis as unknown as {
    navigator?: { userAgent?: string; mediaDevices?: { getUserMedia?: (c: { audio: boolean }) => Promise<MediaStream> } };
    AudioContext?: new () => AudioContext;
  };
  const ua = w.navigator?.userAgent ?? '';
  if (!/Chrom(e|ium)/.test(ua) || !w.AudioContext || !w.navigator?.mediaDevices?.getUserMedia) return null;
  try {
    const stream = await w.navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new w.AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    const tick = setInterval(() => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = ((buf[i] ?? 128) - 128) / 128;
        sum += v * v;
      }
      // RMS of quiet speech is around 0.05; a raised voice 0.3. Scaled so
      // ordinary talking fills most of the range.
      onLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
    }, 120);
    return {
      stop() {
        clearInterval(tick);
        for (const t of stream.getTracks()) t.stop();
        void ctx.close().catch(() => undefined);
      },
    };
  } catch {
    return null;
  }
}

function webDictation(): Dictation {
  let wanted = false;
  let rec: WebRecognition | null = null;
  let current: DictationHandlers | null = null;
  let level: Meter | null = null;
  let restart: ReturnType<typeof setTimeout> | null = null;
  // Errors in a row with no words between them. Three and it stops, rather
  // than a recogniser that fails, restarts and fails again forever.
  let strikes = 0;

  const drop = () => {
    if (restart) clearTimeout(restart);
    restart = null;
    if (rec) {
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      try {
        rec.abort();
      } catch {
        // Already gone.
      }
    }
    rec = null;
  };

  const later = (ms: number) => {
    if (restart) clearTimeout(restart);
    restart = setTimeout(() => {
      restart = null;
      if (wanted) begin();
    }, ms);
  };

  const begin = () => {
    const R = webRecognitionClass();
    if (!R) {
      wanted = false;
      current?.onProblem(NO_MIC);
      return;
    }
    // One recogniser at a time. The browser allows one, and two of them
    // was the bug this file exists to fix.
    if (rec) {
      const old = rec;
      rec = null;
      old.onresult = null;
      old.onend = null;
      old.onerror = null;
      try {
        old.abort();
      } catch {
        // Already gone.
      }
    }
    const r = new R();
    rec = r;
    r.lang = lang;
    if (onDevice) r.processLocally = true;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    // How many final stretches of this recogniser the caller has been
    // handed. The browser keeps every stretch of the session in `results`;
    // the ones before this index are already in the person's text.
    let committed = 0;
    r.onresult = (ev) => {
      if (rec !== r) return;
      const results = ev.results;
      // Every stretch the browser has just finished, oldest first, each as
      // its own final; then whatever it is still hearing.
      for (let i = committed; i < results.length; i++) {
        const stretch = results[i];
        if (!stretch?.isFinal) break;
        const text = stretch[0]?.transcript?.trim() ?? '';
        committed = i + 1;
        strikes = 0;
        if (text) current?.onText(text, true);
      }
      let interim = '';
      for (let i = committed; i < results.length; i++) {
        const stretch = results[i];
        if (stretch && !stretch.isFinal) interim += stretch[0]?.transcript ?? '';
      }
      if (interim.trim()) {
        strikes = 0;
        current?.onText(interim, false);
      }
    };
    r.onend = () => {
      if (rec !== r) return;
      rec = null;
      // Silence, the browser's own limit, or an interruption. Still wanted,
      // so listen again — after a beat, so a browser that ends and errors in
      // the same instant does not see two starts.
      if (wanted) later(250);
    };
    r.onerror = (ev) => {
      if (rec !== r) return;
      const code = String(ev?.error ?? '');
      // A stretch with nothing in it, or a stop of our own: `onend` follows
      // and starts again if wanted.
      if (code === 'no-speech' || code === 'aborted') return;
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        wanted = false;
        current?.onProblem(REFUSED);
        return;
      }
      if (code === 'audio-capture') {
        wanted = false;
        current?.onProblem(NO_MIC);
        return;
      }
      if (code === 'network') {
        current?.onProblem(NO_NETWORK);
        rec = null;
        r.onend = null;
        later(3000);
        return;
      }
      // The browser said it could recognise on the device and then could
      // not, or turned the regional English down: once more, the ordinary
      // way, in en-US, and no more asking.
      if (code === 'language-not-supported' && (onDevice || lang !== FALLBACK_LANG)) {
        onDevice = false;
        lang = FALLBACK_LANG;
        rec = null;
        r.onend = null;
        later(200);
        return;
      }
      strikes += 1;
      if (strikes >= 3) {
        wanted = false;
        current?.onProblem(NO_MIC);
      }
    };
    try {
      r.start();
    } catch {
      // "already started" from a browser that has not yet fired `end` for
      // the last one: once more, in a moment.
      rec = null;
      later(400);
    }
  };

  return {
    async available() {
      return webRecognitionClass() !== null && secureEnough();
    },

    async permission() {
      if (!webRecognitionClass()) return 'unavailable';
      await checkOnDevice();
      // The browser asks for the microphone on the first `start()`, which
      // would be on the clock. Asking through getUserMedia here brings the
      // dialog forward to the doorway, and the stream is closed at once:
      // nothing is recorded.
      const media = (globalThis as unknown as { navigator?: { mediaDevices?: { getUserMedia?: (c: { audio: boolean }) => Promise<{ getTracks(): { stop(): void }[] }> } } }).navigator?.mediaDevices;
      if (!media?.getUserMedia) return 'granted';
      try {
        const stream = await media.getUserMedia({ audio: true });
        for (const t of stream.getTracks()) t.stop();
        return 'granted';
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        return name === 'NotAllowedError' || name === 'SecurityError' ? 'refused' : name === 'NotFoundError' ? 'unavailable' : 'granted';
      }
    },

    async start(handlers) {
      if (!webRecognitionClass()) {
        handlers.onProblem(NO_MIC);
        return false;
      }
      current = handlers;
      wanted = true;
      strikes = 0;
      begin();
      if (handlers.onLevel) {
        const mine = handlers;
        void meter((v) => {
          if (current === mine) mine.onLevel?.(v);
        }).then((m) => {
          if (!m) return;
          // Stopped before the meter came up: let it go at once.
          if (current !== mine || !wanted) m.stop();
          else level = m;
        });
      }
      return true;
    },

    stop() {
      wanted = false;
      level?.stop();
      level = null;
      const r = rec;
      if (restart) clearTimeout(restart);
      restart = null;
      if (r) {
        // `stop`, not `abort`: the last stretch still arrives as a final.
        try {
          r.stop();
        } catch {
          // Already stopped.
        }
        // After the final result has had a moment to arrive.
        setTimeout(() => {
          if (rec === r) drop();
        }, 800);
      }
    },
  };
}

// ---------------------------------------------------------------- the phone

type Module = typeof import('expo-speech-recognition');

let loaded: Module | null | undefined;

async function module(): Promise<Module | null> {
  if (loaded !== undefined) return loaded;
  try {
    const m: Module = await import('expo-speech-recognition');
    loaded = m?.ExpoSpeechRecognitionModule ? m : null;
  } catch {
    loaded = null;
  }
  return loaded;
}

function nativeDictation(): Dictation {
  let listening = false;
  let subs: { remove(): void }[] = [];
  let current: DictationHandlers | null = null;
  // On-device first. A phone that says it can and then cannot for this
  // language answers with an error, and the next start goes through the OS
  // recogniser instead rather than telling the person the microphone failed.
  let onDevice: boolean | null = null;
  // Errors in a row with no words between them. Three and it stops, rather
  // than a recogniser that fails, restarts and fails again forever.
  let strikes = 0;
  // When the recogniser was last started, so an `end` that belongs to the
  // one just replaced does not start a third.
  let startedAt = 0;
  // Which start() the current listeners belong to. A stop() clears its own
  // listeners a moment later, after the last result has had time to arrive;
  // a start() that came in between — every return to the app does this —
  // must not have its fresh listeners taken away by the old stop's timer.
  // That is exactly what happened: the room said Listening and heard nothing.
  let generation = 0;

  const clear = () => {
    for (const s of subs) s.remove();
    subs = [];
  };

  const begin = (m: Module) => {
    startedAt = Date.now();
    try {
      m.ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
        // On-device when the phone can; the OS recogniser where it cannot,
        // and the app never sees audio either way.
        requiresOnDeviceRecognition: (onDevice ??= m.ExpoSpeechRecognitionModule.supportsOnDeviceRecognition?.() === true),
        addsPunctuation: true,
        // Long-form speech, not a command: Apple's recogniser tunes for it.
        iosTaskHint: 'dictation',
        // The recogniser's own volume, a few times a second, for the pulse.
        volumeChangeEventOptions: { enabled: true, intervalMillis: 150 },
      });
    } catch {
      current?.onProblem(NO_MIC);
      listening = false;
    }
  };
  /** Start again, unless a start is already under way. */
  const again = (m: Module, after = 0) => {
    if (!listening) return;
    if (Date.now() - startedAt < 300) return;
    if (after) setTimeout(() => listening && begin(m), after);
    else begin(m);
  };

  return {
    async available() {
      const m = await module();
      if (!m) return false;
      try {
        return m.ExpoSpeechRecognitionModule.isRecognitionAvailable();
      } catch {
        return false;
      }
    },

    async permission() {
      const m = await module();
      if (!m) return 'unavailable';
      try {
        // No recogniser on this phone: say so before the OS is asked for a
        // microphone the room could not use.
        if (!m.ExpoSpeechRecognitionModule.isRecognitionAvailable()) return 'unavailable';
      } catch {
        return 'unavailable';
      }
      try {
        const allowed = await m.ExpoSpeechRecognitionModule.requestPermissionsAsync();
        return allowed?.granted ? 'granted' : 'refused';
      } catch {
        return 'unavailable';
      }
    },

    async start(handlers) {
      const m = await module();
      if (!m) {
        handlers.onProblem(NO_MIC);
        return false;
      }
      try {
        const allowed = await m.ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!allowed?.granted) {
          handlers.onProblem(REFUSED);
          return false;
        }
      } catch {
        handlers.onProblem(NO_MIC);
        return false;
      }
      current = handlers;
      listening = true;
      strikes = 0;
      generation += 1;
      clear();
      const mod = m.ExpoSpeechRecognitionModule;
      subs.push(
        mod.addListener('volumechange', (e) => {
          // -2..10, below 0 inaudible.
          current?.onLevel?.(Math.max(0, Math.min(1, (e.value ?? 0) / 8)));
        }),
        mod.addListener('result', (e) => {
          const text = e.results?.[0]?.transcript ?? '';
          strikes = 0;
          current?.onText(text, e.isFinal);
          // A final stretch is committed by the caller; the next one starts
          // clean rather than growing on top of it.
          if (e.isFinal) again(m);
        }),
        mod.addListener('end', () => {
          // Silence, or the OS cut it. Still wanted, so listen again.
          again(m);
        }),
        mod.addListener('error', (e) => {
          const code = String(e?.error ?? '');
          if (code === 'aborted') return;
          // A stretch with nothing in it is not a problem worth a sentence.
          if (code === 'no-speech' || code === 'nomatch') {
            again(m);
            return;
          }
          if ((code === 'language-not-supported' || code === 'service-not-allowed') && onDevice) {
            // The on-device model is not there for this language. Once
            // more, through the OS recogniser.
            onDevice = false;
            again(m);
            return;
          }
          if (code === 'not-allowed' || code === 'service-not-allowed') {
            listening = false;
            current?.onProblem(REFUSED);
            return;
          }
          if (code === 'network') {
            current?.onProblem(NO_NETWORK);
            again(m, 3000);
            return;
          }
          strikes += 1;
          if (strikes >= 3) {
            listening = false;
            current?.onProblem(NO_MIC);
            return;
          }
          again(m, 600);
        }),
      );
      begin(m);
      return true;
    },

    stop() {
      listening = false;
      const mine = generation;
      void module().then((m) => {
        try {
          m?.ExpoSpeechRecognitionModule.stop();
        } catch {
          // Already stopped.
        }
        // After the final result has had a moment to arrive — and only if no
        // start() has registered new listeners since.
        setTimeout(() => {
          if (generation === mine) clear();
        }, 800);
      });
    },
  };
}
