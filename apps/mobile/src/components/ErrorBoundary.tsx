/**
 * The last line of defence.
 *
 * If a screen throws, the person must not lose the thing they were writing.
 * This boundary says what happened in plain words, offers the two things that
 * are always true (their writing is on the device; they can export it), and
 * gets out of the way.
 */
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { takeAway, takeawayNote } from '../takeaway';
import { day, radius, type as fonts } from '@morrow/ui';
// The key, not a copy of it: read directly off disk, on purpose — see `getOut`.
import { storedRaw } from '../storage';

interface Props {
  children: React.ReactNode;
  /** Where to send them once they have their writing safe. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
  /** The raw store, when the share sheet could not take it. */
  spilled: string | null;
  exportError: string | null;
}

/** The stored state with the account's and the device's identifiers removed; the bytes as they were when they do not parse. */
export function withoutIdentifiers(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    if (parsed && typeof parsed === 'object' && parsed.state && typeof parsed.state === 'object') {
      const { account: _a, deviceId: _d, lastSync: _l, ...rest } = parsed.state;
      return JSON.stringify({ ...parsed, state: rest });
    }
    return raw;
  } catch {
    return raw;
  }
}

/**
 * The reason in plain words. A chunk that did not arrive — a deploy landed
 * between the page load and the first tap on a tab — used to print
 * "Requiring unknown module '777'" here.
 */
function plainReason(error: Error): string {
  if (/Loading module|Requiring unknown module|dynamically imported module|ChunkLoadError|Failed to fetch/i.test(error.message)) {
    return 'This part of Morrow could not be loaded — most often because a newer Morrow shipped while this one was open. Reload the page to get it.';
  }
  return error.message;
}

export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null, spilled: null, exportError: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, spilled: null, exportError: null };
  }

  /**
   * Get the writing out, without going through anything that just crashed.
   *
   * The screen says "export it first if you would rather be certain" and then
   * offered no way to do it: the only control here was Try again, and Settings
   * is behind the router this boundary may have just caught. So it reads the
   * persisted blob straight from AsyncStorage rather than from the store — the
   * store is one of the things that could be broken — and if the share sheet
   * will not take it, it puts the text on the screen where it can be selected
   * and copied by hand. Something always works.
   */
  private getOut = async () => {
    let raw: string | null = null;
    try {
      raw = await storedRaw();
    } catch (err) {
      this.setState({
        exportError: `The device would not hand back what is stored (${
          err instanceof Error ? err.message : 'unknown error'
        }). Nothing has been deleted.`,
      });
      return;
    }
    if (!raw) {
      this.setState({ exportError: 'There is nothing stored on this device yet, so there is nothing to lose.' });
      return;
    }
    // The sheet, a file, or the clipboard; and failing all three, the text
    // on the screen where it can be selected and copied by hand. It is their
    // writing and they are entitled to it whatever this platform can do.
    // Without the account's id and email or the device's name — Settings'
    // export keeps them out on purpose, and this one went to whoever the
    // share sheet was pointed at.
    const out = await takeAway(withoutIdentifiers(raw), 'Morrow — everything on this device', 'morrow-everything.txt');
    // Handed to the sheet, it went somewhere they chose. Anything else —
    // a file, the clipboard, nothing — and the text is put on the screen as
    // well, where it can be selected and copied by hand; a download that
    // may or may not have landed is not enough here.
    if (out.ok && out.how === 'shared') this.setState({ exportError: null });
    else this.setState({ spilled: withoutIdentifiers(raw), exportError: out.ok ? takeawayNote(out, 'everything') : out.how === 'dismissed' ? out.error : null });
  };

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In the product this is Sentry, with the message scrubbed of user text.
    console.error('[morrow] screen crashed', error.message, info.componentStack?.slice(0, 400));
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View testID="error-boundary" style={{ flex: 1, backgroundColor: day.ground, padding: 22, justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 30, lineHeight: 35, color: day.ink }}>
          This screen broke, not your writing.
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 16, lineHeight: 23, color: day.ink2, marginTop: 12 }}>
          Everything you have written is still on this device. Nothing was sent anywhere and nothing was lost. You can
          go back and carry on, or export it first if you would rather be certain.
        </Text>

        <ScrollView
          style={{ maxHeight: 140, marginTop: 18, backgroundColor: day.surface2, borderRadius: radius.field, padding: 12 }}
        >
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: day.ink3 }}>{plainReason(error)}</Text>
        </ScrollView>

        {this.state.exportError ? (
          <Text
            testID="error-export-failed"
            style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: day.ink, marginTop: 14 }}
          >
            {this.state.exportError}
          </Text>
        ) : null}

        {this.state.spilled ? (
          <ScrollView
            style={{ maxHeight: 180, marginTop: 14, backgroundColor: day.surface, borderRadius: radius.field, padding: 12 }}
          >
            <Text
              testID="error-spilled"
              selectable
              style={{ fontFamily: fonts.sans, fontSize: 11, lineHeight: 16, color: day.ink2 }}
            >
              {this.state.spilled}
            </Text>
          </ScrollView>
        ) : null}

        <Pressable
          testID="error-retry"
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={() => {
            this.setState({ error: null, spilled: null, exportError: null });
            this.props.onReset?.();
          }}
          style={{
            height: 58,
            marginTop: 22,
            borderRadius: radius.chip,
            backgroundColor: day.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: fonts.sansSemi, fontSize: 17, color: day.onInk }}>Try again</Text>
        </Pressable>

        {/*
          The other half of the sentence above. Reads straight from disk, so it
          does not depend on the store, the router, or the screen that broke.
        */}
        <Pressable
          testID="error-export"
          accessibilityRole="button"
          accessibilityLabel="Copy my writing out"
          onPress={() => void this.getOut()}
          style={{
            height: 52,
            marginTop: 10,
            borderRadius: radius.chip,
            borderWidth: 1,
            borderColor: day.line,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: fonts.sansSemi, fontSize: 16, color: day.ink }}>Copy my writing out</Text>
        </Pressable>
      </View>
    );
  }
}
