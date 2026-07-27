import { Body, Controller, Post, Get, Delete, Query, HttpCode, UseGuards, Request, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Response, Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtGuard } from './jwt.guard';

const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  /**
   * Store the refresh token in an HttpOnly, Secure cookie so it can't be read
   * by JavaScript (caps the blast radius of any XSS). Scoped to the parent
   * domain so app.eworksocial.com and api.eworksocial.com share it.
   */
  private setRefreshCookie(res: Response, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      domain: isProd ? '.eworksocial.com' : undefined,
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }

  private clearRefreshCookie(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      domain: isProd ? '.eworksocial.com' : undefined,
      path: '/',
    });
  }

  /** Read the refresh token from the HttpOnly cookie (no cookie-parser needed). */
  private readRefreshCookie(req: ExpressRequest): string | null {
    const header = req.headers?.cookie;
    if (!header) return null;
    for (const part of header.split(';')) {
      const [name, ...rest] = part.trim().split('=');
      if (name === REFRESH_COOKIE) return decodeURIComponent(rest.join('='));
    }
    return null;
  }

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    if (result?.refreshToken) this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    if (result?.refreshToken) this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  refresh(@Body() body: { refreshToken?: string }, @Req() req: ExpressRequest) {
    // Prefer the HttpOnly cookie; fall back to the request body for older
    // clients that haven't migrated to the cookie flow yet.
    const token = this.readRefreshCookie(req) || body?.refreshToken;
    return this.authService.refreshAccessToken(token as string);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtGuard)
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    this.clearRefreshCookie(res);
    // Revoke every refresh token for this user (logout everywhere)
    return this.authService.revokeAllSessions(req.user.sub);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  me(@Request() req: any) {
    return this.authService.me(req.user.sub);
  }

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @UseGuards(JwtGuard)
  resendVerification(@Request() req: any) {
    return this.authService.resendVerification(req.user.sub);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtGuard)
  changePassword(@Request() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.authService.changePassword(req.user.sub, body.currentPassword, body.newPassword);
  }

  @Delete('delete-account')
  @UseGuards(JwtGuard)
  deleteAccount(@Request() req: any) {
    return this.authService.deleteAccount(req.user.sub);
  }

  // ─── Google OAuth ────────────────────────────────────────────────────────────

  /** Step 1 — redirect user to Google consent screen */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport handles the redirect automatically
  }

  /** Step 2 — Google redirects back here after user approves */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Request() req: any, @Res() res: Response) {
    const user = req.user;
    const tokens = await this.authService.generateTokensPublic(user.id, user.email);

    // Also set the refresh token as an HttpOnly cookie (backward-compatible —
    // it's still passed in the URL for the current frontend callback handler)
    this.setRefreshCookie(res, tokens.refreshToken);

    // Find primary workspace
    const workspace = await this.authService.getPrimaryWorkspace(user.id);

    const frontendUrl = this.config.get('FRONTEND_URL');
    const params = new URLSearchParams({
      token:        tokens.accessToken,
      refreshToken: tokens.refreshToken,
      userId:       user.id,
      name:         user.name,
      email:        user.email,
      workspaceId:  workspace?.id    || '',
      workspaceName: workspace?.name || '',
      workspacePlan: workspace?.subscription?.plan || 'FREE',
    });

    return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
  }
}
