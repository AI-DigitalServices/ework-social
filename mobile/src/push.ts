import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { request } from './api/client';

// Push needs an installed build. Expo Go has no push on Android, so the library is only loaded outside it.
function load(): typeof import('expo-notifications') | null {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications');
  } catch {
    return null;
  }
}

let registeredToken: string | null = null;

/** Asks permission, gets this phone's push address and tells the server. Never blocks or breaks the app. */
export async function registerForPush(): Promise<void> {
  const N = load();
  if (!N || !Device.isDevice) return;
  try {
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('default', { name: 'eWork Social', importance: N.AndroidImportance.HIGH });
    }
    let { status } = await N.getPermissionsAsync();
    if (status !== 'granted') status = (await N.requestPermissionsAsync()).status;
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const token = (await N.getExpoPushTokenAsync({ projectId })).data;
    await request('/mobile/v1/devices', {
      method: 'POST',
      body: {
        pushToken: token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        appVersion: String(Constants.expoConfig?.version ?? '').slice(0, 32) || undefined,
        deviceName: (Device.deviceName ?? Device.modelName ?? '').slice(0, 80) || undefined,
      },
    });
    registeredToken = token;
  } catch {
    // Push is a bonus. If it cannot start, the app carries on.
  }
}

/** Signing out: this phone stops getting pushes for the account. */
export async function unregisterPush(): Promise<void> {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try {
    await request('/mobile/v1/devices/unregister', { method: 'POST', body: { pushToken: token } });
  } catch {
    // The server also drops the phone when the push service says it is gone.
  }
}

// What a tap on a push opens.
function openFor(data: any) {
  const t = Date.now();
  const type = data?.type;
  const screen = data?.target?.screen;
  if (type === 'post_failed') router.navigate(`/posts?status=FAILED&t=${t}` as never);
  else if (type === 'approval' || screen === 'approvals') router.navigate(`/approvals?t=${t}` as never);
  else if (screen === 'accounts') router.navigate('/connect' as never);
  else router.navigate('/home' as never);
}

/** Starts push for a signed-in person: registers the phone and opens the right screen when a push is tapped. */
export function usePush() {
  useEffect(() => {
    void registerForPush();
    const N = load();
    if (!N) return;
    let handled = '';
    const handle = (r: any) => {
      const id = r?.notification?.request?.identifier;
      if (!r || !id || id === handled) return;
      handled = id;
      openFor(r.notification.request.content?.data);
    };
    try {
      // The push that opened the app from closed.
      void Promise.resolve((N as any).getLastNotificationResponse?.() ?? null).then(handle);
    } catch {
      // nothing to open
    }
    const sub = N.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, []);
}
