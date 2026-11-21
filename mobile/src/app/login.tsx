import { Pressable } from 'react-native';
import { Text } from '../ui';
import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useAuth } from '../auth/AuthContext';
import { Body, Button, ErrorText, Field, Logo, Screen, Title } from '../ui';

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err?.message || 'Could not log in. Please try again.');
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
      <View style={{ marginBottom: 28 }}>
        <Logo />
      </View>
      <Title>Welcome back</Title>
      <Body>Log in to see how your social media is doing.</Body>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        placeholder="you@business.com"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
        autoComplete="password"
        placeholder="Your password"
      />
      <Pressable
        onPress={() => router.push('/forgot' as Href)}
        hitSlop={8}
        style={{ alignSelf: 'flex-end', marginTop: -6, marginBottom: 14 }}
      >
        <Text style={{ color: '#6FB0FF', fontSize: 14, fontWeight: '600' }}>Forgot password?</Text>
      </Pressable>
      <ErrorText>{error}</ErrorText>
      <Button title="Log in" onPress={submit} loading={busy} />
      <Button title="New here? Create an account" variant="link" onPress={() => router.replace('/signup' as Href)} />
      </View>
    </Screen>
  );
}
