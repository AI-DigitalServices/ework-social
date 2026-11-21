import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Pill, Text } from '../ui';
import { colors, radius, space, type } from '../theme';

/** Halo layers: wide and faint on the outside, tighter toward the card. */
const HALO = [26, 20, 15, 10, 6, 3];

/**
 * "Give us an idea" card. The glow marks the next step. While the workspace has no posts yet (`fresh`)
 * it breathes slowly; once there is activity it settles to a still, softer glow so it never nags.
 */
export function IdeaCard({ onPress, fresh }: { onPress: () => void; fresh: boolean }) {
  const pulse = useRef(new Animated.Value(fresh ? 0 : 0.3)).current;
  useEffect(() => {
    if (!fresh) {
      pulse.setValue(0.3);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.15, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fresh, pulse]);

  return (
    <View style={styles.wrap}>
      {HALO.map((g, i) => (
        <Animated.View
          key={g}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -g,
            bottom: -g,
            left: -g,
            right: -g,
            borderRadius: radius.lg + g,
            backgroundColor: colors.accent,
            opacity: Animated.multiply(pulse, 0.05 + i * 0.012),
          }}
        />
      ))}
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
        <Pill label="New" color={colors.accent} soft={colors.accentSoft} />
        <Text style={styles.title}>Give us an idea</Text>
        <Text style={styles.body}>One sentence, and we write three posts in your voice.</Text>
        <View style={styles.btnRow}>
          <View style={styles.btn}>
            <Text style={styles.btnText}>Write a post</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.lg,
    padding: space.md,
  },
  title: { color: colors.text, ...type.heading, fontSize: 18, marginTop: 10, marginBottom: 4 },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 18,
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
