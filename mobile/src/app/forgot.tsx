import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { request } from '../api/client';
import { Body, Button, ErrorText, Field, Logo, Screen, Title } from '../ui';

export default function Forgot() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const e = email.trim();
    if (!e || !e.includes('@')) {
      setError('Enter the email you signed up with.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await request('/auth/forgot-password', { method: 'POST', body: { email: e }, auth: false });
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Could not send the link. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ marginBottom: 28 }}>
          <Logo />
        </View>
        {sent ? (
          <>
            <Title>Check your email</Title>
            <Body>
              If an account exists for {email.trim()}, we have sent a link to reset your password. Open it, choose a new
              password, then come back here to log in.
            </Body>
            <Button title="Back to log in" onPress={() => router.replace('/login' as Href)} />
            <Button title="Use a different email" variant="link" onPress={() => setSent(false)} />
          </>
        ) : (
          <>
            <Title>Forgot your password?</Title>
            <Body>Enter your email and we will send you a link to choose a new one.</Body>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              placeholder="you@business.com"
            />
            <ErrorText>{error}</ErrorText>
            <Button title="Send reset link" onPress={submit} loading={busy} />
            <Button title="Back to log in" variant="link" onPress={() => router.replace('/login' as Href)} />
          </>
        )}
      </View>
    </Screen>
  );
}
