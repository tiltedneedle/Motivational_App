/**
 * The Declaration (PRD §7.17).
 *
 * Rotterdam's third stage was a portrait photo and a public "I will"
 * sentence. Here: the person's own photo, if they want one, with the I will
 * line set across it and the day the Book was sealed under it. Kept private
 * (saved to Photos), shared, or sent to one named witness — through whatever
 * the person already uses to reach them. No feed, no likes, no leaderboard,
 * and nothing leaves the phone without a tap.
 *
 * The witness is a name, kept with the profile. What they get is this image
 * and, when the person chooses on a sealed evening, the count of sealed days
 * with the line — nothing else. The photo itself is never stored by the app:
 * it is composed here and goes where the person sends it.
 *
 * Built on the lock screen's capture, so the image is the same on every
 * platform: a plain View, captured at full size.
 */
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDay, sealedOn } from '@morrow/core';
import { Body, Chip, InkButton, Label, Rule, Statement, Stone, Studio, TextButton, TopBar, UserField, UserText, fitLine, night } from '@morrow/ui';
import { canShareFilesOnWeb, saveWallpaper, shareWallpaper } from '../src/wallpaper';
import { useGoals, useLatestBook, useMorrow } from '../src/store';
import { track, useFirstRunStep } from '../src/analytics';

/** The Declaration is square: a portrait, not a lock screen. */
const SIZE = 1080;

