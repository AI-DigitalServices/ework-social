import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './ui';
import { colors } from './theme';

/**
 * The app's standard buttons, so every screen feels the same:
 *
 *  1. Button (ui.tsx): the one main action on a screen, full width (Publish now, Continue).
 *  2. ActionTile, outline (default): secondary actions, a row of short dark tiles, icon above a one-word label.
 *       <ActionRow>
 *         <ActionTile label="Edit" icon={(c) => <Feather name="edit-2" size={22} color={c} />} onPress={...} />
 *         <ActionTile label="Share" icon={...} onPress={...} />
 *       </ActionRow>
 *  3. ActionTile fill="solid" compact: form actions where the colour carries the meaning.
 *       tone="primary" (blue)  save, confirm
 *       tone="ok" (green)      positive or scheduling actions
 *       tone="danger" (red)    delete, disconnect, anything destructive
 *       <ActionRow>
 *         <ActionTile fill="solid" compact tone="primary" label="Save changes" icon={...} onPress={...} />
 *         <ActionTile fill="solid" compact tone="ok" label="Pick date & time" icon={...} onPress={...} />
 *         <ActionTile fill="solid" compact tone="danger" label="Delete" icon={...} onPress={...} />
 *       </ActionRow>
 *
 * Use accent to colour just the icon with a brand colour (for example the WhatsApp green).
 */
export function ActionRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

type Tone = 'default' | 'primary' | 'ok' | 'danger';

// Deeper than the text colours in theme.ts, so white labels stay readable on them.
const SOLID: Record<Tone, string> = {
  default: colors.cardAlt,
  primary: colors.primary,
  ok: '#1E9E6A',
  danger: '#D6434A',
};

export function ActionTile({
  label,
  icon,
  onPress,
  tone = 'default',
  accent,
  fill = 'outline',
  compact,
  loading,
  disabled,
}: {
  label: string;
  icon: (color: string) => ReactNode;
  onPress: () => void;
  tone?: Tone;
  /** Brand colour for the icon, for example a platform colour. The label keeps the tone colour. */
  accent?: string;
  fill?: 'outline' | 'solid';
  /** Smaller tile with a label that may wrap onto two lines. Meant for rows of three form actions. */
  compact?: boolean;
  loading?: boolean;
  disabled?: boolean;
}) {
  const solid = fill === 'solid';
  const color = solid ? '#FFFFFF' : tone === 'danger' ? colors.danger : tone === 'ok' ? colors.ok : tone === 'primary' ? colors.primaryBright : colors.text;
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.tile,
        compact && styles.compact,
        solid && { backgroundColor: SOLID[tone], borderColor: 'transparent' },
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      {loading ? <ActivityIndicator color={color} /> : icon(accent ?? color)}
      <Text
        style={[styles.label, compact && styles.labelCompact, { color }]}
        numberOfLines={compact ? 2 : 1}
        adjustsFontSizeToFit={!compact}
        minimumFontScale={0.85}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  compact: { gap: 5, paddingVertical: 12, minHeight: 68 },
  label: { fontSize: 14, fontWeight: '700' },
  labelCompact: { fontSize: 13, textAlign: 'center', lineHeight: 16 },
});
