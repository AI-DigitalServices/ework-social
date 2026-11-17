import { EXPO_PUSH_TOKEN } from './dto/mobile.dto';
import { MAX_DEVICES_PER_USER, MobileDevicesService } from './mobile-devices.service';

function build() {
  const prisma: any = {
    mobileDevice: {
      upsert: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  return { prisma, svc: new MobileDevicesService(prisma) };
}

const dto = { pushToken: 'ExponentPushToken[abcdefghijklmnopqrstuv]', platform: 'android' as const };

describe('Expo push token format', () => {
  it('accepts real-looking tokens and rejects anything else', () => {
    expect(EXPO_PUSH_TOKEN.test('ExponentPushToken[abcdefghijklmnopqrstuv]')).toBe(true);
    expect(EXPO_PUSH_TOKEN.test('ExpoPushToken[abcdefghij-_klmnopqrs]')).toBe(true);
    for (const bad of ['', 'abc', 'ExponentPushToken[]', 'ExponentPushToken[short]', 'fcm:APA91bH...', 'ExponentPushToken[abc def ghijklmnop]']) {
      expect(EXPO_PUSH_TOKEN.test(bad)).toBe(false);
    }
  });
});

describe('MobileDevicesService', () => {
  it('registers by upserting on the push token and moves it to the current user', async () => {
    const { svc, prisma } = build();
    await expect(svc.register('u1', dto)).resolves.toEqual({ registered: true });
    const arg = prisma.mobileDevice.upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ pushToken: dto.pushToken });
    expect(arg.create.userId).toBe('u1');
    expect(arg.update.userId).toBe('u1');
  });

  it('keeps only the most recent devices per user', async () => {
    const { svc, prisma } = build();
    const ids = Array.from({ length: MAX_DEVICES_PER_USER + 3 }, (_, i) => ({ id: `d${i}` }));
    prisma.mobileDevice.findMany.mockResolvedValue(ids);
    await svc.register('u1', dto);
    expect(prisma.mobileDevice.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['d10', 'd11', 'd12'] } },
    });
  });

  it('does not delete anything when under the limit', async () => {
    const { svc, prisma } = build();
    prisma.mobileDevice.findMany.mockResolvedValue([{ id: 'd1' }]);
    await svc.register('u1', dto);
    expect(prisma.mobileDevice.deleteMany).not.toHaveBeenCalled();
  });

  it('unregister is always scoped to the calling user', async () => {
    const { svc, prisma } = build();
    await expect(svc.unregister('u1', dto.pushToken)).resolves.toEqual({ registered: false });
    expect(prisma.mobileDevice.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', pushToken: dto.pushToken },
    });
  });
});
