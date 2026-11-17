import { BadRequestException } from '@nestjs/common';
import { MobileNotificationsService } from './mobile-notifications.service';

function row(i: number, link: string | null = '/dashboard/inbox') {
  return { id: `n${i}`, type: 'inbox', title: `T${i}`, message: `M${i}`, read: false, link, createdAt: new Date(2026, 10, 17, 10, 0, 60 - i) };
}

function build(rows: any[] = [], cursorOwned = true) {
  const prisma: any = {
    notification: {
      findFirst: jest.fn().mockResolvedValue(cursorOwned ? { id: 'n1' } : null),
      findMany: jest.fn().mockResolvedValue(rows),
      count: jest.fn().mockResolvedValue(7),
    },
  };
  return { prisma, svc: new MobileNotificationsService(prisma) };
}

describe('MobileNotificationsService.list', () => {
  it('returns a page, a next cursor when there is more, the unread count and a screen target', async () => {
    const { svc, prisma } = build([row(1), row(2), row(3)]);
    const res = await svc.list('u1', undefined, '2');
    expect(prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1' }, take: 3 }));
    expect(res.items.map((i) => i.id)).toEqual(['n1', 'n2']);
    expect(res.nextCursor).toBe('n2');
    expect(res.unreadCount).toBe(7);
    expect(res.items[0].target).toEqual({ screen: 'inbox' });
  });

  it('the last page has no next cursor', async () => {
    const { svc } = build([row(1), row(2)]);
    const res = await svc.list('u1', undefined, '5');
    expect(res.items).toHaveLength(2);
    expect(res.nextCursor).toBeNull();
  });

  it('clamps the limit and falls back to the default', async () => {
    const { svc, prisma } = build([]);
    await svc.list('u1', undefined, '9999');
    expect(prisma.notification.findMany.mock.calls[0][0].take).toBe(51);
    await svc.list('u1', undefined, 'abc');
    expect(prisma.notification.findMany.mock.calls[1][0].take).toBe(21);
  });

  it('uses the cursor and skips it, after checking it belongs to the caller', async () => {
    const { svc, prisma } = build([row(2)]);
    await svc.list('u1', 'n1', '10');
    expect(prisma.notification.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'n1', userId: 'u1' } }));
    expect(prisma.notification.findMany.mock.calls[0][0]).toMatchObject({ cursor: { id: 'n1' }, skip: 1 });
  });

  it("rejects another user's or unknown cursor", async () => {
    const { svc, prisma } = build([], false);
    await expect(svc.list('u1', 'someone-elses')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.notification.findMany).not.toHaveBeenCalled();
  });
});
