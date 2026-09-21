/**
 * What I heard (PRD §7.2, F1.6). The coach lists the user's own phrases back,
 * verbatim. Keep, Merge or Not a goal, and then the user names each one.
 *
 * Every span on this screen is a substring of what they wrote. If the provider
 * ever returns something else, `guarded()` has already thrown it away.
 */
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { domainMeta, plural, type Span } from '@morrow/core';
import { Body, Chip, Heading, Label, Notice, Screen, Stone, UserField, UserText, day } from '@morrow/ui';
import { useGoals, ai, latestText, useMorrow } from '../src/store';
import { useFirstRunStep } from '../src/analytics';

interface Row {
  span: Span;
  state: 'open' | 'kept' | 'dropped';
  name: string;
}

export default function Heard() {
  const router = useRouter();
  const onPath = useMorrow((s) => s.books.length === 0);
  useFirstRunStep('read_back');
  const showResources = useMorrow((st) => st.showResources);
  const texts = useMorrow((s) => s.texts);
  const addGoals = useMorrow((s) => s.addGoals);
  const goals = useGoals();

  const savedRows = useMorrow((s) => s.readBackDraft);
  const saveRows = useMorrow((s) => s.saveReadBackDraft);
  const clearRows = useMorrow((s) => s.clearReadBackDraft);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [leftOut, setLeftOut] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // The newest sitting that may be quoted. Never a crisis one.
  const source = latestText(texts, 'ideal')?.body ?? '';

  useEffect(() => {
    let alive = true;
    if (!source.trim()) {
      setRows([]);
      return;
    }
    // The rows as they were left — kept, named, dropped — if this is the
    // same sitting. A kill mid-read-back used to ask the coach again and
    // hand back a page with every name gone.
    if (savedRows && savedRows.source === source && Array.isArray(savedRows.rows) && savedRows.rows.every((r) => r && typeof r.span?.text === 'string' && typeof r.name === 'string')) {
      setRows(savedRows.rows);
      setLeftOut(savedRows.leftOut);
      return;
    }
    ai.readBack({ text: source, limit: 7 })
      .then((out) => {
        if (!alive) return;
        setRows(out.spans.map((span) => ({ span, state: 'open' as const, name: '' })));
        setLeftOut(out.leftOutQuestion);
      })
      .catch(() => {
        if (!alive) return;
        // The read-back is the only online step in the sitting. Losing it must
        // not lose the sitting: the Interview's own goals are already named.
        setError('I could not read it back just now. Your writing is safe, and the goals you named still stand.');
        setRows([]);
      });
    return () => {
      alive = false;
    };
  }, [source]);

  const keep = (i: number) =>
    setRows((r) => r?.map((row, j) => (j === i ? { ...row, state: row.state === 'kept' ? 'open' : 'kept' } : row)) ?? r);
  const drop = (i: number) =>
    setRows((r) => r?.map((row, j) => (j === i ? { ...row, state: 'dropped', name: '' } : row)) ?? r);
  // Undo over confirm: a dropped line stays on the page, struck through, with
  // one tap back. It used to vanish.
  const restore = (i: number) => setRows((r) => r?.map((row, j) => (j === i ? { ...row, state: 'open' } : row)) ?? r);
  const rename = (i: number, name: string) =>
    setRows((r) => r?.map((row, j) => (j === i ? { ...row, name } : row)) ?? r);

  // Written as it changes, cleared when the goals are named.
  useEffect(() => {
    if (rows && rows.length) saveRows(rows, source, leftOut);
  }, [rows, source, leftOut, saveRows]);

  const named = rows?.filter((r) => r.state === 'kept' && r.name.trim()) ?? [];
  const unnamed = rows?.filter((r) => r.state === 'kept' && !r.name.trim()) ?? [];

  const done = () => {
    clearRows();
    if (named.length) {
      addGoals(
        named.map((r) => ({
          // Named by the person, on the read-back screen, in their own words.
          authored: true,
          title: r.name.trim(),
          domain: r.span.domain,
          horizon: 'No deadline',
          sourceSpan: r.span.text,
        })),
      );
    }
    // The first evening ends here — "Tonight about twenty-five minutes" was
    // the promise — so the way on is Today, whose path card says what comes
    // next and offers it now or tomorrow. It used to run straight on into
    // the second sitting with nothing to mark the stop.
    router.dismissTo('/today');
  };

  const back = () => (router.canGoBack() ? router.back() : router.dismissTo('/today'));
  const progress = onPath ? { value: 3 / 5, label: 'Step 3 of 5 · Your future is written', testID: 'heard-progress' } : undefined;

  return (
    <Screen
      testID="screen-heard"
      back={{ onPress: back, testID: 'heard-back' }}
      where="What I heard"
      help={{ onPress: showResources }}
      progress={progress}
      keyboard
      cta={
        rows === null
          ? undefined
          : {
              label: named.length ? `Keep ${named.length} and go on` : goals.length ? 'Go on with the goals I named' : 'Name at least one',
              disabled: named.length === 0 && goals.length === 0,
              onPress: done,
              testID: 'heard-continue',
            }
      }
      footer={
        // A kept line with no name is not a goal, because the app does not
        // get to name it. Said out loud, because otherwise pressing "go on"
        // quietly drops the lines they just chose and nothing on the screen
        // explains where they went.
        unnamed.length ? (
          <Notice testID="heard-unnamed" text={`${plural(unnamed.length, 'line')} kept but not named yet. Name a line to keep it — the app will not name it for you.`} style={{ fontSize: 13, textAlign: 'center' }} />
        ) : null
      }
    >
      <Heading
        title={rows === null ? 'Reading it back…' : rows.length === 0 ? 'Your goals are already named.' : `${rows.length === 1 ? 'One thing' : `${rows.length} things`} you said you want.`}
        line={rows && rows.length ? 'Your own phrases, verbatim. Keep the ones that are goals and give each a short name.' : undefined}
      />

      {rows === null ? (
        <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={day.ink} />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Notice testID="heard-error" kind="error" text={error} />

          {rows.map((row, i) => {
            const meta = domainMeta(row.span.domain);
            if (row.state === 'dropped') {
              return (
                <View
                  key={`${row.span.start}-${i}`}
                  testID={`span-${i}-dropped`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: day.line2, borderStyle: 'dashed' }}
                >
                  <Body style={{ flex: 1, fontSize: 14, color: day.ink3, textDecorationLine: 'line-through' }} numberOfLines={1}>
                    “{row.span.text}”
                  </Body>
                  <Chip testID={`restore-${i}`} label="Put it back" accessibilityLabel={`Put it back, “${row.span.text}”`} ghost onPress={() => restore(i)} />
                </View>
              );
            }
            const kept = row.state === 'kept';
            return (
              <View
                key={`${row.span.start}-${i}`}
                testID={`span-${i}`}
                style={{
                  gap: 12,
                  padding: 16,
                  borderRadius: 18,
                  backgroundColor: day.surface,
                  borderWidth: kept ? 2 : 1,
                  borderColor: kept ? day.ink : day.line2,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <Stone size={24} domain={row.span.domain} polish={1} style={{ marginTop: 3 }} />
                  {/* verbatim, in the serif, because these are their words */}
                  <UserText testID={`span-text-${i}`} style={{ flex: 1, fontSize: 18, lineHeight: 26 }}>
                    “{row.span.text}”
                  </UserText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Chip
                    testID={`keep-${i}`}
                    label={kept ? 'Keeping' : 'Keep'}
                    accessibilityLabel={`${kept ? 'Keeping' : 'Keep'}, “${row.span.text}”`}
                    selected={kept}
                    role="checkbox"
                    onPress={() => keep(i)}
                  />
                  <Chip testID={`drop-${i}`} label="Not a goal" accessibilityLabel={`Not a goal, “${row.span.text}”`} ghost onPress={() => drop(i)} />
                  <View style={{ flex: 1 }} />
                  <Label>{meta.label}</Label>
                </View>
                {kept ? (
                  <UserField
                    testID={`name-${i}`}
                    label={`Name for “${row.span.text.slice(0, 40)}${row.span.text.length > 40 ? '…' : ''}”`}
                    labelHidden
                    value={row.name}
                    onChangeText={(t) => rename(i, t)}
                    placeholder="Name it the way you'd say it to a friend"
                  />
                ) : null}
              </View>
            );
          })}

          {leftOut && named.length < 3 ? (
            <Body testID="left-out" style={{ color: day.ink2 }}>
              {leftOut}
            </Body>
          ) : null}

          <Label style={{ marginTop: 4, textAlign: 'center' }}>Every line is yours. I only sorted them.</Label>
        </View>
      )}
    </Screen>
  );
}
