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
import { Pressable, Text, View } from 'react-native';
import { accent, day, radius, type as fonts } from '@morrow/ui';

export function StorageWarning({ onExport }: { onExport?: () => void }) {
  const [open, setOpen] = useState(true);

  return (
    <View
      testID="storage-warning"
      accessibilityLiveRegion="assertive"
      style={{
        backgroundColor: accent.coralText,
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 14,
        gap: 8,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Hide the details' : 'Why nothing is being saved'}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
      >
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 15, lineHeight: 21, color: '#FFFFFF' }}>
          Nothing is being saved on this device right now.
        </Text>
      </Pressable>

      {open ? (
        <>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.92)' }}>
            Morrow could not read its own storage, so anything you write now will be here until you close the app and
            no longer. Whatever was already saved has not been touched and is still on the device. Restarting the app
            usually clears this.
          </Text>
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
