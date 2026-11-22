import { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Button, Card, Text } from '../ui';
import { PLAN_URL } from '../plan';
import { colors, radius, space } from '../theme';

/** What the API reports for AI writing ("Give us an idea"): this month's use and allowance. */
export type IdeaUsage = { used: number; limit: number; remaining: number; trial: boolean; resets: string | null };

const NO_CAP = 100000;

function resetText(u: IdeaUsage | null): string {
  const d = u?.resets ? new Date(u.resets) : null;
  if (!d || Number.isNaN(d.getTime())) return 'the start of next month';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}

/** A small "?" row next to the AI actions: shows how many AI writes are left and explains how they work. */
export default function AiInfo({ usage }: { usage: IdeaUsage | null }) {
  const [open, setOpen] = useState(false);
  const capped = !!usage && usage.limit < NO_CAP;
  const label =
    usage && capped ? `${usage.remaining} AI ${usage.remaining === 1 ? 'write' : 'writes'} left` : 'How AI writing works';

  const first = !usage
    ? 'Each time we write posts, it uses one AI write from your monthly allowance.'
    : !capped
      ? 'Your plan has no monthly cap on AI writing.'
      : `${usage.trial ? 'Your free trial includes' : 'Your plan includes'} ${usage.limit} AI writes a month. You have used ${usage.used}, so ${usage.remaining} ${usage.remaining === 1 ? 'is' : 'are'} left.`;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={styles.row} accessibilityRole="button" accessibilityLabel="How AI writing works">
        <Feather name="help-circle" size={18} color={colors.primaryBright} />
        <Text style={styles.rowText}>{label}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.title}>How AI writing works</Text>
            <Text style={styles.body}>{first}</Text>
            <Text style={styles.body}>Writing three posts, or writing different ones, uses one AI write each time. Editing the text yourself is always free.</Text>
            {capped ? (
              <Text style={styles.body}>
                If you run out, you can still write posts by hand, save drafts and schedule. AI writing comes back on {resetText(usage)}, or you can choose a plan for more.
              </Text>
            ) : null}
            {capped ? <Button title="Choose a plan" onPress={() => void Linking.openURL(PLAN_URL)} /> : null}
            <Button title="Got it" variant="link" onPress={() => setOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/** Shown instead of an error when the AI allowance is used up: a calm explanation and a way to carry on by hand. */
export function LimitNote({ usage, onWriteMyself }: { usage: IdeaUsage | null; onWriteMyself: () => void }) {
  return (
    <Card tone="warn">
      <Text style={styles.noteTitle}>You have used your AI writes for now</Text>
      <Text style={[styles.body, { marginBottom: 14 }]}>
        You can still write this post yourself, save it and schedule it. AI writing returns on {resetText(usage)}, or you can choose a plan for more.
      </Text>
      <Button title="Write it myself" onPress={onWriteMyself} />
      <Button title="Choose a plan" variant="link" onPress={() => void Linking.openURL(PLAN_URL)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  rowText: { color: colors.primaryBright, fontSize: 14, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingTop: 10,
    paddingBottom: 34,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: radius.pill, backgroundColor: colors.border, marginBottom: 14 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginBottom: 10 },
  noteTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 12 },
});
