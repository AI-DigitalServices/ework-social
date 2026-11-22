import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Pill, Text } from '../ui';
import { colors, fonts, radius, space } from '../theme';

/** Halo layers: wide and faint on the outside, tighter toward the card. */
const HALO = [26, 20, 15, 10, 6, 3];

/**
 * A card that points at the next step: serif title, a blue button at the bottom and a glow around the border.
 * With `pulse` the glow breathes slowly; without it the glow stays still and softer.
 */
export function NextStepCard({
  pill,
  title,
  text,
  cta,
  onPress,
  tone = colors.accent,
  toneSoft = colors.accentSoft,
  pulse: breathe,
}: {
  pill: string;
  title: string;
  text: string;
  cta: string;
  onPress: () => void;
  tone?: string;
  toneSoft?: string;
  pulse: boolean;
}) {
  const pulse = useRef(new Animated.Value(breathe ? 0 : 0.3)).current;
  useEffect(() => {
    if (!breathe) {
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
  }, [breathe, pulse]);

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
            backgroundColor: tone,
            opacity: Animated.multiply(pulse, 0.05 + i * 0.012),
          }}
        />
      ))}
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { borderColor: tone }, pressed && { opacity: 0.9 }]}>
        <Pill label={pill} color={tone} soft={toneSoft} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{text}</Text>
        <View style={styles.btnRow}>
          <View style={styles.btn}>
            <Text style={styles.btnText}>{cta}</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

/** "Give us an idea" card. Glows and breathes while the workspace has no posts yet (`fresh`). */
export function IdeaCard({ onPress, fresh }: { onPress: () => void; fresh: boolean }) {
  return (
    <NextStepCard
      pill="New"
      title="Give us an idea"
      text="One sentence, and we write three posts in your voice."
      cta="Write a post"
      onPress={onPress}
      pulse={fresh}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
  },
  title: { color: colors.text, fontFamily: fonts.serifBold, fontSize: 20, lineHeight: 28, marginTop: 10, marginBottom: 4 },
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
