/**
 * What Morrow knows about me (PRD §7.9, §7.12).
 *
 * "The memory profile, editable line by line … user edits are locked."
 *
 * Every line here is built from something the person wrote or did, and
 * nothing is inferred. The app's framing is in the sans and their words are
 * in the serif, the same rule as everywhere else. Change a line and it stays
 * as they wrote it whatever the rebuild says; forget one and it is gone — and
 * where the line is one of the stones, the coach stops quoting it too, which
 * is what forgetting has to mean or the screen is decoration.
 *
 * What the copy promises is exactly what the code does. The coach here reads
 * the Book, the stones and the ledger directly; this profile is what a coach
 * behind a model would be handed, and Forget on a stone reaches the coach
 * that exists. Forgetting a line about the Book or the ledger takes it out
 * of the profile; it does not unwrite the Book.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MEMORY_ABOUT_ORDER, memoryEditOf, plural, type MemoryLine } from '@morrow/core';
import { Body, Chip, Label, Rule, Statement, Studio, TextButton, TopBar, UserField, UserText, day, radius } from '@morrow/ui';
import { memoryLines, useMorrow } from '../src/store';

/**
 * What Change starts from: their words, and both halves of an if-then with
 * the app's framing between them, so editing one half never drops the other.
 * A bank title is the app's words and seeds nothing.
 */
function seedOf(l: MemoryLine): string {
  if (!l.quote || l.quoteAuthored === false) return '';
  return l.quote2 ? `if ${l.quote}, ${l.quote2Framing ?? 'then I'} ${l.quote2}` : l.quote;
}

const ABOUT_LABEL: Record<MemoryLine['about'], string> = {
  you: 'You',
  'your goals': 'Your goals',
  'your lines': 'Your lines',
  'the Book': 'The Book',
  'your days': 'Your days',
};

