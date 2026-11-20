import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../theme';

export function Progress({ step, total }: { step: number; total: number }) {
  const pct = Math.min(100, Math.round((step / total) * 100));
  return (
    <View style={{ marginBottom: space.lg }}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.count}>
        Step {Math.min(step, total)} of {total}
      </Text>
    </View>
  );
}

function usePress() {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  return { scale, onPressIn: () => to(0.98), onPressOut: () => to(1) };
}

export function Choice({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { scale, onPressIn, onPressOut } = usePress();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.choice, selected && { borderColor: colors.primaryBright, backgroundColor: colors.cardAlt }]}
      >
        <View style={[styles.radio, selected && { borderColor: colors.primaryBright, backgroundColor: colors.primaryBright }]}>
          {selected ? <Text style={styles.tick}>✓</Text> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.choiceLabel}>{label}</Text>
          {hint ? <Text style={styles.choiceHint}>{hint}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: colors.primary, borderColor: colors.primaryBright },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.chipText, selected && { fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.primaryBright },
  count: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 8 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A5C75',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { color: '#fff', fontSize: 14, fontWeight: '900', marginTop: -1 },
  choiceLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  choiceHint: { color: colors.muted, fontSize: 13, marginTop: 3, lineHeight: 18 },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { color: colors.text, fontSize: 14 },
});
