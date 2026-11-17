import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { MobileAuthService } from './mobile-auth.service';

const profile = { sub: 'g-1', email: 'jane@example.com', name: 'Jane Doe', picture: 'https://x/p.png' };

function build() {
  const prisma: any = {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    workspace: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(null) },
  };
  const auth: any = { generateTokens: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }) };
  const config: any = { get: jest.fn() };
  const svc: any = new MobileAuthService(prisma, auth, config);
  jest.spyOn(svc, 'verifyGoogle').mockResolvedValue(profile);
  return { prisma, auth, svc };
}

describe('MobileAuthService.socialLogin', () => {
  it('Apple is not available yet and is refused clearly', async () => {
    const { svc } = build();
    await expect(svc.socialLogin({ provider: 'apple', idToken: 'x'.repeat(30) })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('a known Google account signs in without any write', async () => {
    const { svc, prisma } = build();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'jane@example.com', name: 'Jane', isVerified: true, googleId: 'g-1' });
    const res = await svc.socialLogin({ provider: 'google', idToken: 'x'.repeat(30) });
    expect(res.user.id).toBe('u1');
    expect(res).toMatchObject({ accessToken: 'a', refreshToken: 'r' });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('an existing email/password account gets Google linked, never duplicated', async () => {
    const { svc, prisma } = build();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue({ id: 'u2', email: 'jane@example.com', name: 'Jane', googleId: null, avatar: null });
    prisma.user.update.mockResolvedValue({ id: 'u2', email: 'jane@example.com', name: 'Jane', isVerified: true });
    await svc.socialLogin({ provider: 'google', idToken: 'x'.repeat(30) });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u2' }, data: expect.objectContaining({ googleId: 'g-1', isVerified: true }) }),
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('refuses an email that is already linked to a DIFFERENT Google account', async () => {
    const { svc, prisma } = build();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue({ id: 'u3', email: 'jane@example.com', googleId: 'someone-else' });
    await expect(svc.socialLogin({ provider: 'google', idToken: 'x'.repeat(30) })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('a brand-new user gets a workspace, owner membership and a 7-day trial', async () => {
    const { svc, prisma } = build();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u4', email: 'jane@example.com', name: 'Jane Doe', isVerified: true });
    await svc.socialLogin({ provider: 'google', idToken: 'x'.repeat(30) });
    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ email: 'jane@example.com', isVerified: true, googleId: 'g-1' });
    expect(data.ownedWorkspaces.create.slug).toBe('jane-doe');
    expect(data.ownedWorkspaces.create.members.create.role).toBe('OWNER');
    expect(data.ownedWorkspaces.create.subscription.create).toMatchObject({ plan: 'FREE', status: 'TRIALING' });
  });

  it('a race on first sign-in reuses the user the other request created', async () => {
    const { svc, prisma } = build();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'u5', email: 'jane@example.com', name: 'Jane', isVerified: true });
    prisma.user.create.mockRejectedValue({ code: 'P2002' });
    const res = await svc.socialLogin({ provider: 'google', idToken: 'x'.repeat(30) });
    expect(res.user.id).toBe('u5');
  });
});