export default function MemoryScreen() {
  const router = useRouter();
  const showResources = useMorrow((st) => st.showResources);
  const state = useMorrow((s) => s);
  const edits = useMorrow((s) => s.memoryEdits);
  const edit = useMorrow((s) => s.editMemory);
  const forget = useMorrow((s) => s.forgetMemory);
  const restore = useMorrow((s) => s.restoreMemory);

  const memoryDraft = useMorrow((s) => s.memoryDraft);
  const setMemoryDraft = useMorrow((s) => s.setMemoryDraft);

  const lines = useMemo(() => memoryLines(state), [state]);
  const forgotten = edits.filter((e) => e.text === null).length;

  /**
   * The line whose field is open. What is in it lives in the store as it is
   * typed, so Back never loses it and the field is open again on return.
   */
  const [changing, setChanging] = useState<string | null>(() => memoryDraft?.key ?? null);
  const draft = memoryDraft?.key === changing ? memoryDraft.text : '';
  const setDraft = (text: string) => {
    if (!changing) return;
    setMemoryDraft({ key: changing, text });
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  const groups = MEMORY_ABOUT_ORDER.map((about) => ({ about, lines: lines.filter((l) => l.about === about) })).filter((g) => g.lines.length);

  return (
    <Studio testID="screen-memory">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ label: 'Back', onPress: goBack, testID: 'memory-back' }} where="What Morrow knows" help={{ onPress: showResources }} />
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 28, gap: 18 }}
        >
          <View style={{ gap: 8 }}>
            <Statement testID="memory-title">What Morrow knows about you.</Statement>
            <Body>
              Every line comes from something you wrote or did; nothing is guessed. This is what is said about you on the way to a coach. Change a line and it stays as you wrote it here. Forget one and it is gone from here — and if it is one of your stones, the coach stops quoting it.
            </Body>
          </View>

          {lines.length === 0 ? (
            <Body testID="memory-empty">Nothing yet. There will be lines here once there is a name, a goal, or a sealed day.</Body>
          ) : null}

          {groups.map((g) => (
            <View key={g.about} testID={`memory-group-${g.about.replace(/\s+/g, '-')}`} style={{ gap: 12 }}>
              <Label>{ABOUT_LABEL[g.about]}</Label>
              {g.lines.map((l) => {
                const e = memoryEditOf(edits, l.key);
                const open = changing === l.key;
                return (
                  <View key={l.key} testID={`memory-line-${l.key}`} style={{ gap: 6, backgroundColor: day.surface2, borderRadius: radius.card, padding: 14 }}>
                    {e ? <Label style={{ fontSize: 11 }}>In your words</Label> : null}
                    {l.text || l.goal ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 5 }}>
                        {l.text ? (
                          <Body testID={`memory-text-${l.key}`} style={{ color: day.ink, fontSize: 15 }}>
                            {l.text}
                          </Body>
                        ) : null}
                        {l.goal ? (
                          l.goal.authored ? (
                            <UserText testID={`memory-goal-${l.key}`} style={{ fontSize: 16, lineHeight: 22, color: day.ink }}>
                              {l.goal.name}
                            </UserText>
                          ) : (
                            <Body testID={`memory-goal-${l.key}`} style={{ color: day.ink, fontSize: 15 }}>
                              {l.goal.name}
                            </Body>
                          )
                        ) : null}
                        {l.tail ? (
                          <Body style={{ color: day.ink, fontSize: 15 }}>{l.tail}</Body>
                        ) : null}
                      </View>
                    ) : null}
                    {l.quote2 ? (
                      <View style={{ gap: 2 }}>
                        <UserText testID={`memory-quote-${l.key}`} style={{ fontSize: 17, lineHeight: 26, color: day.ink }}>
                          {l.quote}
                        </UserText>
                        <UserText italic framing={l.quote2Framing ?? 'then I'} style={{ fontSize: 16, lineHeight: 24, color: day.ink2 }}>
                          {l.quote2}
                        </UserText>
                      </View>
                    ) : l.quote ? (
                      l.quoteAuthored === false ? (
                        <Body testID={`memory-quote-${l.key}`} style={{ color: day.ink, fontSize: 16 }}>
                          {l.quote}
                        </Body>
                      ) : (
                        <UserText testID={`memory-quote-${l.key}`} style={{ fontSize: 17, lineHeight: 26, color: day.ink }}>
                          {l.quote}
                        </UserText>
                      )
                    ) : null}
                    {open ? (
                      <View style={{ gap: 8, marginTop: 4 }}>
                        <UserField
                          testID={`memory-field-${l.key}`}
                          labelHidden
                          label="This line, in your words"
                          value={draft}
                          onChangeText={setDraft}
                          placeholder="in your words"
                          multiline
                        />
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                          <Chip
                            testID={`memory-keep-${l.key}`}
                            label="Keep this"
                            role="button"
                            selected
                            onPress={() => {
                              // Their words, or nothing: a line left as Morrow
                              // had it is not an edit, and the app's own
                              // sentence never becomes a quote in the serif.
                              if (!draft.trim() || draft.trim() === seedOf(l)) {
                                setMemoryDraft(null);
                                setChanging(null);
                                return;
                              }
                              edit(l.key, draft);
                              setChanging(null);
                            }}
                          />
                          <TextButton
                            testID={`memory-cancel-${l.key}`}
                            label="Leave it"
                            onPress={() => {
                              setMemoryDraft(null);
                              setChanging(null);
                            }}
                          />
                        </View>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 2 }}>
                        <TextButton
                          testID={`memory-change-${l.key}`}
                          label="Change"
                          onPress={() => {
                            // Seeded with their words only. A line that is all
                            // the app's framing starts empty: Change means
                            // "say it in your words", never "edit Morrow's".
                            setChanging(l.key);
                            setMemoryDraft(seedOf(l) ? { key: l.key, text: seedOf(l) } : null);
                          }}
                        />
                        <TextButton testID={`memory-forget-${l.key}`} label="Forget" onPress={() => forget(l.key)} />
                        {e ? <TextButton testID={`memory-restore-${l.key}`} label="As Morrow had it" onPress={() => restore(l.key)} /> : null}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}

          {forgotten > 0 ? (
            <>
              <Rule />
              <View testID="memory-forgotten" style={{ gap: 8 }}>
                <Body style={{ fontSize: 14 }}>
                  {plural(forgotten, 'line')} forgotten. {forgotten === 1 ? 'It stays' : 'They stay'} forgotten until you bring {forgotten === 1 ? 'it' : 'them'} back.
                </Body>
                <View style={{ alignItems: 'flex-start' }}>
                  <TextButton
                    testID="memory-bring-back"
                    label={forgotten === 1 ? 'Bring it back' : 'Bring them all back'}
                    onPress={() => {
                      for (const e of edits) if (e.text === null) restore(e.key);
                    }}
                  />
                </View>
              </View>
            </>
          ) : null}

          <Rule />
          <Body style={{ fontSize: 13 }}>
            The writing itself — the Fifteen, the stones, the Book — is not on this page and is never changed from it. This is only what is said about you on the way to the coach.
          </Body>
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
