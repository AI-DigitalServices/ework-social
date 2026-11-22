import { markFresh } from '../onboarding/session';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { ErrorText, Text } from '../ui';
import { colors, radius } from '../theme';
import { useAuth } from './AuthContext';

/** Continue with Google (Google's dark button style, full-colour G), then an "or" divider. Shows its own error line. */
export default function GoogleButton() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const press = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      markFresh();
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Google sign-in did not finish. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ marginTop: 4, marginBottom: 4 }}>
      <Pressable
        onPress={press}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
      >
        {busy ? (
          <ActivityIndicator color="#E3E3E3" />
        ) : (
          <>
            <Image source={require('../../assets/images/google-g.png')} style={styles.g} />
            <Text style={styles.label}>Continue with Google</Text>
          </>
        )}
      </Pressable>
      <ErrorText>{error}</ErrorText>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.or}>or</Text>
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#8E918F',
    backgroundColor: '#131314',
  },
  g: { width: 20, height: 20 },
  label: { color: '#E3E3E3', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, marginBottom: 6 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  or: { color: colors.muted, fontSize: 13 },
});
