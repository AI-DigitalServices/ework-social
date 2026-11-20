import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui';
import { Button } from '../ui';
import PlatformIcon from '../platform';
import { colors, platformColors, radius } from '../theme';

export type Account = { id: string; platform: string; accountName: string };

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

/** Choose an account and when, then confirm. Used by the write flow and by the ideas shelf. */
export default function PublishPanel({
  accounts,
  busy,
  onConfirm,
}: {
  accounts: Account[];
  busy: boolean;
  onConfirm: (accountId: string, status: 'DRAFT' | 'SCHEDULED', scheduledAt?: string) => void;
}) {
  const options = useMemo(() => presets(), []);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [when, setWhen] = useState('DRAFT');
  const chosen = options.find((o) => o.id === when) ?? options[0];

  return (
    <View>
      <Text style={styles.cap}>Post to</Text>
      <View style={styles.wrap}>
        {accounts.map((a) => {
          const on = a.id === accountId;
          const c = platformColors[a.platform] ?? colors.primaryBright;
          return (
            <Pressable
              key={a.id}
              onPress={() => setAccountId(a.id)}
              style={({ pressed }) => [styles.chip, on && { borderColor: c, backgroundColor: colors.cardAlt }, pressed && { opacity: 0.85 }]}
            >
              <PlatformIcon platform={a.platform} size={22} />
              <Text style={styles.chipText} numberOfLines={1}>
                {platformName(a.platform)} · {a.accountName}
              </Text>
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
        title={chosen.at ? 'Schedule this post' : 'Save as a draft'}
        loading={busy}
        disabled={!accountId}
        onPress={() => onConfirm(accountId, chosen.at ? 'SCHEDULED' : 'DRAFT', chosen.at ? chosen.at.toISOString() : undefined)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cap: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
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
  dot: { width: 8, height: 8, borderRadius: 4 },
});
