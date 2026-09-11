/**
 * Talking as writing (PRD §7.2: "say it" is the Fifteen's default mode).
 *
 * The recogniser is `expo-speech-recognition` — on-device where the phone
 * has it, the Web Speech API in a browser — loaded lazily and behind a
 * try/catch like every other native edge in this app: a build without the
 * module, or a device that refuses the microphone, is a room where the
 * person types, not a room that fails to open.
 *
 * What comes out is text and only text. Nothing here stores audio, and with
 * `requiresOnDeviceRecognition` the words never leave the phone on a device
 * that can do it locally; where it cannot, the OS recogniser is used and
 * the consent screen says so under "What is sent, and when".
 *
 * The transcript arrives as a whole for the current utterance and grows with
 * it, so the caller is handed the running text of the *current* stretch and
 * told when it is final. Each final stretch is committed by the caller and
 * the recogniser is started again, which is the one behaviour every platform
 * shares; a recogniser that stops on its own (silence, an interruption) is
 * started again too, for as long as the caller wants it listening.
 */
export interface DictationHandlers {
  /** The running text of the current stretch, and whether it is finished. */
  onText: (text: string, final: boolean) => void;
  /** One plain sentence. Nothing here is a stack trace. */
  onProblem: (message: string) => void;
}

export interface Dictation {
  /** Whether this build and device can listen at all. */
  available(): Promise<boolean>;
  /** Ask for the microphone (once) and start listening. Resolves false when it cannot. */
  start(handlers: DictationHandlers): Promise<boolean>;
  /** Stop listening. The last stretch is delivered as final if there is one. */
  stop(): void;
}

const NO_MIC = 'This device cannot listen, so the room is a typed one.';
const REFUSED = 'The microphone was not allowed. You can type instead, or allow it in Settings.';

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

export function dictation(): Dictation {
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

  const clear = () => {
    for (const s of subs) s.remove();
    subs = [];
  };

  const begin = (m: Module) => {
    try {
      m.ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
        // On-device when the phone can; the OS recogniser where it cannot,
        // and the app never sees audio either way.
        requiresOnDeviceRecognition: (onDevice ??= m.ExpoSpeechRecognitionModule.supportsOnDeviceRecognition?.() === true),
        addsPunctuation: true,
      });
    } catch {
      current?.onProblem(NO_MIC);
      listening = false;
    }
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
      clear();
      const mod = m.ExpoSpeechRecognitionModule;
      subs.push(
        mod.addListener('result', (e) => {
          const text = e.results?.[0]?.transcript ?? '';
          strikes = 0;
          current?.onText(text, e.isFinal);
          // A final stretch is committed by the caller; the next one starts
          // clean rather than growing on top of it.
          if (e.isFinal && listening) begin(m);
        }),
        mod.addListener('end', () => {
          // Silence, or the OS cut it. Still wanted, so listen again.
          if (listening) begin(m);
        }),
        mod.addListener('error', (e) => {
          const code = String(e?.error ?? '');
          if (code === 'aborted') return;
          // A stretch with nothing in it is not a problem worth a sentence.
          if (code === 'no-speech' || code === 'nomatch') {
            if (listening) begin(m);
            return;
          }
          if ((code === 'language-not-supported' || code === 'service-not-allowed') && onDevice) {
            // The on-device model is not there for this language. Once
            // more, through the OS recogniser.
            onDevice = false;
            if (listening) begin(m);
            return;
          }
          if (code === 'not-allowed' || code === 'service-not-allowed') {
            listening = false;
            current?.onProblem(REFUSED);
            return;
          }
          if (code === 'network') {
            current?.onProblem('No connection for the recogniser just now. Type for a moment; it will try again.');
            if (listening) setTimeout(() => listening && begin(m), 3000);
            return;
          }
          strikes += 1;
          if (strikes >= 3) {
            listening = false;
            current?.onProblem(NO_MIC);
            return;
          }
          if (listening) setTimeout(() => listening && begin(m), 600);
        }),
      );
      begin(m);
      return true;
    },

    stop() {
      listening = false;
      void module().then((m) => {
        try {
          m?.ExpoSpeechRecognitionModule.stop();
        } catch {
          // Already stopped.
        }
        // After the final result has had a moment to arrive.
        setTimeout(clear, 800);
      });
    },
  };
}
