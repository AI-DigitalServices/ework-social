import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { AppState } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { Body, Button, ErrorText, Logo, Screen, Title } from '../ui';
import { colors } from '../theme';
import { Text } from 'react-native';

const RESEND_COOLDOWN_S = 30;

export default function Verify() {
  const { config, checkVerified, resendVerification, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const busyRef = useRef(false);

  const check = useCallback(
    async (silent: boolean) => {
      if (busyRef.current) return;
      busyRef.current = true;
      if (!silent) {
        setChecking(true);
        setError(null);
        setMessage(null);
      }
      try {
        const ok = await checkVerified();
        // On success the app moves on by itself.
        if (!ok && !silent) setMessage('Not verified yet. Open the email we sent you and tap the confirm button, then come back here.');
      } catch (err: any) {
        if (!silent) setError(err?.message || 'Could not check. Please try again.');
      } finally {
        busyRef.current = false;
        if (!silent) setChecking(false);
      }
    },
    [checkVerified],
  );

  // Check again whenever the user comes back to the app (they just tapped the email link).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void check(true);
    });
    return () => sub.remove();
  }, [check]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    setError(null);
    setMessage(null);
    try {
      await resendVerification();
      setMessage('We sent a new email. It can take a minute to arrive. Check your spam folder too.');
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err: any) {
      setError(err?.message || 'Could not send the email. Please try again.');
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
      <View style={{ marginBottom: 28 }}>
        <Logo />
      </View>
      <Title>Check your email</Title>
      <Body>
        We sent a confirmation link to{' '}
        <Text style={{ color: colors.text, fontWeight: '700' }}>{config?.user.email ?? 'your email'}</Text>. Tap it to
        confirm your account, then come back here.
      </Body>
      <ErrorText>{error}</ErrorText>
      {message ? <Body>{message}</Body> : null}
      <Button title="I have confirmed my email" onPress={() => check(false)} loading={checking} />
      <Button
        title={cooldown > 0 ? `Send again in ${cooldown}s` : 'Send the email again'}
        variant="secondary"
        onPress={resend}
        disabled={cooldown > 0}
      />
      <Button title="Log out" variant="link" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}
