import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.notification.create({
      data: { userId, type, title, message, link },
    });
  }

  async createWelcomeNotifications(userId: string) {
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
