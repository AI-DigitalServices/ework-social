import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/mobile.dto';

export const MAX_DEVICES_PER_USER = 10;

/**
 * Push-notification devices. A push token is unique: if a phone is handed to
 * another person who signs in, the token moves to the new user. Unregister is
 * always scoped to the caller, so nobody can remove another user's device.
 * Logging out of the app only unregisters that device - it does NOT use the
 * web "logout everywhere", which would sign the user out of every session.
 */
@Injectable()
export class MobileDevicesService {
  constructor(private prisma: PrismaService) {}

  async register(userId: string, dto: RegisterDeviceDto) {
    const now = new Date();
    await this.prisma.mobileDevice.upsert({
      where: { pushToken: dto.pushToken },
      create: {
        userId,
        pushToken: dto.pushToken,
        platform: dto.platform,
        appVersion: dto.appVersion ?? null,
        deviceName: dto.deviceName ?? null,
        lastSeenAt: now,
      },
      update: {
        userId,
        platform: dto.platform,
        appVersion: dto.appVersion ?? null,
        deviceName: dto.deviceName ?? null,
        lastSeenAt: now,
      },
    });

    // Keep only the most recently used devices per user.
    const devices = await this.prisma.mobileDevice.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
      select: { id: true },
    });
    if (devices.length > MAX_DEVICES_PER_USER) {
      await this.prisma.mobileDevice.deleteMany({
        where: { id: { in: devices.slice(MAX_DEVICES_PER_USER).map((d) => d.id) } },
      });
    }
    return { registered: true };
  }

  async unregister(userId: string, pushToken: string) {
    await this.prisma.mobileDevice.deleteMany({ where: { userId, pushToken } });
    return { registered: false };
  }
}
