import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      clientID:     config.get('GOOGLE_CLIENT_ID'),
      clientSecret: config.get('GOOGLE_CLIENT_SECRET'),
      callbackURL:  config.get('GOOGLE_REDIRECT_URI'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const email: string = profile.emails?.[0]?.value;
    const name: string  = profile.displayName || profile.emails?.[0]?.value?.split('@')[0];
    const avatar: string | undefined = profile.photos?.[0]?.value;

    if (!email) return done(new Error('No email returned from Google'), undefined);

    // Find or create the user
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // New user — create account without a personal workspace.
      // A workspace will be created after OAuth completes (same as invite flow).
      // We create a default workspace here so the dashboard has somewhere to land.
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const existingSlug = await this.prisma.workspace.findUnique({ where: { slug } });
      const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

      user = await this.prisma.user.create({
        data: {
          name,
          email,
          // Google-authenticated users have no password — they use OAuth exclusively
          password: crypto.randomBytes(32).toString('hex'),
          isVerified: true,  // Google has already verified the email
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
      // Existing email/password user — link their Google account
      await this.prisma.user.update({
        where: { email },
        data: { googleId: profile.id, isVerified: true, avatar: avatar || user.avatar },
      });
    }

    done(null, user);
  }
}
