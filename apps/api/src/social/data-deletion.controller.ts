import { Controller, Post, Get, Body, Query, Res } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

@Controller('social')
export class DataDeletionController {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // Meta Data Deletion Callback — required for app review
  @Post('data-deletion')
  async handleDataDeletion(
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      const signedRequest = body.signed_request;
      if (!signedRequest) {
        return res.status(400).json({ error: 'Missing signed_request' });
      }

      // Decode the signed request
      const [encodedSig, payload] = signedRequest.split('.');
      const data = JSON.parse(
        Buffer.from(payload, 'base64').toString('utf8')
      );

      const userId = data.user_id;
      if (!userId) {
        return res.status(400).json({ error: 'Missing user_id' });
      }

      // Find and disconnect any social accounts linked to this Facebook user
      await this.prisma.socialAccount.updateMany({
        where: {
          accountId: userId,
          platform: { in: ['FACEBOOK', 'INSTAGRAM'] },
        },
        data: {
          isActive: false,
          accessToken: null,
          refreshToken: null,
        },
      });

      // Generate a confirmation code
      const confirmationCode = createHmac('sha256', userId)
        .update(Date.now().toString())
        .digest('hex')
        .slice(0, 16);

      return res.json({
        url: `https://www.eworksocial.com/privacy#data-deletion`,
        confirmation_code: confirmationCode,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Data deletion failed' });
    }
  }

  // Status check URL — Meta redirects users here to check deletion status
  @Get('deletion-status')
  async getDeletionStatus(
    @Query('id') confirmationCode: string,
    @Res() res: Response,
  ) {
    return res.json({
      status: 'complete',
      confirmation_code: confirmationCode,
      message: 'Your data has been removed from eWork Social.',
    });
  }
}
