/**
 * The Book (PRD §7.3): the user's writing, typeset. A paper page in the dark.
 * Everything on it is in the serif because everything on it is theirs.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, View , ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ANALYSIS_TITLES, bookToHtml, bookToText, formatDay, ordinal, pageCount, restOfIdeal, sealedOn, thenHalf } from '@morrow/core';
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
  fitSentence,
  keyboardScroll,
  night,
  paper,
  radius,
  useTwoColumn,
  TopBar,
} from '@morrow/ui';
import { printBook } from '../src/print';
import { useLatestBook, useMorrow, useFirstRun } from '../src/store';
import { DiffPage } from '../src/components/DiffPage';

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
    <Body style={{ fontSize: size - 1, lineHeight: size * 1.3, color: paper.ink }}>{name}</Body>
  );
}

export default function BookScreen() {
  const router = useRouter();
  // Straight from the seal: one door, to Today. Checked against a shape this app owns.
  const { from, version } = useLocalSearchParams<{ from?: string; version?: string }>();
  const fromSeal = from === 'seal';
  const latest = useLatestBook();
  const books = useMorrow((s) => s.books);
  // An older edition by number (the inventory's /book/[version]); the latest otherwise.
  const book = (version ? books.find((b) => String(b.version) === version) : undefined) ?? latest;
  const authoredName = (name: string): boolean => {
    const here = book?.chapters.find((c) => c.name === name);
    const earlier = book ? books.find((b) => b.version === book.version - 1)?.chapters.find((c) => c.name === name) : undefined;
    const c = here ?? earlier;
    return c ? c.nameAuthored !== false : false;
  };
  // Kept: this one is read on Today, which is where it navigates to.
  const setToast = useMorrow((s) => s.setToast);
  const boundary = useMorrow((s) => s.profile.dayBoundaryHour);
  const [exportError, setExportError] = useState<string | null>(null);
  // Above the early return, with the other hooks. Declared below it, this
  // would be called on one render and not the next the moment a Book appeared
  // or was deleted, and React would throw on the screen that shows the Book.
  // `react-hooks/rules-of-hooks` now fails the build on exactly that.
  const [printing, setPrinting] = useState(false);
  const twoColumn = useTwoColumn();
  const firstRun = useFirstRun();

  if (!book) {
    // Reached cold — a stale notification, a bookmarked link — since a Today
    // without a Book has no tab bar. So it has a way back at the top like
    // every other screen, and Begin goes to the next step of the path rather
    // than to a consent already given.
    return (
      <Studio testID="screen-book">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          <TopBar back={{ label: 'Today', onPress: () => router.dismissTo('/today'), testID: 'book-back' }} where="The Book" />
          <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
            <Statement>No Book yet.</Statement>
            <Body>Three evenings and there will be one. It starts with the Interview.</Body>
            <InkButton testID="book-start" label={firstRun.label} onPress={() => router.push(firstRun.route)} />
          </View>
        </SafeAreaView>
      </Studio>
    );
  }

  const onPdf = async () => {
    if (!book || printing) return;
    setPrinting(true);
    setExportError(null);
    const out = await printBook(bookToHtml(book, boundary), book.title);
    setPrinting(false);
    if (!out.ok) setExportError(out.error);
  };

  const onExport = async () => {
    const text = bookToText(book, boundary);
    try {
      await Share.share({ message: text, title: book.title });
      setExportError(null);
    } catch {
      // The Toast surface is only rendered by Today, so a message put there
      // from this screen was written to something nobody was looking at.
      setExportError('This device would not open the share sheet. Your Book is safe here, and You, the last tab, can export everything as text.');
    }
  };

  return (
    <Studio dark wide={twoColumn} testID="screen-book">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 18 }}>
        <TopBar
          back={{ label: 'Today', onPress: () => router.dismissTo('/today'), testID: 'book-back' }}
          right={
            <Label style={{ color: night.ink3 }}>
              {ordinal(book.version)} edition · {pageCount(book)} pages
            </Label>
          }
          style={{ paddingTop: 4, minHeight: 52 }}
        />

        {/* the paper page */}
        <ScrollView
          {...keyboardScroll}
          testID="book-page"
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: paper.ground, borderRadius: radius.card }}
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
              <Body testID="book-spine-framing" style={{ fontSize: 15, color: paper.ink3 }}>
                {book.titleFraming}
              </Body>
            ) : null}
            {book.titleAuthored === false ? (
              <Body testID="book-spine" accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, color: '#231F1A' }}>
                {book.title}
              </Body>
            ) : (
              <UserText testID="book-spine" accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, color: '#231F1A' }}>
                {book.title}
              </UserText>
            )}
          </View>
          <Rule style={{ backgroundColor: '#E2DACB' }} />

          {/* A re-authored edition opens on what changed (PRD §7.3). */}
          {book.diff && book.version > 1 ? (
            <>
              <DiffPage diff={book.diff} previous={book.version - 1} authored={authoredName} />
              <Rule style={{ backgroundColor: '#E2DACB' }} />
            </>
          ) : null}

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
              <Label style={{ color: paper.ink3 }}>Chapter one · the Fifteen</Label>
              <UserText testID="book-first-sentence" style={{ ...fitSentence(book.firstSentence.length), color: '#15181F' }}>
                {book.firstSentence}
              </UserText>
              <UserText style={{ fontSize: 17, lineHeight: 27, color: paper.ink }}>
                {restOfIdeal(book.ideal, book.firstSentence)}
              </UserText>

              {book.shadow ? (
                <>
                  <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
                  <Label style={{ color: paper.ink3 }}>The other road</Label>
                  <UserText style={{ fontSize: 16, lineHeight: 25, color: paper.ink2 }}>{book.shadow}</UserText>
                </>
              ) : null}

              <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
              <Label style={{ color: paper.ink3 }}>Contents</Label>
              {book.chapters.map((c) => (
                <View key={c.goalId} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <ChapterName name={c.name} authored={c.nameAuthored !== false} size={17} />
                  </View>
                  <Label style={{ color: paper.ink3 }}>{c.horizon}</Label>
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
                      <Label style={{ color: paper.ink3 }}>
                        {ANALYSIS_TITLES[l.kind]}
                        {l.framingLabel ? ` · ${l.framingLabel}` : ''}
                      </Label>
                      <UserText style={{ fontSize: 17, lineHeight: 26, color: paper.ink }}>{l.text}</UserText>
                      {l.text2 ? (
                        <UserText italic framing={thenHalf(l.text2).framing} style={{ fontSize: 16, lineHeight: 24, color: paper.ink2 }}>
                          {thenHalf(l.text2).act}
                        </UserText>
                      ) : null}
                      {l.paragraph ? (
                        <UserText style={{ fontSize: 15, lineHeight: 23, color: paper.ink2 }}>{l.paragraph}</UserText>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))}
              {/* The other two volumes, as the reading prints them: after the goals, before the last line. The top bar counts their pages; the paper used to skip them. */}
              {book.volumes?.present?.entries?.length ? (
                <>
                  <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
                  <Body testID="book-present" style={{ fontSize: 21, color: paper.ink }}>What I am like</Body>
                  {book.volumes.present.entries.map((e, k) => (
                    <View key={'present-' + String(k)} style={{ gap: 3 }}>
                      <Label style={{ color: paper.ink3 }}>
                        {e.half === 'faults' ? 'What gets in the way' : 'What I am good at'}
                        {e.goalName ? ' · ' + e.goalName : ''}
                      </Label>
                      <Body style={{ fontSize: 16, color: paper.ink2 }}>{e.card}</Body>
                      <UserText style={{ fontSize: 17, lineHeight: 27, color: paper.ink }}>{e.story}</UserText>
                      <UserText italic framing={e.framing ?? undefined} style={{ fontSize: 16, lineHeight: 25, color: paper.ink2 }}>
                        {e.apply}
                      </UserText>
                    </View>
                  ))}
                </>
              ) : null}
              {book.volumes?.past?.entries?.length ? (
                <>
                  <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
                  <Body testID="book-past" style={{ fontSize: 21, color: paper.ink }}>Where I came from</Body>
                  {book.volumes.past.entries.map((e, k) => (
                    <View key={'past-' + String(k)} style={{ gap: 3 }}>
                      <Label style={{ color: paper.ink3 }}>{e.period}</Label>
                      <UserText style={{ fontSize: 18, lineHeight: 26, color: '#15181F' }}>{e.title}</UserText>
                      <UserText style={{ fontSize: 17, lineHeight: 27, color: paper.ink }}>{e.whatHappened}</UserText>
                      <UserText style={{ fontSize: 16, lineHeight: 25, color: paper.ink2 }}>{e.shapedMe}</UserText>
                      <UserText italic style={{ fontSize: 17, lineHeight: 26, color: paper.ink }}>
                        {e.stillBelieve}
                      </UserText>
                    </View>
                  ))}
                </>
              ) : null}
              <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
              <Label style={{ color: paper.ink3 }}>I will</Label>
              <UserText testID="book-i-will" style={{ fontSize: 24, lineHeight: 32, color: '#15181F' }}>
                {book.iWill}
              </UserText>
              <Label style={{ color: paper.ink3, marginTop: 8 }}>
                Sealed {formatDay(sealedOn(book.sealedAt, boundary))} · written by you
              </Label>
              </View>
            </View>
          ) : (
            <>
          <Label style={{ color: paper.ink3 }}>Chapter one · the Fifteen</Label>
          <UserText testID="book-first-sentence" style={{ ...fitSentence(book.firstSentence.length), color: '#15181F' }}>
            {book.firstSentence}
          </UserText>
          <UserText style={{ fontSize: 17, lineHeight: 27, color: paper.ink }}>
            {restOfIdeal(book.ideal, book.firstSentence)}
          </UserText>

          {book.shadow ? (
            <>
              <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
              <Label style={{ color: paper.ink3 }}>The other road</Label>
              <UserText style={{ fontSize: 16, lineHeight: 25, color: paper.ink2 }}>{book.shadow}</UserText>
            </>
          ) : null}

          <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
          <Label style={{ color: paper.ink3 }}>Contents</Label>
          {book.chapters.map((c) => (
            <View key={c.goalId} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <ChapterName name={c.name} authored={c.nameAuthored !== false} size={17} />
              </View>
              <Label style={{ color: paper.ink3 }}>{c.horizon}</Label>
            </View>
          ))}
          {book.chapters.map((c) => (
            <View key={`ch-${c.goalId}`} style={{ gap: 10, marginTop: 10 }}>
              <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
              <ChapterName name={c.name} authored={c.nameAuthored !== false} size={22} />
              {c.lines.map((l, i) => (
                <View key={`${c.goalId}-${i}`} style={{ gap: 3 }}>
                  <Label style={{ color: paper.ink3 }}>
                    {ANALYSIS_TITLES[l.kind]}
                    {l.framingLabel ? ` · ${l.framingLabel}` : ''}
                  </Label>
                  <UserText style={{ fontSize: 17, lineHeight: 26, color: paper.ink }}>{l.text}</UserText>
                  {l.text2 ? (
                    <UserText italic framing={thenHalf(l.text2).framing} style={{ fontSize: 16, lineHeight: 24, color: paper.ink2 }}>
                      {thenHalf(l.text2).act}
                    </UserText>
                  ) : null}
                  {l.paragraph ? (
                    <UserText style={{ fontSize: 15, lineHeight: 23, color: paper.ink2 }}>{l.paragraph}</UserText>
                  ) : null}
                </View>
              ))}
            </View>
          ))}
          {/* The other two volumes, as the reading prints them: after the goals, before the last line. The top bar counts their pages; the paper used to skip them. */}
          {book.volumes?.present?.entries?.length ? (
            <>
              <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
              <Body testID="book-present" style={{ fontSize: 21, color: paper.ink }}>What I am like</Body>
              {book.volumes.present.entries.map((e, k) => (
                <View key={'present-' + String(k)} style={{ gap: 3 }}>
                  <Label style={{ color: paper.ink3 }}>
                    {e.half === 'faults' ? 'What gets in the way' : 'What I am good at'}
                    {e.goalName ? ' · ' + e.goalName : ''}
                  </Label>
                  <Body style={{ fontSize: 16, color: paper.ink2 }}>{e.card}</Body>
                  <UserText style={{ fontSize: 17, lineHeight: 27, color: paper.ink }}>{e.story}</UserText>
                  <UserText italic framing={e.framing ?? undefined} style={{ fontSize: 16, lineHeight: 25, color: paper.ink2 }}>
                    {e.apply}
                  </UserText>
                </View>
              ))}
            </>
          ) : null}
          {book.volumes?.past?.entries?.length ? (
            <>
              <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
              <Body testID="book-past" style={{ fontSize: 21, color: paper.ink }}>Where I came from</Body>
              {book.volumes.past.entries.map((e, k) => (
                <View key={'past-' + String(k)} style={{ gap: 3 }}>
                  <Label style={{ color: paper.ink3 }}>{e.period}</Label>
                  <UserText style={{ fontSize: 18, lineHeight: 26, color: '#15181F' }}>{e.title}</UserText>
                  <UserText style={{ fontSize: 17, lineHeight: 27, color: paper.ink }}>{e.whatHappened}</UserText>
                  <UserText style={{ fontSize: 16, lineHeight: 25, color: paper.ink2 }}>{e.shapedMe}</UserText>
                  <UserText italic style={{ fontSize: 17, lineHeight: 26, color: paper.ink }}>
                    {e.stillBelieve}
                  </UserText>
                </View>
              ))}
            </>
          ) : null}
          <Rule style={{ backgroundColor: 'rgba(21,24,31,0.12)' }} />
          <Label style={{ color: paper.ink3 }}>I will</Label>
          <UserText testID="book-i-will" style={{ fontSize: 24, lineHeight: 32, color: '#15181F' }}>
            {book.iWill}
          </UserText>
          <Label style={{ color: paper.ink3, marginTop: 8 }}>
            Sealed {formatDay(sealedOn(book.sealedAt, boundary))} · written by you
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
        <View style={{ gap: 10, paddingVertical: 14 }}>
          {fromSeal ? (
            /*
              Straight from the seal, the Book is the thing they made and Today
              is the thing to do with it. The three Sunday verdicts below are
              for a Book that has been lived with; on the night it was sealed
              they read as a quiz, and the first move sat two taps away.
            */
            <View style={{ gap: 8 }}>
              <InkButton testID="book-to-today" label="On to Today — your first move" onPress={() => router.dismissTo('/today')} />
              <Label style={{ color: night.ink3, textAlign: 'center' }}>Read it any time from the Book tab</Label>
            </View>
          ) : book !== latest ? (
            /*
              An earlier edition, opened by its number. It is read, not acted
              on: the verdicts and the doors below belong to the edition that
              stands, and this page says so and leads there.
            */
            <View style={{ gap: 8 }}>
              <Label testID="book-earlier" style={{ color: night.ink3 }}>
                An earlier edition. The {latest ? ordinal(latest.version).toLowerCase() : 'latest'} is the one that stands.
              </Label>
              <Chip testID="book-latest" label="The edition that stands" onPress={() => router.replace('/book')} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {/*
                The Sunday reading (PRD §7.3) has a door. The notification
                points at it and so does Today on a Sunday, but somebody who
                simply opened their Book and wanted to read it properly had no
                way through.
              */}
              <Chip testID="book-read" label="Read it" onPress={() => router.push('/reading')} />
              <Chip
                testID="book-still-true"
                label="Still true"
                onPress={() => {
                  setToast({ text: 'Good. Nothing to change today.', kind: 'info' });
                  router.dismissTo('/today');
                }}
              />
              {/* The reading's own verdict, which opens the chooser of what moved. */}
              <Chip testID="book-moved" label="Something moved" onPress={() => router.push('/reading?moved=1')} />
            </View>
          )}
          {/* The ways out of the app: quieter than the ways through it. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
            <TextButton testID="book-export" label="Export" onPress={onExport} />
            {/*
              The Book as a PDF (PRD §7.3). The same page, typeset the same
              way, handed to the platform's own renderer; on the web it is the
              print dialogue, which has Save as PDF in it everywhere. Of the
              edition on the page, like Export.
            */}
            <TextButton testID="book-pdf" label={printing ? 'Making it…' : 'PDF'} onPress={() => void onPdf()} />
            {book === latest ? (
              <>
            {/* The I will line as a lock screen (PRD §7.8). */}
            <TextButton testID="book-wallpaper" label="Lock screen" onPress={() => router.push('/wallpaper')} />
            {/* The Declaration (PRD §7.17): the line across their own face, for one witness or nobody. */}
            <TextButton testID="book-declare" label="Declare it" onPress={() => router.push('/declare')} />
              </>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </Studio>
  );
}
