import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { SocialLoginDto } from './dto/mobile.dto';
import { fetchTokenInfo, GoogleProfile, parseAudiences, validateTokenInfo } from './google-id-token.util';

/**
 * Sign-in for the mobile app with a Google ID token (native Google Sign-In).
 *
 * Mirrors the web Google login so a person lands in the SAME account on both:
 * known googleId -> that user; known email -> link Google to it; otherwise a
 * new user with a workspace and the 7-day trial. Stricter than web: the token
 * must be for one of our client IDs and the email must be verified by Google.
 *
 * Returns the same shape as POST /auth/login. No cookie is set - the app keeps
 * the refresh token in secure storage and uses POST /auth/refresh with it.
 */
@Injectable()
export class MobileAuthService {
  private readonly logger = new Logger(MobileAuthService.name);

  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
    private config: ConfigService,
  ) {}

  async socialLogin(dto: SocialLoginDto) {
    if (dto.provider !== 'google') {
      throw new BadRequestException('Sign in with Apple is coming soon. Please use Google or email for now.');
    }
    const profile = await this.verifyGoogle(dto.idToken);
    const user = await this.findOrCreateGoogleUser(profile);
    const tokens = await this.auth.generateTokens(user.id, user.email);

    const ws = await this.prisma.workspace.findFirst({
      where: { ownerId: user.id },
      include: { subscription: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      user: { id: user.id, name: user.name, email: user.email, isVerified: user.isVerified },
      workspace: ws
        ? {
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            plan: ws.subscription?.plan || 'FREE',
            isOwner: true,
            role: 'OWNER',
          }
        : null,
      ...tokens,
    };
  }

  /** Verifies the token with Google. Protected so tests can replace it without HTTP. */
  protected async verifyGoogle(idToken: string): Promise<GoogleProfile> {
    const audiences = parseAudiences(
      this.config.get<string>('GOOGLE_MOBILE_CLIENT_IDS'),
      this.config.get<string>('GOOGLE_CLIENT_ID'),
    );
    if (audiences.length === 0) {
      throw new ServiceUnavailableException('Google sign-in is not configured on the server.');
    }
    let info: any;
    try {
      info = await fetchTokenInfo(idToken);
    } catch (err: any) {
      this.logger.warn(`Google tokeninfo call failed: ${err?.response?.status ?? err?.message}`);
      throw new UnauthorizedException('Google did not accept the sign-in. Please try again.');
    }
    try {
      return validateTokenInfo(info, audiences);
    } catch (err: any) {
      throw new UnauthorizedException(err.message);
    }
  }

  async findOrCreateGoogleUser(profile: GoogleProfile) {
    // 1) Same Google account as before (works even if their Google email changed)
    const byGoogle = await this.prisma.user.findUnique({ where: { googleId: profile.sub } });
    if (byGoogle) return byGoogle;

    // 2) Same email as an existing account -> link Google to it
    const byEmail = await this.prisma.user.findFirst({
      where: { email: { equals: profile.email, mode: 'insensitive' } },
    });
    if (byEmail) {
      if (byEmail.googleId && byEmail.googleId !== profile.sub) {
        throw new UnauthorizedException('This email is already linked to a different Google account.');
      }
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: profile.sub,
          isVerified: true,
          avatar: profile.picture ?? byEmail.avatar ?? undefined,
        },
      });
    }

    // 3) Brand-new user: workspace + owner membership + 7-day trial (same as web)
    const baseSlug =
      profile.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'workspace';
    const slugTaken = await this.prisma.workspace.findUnique({ where: { slug: baseSlug } });
    const slug = slugTaken ? `${baseSlug}-${Date.now()}` : baseSlug;

    try {
      return await this.prisma.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          password: randomBytes(32).toString('hex'),
          isVerified: true,
          googleId: profile.sub,
          avatar: profile.picture,
          ownedWorkspaces: {
            create: {
              name: `${profile.name}'s Workspace`,
              slug,
              members: { create: { role: 'OWNER', user: { connect: { email: profile.email } } } },
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
      });
    } catch (err: any) {
      // Two first-time sign-ins racing: the other one created the user - use it.
      if (err?.code === 'P2002') {
        const again = await this.prisma.user.findFirst({
          where: { email: { equals: profile.email, mode: 'insensitive' } },
        });
        if (again) return again;
      }
      throw err;
    }
  }
}
