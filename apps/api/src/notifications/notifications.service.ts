import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';
import { toMobileTarget } from './notification-target.util';

@Injectable()
export class NotificationsService {
  // PushService is optional: a module that provides this service without it
  // simply sends no push, instead of failing to start.
  constructor(
    private prisma: PrismaService,
    @Optional() private push?: PushService,
  ) {}

  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { message: 'All notifications marked as read' };
  }

  async markRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    return { message: 'Notification marked as read' };
  }

  async createNotification(userId: string, type: string, title: string, message: string, link?: string) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, message, link },
    });
    // Best-effort mobile push: never awaited, never allowed to fail the notification.
    if (this.push) {
      Promise.resolve(
        this.push.sendToUser(userId, {
          title,
          body: message,
          data: { type, link: link ?? null, target: toMobileTarget(link), notificationId: notification.id },
        }),
      ).catch(() => undefined);
    }
    return notification;
  }

  async createWelcomeNotifications(userId: string) {
    // Only create welcome notifications once
    const existing = await this.prisma.notification.count({ where: { userId } });
    if (existing > 0) return;
    const notifications = [
      {
        type: 'welcome',
        title: '👋 Welcome to eWork Social!',
        message: 'Your 7-day free trial is now active. Explore all Pro features.',
        link: '/dashboard',
      },
      {
        type: 'setup',
        title: '🔗 Connect your social accounts',
        message: 'Link Facebook & Instagram to start scheduling posts.',
        link: '/dashboard/settings?tab=social',
      },
      {
        type: 'setup',
        title: '👥 Add your first client',
        message: 'Use the CRM to manage your agency clients and leads.',
        link: '/dashboard/crm',
      },
    ];

    for (const n of notifications) {
      await this.createNotification(userId, n.type, n.title, n.message, n.link);
    }
  }
}
