import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { EXPO_PUSH_URL, PushPayload, buildMessages, deviceIdsToRemove } from './push.util';

/**
 * Sends a push notification to every mobile device a user has registered, via
 * Expo's push service (covers Android now and iOS later). Best-effort by design:
 * it never throws, so a push problem can never break whatever created the
 * notification. Devices Expo reports as uninstalled are removed.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    try {
      const devices = await this.prisma.mobileDevice.findMany({
        where: { userId },
        select: { id: true, pushToken: true },
      });
      if (devices.length === 0) return;

      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };
      const accessToken = this.config.get<string>('EXPO_ACCESS_TOKEN');
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const res = await axios.post(EXPO_PUSH_URL, buildMessages(devices, payload), {
        headers,
        timeout: 8000,
      });

      const dead = deviceIdsToRemove(devices, res.data?.data);
      if (dead.length > 0) {
        await this.prisma.mobileDevice.deleteMany({ where: { id: { in: dead } } });
      }
    } catch (err: any) {
      this.logger.warn(`Push to user ${userId} failed: ${err?.message ?? err}`);
    }
  }
}
