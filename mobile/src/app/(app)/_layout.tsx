import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import CreateSheet from '../../create/CreateSheet';
import { colors } from '../../theme';

function icon(glyph: string) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 21, fontWeight: '700', marginBottom: -2 }}>{glyph}</Text>;
  };
}

export default function AppLayout() {
  const [sheet, setSheet] = useState(false);

  return (
    <>
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
        <Tabs.Screen
          name="create"
          options={{
            title: 'Create',
            tabBarButton: () => (
              <View style={styles.slot}>
                <Pressable
                  onPress={() => setSheet(true)}
                  accessibilityLabel="Create a post"
                  style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.95 }] }]}
                >
                  <Text style={styles.plus}>+</Text>
                </Pressable>
                <Text style={styles.fabLabel}>Create</Text>
              </View>
            ),
          }}
        />
        <Tabs.Screen name="approvals" options={{ title: 'Approvals', tabBarIcon: icon('✓') }} />
        <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('≡') }} />
        {/* Full-screen flows: reachable, but not tabs, and without the tab bar where it would get in the way. */}
        <Tabs.Screen name="onboarding" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="idea" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="ideas" options={{ href: null }} />
      </Tabs>
      <CreateSheet visible={sheet} onClose={() => setSheet(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: -18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.bg,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  plus: { color: '#fff', fontSize: 32, fontWeight: '500', marginTop: -3 },
  fabLabel: { color: colors.primaryBright, fontSize: 11, fontWeight: '700', marginTop: 3 },
});
