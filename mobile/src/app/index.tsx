import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import type { Href } from 'expo-router';
import { useAuth } from '../auth/AuthContext';
import { Body, Button, Logo, Screen, Title } from '../ui';
import { colors } from '../theme';

// The front door: sends the user to the right place for their state.
export default function Index() {
  const { status, retry } = useAuth();

  if (status === 'signedOut') return <Redirect href={'/welcome' as Href} />;
  if (status === 'needsVerification') return <Redirect href={'/verify' as Href} />;
  if (status === 'ready') return <Redirect href={'/home' as Href} />;

  if (status === 'offline') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Logo />
          <View style={{ height: 24 }} />
          <Title>No connection</Title>
          <Body>We could not reach eWork Social. Check your internet connection and try again.</Body>
          <Button title="Try again" onPress={retry} />
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.primaryBright} size="large" />
    </View>
  );
}
