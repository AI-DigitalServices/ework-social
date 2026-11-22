import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../ui';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CreateSheet from '../../../create/CreateSheet';
import { usePush } from '../../../push';
import { colors } from '../../../theme';

function icon(name: string) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Feather name={name as never} size={22} color={color as string} />;
  };
}

export default function AppLayout() {
  const [sheet, setSheet] = useState(false);
  usePush();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primaryBright,
          tabBarInactiveTintColor: '#5E7089',
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 64 + insets.bottom,
            paddingTop: 6,
            paddingBottom: insets.bottom + 4,
          },
          tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter_700Bold' },
          tabBarAllowFontScaling: false,
        }}
      >
        <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('home') }} />
        <Tabs.Screen name="posts" options={{ title: 'Posts', tabBarIcon: icon('file-text') }} />
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
        <Tabs.Screen name="approvals" options={{ title: 'Approvals', tabBarIcon: icon('check-square') }} />
        <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('menu') }} />
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
    marginTop: -22,
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
