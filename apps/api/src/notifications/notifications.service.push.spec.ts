import { NotificationsService } from './notifications.service';

function build(push: any) {
  const prisma: any = {
    notification: { create: jest.fn().mockResolvedValue({ id: 'n1', userId: 'u1' }) },
  };
  return { prisma, svc: new NotificationsService(prisma, push) };
}

describe('NotificationsService.createNotification + push', () => {
  it('sends a push carrying the mobile target, and returns the notification', async () => {
    const push = { sendToUser: jest.fn().mockResolvedValue(undefined) };
    const { svc } = build(push);
    const n = await svc.createNotification('u1', 'approval', 'Post Approved', 'Ready to publish.', '/dashboard/approvals');
    expect(n).toEqual({ id: 'n1', userId: 'u1' });
    expect(push.sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        title: 'Post Approved',
        body: 'Ready to publish.',
        data: expect.objectContaining({ target: { screen: 'approvals' }, notificationId: 'n1' }),
      }),
    );
  });

  it('does not wait for the push to finish', async () => {
    const push = { sendToUser: jest.fn().mockReturnValue(new Promise(() => {})) }; // never resolves
    const { svc } = build(push);
    await expect(svc.createNotification('u1', 'x', 't', 'm')).resolves.toBeDefined();
  });

  it('a failing push never breaks the notification', async () => {
    const push = { sendToUser: jest.fn().mockRejectedValue(new Error('expo down')) };
    const { svc } = build(push);
    await expect(svc.createNotification('u1', 'x', 't', 'm')).resolves.toBeDefined();
    await Promise.resolve(); // let the swallowed rejection settle
  });

  it('works when no push service is provided at all', async () => {
    const { svc } = build(undefined);
    await expect(svc.createNotification('u1', 'x', 't', 'm')).resolves.toBeDefined();
  });
});
