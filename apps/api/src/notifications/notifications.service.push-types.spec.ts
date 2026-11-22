import { NotificationsService } from './notifications.service';

function build() {
  const push = { sendToUser: jest.fn().mockResolvedValue(undefined) };
  const prisma: any = { notification: { create: jest.fn().mockResolvedValue({ id: 'n1', userId: 'u1' }) } };
  return { push, svc: new NotificationsService(prisma, push as any) };
}

describe('NotificationsService push types', () => {
  it.each(['post_failed', 'approval'])('rings the phone for %s', async (type) => {
    const { push, svc } = build();
    await svc.createNotification('u1', type, 'Title', 'Message');
    expect(push.sendToUser).toHaveBeenCalledTimes(1);
  });

  it.each(['post_published', 'welcome', 'setup', 'anything_else'])('stays quiet for %s', async (type) => {
    const { push, svc } = build();
    await svc.createNotification('u1', type, 'Title', 'Message');
    expect(push.sendToUser).not.toHaveBeenCalled();
  });
});
