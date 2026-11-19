import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Body, Button, Logo, Screen, Title } from '../ui';

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={{ marginTop: 48 }}>
          <Logo />
        </View>
        <View>
          <Title>Your social media, handled.</Title>
          <Body>
            Tell us about your business and we will help you plan, write and schedule your posts, in minutes, from
            your phone.
          </Body>
        </View>
        <View>
          <Button title="Create your account" onPress={() => router.push('/signup' as Href)} />
          <Button title="I already have an account" variant="secondary" onPress={() => router.push('/login' as Href)} />
        </View>
      </View>
    </Screen>
  );
}
