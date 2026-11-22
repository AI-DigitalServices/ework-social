import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { colors } from '../theme';

// The server sends the browser to eworksocial://oauth-return when a Google sign-in or an account connection finishes.
// The code in that link is picked up by the sign-in itself; this screen only has to get out of the way.
export default function OAuthReturn() {
  const router = useRouter();
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/' as Href);
  }, [router]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.primaryBright} size="large" />
    </View>
  );
}
