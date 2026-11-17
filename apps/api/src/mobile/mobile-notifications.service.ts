import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toMobileTarget } from '../notifications/notification-target.util';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** Cursor-paged notification feed for the app (the web endpoint returns only the latest 20). */
@Injectable()
export class MobileNotificationsService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, cursor?: string, limitRaw?: string) {
    const parsed = parseInt(limitRaw ?? '', 10);
    const limit = Math.min(Math.max(Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LIMIT, 1), MAX_LIMIT);

    if (cursor) {
      // The cursor must be one of THIS user's notifications.
      const ok = await this.prisma.notification.findFirst({
        where: { id: cursor, userId },
        select: { id: true },
      });
      if (!ok) throw new BadRequestException('Invalid cursor.');
    }

    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const page = rows.slice(0, limit);
    const items = page.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      link: n.link,
      target: toMobileTarget(n.link),
      createdAt: n.createdAt,
    }));
    const unreadCount = await this.prisma.notification.count({ where: { userId, read: false } });

    return {
      items,
      nextCursor: rows.length > limit && items.length > 0 ? items[items.length - 1].id : null,
      unreadCount,
    };
  }
}
