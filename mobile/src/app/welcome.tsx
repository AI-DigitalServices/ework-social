import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Button, FadeIn, Logo, Screen } from '../ui';
import { colors, space, type } from '../theme';

const POINTS = [
  { icon: '✦', text: 'Tell us about your business once' },
  { icon: '✎', text: 'We write your posts in your voice' },
  { icon: '◷', text: 'Approve and schedule in a tap' },
];

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <FadeIn style={{ marginTop: 40 }}>
          <Logo />
        </FadeIn>

        <View>
          <FadeIn delay={120}>
            <Text style={styles.headline}>
              Your social media,{'\n'}
              <Text style={{ color: colors.primaryBright }}>handled.</Text>
            </Text>
            <Text style={styles.sub}>Plan, write and schedule your posts in minutes, from your phone.</Text>
          </FadeIn>
          <FadeIn delay={260}>
            {POINTS.map((p) => (
              <View key={p.text} style={styles.point}>
                <View style={styles.pointIcon}>
                  <Text style={styles.pointIconText}>{p.icon}</Text>
                </View>
                <Text style={styles.pointText}>{p.text}</Text>
              </View>
            ))}
          </FadeIn>
        </View>

        <FadeIn delay={400}>
          <Button title="Create your account" onPress={() => router.push('/signup' as Href)} />
          <Button title="I already have an account" variant="secondary" onPress={() => router.push('/login' as Href)} />
        </FadeIn>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headline: { color: colors.text, ...type.display, fontSize: 38, lineHeight: 44, marginBottom: space.md },
  sub: { color: colors.muted, fontSize: 17, lineHeight: 25, marginBottom: space.lg },
  point: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  pointIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointIconText: { color: colors.primaryBright, fontSize: 17, fontWeight: '800' },
  pointText: { color: colors.text, fontSize: 16, fontWeight: '600', flexShrink: 1 },
});
