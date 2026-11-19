import { Text } from 'react-native';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '../../theme';

function icon(glyph: string) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 21, fontWeight: '700', marginBottom: -2 }}>{glyph}</Text>;
  };
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryBright,
        tabBarInactiveTintColor: '#5E7089',
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('⌂') }} />
      <Tabs.Screen name="posts" options={{ title: 'Posts', tabBarIcon: icon('▤') }} />
      <Tabs.Screen name="approvals" options={{ title: 'Approvals', tabBarIcon: icon('✓') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('≡') }} />
      {/* Setup is a full-screen flow: reachable, but not a tab, and with no tab bar. */}
      <Tabs.Screen name="onboarding" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
