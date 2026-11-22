import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { ActionRow, ActionTile } from '../actions';
import { Button, Text } from '../ui';
import PlatformIcon, { platformColor } from '../platform';
import { colors, radius } from '../theme';
import WhenPicker, { DRAFT_WHEN, formatShort } from './WhenPicker';
import type { When, WhenPickerHandle } from './WhenPicker';

export type Account = { id: string; platform: string; accountName: string };

// Video platforms: the app writes text posts for now, so they are not offered as post targets yet.
const VIDEO_ONLY = ['YOUTUBE', 'TIKTOK'];

function platformName(p: string): string {
  if (p === 'TWITTER') return 'X';
  return p.charAt(0) + p.slice(1).toLowerCase();
}

/**
 * Choose one or more accounts and when, then confirm. The same text goes to every chosen account.
 * Used by the write flow and by the ideas shelf.
 */
export default function PublishPanel({
  accounts: allAccounts,
  busy,
  onConfirm,
}: {
  accounts: Account[];
  busy: boolean;
  onConfirm: (accountIds: string[], status: 'DRAFT' | 'SCHEDULED', scheduledAt?: string) => void;
}) {
  const accounts = allAccounts.filter((a) => !VIDEO_ONLY.includes(a.platform));
  const hiddenVideo = allAccounts.length - accounts.length;
  const [selected, setSelected] = useState<string[]>(accounts[0] ? [accounts[0].id] : []);
  const [when, setWhen] = useState<When>(DRAFT_WHEN);
  const whenRef = useRef<WhenPickerHandle>(null);
  const n = selected.length;
  const all = accounts.length > 1 && n === accounts.length;

  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const title = when.at
    ? n > 1
      ? `Schedule to ${n} accounts`
      : 'Schedule this post'
    : n > 1
      ? `Save ${n} drafts`
      : 'Save as a draft';

  // Nothing to post text to: say so and offer the next step, instead of an empty "Post to" and a dead button.
  if (accounts.length === 0) {
    return (
      <View>
        <Text style={[styles.note, { fontSize: 14, lineHeight: 21 }]}>
          {allAccounts.length === 0
            ? 'You have not connected an account yet. Connect one to schedule this post.'
            : 'Your connected accounts are video platforms. Text posts cannot go there yet, so connect another account to post.'}
        </Text>
        <Button title="Connect an account" onPress={() => router.navigate('/connect' as Href)} />
      </View>
    );
  }

  return (
    <View>
      {hiddenVideo > 0 ? (
        <Text style={styles.note}>
          {accounts.length === 0
            ? 'Your connected accounts are video platforms. Text posts cannot go there yet, so connect another account to post.'
            : 'YouTube and TikTok are connected, but they need a video. Video posting from the app is coming soon.'}
        </Text>
      ) : null}
      <View style={styles.head}>
        <Text style={styles.cap}>{accounts.length > 1 ? 'Post to (pick one or more)' : 'Post to'}</Text>
        {accounts.length > 1 ? (
          <Pressable hitSlop={10} onPress={() => setSelected(all ? [] : accounts.map((a) => a.id))}>
            <Text style={styles.link}>{all ? 'Clear' : 'Select all'}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.wrap}>
        {accounts.map((a) => {
          const on = selected.includes(a.id);
          const c = platformColor(a.platform);
          return (
            <Pressable
              key={a.id}
              onPress={() => toggle(a.id)}
              style={({ pressed }) => [styles.chip, on && { borderColor: c, backgroundColor: colors.cardAlt }, pressed && { opacity: 0.85 }]}
            >
              <PlatformIcon platform={a.platform} size={22} />
              <Text style={styles.chipText} numberOfLines={1}>
                {platformName(a.platform)} · {a.accountName}
              </Text>
              <View style={[styles.box, on && { backgroundColor: c, borderColor: c }]}>
                {on ? <Text style={styles.tick}>✓</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <WhenPicker ref={whenRef} pickChip={false} value={when} onChange={(w) => w && setWhen(w)} />
      <ActionRow>
        <ActionTile
          compact
          label={when.id === 'custom' && when.at ? formatShort(when.at) : 'Pick date & time'}
          accent={when.id === 'custom' ? colors.primaryBright : undefined}
          disabled={busy}
          icon={(c) => <Feather name="calendar" size={20} color={c} />}
          onPress={() => whenRef.current?.open()}
        />
      </ActionRow>

      <Button
        title={title}
        loading={busy}
        disabled={n === 0}
        onPress={() => onConfirm(selected, when.at ? 'SCHEDULED' : 'DRAFT', when.at ? when.at.toISOString() : undefined)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 },
  cap: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  link: { color: colors.primaryBright, fontSize: 13, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: { color: colors.text, fontSize: 14, flexShrink: 1 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4A5C75',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { color: '#fff', fontSize: 12, fontWeight: '900', marginTop: -1 },
});
