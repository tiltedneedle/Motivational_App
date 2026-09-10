/**
 * The Book (PRD §7.3): the user's writing, typeset. A paper page in the dark.
 * Everything on it is in the serif because everything on it is theirs.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ANALYSIS_TITLES, bookToText, formatDay, ordinal, pageCount } from '@morrow/core';
import {
  Body,
  Chip,
  InkButton,
  Label,
  Rule,
  Statement,
  Studio,
  TextButton,
  UserText,
  day,
  night,
  radius,
  useTwoColumn,
} from '@morrow/ui';
import { useLatestBook, useMorrow } from '../src/store';

/**
 * A goal's name, set in the face that tells the truth about who wrote it.
 *
 * A goal named by tapping through the fixed Interview bank is the app's phrase,
 * not the person's. Printing it in the serif alongside their own sentences says
 * they wrote it, on the one page in the product where that claim is the whole
 * point. The authorship ratio already knows the difference — `nameAuthored` —
 * and the typography now knows it too.
 */
function ChapterName({ name, authored, size }: { name: string; authored: boolean; size: number }) {
  if (authored) {
    return <UserText style={{ fontSize: size, lineHeight: size * 1.3, color: '#15181F' }}>{name}</UserText>;
  }
  return (
    <Body style={{ fontSize: size - 1, lineHeight: size * 1.3, color: '#3B3A36' }}>{name}</Body>
  );
}

