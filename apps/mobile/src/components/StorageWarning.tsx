/**
 * Shown when the local store could not be read.
 *
 * This is the one failure the app cannot recover from on its own, and the
 * dangerous response is to say nothing: the store comes up empty, the person
 * looks at a blank app, and the next thing they write is saved over a Book that
 * is still on the device underneath.
 *
 * So the app opens, writing still works in memory — a sitting in progress is
 * not thrown away — and this says plainly that nothing is being kept and what
 * to do about it. It does not offer to "fix" anything, because it cannot.
 */
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { day, radius, type as fonts } from '@morrow/ui';
import { clearLatchAndReplace, quarantinedRaw, storageFailure } from '../storage';
import { takeAway, takeawayNote } from '../takeaway';

export function StorageWarning({ onExport, onFresh }: { onExport?: () => void; onFresh?: () => void }) {
  const [open, setOpen] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const detail = storageFailure()?.detail ?? '';
  const full = /quota|full|no space|disk is full/i.test(detail);

  /** The unreadable bytes, out: they are the person's, however they read. */
  const copyOut = async () => {
    const raw = await quarantinedRaw();
    if (!raw) {
      setNote('There is no earlier copy to hand back.');
      return;
    }
    const out = await takeAway(raw, 'Morrow — the copy that could not be read', 'morrow-unreadable.txt');
    setNote(takeawayNote(out, 'the copy'));
  };

  /** A fresh start on this device, at their asking, after the copy is offered. */
  const startAgain = async () => {
    await clearLatchAndReplace();
    setConfirming(false);
    onFresh?.();
  };
  // Which way it failed decides what to say was kept. A read failure means
  // the old writing is safe underneath and nothing since launch is; a write
  // failure means everything up to the failed save is on disk and only what
  // came after it is not.
  const kind = storageFailure()?.kind ?? 'read';

  return (
    <View
      testID="storage-warning"
      accessibilityLiveRegion="assertive"
      style={{
        // The one deep coral that stays put in the night studio: the banner
        // carries white text and must in both.
        backgroundColor: '#CB3014',
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 14,
        gap: 8,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Nothing is being saved on this device right now. ${open ? 'Hide' : 'Show'} the details`}
        aria-expanded={open}
        onPress={() => setOpen((v) => !v)}
      >
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 15, lineHeight: 21, color: '#FFFFFF' }}>
          Nothing is being saved on this device right now.
        </Text>
      </Pressable>

      {open ? (
        <>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.92)' }}>
            {kind === 'write'
              ? full
                ? `This ${Platform.OS === 'web' ? 'browser' : 'device'} is out of room for Morrow, so the last save did not land. Everything saved before it is still here; copy out what is open, then free some space.`
                : 'The last save did not land. Everything saved before it is still on the device, and Morrow keeps trying; if this stays up, copy out what is open before you close the app.'
              : 'Morrow could not read what it saved last time, so nothing new is being kept. The earlier copy is untouched underneath: take it out below, and then, if you want, start again on this device.'}
          </Text>
          {kind === 'read' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              <Pressable
                testID="storage-warning-copy-out"
                accessibilityRole="button"
                accessibilityLabel="Copy out the earlier copy that could not be read"
                onPress={() => void copyOut()}
                style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.chip, backgroundColor: '#FFFFFF' }}
              >
                <Text style={{ fontFamily: fonts.sansSemi, fontSize: 13, color: day.ink }}>Copy out the earlier copy</Text>
              </Pressable>
              {confirming ? (
                <Pressable
                  testID="storage-warning-fresh-confirm"
                  accessibilityRole="button"
                  accessibilityLabel="Yes, start again on this device. The earlier copy stays on it under another name."
                  onPress={() => void startAgain()}
                  style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.chip, backgroundColor: '#FFFFFF' }}
                >
                  <Text style={{ fontFamily: fonts.sansSemi, fontSize: 13, color: '#CB3014' }}>Yes, start again</Text>
                </Pressable>
              ) : (
                <Pressable
                  testID="storage-warning-fresh"
                  accessibilityRole="button"
                  accessibilityLabel="Start again on this device"
                  onPress={() => setConfirming(true)}
                  style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.chip, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' }}
                >
                  <Text style={{ fontFamily: fonts.sansSemi, fontSize: 13, color: '#FFFFFF' }}>Start again on this device</Text>
                </Pressable>
              )}
            </View>
          ) : null}
          {note ? (
            <Text testID="storage-warning-note" style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: '#FFFFFF' }}>
              {note}
            </Text>
          ) : null}
          {onExport ? (
            <Pressable
              testID="storage-warning-export"
              accessibilityRole="button"
              accessibilityLabel="Copy out what is open"
              onPress={onExport}
              style={{
                alignSelf: 'flex-start',
                marginTop: 2,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: radius.chip,
                backgroundColor: '#FFFFFF',
              }}
            >
              <Text style={{ fontFamily: fonts.sansSemi, fontSize: 13, color: day.ink }}>Copy out what is open</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
