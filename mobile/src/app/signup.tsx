import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useAuth } from '../auth/AuthContext';
import { Body, Button, ErrorText, Field, Logo, Screen, Title } from '../ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return setError('Please enter your name.');
    if (!business.trim()) return setError('Please enter your business name.');
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter a valid email address.');
    if (password.length < 8) return setError('Your password needs at least 8 characters.');
    setBusy(true);
    setError(null);
    try {
      await signUp({ name, workspaceName: business, email, password });
    } catch (err: any) {
      setError(err?.message || 'Could not create your account. Please try again.');
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
      <View style={{ marginBottom: 28 }}>
        <Logo />
      </View>
      <Title>Create your account</Title>
      <Body>It takes about a minute. Your free trial starts right away.</Body>
      <Field
        label="Your name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        textContentType="name"
        autoComplete="name"
        placeholder="Ada Okafor"
      />
      <Field
        label="Business name"
        value={business}
        onChangeText={setBusiness}
        autoCapitalize="words"
        placeholder="Ada's Bakery"
      />
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
        label="Password (at least 8 characters)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        placeholder="Choose a password"
      />
      <ErrorText>{error}</ErrorText>
      <Button title="Create account" onPress={submit} loading={busy} />
      <Button title="I already have an account" variant="link" onPress={() => router.replace('/login' as Href)} />
      </View>
    </Screen>
  );
}
