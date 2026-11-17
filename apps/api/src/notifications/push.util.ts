// Pure helpers for Expo push messages. No framework imports.

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushDevice {
  id: string;
  pushToken: string;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export function clip(text: string, max: number): string {
  const t = (text || '').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

export function buildMessages(devices: PushDevice[], payload: PushPayload) {
  return devices.map((d) => ({
    to: d.pushToken,
    title: clip(payload.title, 100),
    body: clip(payload.body, 240),
    data: payload.data ?? {},
    sound: 'default' as const,
    priority: 'high' as const,
  }));
}

/**
 * Expo answers with one ticket per message, in order. A ticket saying
 * DeviceNotRegistered means the app was uninstalled: drop that device.
 */
export function deviceIdsToRemove(devices: PushDevice[], tickets: any): string[] {
  if (!Array.isArray(tickets)) return [];
  const out: string[] = [];
  tickets.forEach((t, i) => {
    if (t?.status === 'error' && t?.details?.error === 'DeviceNotRegistered' && devices[i]) {
      out.push(devices[i].id);
    }
  });
  return out;
}
