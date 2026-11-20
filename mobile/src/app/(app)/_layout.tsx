import { Stack } from 'expo-router';
import { colors } from '../../theme';

// Tabs live in (tabs). Full-screen flows sit on top of them, so they have no tab bar and a real back.
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="idea" />
      <Stack.Screen name="ideas" />
      <Stack.Screen name="connect" />
      <Stack.Screen name="post" />
    </Stack>
  );
}
