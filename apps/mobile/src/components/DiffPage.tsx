/**
 * The first page of a re-authored edition (PRD §7.3): what changed since the
 * one before. Printed on the Book and turned to in the Sunday reading, so it
 * is one component with the paper's palette baked in.
 *
 * The labels are the app's words and go in the sans. The goal names and the
 * lines written on letting go are the person's, and go in the serif — except
 * a name that came from the bank, which the Book's own chapter headings also
 * set in the sans, for the same reason: the serif is the claim that they
 * wrote it.
 */
import { View } from 'react-native';
import { diffLines, ordinal, type BookDiff } from '@morrow/core';
import { Body, Label, UserText, paper } from '@morrow/ui';

export function DiffPage({
  diff,
  previous,
  authored,
  testID = 'book-diff',
}: {
  diff: BookDiff;
  /** The number of the edition this one is compared with. */
  previous: number;
  /** Whether the person typed this goal's name themselves. */
  authored: (name: string) => boolean;
  testID?: string;
}) {
  const rows = diffLines(diff);
  return (
    <View testID={testID} style={{ gap: 12 }}>
      <Label style={{ color: paper.ink3 }}>Since the {ordinal(previous).toLowerCase()} edition</Label>
      {rows.length === 0 ? (
        <Body style={{ fontSize: 15, color: paper.ink2 }}>Nothing yet.</Body>
      ) : (
        rows.map((row) => (
          <View key={row.label} testID={`${testID}-${row.label.toLowerCase().replace(/\s+/g, '-')}`} style={{ gap: 3 }}>
            <Label style={{ color: paper.ink3 }}>{row.label}</Label>
            {row.names.map((name, i) =>
              authored(name) ? (
                <UserText key={`${row.label}-${i}`} style={{ fontSize: 17, lineHeight: 26, color: '#15181F' }}>
                  {name}
                </UserText>
              ) : (
                <Body key={`${row.label}-${i}`} style={{ fontSize: 16, lineHeight: 26, color: paper.ink }}>
                  {name}
                </Body>
              ),
            )}
          </View>
        ))
      )}
      {diff.lessons?.length ? (
        <View testID={`${testID}-lessons`} style={{ gap: 8, marginTop: 4 }}>
          <Label style={{ color: paper.ink3 }}>What it taught</Label>
          {diff.lessons.map((l, i) => (
            <View key={`lesson-${i}`} style={{ gap: 2 }}>
              {authored(l.name) ? (
                <UserText style={{ fontSize: 15, lineHeight: 22, color: paper.ink2 }}>{l.name}</UserText>
              ) : (
                <Body style={{ fontSize: 14, lineHeight: 22, color: paper.ink2 }}>{l.name}</Body>
              )}
              <UserText italic style={{ fontSize: 17, lineHeight: 27, color: paper.ink }}>
                {l.line}
              </UserText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
