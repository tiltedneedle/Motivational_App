/**
 * What I heard (PRD §7.2, F1.6). The coach lists the user's own phrases back,
 * verbatim. Keep, Merge or Not a goal, and then the user names each one.
 *
 * Every span on this screen is a substring of what they wrote. If the provider
 * ever returns something else, `guarded()` has already thrown it away.
 */
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { domainMeta, plural, type Span } from '@morrow/core';
import { Body, Chip, InkButton, Label, Statement, Stone, Studio, UserField, UserText, day } from '@morrow/ui';
import { ai, latestText, useMorrow } from '../src/store';

interface Row {
  span: Span;
  state: 'open' | 'kept' | 'dropped';
  name: string;
}

export default function Heard() {
  const router = useRouter();
  const texts = useMorrow((s) => s.texts);
  const addGoals = useMorrow((s) => s.addGoals);
  const goals = useMorrow((s) => s.goals);

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
  const rename = (i: number, name: string) =>
    setRows((r) => r?.map((row, j) => (j === i ? { ...row, name } : row)) ?? r);

  const named = rows?.filter((r) => r.state === 'kept' && r.name.trim()) ?? [];
  const unnamed = rows?.filter((r) => r.state === 'kept' && !r.name.trim()) ?? [];

  const done = () => {
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
    router.replace('/rank');
  };

  return (
    <Studio testID="screen-heard">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <View style={{ paddingTop: 12 }}>
          <Label>What I heard</Label>
          <Statement style={{ marginTop: 8 }}>
            {rows === null
              ? 'Reading it back…'
              : rows.length === 0
                ? 'Your goals are already named.'
                : `${rows.length} things you want. Two of them might be one.`}
          </Statement>
        </View>

        {rows === null ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={day.ink} />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 0 }}>
            {error ? <Body testID="heard-error">{error}</Body> : null}

            {rows.map((row, i) => {
              if (row.state === 'dropped') return null;
              const meta = domainMeta(row.span.domain);
              return (
                <View
                  key={`${row.span.start}-${i}`}
                  testID={`span-${i}`}
                  // A document, not a stack of cards: the read-back is the
                  // coach's one page, and its lines sit on hairlines the way a
                  // list of quotations does.
                  style={{
                    paddingVertical: 18,
                    gap: 12,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: day.line,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <Stone size={22} domain={row.span.domain} polish={1} style={{ marginTop: 4 }} />
                    {/* verbatim, in the serif, because these are their words */}
                    <UserText testID={`span-text-${i}`} style={{ flex: 1, fontSize: 17, lineHeight: 24 }}>
                      “{row.span.text}”
                    </UserText>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Chip
                      testID={`keep-${i}`}
                      label={row.state === 'kept' ? 'Keeping' : 'Keep'}
                      selected={row.state === 'kept'}
                      role="checkbox"
                      onPress={() => keep(i)}
                    />
                    <Chip testID={`drop-${i}`} label="Not a goal" ghost onPress={() => drop(i)} />
                    <View style={{ flex: 1 }} />
                    <Label style={{ alignSelf: 'center' }}>{meta.label}</Label>
                  </View>
                  {row.state === 'kept' ? (
                    <UserField
                      testID={`name-${i}`}
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

            <Label style={{ marginTop: 4 }}>Every line is yours. I only sorted them.</Label>
          </ScrollView>
        )}

        <View style={{ paddingBottom: 18, gap: 8 }}>
          {/*
            A kept line with no name is not a goal, because the app does not
            get to name it. Said out loud, because otherwise pressing "go on"
            quietly drops the lines they just chose and nothing on the screen
            explains where they went.
          */}
          {unnamed.length ? (
            <Body testID="heard-unnamed" style={{ fontSize: 13 }}>
              {plural(unnamed.length, 'line')} kept but not named yet. Name a line to keep it — the app will not name it
              for you.
            </Body>
          ) : null}
          <InkButton
            testID="heard-continue"
            label={
              named.length
                ? `Keep ${named.length} and go on`
                : goals.length
                  ? 'Go on with the goals I named'
                  : 'Name at least one'
            }
            disabled={named.length === 0 && goals.length === 0}
            onPress={done}
          />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
