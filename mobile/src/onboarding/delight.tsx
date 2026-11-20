import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui';
import { colors, platformColors, radius, space, type } from '../theme';
import { platformLabel } from './api';
import PlatformIcon from '../platform';

/** Encouragement that changes as the person moves through setup. */
function momentumText(step: number): string {
  if (step <= 1) return 'Let us begin';
  if (step <= 3) return 'Great start';
  if (step <= 5) return 'Looking good';
  if (step === 6) return 'More than halfway';
  if (step <= 8) return 'Almost there';
  return 'Done';
}

/** Segmented progress bar with a short encouraging line. Replaces the plain bar. */
export function Momentum({ step, total }: { step: number; total: number }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <View style={styles.segs}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.seg, i < step && styles.segOn]} />
        ))}
      </View>
      <View style={styles.momentumRow}>
        <Text style={styles.momentumLeft}>
          Step {Math.min(step, total)} of {total}
        </Text>
        <Text style={styles.momentumRight}>{momentumText(step)}</Text>
      </View>
    </View>
  );
}

/** Big friendly header for each step: glowing glyph, kicker, title and one supporting line. */
export function StepHero({
  icon,
  kicker,
  title,
  sub,
  tint = colors.primaryBright,
  soft = colors.primarySoft,
}: {
  icon: string;
  kicker: string;
  title: string;
  sub?: string;
  tint?: string;
  soft?: string;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 340, useNativeDriver: true }).start();
  }, [v]);
  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        marginBottom: space.md,
      }}
    >
      <View style={styles.heroTop}>
        <View style={[styles.badgeOuter, { backgroundColor: soft }]}>
          <View style={[styles.badgeInner, { backgroundColor: tint }]}>
            <Text style={styles.badgeIcon}>{icon}</Text>
          </View>
        </View>
        <Text style={[styles.kicker, { color: tint }]}>{kicker}</Text>
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      {sub ? <Text style={styles.heroSub}>{sub}</Text> : null}
    </Animated.View>
  );
}

const PLATFORM_HINT: Record<string, string> = {
  INSTAGRAM: 'Photos, Reels and stories',
  FACEBOOK: 'Pages and local community',
  LINKEDIN: 'Professional network',
  TWITTER: 'Short, quick updates',
  TIKTOK: 'Short videos',
  YOUTUBE: 'Videos and Shorts',
};

/** A platform shown as a card with its own colour stripe. */
export function PlatformCard({ platform, selected, onPress }: { platform: string; selected: boolean; onPress: () => void }) {
  const color = platformColors[platform] ?? colors.primaryBright;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pCard, selected && { borderColor: color, backgroundColor: colors.cardAlt }, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.pStripe, { backgroundColor: color }]} />
      <PlatformIcon platform={platform} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={styles.pName}>{platformLabel(platform)}</Text>
        {PLATFORM_HINT[platform] ? <Text style={styles.pHint}>{PLATFORM_HINT[platform]}</Text> : null}
      </View>
      <View style={[styles.pCheck, selected && { backgroundColor: color, borderColor: color }]}>
        {selected ? <Text style={styles.pCheckText}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

/** A tone option that shows the sample as a quote, so the choice feels real. */
export function VoiceCard({
  label,
  sample,
  selected,
  onPress,
}: {
  label: string;
  sample: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.vCard, selected && { borderColor: colors.accent, backgroundColor: colors.cardAlt }, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.vTop}>
        <View style={[styles.vPill, selected && { backgroundColor: colors.accent }]}>
          <Text style={[styles.vPillText, selected && { color: '#fff' }]}>{label}</Text>
        </View>
        {selected ? <Text style={{ color: colors.accent, fontWeight: '900', fontSize: 16 }}>✓</Text> : null}
      </View>
      {sample ? (
        <View style={styles.vQuoteRow}>
          <View style={[styles.vQuoteBar, selected && { backgroundColor: colors.accent }]} />
          <Text style={styles.vQuote}>{sample}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** A tick that pops in with a soft pulsing ring. Used on the final screen. */
export function Celebration() {
  const pop = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 5, tension: 90 }).start();
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [pop, pulse]);
  return (
    <View style={styles.celeb}>
      <Animated.View
        style={[
          styles.ring,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
          },
        ]}
      />
      <Animated.View style={[styles.celebCore, { transform: [{ scale: pop }] }]}>
        <Text style={styles.celebTick}>✓</Text>
      </Animated.View>
    </View>
  );
}

/** One line of the "what happens next" timeline. */
export function NextStep({ when, text, last }: { when: string; text: string; last?: boolean }) {
  return (
    <View style={styles.nRow}>
      <View style={styles.nRail}>
        <View style={styles.nDot} />
        {last ? null : <View style={styles.nLine} />}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 16 }}>
        <Text style={styles.nWhen}>{when}</Text>
        <Text style={styles.nText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  segs: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border },
  segOn: { backgroundColor: colors.primaryBright },
  momentumRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  momentumLeft: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  momentumRight: { color: colors.primaryBright, fontSize: 12, fontWeight: '700' },

  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  badgeOuter: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  badgeInner: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  badgeIcon: { color: '#fff', fontSize: 18, fontWeight: '800' },
  kicker: { ...type.label, textTransform: 'uppercase' },
  heroTitle: { color: colors.text, ...type.title, fontSize: 28, lineHeight: 34, marginBottom: 8 },
  heroSub: { color: colors.muted, fontSize: 16, lineHeight: 24 },

  pCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 0,
    marginBottom: 10,
    overflow: 'hidden',
  },
  pStripe: { width: 5, alignSelf: 'stretch' },
  pBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pBadgeText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  pName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  pHint: { color: colors.muted, fontSize: 13, marginTop: 2 },
  pCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A5C75',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pCheckText: { color: '#fff', fontSize: 13, fontWeight: '900', marginTop: -1 },

  vCard: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 12,
  },
  vTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  vPill: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  vPillText: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  vQuoteRow: { flexDirection: 'row', gap: 12 },
  vQuoteBar: { width: 3, borderRadius: 2, backgroundColor: colors.border },
  vQuote: { color: colors.text, fontSize: 15, lineHeight: 23, fontStyle: 'italic', flex: 1 },

  celeb: { alignSelf: 'center', width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  ring: { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: colors.ok },
  celebCore: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.ok, alignItems: 'center', justifyContent: 'center' },
  celebTick: { color: '#fff', fontSize: 44, fontWeight: '900', marginTop: -2 },

  nRow: { flexDirection: 'row', gap: 14 },
  nRail: { alignItems: 'center', width: 14 },
  nDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primaryBright, marginTop: 4 },
  nLine: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4 },
  nWhen: { color: colors.primaryBright, ...type.label, textTransform: 'uppercase', marginBottom: 3 },
  nText: { color: colors.text, fontSize: 15, lineHeight: 22 },
});
