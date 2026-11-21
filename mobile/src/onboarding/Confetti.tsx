import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const COUNT = 48;
const FLOWERS = ['🌸', '🌼', '🌺', '🌷', '✨'];
const PALETTE = [colors.primaryBright, colors.accent, colors.ok, colors.warn, '#FF7AB6', '#25D5CE'];

/** Small deterministic generator, so the pieces are spread evenly and the same on every run. */
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

type Piece = {
  left: number;
  delay: number;
  duration: number;
  size: number;
  sway: number;
  spin: number;
  flower: string | null;
  color: string;
};

/**
 * A one-off shower of confetti and flower petals over the whole screen. It falls once (about five seconds),
 * ignores touches and then removes itself. Used on the last onboarding screen.
 */
export default function Confetti() {
  const { height } = Dimensions.get('window');
  const [done, setDone] = useState(false);
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        left: rand(i + 1) * 94 + 2,
        delay: rand(i + 101) * 1100,
        duration: 2800 + rand(i + 201) * 1800,
        size: 8 + rand(i + 301) * 10,
        sway: (rand(i + 401) - 0.5) * 70,
        spin: (rand(i + 501) > 0.5 ? 1 : -1) * (360 + rand(i + 601) * 540),
        flower: rand(i + 701) < 0.4 ? FLOWERS[Math.floor(rand(i + 801) * FLOWERS.length)] : null,
        color: PALETTE[Math.floor(rand(i + 901) * PALETTE.length)],
      })),
    [],
  );
  const values = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const runs = pieces.map((p, i) =>
      Animated.timing(values[i], {
        toValue: 1,
        duration: p.duration,
        delay: p.delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    Animated.parallel(runs).start(({ finished }) => {
      if (finished) setDone(true);
    });
  }, [pieces, values]);

  if (done) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const v = values[i];
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: -30,
              left: `${p.left}%`,
              opacity: v.interpolate({ inputRange: [0, 0.04, 0.85, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, height + 60] }) },
                { translateX: v.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, p.sway, 0, -p.sway, 0] }) },
                { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
              ],
            }}
          >
            {p.flower ? (
              <Text style={{ fontSize: p.size + 8 }}>{p.flower}</Text>
            ) : (
              <View style={{ width: p.size, height: p.size * 0.55, borderRadius: 2, backgroundColor: p.color }} />
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}