export default function Declare() {
  const router = useRouter();
  useFirstRunStep('declare');
  const book = useLatestBook();
  const goals = useGoals();
  const boundary = useMorrow((s) => s.profile.dayBoundaryHour);
  const witnessName = useMorrow((s) => s.profile.witnessName);
  const declaredAt = useMorrow((s) => s.profile.declaredAt);
  const setProfile = useMorrow((s) => s.setProfile);
  const showResources = useMorrow((s) => s.showResources);
  const printRef = useRef<View>(null);
  const { width: windowWidth } = useWindowDimensions();

  const [photo, setPhoto] = useState<string | null>(null);
  const [witness, setWitness] = useState(witnessName);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const goal = goals[0];
  const line = book?.iWill?.trim() || book?.firstSentence?.trim() || '';
  const back = () => (router.canGoBack() ? router.back() : router.dismissTo('/book'));

  if (!book || !line) {
    return (
      <Studio dark testID="screen-declare">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          <TopBar back={{ onPress: back, testID: 'declare-back' }} where="The Declaration" />
          <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
            <Statement style={{ color: night.ink }}>The Declaration is your own line, across your own face.</Statement>
            <Body style={{ color: night.ink2 }}>Finish the Book and the I will line comes here.</Body>
            <InkButton label="Back" onPress={back} />
          </View>
        </SafeAreaView>
      </Studio>
    );
  }

  /**
   * The photo, from the camera or the library, through the platform's own
   * picker. On the web that is a file input. Nothing is read from the
   * library but the one the person picks; nothing is written back.
   */
  const pick = async (from: 'camera' | 'library') => {
    setNote(null);
    try {
      const picker: any = await import('expo-image-picker');
      if (from === 'camera') {
        const ok = await picker.requestCameraPermissionsAsync();
        if (!ok?.granted) {
          setNote('The camera was not allowed. You can allow it in Settings, or choose a photo instead.');
          return;
        }
      }
      const result =
        from === 'camera'
          ? await picker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 })
          : await picker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
      const uri = result?.canceled ? null : (result?.assets?.[0]?.uri ?? null);
      if (uri) setPhoto(uri);
    } catch {
      setNote('This device could not open a photo. The line still stands on its own.');
    }
  };

  const keepWitness = () => {
    const name = witness.trim();
    if (name !== witnessName) {
      setProfile({ witnessName: name });
      setNote(name ? 'Kept. ' + name + ' gets what you send them, and nothing you do not.' : 'No witness. The Declaration is yours alone.');
    }
  };

  const run = async (how: 'save' | 'share') => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    keepWitness();
    try {
      const square = { width: SIZE, height: SIZE };
      const out =
        how === 'save'
          ? await saveWallpaper(printRef, 'morrow-declaration.png', square)
          : await shareWallpaper(printRef, 'morrow-declaration.png', 'Your Declaration', square);
      // Made when it is kept. The share sheet cannot say whether anything
      // was sent, or to whom, so a share alone is not a Declaration made and
      // the note says only what is known.
      if (out.ok && out.how !== 'shared' && !declaredAt) {
        setProfile({ declaredAt: new Date().toISOString() });
        track({ name: 'declaration_made', with_photo: photo !== null, witness: witness.trim().length > 0 });
      }
      setNote(
        out.ok
          ? out.how === 'photos'
            ? 'Saved to Photos. Yours to keep, or to send.'
            : out.how === 'downloaded'
              ? 'Downloaded.'
              : 'The share sheet opened. It goes wherever you sent it; keep it in Photos to mark it made.'
          : out.error,
      );
    } finally {
      setBusy(false);
    }
  };

  // The print, as large as the phone allows with the controls still on screen.
  const w = Math.round(Math.max(200, Math.min(SIZE / 3, windowWidth - 44)));

  return (
    <Studio dark testID="screen-declare">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ onPress: back, testID: 'declare-back' }} where="The Declaration" help={{ onPress: showResources }} />
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12, gap: 16, alignItems: 'center' }}>
          <Statement testID="declare-title" style={{ color: night.ink, alignSelf: 'stretch' }}>
            Your line, across your own face.
          </Statement>
          <Body style={{ color: night.ink2, alignSelf: 'stretch' }}>
            Keep it to yourself, share it, or send it to one person. Nobody sees it unless you send it, and there is no feed for it to go to.
          </Body>

          {/* The print: exactly what is captured. */}
          <View style={{ borderRadius: 29, borderWidth: 1, borderColor: night.line2 }}>
            <View
              ref={printRef}
              testID="declare-print"
              collapsable={false}
              style={{ width: w, height: w, borderRadius: 28, overflow: 'hidden', backgroundColor: night.ground, justifyContent: 'flex-end' }}
            >
              {photo ? <Image source={{ uri: photo }} accessibilityIgnoresInvertColors accessibilityLabel="Your photo" style={{ position: 'absolute', top: 0, left: 0, width: w, height: w }} resizeMode="cover" /> : null}
              {/* A scrim so the line reads on any photo: darker at the foot, clear at the top. */}
              {photo ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: w * 0.62, backgroundColor: 'rgba(10,11,14,0.62)' }} /> : null}
              <View style={{ padding: 24, gap: 14 }}>
                <Stone size={36} domain={goal?.domain ?? 'health'} polish={1} />
                <UserText testID="declare-line" style={{ ...fitLine(line.length), color: night.ink }}>
                  {line}
                </UserText>
                <Label style={{ color: night.ink3 }}>{formatDay(sealedOn(book.sealedAt, boundary))}</Label>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {Platform.OS !== 'web' ? <Chip testID="declare-camera" label="Take a photo" ghost onPress={() => void pick('camera')} /> : null}
            <Chip testID="declare-photo" label={photo ? 'Another photo' : 'Choose a photo'} ghost onPress={() => void pick('library')} />
            {photo ? <Chip testID="declare-no-photo" label="No photo" ghost onPress={() => setPhoto(null)} /> : null}
          </View>

          <Rule />

          <View style={{ alignSelf: 'stretch', gap: 8 }}>
            <Label style={{ color: night.ink3 }}>One witness, if you want one</Label>
            <UserField
              testID="declare-witness"
              label="One witness, by name"
              labelHidden
              value={witness}
              onChangeText={setWitness}
              onSubmitEditing={keepWitness}
              returnKeyType="done"
              placeholder="The name you call them"
            />
            <Body style={{ color: night.ink3, fontSize: 13 }}>
              A name, kept with your profile. They get this image when you send it, and on a closed evening you can tell them the count. Nothing else, and nothing you do not choose.
            </Body>
          </View>

          <View style={{ alignSelf: 'stretch', gap: 8, paddingTop: 4 }}>
            <InkButton
              testID="declare-keep"
              label={busy ? 'Making it…' : Platform.OS === 'web' ? 'Download it' : 'Keep it in Photos'}
              onPress={() => void run('save')}
            />
            {Platform.OS !== 'web' || canShareFilesOnWeb() ? (
              <TextButton testID="declare-share" label={witness.trim() ? 'Share it — for ' + witness.trim() : 'Share it'} onPress={() => void run('share')} />
            ) : null}
          </View>
          {note ? (
            <Body testID="declare-note" style={{ color: night.ink2, textAlign: 'center' }}>
              {note}
            </Body>
          ) : null}
          {declaredAt ? (
            <Label testID="declare-made" style={{ color: night.ink3, textAlign: 'center' }}>
              First made {formatDay(sealedOn(declaredAt, boundary))}
            </Label>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
