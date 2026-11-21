import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { ErrorText, Text } from '../ui';
import { colors, radius } from '../theme';
import { useAuth } from './AuthContext';

/** "or" divider and a Continue with Google button. Shows its own error line; the screen's error line is untouched. */
export default function GoogleButton() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const press = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Google sign-in did not finish. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ marginTop: 6 }}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.or}>or</Text>
        <View style={styles.line} />
      </View>
      <Pressable
        onPress={press}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
      >
        {busy ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <>
            <AntDesign name="google" size={18} color={colors.text} />
            <Text style={styles.label}>Continue with Google</Text>
          </>
        )}
      </Pressable>
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 14 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  or: { color: colors.muted, fontSize: 13 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  label: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
