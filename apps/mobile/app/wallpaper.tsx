/**
 * The lock screen (PRD §7.8).
 *
 * "From any scene or the 'I will' line: lock-screen sizes with the line
 * typeset in the serif; export to Photos on iOS." The image is the night
 * studio with their line on it and nothing else — no logo, no chrome — so
 * what they see forty times a day is a sentence they wrote. The print on
 * screen is as large as the phone allows with its controls still in view;
 * the capture is at lock-screen pixels.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDay, sealedOn } from '@morrow/core';
import { Body, Chip, InkButton, Label, Statement, Stone, Studio, UserText, fitLine, night, TopBar } from '@morrow/ui';
import { WALLPAPER, saveWallpaper, shareWallpaper } from '../src/wallpaper';
import { useGoals, useLatestBook, useMorrow } from '../src/store';

export default function Wallpaper() {
  const router = useRouter();
  const { goal: goalId } = useLocalSearchParams<{ goal?: string }>();
  const book = useLatestBook();
  const goals = useGoals();
  const boundary = useMorrow((s) => s.profile.dayBoundaryHour);
  const printRef = useRef<View>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const goal = goals.find((g) => g.id === goalId) ?? goals[0];
  const line = book?.iWill?.trim() || book?.firstSentence?.trim() || '';

  const back = () => (router.canGoBack() ? router.back() : router.dismissTo('/today'));

  const run = async (how: 'save' | 'share') => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const out = how === 'save' ? await saveWallpaper(printRef) : await shareWallpaper(printRef);
      setNote(
        out.ok
          ? out.how === 'photos'
            ? 'Saved to Photos. Set it from there.'
            : out.how === 'downloaded'
              ? 'Downloaded.'
              : 'Shared.'
          : out.error,
      );
    } finally {
      setBusy(false);
    }
  };

  if (!book || !line) {
    return (
      <Studio dark testID="screen-wallpaper">
        <SafeAreaView style={{ flex: 1, padding: 22, justifyContent: 'center', gap: 12 }}>
          <Statement style={{ color: night.ink }}>The lock screen is your own line.</Statement>
          <Body style={{ color: night.ink2 }}>Finish the Book and the I will line goes here.</Body>
          <InkButton label="Back" onPress={back} />
        </SafeAreaView>
      </Studio>
    );
  }

  // The print at a third of lock-screen pixels, or as large as the phone
  // allows with the header, the chips and the hint still on screen — the
  // first frame should show the print and the way to save it. The capture
  // is upsampled to the full size either way.
  const CHROME = 250;
  const wByHeight = ((windowHeight - CHROME) * WALLPAPER.width) / WALLPAPER.height;
  const w = Math.round(Math.max(200, Math.min(WALLPAPER.width / WALLPAPER.scale, windowWidth - 44, wByHeight)));
  const h = Math.round((w * WALLPAPER.height) / WALLPAPER.width);

  return (
    <Studio dark testID="screen-wallpaper">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ onPress: back, testID: 'wallpaper-back' }} right={<Label style={{ color: night.ink3 }}>Lock screen</Label>} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16, gap: 16, alignItems: 'center' }}>
          {/*
            The print. Exactly what is captured: a plain View, so the capture
            is the same on every platform, and the OS's clock and widgets sit
            in the top third, which is why the line sits low.
          */}
          {/* A hairline frame around the print, outside the capture, so the
              print's own night reads as an object on the night studio. */}
          <View style={{ borderRadius: 29, borderWidth: 1, borderColor: night.line2 }}>
            <View
              ref={printRef}
              testID="wallpaper-print"
              collapsable={false}
              style={{
                width: w,
                height: h,
                borderRadius: 28,
                overflow: 'hidden',
                backgroundColor: night.ground,
                justifyContent: 'flex-end',
                padding: 28,
                gap: 18,
              }}
            >
              <Stone size={44} domain={goal?.domain ?? 'health'} polish={1} />
              <UserText testID="wallpaper-line" style={{ ...fitLine(line.length), color: night.ink }}>
                {line}
              </UserText>
              <Label style={{ color: night.ink3 }}>{formatDay(sealedOn(book.sealedAt, boundary))}</Label>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            <Chip
              testID="wallpaper-save"
              label={busy ? 'Making it…' : Platform.OS === 'web' ? 'Download' : 'Save to Photos'}
              onPress={() => void run('save')}
            />
            {Platform.OS !== 'web' ? <Chip testID="wallpaper-share" label="Share" ghost onPress={() => void run('share')} /> : null}
          </View>
          {note ? (
            <Body testID="wallpaper-note" style={{ color: night.ink2, textAlign: 'center' }}>
              {note}
            </Body>
          ) : null}
          <Body style={{ color: night.ink3, fontSize: 13, textAlign: 'center' }}>
            {Platform.OS === 'ios'
              ? 'Photos → the image → Share → Use as Wallpaper.'
              : Platform.OS === 'android'
                ? 'Share it to your wallpaper app, or set it from the gallery.'
                : 'Send the file to your phone and set it from Photos.'}
          </Body>
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
