import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, FadeIn, Logo, Text } from '../ui';
import { colors, fonts, space, type } from '../theme';

const SITE = 'https://app.eworksocial.com';

/** Corner circle: a defined edge, brightest toward the top-right. Stacked discs fake the gradient without extra packages. */
const BOX = 330;
const DISC_COUNT = 44;
const FROM = [0x0b, 0x1b, 0x42];
const TO = [0x4a, 0x96, 0xee];
const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
// many fine steps (edge dark -> centre bright) so no rings show; each smaller disc drifts toward the corner
const DISCS = Array.from({ length: DISC_COUNT }, (_, i) => {
  const t = i / (DISC_COUNT - 1);
  const size = BOX - t * (BOX - 30);
  const mix = Math.pow(t, 0.9);
  const color = '#' + FROM.map((f, k) => hex(f + (TO[k] - f) * mix)).join('');
  const drift = (BOX - size) * 0.2;
  return { size, color, left: BOX / 2 - size / 2 + drift, top: BOX / 2 - size / 2 - drift };
});

/** Soft halo around the preview card: wider, fainter rounded rectangles. */
const HALO = [34, 26, 19, 13, 8, 4];

export default function Welcome() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.screen}>
      <View pointerEvents="none" style={styles.corner}>
        {DISCS.map((d) => (
          <View
            key={d.size}
            style={{
              position: 'absolute',
              top: d.top,
              left: d.left,
              width: d.size,
              height: d.size,
              borderRadius: d.size / 2,
              backgroundColor: d.color,
            }}
          />
        ))}
      </View>

      <View style={styles.body}>
        <FadeIn style={{ marginTop: space.md }}>
          <Logo />
        </FadeIn>

        <FadeIn delay={120} style={{ marginTop: 36 }}>
          <Text style={styles.headline}>
            Your social media,{'\n'}
            <Text style={{ color: '#6FB0FF', fontFamily: fonts.serifItalic }}>handled.</Text>
          </Text>
          <Text style={styles.sub}>Plan, write, and schedule posts in minutes.</Text>
        </FadeIn>

        <FadeIn delay={260} style={styles.previewWrap}>
          {HALO.map((g, i) => (
            <View
              key={g}
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -g,
                bottom: -g,
                left: -g,
                right: -g,
                borderRadius: 18 + g,
                backgroundColor: colors.primaryBright,
                opacity: 0.035 + i * 0.012,
              }}
            />
          ))}
          <View style={styles.stackBack2} />
          <View style={styles.stackBack1} />
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.avatar} />
              <Text style={styles.brand}>Your Brand</Text>
            </View>
            <Text style={styles.cardText}>Launching our autumn collection this Friday...</Text>
            <View style={styles.voice}>
              <Text style={styles.voiceStar}>✦</Text>
              <Text style={styles.voiceText}>Written in your voice</Text>
            </View>
            <View style={styles.approveRow}>
              <View style={styles.approve}>
                <Text style={styles.approveText}>Approve & Schedule</Text>
              </View>
            </View>
          </View>
        </FadeIn>

        <View style={{ flex: 1 }} />

        <FadeIn delay={400}>
          <Button title="Create your account" onPress={() => router.push('/signup' as Href)} />
          <Pressable onPress={() => router.push('/login' as Href)} hitSlop={10} style={styles.signInRow}>
            <Text style={styles.signInMuted}>
              Already have an account? <Text style={styles.signInLink}>Sign in</Text>
            </Text>
          </Pressable>
          <Text style={styles.legal}>
            By continuing, you agree to our{' '}
            <Text style={styles.legalLink} onPress={() => Linking.openURL(SITE + '/terms')}>
              Terms of Service
            </Text>{' '}
            &{' '}
            <Text style={styles.legalLink} onPress={() => Linking.openURL(SITE + '/privacy')}>
              Privacy Policy
            </Text>
          </Text>
        </FadeIn>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  corner: { position: 'absolute', top: -150, right: -125, width: BOX, height: BOX },
  body: { flex: 1, paddingHorizontal: 22, paddingBottom: space.md },
  headline: { color: colors.text, ...type.display, fontSize: 31, lineHeight: 41, textAlign: 'center' },
  sub: { color: '#A9BBD1', fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 12, paddingHorizontal: 16 },
  previewWrap: { marginTop: 40, marginHorizontal: 6 },
  stackBack2: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: -20,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.6,
  },
  stackBack1: {
    position: 'absolute',
    left: 9,
    right: 9,
    bottom: -10,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.85,
  },
  card: {
    backgroundColor: '#121E36',
    borderWidth: 1,
    borderColor: '#34507F',
    borderRadius: 18,
    padding: 16,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent },
  brand: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cardText: { color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 12 },
  voice: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(76,155,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(111,176,255,0.55)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  voiceStar: { color: '#6FB0FF', fontSize: 14 },
  voiceText: { color: '#CFE3FF', fontSize: 14, fontWeight: '600' },
  approveRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  approve: { backgroundColor: colors.primary, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 14 },
  approveText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  signInRow: { alignItems: 'center', paddingVertical: 14 },
  signInMuted: { color: '#A9BBD1', fontSize: 15 },
  signInLink: { color: '#6FB0FF', fontWeight: '700' },
  legal: { color: '#6B7F9B', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  legalLink: { textDecorationLine: 'underline' },
});
