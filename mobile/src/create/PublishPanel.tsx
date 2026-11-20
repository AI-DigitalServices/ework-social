import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from '../ui';
import PlatformIcon, { platformColor } from '../platform';
import { colors, radius } from '../theme';

export type Account = { id: string; platform: string; accountName: string };

// Video platforms: the app writes text posts for now, so they are not offered as post targets yet.
const VIDEO_ONLY = ['YOUTUBE', 'TIKTOK'];

type Preset = { id: string; label: string; at: Date | null };

function platformName(p: string): string {
  if (p === 'TWITTER') return 'X';
  return p.charAt(0) + p.slice(1).toLowerCase();
}

/** Quick time choices, so nobody needs a date picker for their first post. */
export function presets(now = new Date()): Preset[] {
  const tomorrowAt = (h: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(h, 0, 0, 0);
    return d;
  };
  return [
    { id: 'DRAFT', label: 'Save as draft', at: null },
    { id: '1h', label: 'In 1 hour', at: new Date(now.getTime() + 3600_000) },
    { id: 't9', label: 'Tomorrow 9:00', at: tomorrowAt(9) },
    { id: 't18', label: 'Tomorrow 18:00', at: tomorrowAt(18) },
  ];
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
  const options = useMemo(() => presets(), []);
  const [selected, setSelected] = useState<string[]>(accounts[0] ? [accounts[0].id] : []);
  const [when, setWhen] = useState('DRAFT');
  const chosen = options.find((o) => o.id === when) ?? options[0];
  const n = selected.length;
  const all = accounts.length > 1 && n === accounts.length;

  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const title = chosen.at
    ? n > 1
      ? `Schedule to ${n} accounts`
      : 'Schedule this post'
    : n > 1
      ? `Save ${n} drafts`
      : 'Save as a draft';

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

      <Text style={styles.cap}>When</Text>
      <View style={styles.wrap}>
        {options.map((o) => {
          const on = o.id === when;
          return (
            <Pressable
              key={o.id}
              onPress={() => setWhen(o.id)}
              style={({ pressed }) => [styles.chip, on && { backgroundColor: colors.primary, borderColor: colors.primaryBright }, pressed && { opacity: 0.85 }]}
            >
              <Text style={[styles.chipText, on && { fontWeight: '700' }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        title={title}
        loading={busy}
        disabled={n === 0}
        onPress={() => onConfirm(selected, chosen.at ? 'SCHEDULED' : 'DRAFT', chosen.at ? chosen.at.toISOString() : undefined)}
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
