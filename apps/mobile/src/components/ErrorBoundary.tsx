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
import { day, radius, type as fonts } from '@morrow/ui';

interface Props {
  children: React.ReactNode;
  /** Where to send them once they have their writing safe. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

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

        <Pressable
          testID="error-retry"
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={() => {
            this.setState({ error: null });
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
          <Text style={{ fontFamily: fonts.sansSemi, fontSize: 17, color: '#FFFFFF' }}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}
