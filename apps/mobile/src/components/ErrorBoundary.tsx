/**
 * The last line of defence.
 *
 * If a screen throws, the person must not lose the thing they were writing.
 * This boundary says what happened in plain words, offers the two things that
 * are always true (their writing is on the device; they can export it), and
 * gets out of the way.
 */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { takeAway, takeawayNote } from '../takeaway';
import { day, radius, type as fonts } from '@morrow/ui';
// The key, not a copy of it: read directly off disk, on purpose — see `getOut`.
import { STORE_KEY } from '../storage';

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
      raw = await AsyncStorage.getItem(STORE_KEY);
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
    const out = await takeAway(raw, 'Morrow — everything on this device', 'morrow-everything.txt');
    if (out.ok) this.setState({ exportError: out.how === 'shared' ? null : takeawayNote(out, 'everything') });
    else if (out.how === 'dismissed') this.setState({ exportError: out.error });
    else this.setState({ spilled: raw, exportError: null });
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
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: day.ink3 }}>{error.message}</Text>
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
