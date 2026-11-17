import { buildMessages, clip, deviceIdsToRemove } from './push.util';

const devices = [
  { id: 'd1', pushToken: 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]' },
  { id: 'd2', pushToken: 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]' },
  { id: 'd3', pushToken: 'ExponentPushToken[cccccccccccccccccccccc]' },
];

describe('push.util', () => {
  it('clip leaves short text and shortens long text with an ellipsis', () => {
    expect(clip('  hi  ', 10)).toBe('hi');
    expect(clip('abcdefghij', 5)).toBe('abcd…');
    expect(clip(undefined as any, 5)).toBe('');
  });

  it('builds one message per device with the payload and safe lengths', () => {
    const msgs = buildMessages(devices, { title: 'T'.repeat(300), body: 'B'.repeat(500), data: { target: { screen: 'inbox' } } });
    expect(msgs).toHaveLength(3);
    expect(msgs[0].to).toBe(devices[0].pushToken);
    expect(msgs[0].title.length).toBeLessThanOrEqual(100);
    expect(msgs[0].body.length).toBeLessThanOrEqual(240);
    expect(msgs[0].data).toEqual({ target: { screen: 'inbox' } });
    expect(msgs[0].priority).toBe('high');
  });

  it('removes only devices Expo reports as not registered, matched by position', () => {
    const tickets = [
      { status: 'ok', id: 'x' },
      { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
      { status: 'error', message: 'slow down', details: { error: 'MessageRateExceeded' } },
    ];
    expect(deviceIdsToRemove(devices, tickets)).toEqual(['d2']);
  });

  it('ignores a malformed response', () => {
    expect(deviceIdsToRemove(devices, undefined)).toEqual([]);
    expect(deviceIdsToRemove(devices, { errors: [] })).toEqual([]);
    expect(deviceIdsToRemove(devices, [null, {}])).toEqual([]);
  });
});