export default function BookScreen() {
  const router = useRouter();
  const book = useLatestBook();
  // Kept: this one is read on Today, which is where it navigates to.
  const setToast = useMorrow((s) => s.setToast);
  const [exportError, setExportError] = useState<string | null>(null);
  const twoColumn = useTwoColumn();

  if (!book) {
    return (
      <Studio testID="screen-book">
        <SafeAreaView style={{ flex: 1, padding: 22, justifyContent: 'center', gap: 12 }}>
          <Statement>No Book yet.</Statement>
          <Body>Three evenings and there will be one. It starts with the Interview.</Body>
          <InkButton testID="book-start" label="Begin" onPress={() => router.replace('/consent')} />
        </SafeAreaView>
      </Studio>
    );
  }

  const onExport = async () => {
    const text = bookToText(book);
    try {
      await Share.share({ message: text, title: book.title });
      setExportError(null);
    } catch {
      // The Toast surface is only rendered by Today, so a message put there
      // from this screen was written to something nobody was looking at.
      setExportError('This device would not open the share sheet. Your Book is safe here, and Settings can export everything as text.');
    }
  };

  return (
    <Studio dark wide={twoColumn} testID="screen-book">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 18 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
          <TextButton testID="book-back" label="← Today" onPress={() => router.replace('/today')} />
          <Label style={{ color: night.ink3 }}>
            {ordinal(book.version)} edition · {pageCount(book)} pages
          </Label>
        </View>

        {/* the paper page */}
        <ScrollView
          testID="book-page"
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: '#FBF8F2', borderRadius: radius.card }}
          contentContainerStyle={{ padding: 26, paddingBottom: 40, gap: 18 }}
        >
          {/*
            The spine.

            Sitting 2 asks "if this plan were a book on your shelf, what is on
            the spine?", stores the answer, prints it at the top of the plain
            text export — and never showed it on the Book itself. Somebody was
            asked to title their own book and then never saw the title.

            In the serif when they typed it, in the sans when it is the app's
            fallback, which is the same rule as everywhere else — and the
            framing sits apart from the title for the same reason the Portrait's
            identity framing does.

            The id is `book-spine`, not `book-title`: the rank screen's own
            field already owns that one, and expo-router keeps that screen
            mounted behind this one, so anything asking for "book-title" was
            handed the field the person typed into rather than the spine of the
            Book it produced.
          */}
          <View style={{ gap: 2 }}>
            {book.titleFraming ? (
              <Body testID="book-spine-framing" style={{ fontSize: 15, color: '#8B7F6A' }}>
                {book.titleFraming}
              </Body>
            ) : null}
            {book.titleAuthored === false ? (
              <Body testID="book-spine" style={{ fontSize: 26, lineHeight: 32, color: '#231F1A' }}>
                {book.title}
              </Body>
            ) : (
              <UserText testID="book-spine" style={{ fontSize: 26, lineHeight: 32, color: '#231F1A' }}>
                {book.title}
              </UserText>
            )}
          </View>
          <Rule style={{ backgroundColor: '#E2DACB' }} />

          {/*
            PRD §7.14: two-column Book on a tablet.

            The split is the one the document already has. The left column is
            how the Book opens — the spine, the Fifteen, and the contents — and
            the right is the chapters themselves. On a phone there is only ever
            room for one, and they run in the same order they always did.
          */}
          {twoColumn ? (
            <View testID="book-two-column" style={{ flexDirection: 'row', gap: 34 }}>
              <View style={{ flex: 1, gap: 18 }}>
              <Label style={{ color: '#8B7F6A' }}>Chapter one · the Fifteen</Label>
              <UserText testID="book-first-sentence" style={{ fontSize: 28, lineHeight: 34, color: '#15181F' }}>
                {book.firstSentence}
              </UserText>
              <UserText style={{ fontSize: 17, lineHeight: 27, color: '#3B3A36' }}>
                {book.ideal.slice(book.firstSentence.length).trim()}
              </UserText>

              {book.shadow ? (
                <>
                  <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
                  <Label style={{ color: '#8B7F6A' }}>The other road</Label>
                  <UserText style={{ fontSize: 16, lineHeight: 25, color: '#5A5750' }}>{book.shadow}</UserText>
                </>
              ) : null}

              <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
              <Label style={{ color: '#8B7F6A' }}>Contents</Label>
              {book.chapters.map((c) => (
                <View key={c.goalId} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <ChapterName name={c.name} authored={c.nameAuthored !== false} size={17} />
                  </View>
                  <Label style={{ color: '#8B7F6A' }}>{c.horizon}</Label>
                </View>
              ))}
              </View>
              <View style={{ flex: 1, gap: 18 }}>
              {book.chapters.map((c) => (
                <View key={`ch-${c.goalId}`} style={{ gap: 10, marginTop: 10 }}>
                  <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
                  <ChapterName name={c.name} authored={c.nameAuthored !== false} size={22} />
                  {c.lines.map((l, i) => (
                    <View key={`${c.goalId}-${i}`} style={{ gap: 3 }}>
                      <Label style={{ color: '#8B7F6A' }}>
                        {ANALYSIS_TITLES[l.kind]}
                        {l.framingLabel ? ` · ${l.framingLabel}` : ''}
                      </Label>
                      <UserText style={{ fontSize: 17, lineHeight: 26, color: '#3B3A36' }}>{l.text}</UserText>
                      {l.text2 ? (
                        <UserText italic style={{ fontSize: 16, lineHeight: 24, color: '#5A5750' }}>
                          …then I {l.text2}
                        </UserText>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))}
              <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
              <Label style={{ color: '#8B7F6A' }}>I will</Label>
              <UserText testID="book-i-will" style={{ fontSize: 24, lineHeight: 32, color: '#15181F' }}>
                {book.iWill}
              </UserText>
              <Label style={{ color: '#8B7F6A', marginTop: 8 }}>
                Sealed {formatDay(book.sealedAt.slice(0, 10))} · written by you
              </Label>
              </View>
            </View>
          ) : (
            <>
          <Label style={{ color: '#8B7F6A' }}>Chapter one · the Fifteen</Label>
          <UserText testID="book-first-sentence" style={{ fontSize: 28, lineHeight: 34, color: '#15181F' }}>
            {book.firstSentence}
          </UserText>
          <UserText style={{ fontSize: 17, lineHeight: 27, color: '#3B3A36' }}>
            {book.ideal.slice(book.firstSentence.length).trim()}
          </UserText>

          {book.shadow ? (
            <>
              <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
              <Label style={{ color: '#8B7F6A' }}>The other road</Label>
              <UserText style={{ fontSize: 16, lineHeight: 25, color: '#5A5750' }}>{book.shadow}</UserText>
            </>
          ) : null}

          <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
          <Label style={{ color: '#8B7F6A' }}>Contents</Label>
          {book.chapters.map((c) => (
            <View key={c.goalId} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <ChapterName name={c.name} authored={c.nameAuthored !== false} size={17} />
              </View>
              <Label style={{ color: '#8B7F6A' }}>{c.horizon}</Label>
            </View>
          ))}
          {book.chapters.map((c) => (
            <View key={`ch-${c.goalId}`} style={{ gap: 10, marginTop: 10 }}>
              <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
              <ChapterName name={c.name} authored={c.nameAuthored !== false} size={22} />
              {c.lines.map((l, i) => (
                <View key={`${c.goalId}-${i}`} style={{ gap: 3 }}>
                  <Label style={{ color: '#8B7F6A' }}>
                    {ANALYSIS_TITLES[l.kind]}
                    {l.framingLabel ? ` · ${l.framingLabel}` : ''}
                  </Label>
                  <UserText style={{ fontSize: 17, lineHeight: 26, color: '#3B3A36' }}>{l.text}</UserText>
                  {l.text2 ? (
                    <UserText italic style={{ fontSize: 16, lineHeight: 24, color: '#5A5750' }}>
                      …then I {l.text2}
                    </UserText>
                  ) : null}
                </View>
              ))}
            </View>
          ))}
          <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
          <Label style={{ color: '#8B7F6A' }}>I will</Label>
          <UserText testID="book-i-will" style={{ fontSize: 24, lineHeight: 32, color: '#15181F' }}>
            {book.iWill}
          </UserText>
          <Label style={{ color: '#8B7F6A', marginTop: 8 }}>
            Sealed {formatDay(book.sealedAt.slice(0, 10))} · written by you
          </Label>
            </>
          )}
        </ScrollView>

        {exportError ? (
          <Body testID="book-export-error" style={{ color: night.ink, paddingTop: 10 }}>
            {exportError}
          </Body>
        ) : null}

        {/*
          Wraps. Three chips in a fixed row ran 12 pt past the edge of a
          320 pt screen, which put "Something moved" — the one that says the
          Book no longer describes them — half off the page.
        */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 14 }}>
          <Chip testID="book-export" label="Export" onPress={onExport} />
          {/*
            The Sunday reading (PRD §7.3) has a door. The notification points at
            it and so does Today on a Sunday, but somebody who simply opened
            their Book and wanted to read it properly had no way through.
          */}
          <Chip testID="book-read" label="Read it" onPress={() => router.push('/reading')} />
          <Chip
            testID="book-still-true"
            label="Still true"
            onPress={() => {
              setToast({ text: 'Good. Nothing to change today.', kind: 'info' });
              router.replace('/today');
            }}
          />
          <Chip
            testID="book-moved"
            label="Something moved"
            onPress={() => router.replace('/today')}
          />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
