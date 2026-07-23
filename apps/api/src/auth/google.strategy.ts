import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      clientID:     config.get<string>('GOOGLE_CLIENT_ID') ?? '',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') ?? '',
      callbackURL:  config.get<string>('GOOGLE_REDIRECT_URI') ?? '',
      scope: ['email', 'profile'],
    });
  }

  // NestJS @nestjs/passport pattern: return the user (or throw) — do NOT use done() callback
  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
  ): Promise<any> {
    const email: string | undefined = profile.emails?.[0]?.value;
    const name: string  = profile.displayName || email?.split('@')[0] || 'User';
    const avatar: string | undefined = profile.photos?.[0]?.value;

    if (!email) throw new UnauthorizedException('No email returned from Google');

    // Find existing user by email
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // New Google user — create with a workspace
      const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'workspace';
      const existingSlug = await this.prisma.workspace.findUnique({ where: { slug: baseSlug } });
      const finalSlug = existingSlug ? `${baseSlug}-${Date.now()}` : baseSlug;

      user = await this.prisma.user.create({
        data: {
          name,
          email,
          password: crypto.randomBytes(32).toString('hex'),
          isVerified: true,
          googleId: profile.id,
          avatar,
          ownedWorkspaces: {
            create: {
              name: `${name}'s Workspace`,
              slug: finalSlug,
              members: { create: { role: 'OWNER', user: { connect: { email } } } },
              subscription: {
                create: {
                  plan: 'FREE',
                  status: 'TRIALING',
                  trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
              },
            },
          },
        },
        include: { ownedWorkspaces: true },
      });
    } else if (!user.googleId) {
      // Existing email/password user — link Google account
      user = await this.prisma.user.update({
        where: { email },
        data: { googleId: profile.id, isVerified: true, avatar: avatar ?? user.avatar ?? undefined },
      });
    }

    return user;
  }
}
