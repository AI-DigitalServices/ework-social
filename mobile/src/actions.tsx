import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './ui';
import { colors } from './theme';

/**
 * The app's standard row of secondary actions: short dark tiles side by side, icon above a one-word label.
 * Keep the main action (Publish now, Save, Approve) as a full-width Button above or below the row.
 *
 *   <ActionRow>
 *     <ActionTile label="Edit" icon={(c) => <Feather name="edit-2" size={20} color={c} />} onPress={...} />
 *     <ActionTile label="Delete" tone="danger" icon={...} onPress={...} />
 *   </ActionRow>
 */
export function ActionRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function ActionTile({
  label,
  icon,
  onPress,
  tone = 'default',
  accent,
  disabled,
}: {
  label: string;
  icon: (color: string) => ReactNode;
  onPress: () => void;
  tone?: 'default' | 'danger' | 'ok';
  /** Brand colour for the icon, for example a platform colour. The label keeps the tone colour. */
  accent?: string;
  disabled?: boolean;
}) {
  const color = tone === 'danger' ? colors.danger : tone === 'ok' ? colors.ok : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tile, disabled && { opacity: 0.5 }, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
    >
      {icon(accent ?? color)}
      <Text style={[styles.label, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
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
  label: { fontSize: 14, fontWeight: '700' },
});
