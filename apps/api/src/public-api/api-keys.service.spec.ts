import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../common/plan-guard.service', () => ({ PlanGuardService: class {} }));

import { ApiKeysService } from './api-keys.service';
import { generateApiKey, hashApiKey } from './api-key.util';

function build(plan = 'AGENCY_PRO') {
  const prisma: any = {
    apiKey: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'k1', createdAt: new Date(), ...data })),
      findFirst: jest.fn().mockResolvedValue({ id: 'k1', workspaceId: 'w1', revokedAt: null }),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const planGuard: any = { assertCanWrite: jest.fn().mockResolvedValue({ plan }) };
  return { prisma, planGuard, svc: new ApiKeysService(prisma, planGuard) };
}

describe('ApiKeysService.create', () => {
  it('returns the key once and stores only its hash', async () => {
    const { svc, prisma } = build();
    const res = await svc.create('w1', 'u1', { name: 'Make', scopes: ['clients:write'] });
    expect(res.key).toMatch(/^ewk_live_/);
    const stored = prisma.apiKey.create.mock.calls[0][0].data;
    expect(stored.keyHash).toBe(hashApiKey(res.key));
    expect(JSON.stringify(stored)).not.toContain(res.key);
    expect(stored.workspaceId).toBe('w1');
  });

  it('is not available below Agency Pro', async () => {
    const { svc, prisma } = build('GROWTH');
    await expect(svc.create('w1', 'u1', { name: 'x', scopes: ['clients:read'] })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.apiKey.create).not.toHaveBeenCalled();
  });

  it('needs a name and at least one valid scope', async () => {
    const { svc } = build();
    await expect(svc.create('w1', 'u1', { scopes: ['clients:read'] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.create('w1', 'u1', { name: 'x', scopes: ['root'] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('caps active keys', async () => {
    const { svc, prisma } = build();
    prisma.apiKey.count.mockResolvedValue(10);
    await expect(svc.create('w1', 'u1', { name: 'x', scopes: ['clients:read'] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates expiry', async () => {
    const { svc } = build();
    await expect(svc.create('w1', 'u1', { name: 'x', scopes: ['clients:read'], expiresInDays: 9999 })).rejects.toBeInstanceOf(BadRequestException);
    const ok = await svc.create('w1', 'u1', { name: 'x', scopes: ['clients:read'], expiresInDays: 30 });
    expect(ok.expiresAt).toBeInstanceOf(Date);
  });
});

describe('ApiKeysService.revoke', () => {
  it('only revokes keys in the caller\'s workspace', async () => {
    const { svc, prisma } = build();
    prisma.apiKey.findFirst.mockResolvedValue(null);
    await expect(svc.revoke('w1', 'k1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.apiKey.findFirst).toHaveBeenCalledWith({ where: { id: 'k1', workspaceId: 'w1' } });
  });

  it('sets revokedAt', async () => {
    const { svc, prisma } = build();
    await svc.revoke('w1', 'k1');
    expect(prisma.apiKey.update).toHaveBeenCalledWith({ where: { id: 'k1' }, data: { revokedAt: expect.any(Date) } });
  });
});

describe('ApiKeysService.authenticate', () => {
  const row = (over: any = {}) => ({ id: 'k1', name: 'Make', workspaceId: 'w1', scopes: ['clients:read'], revokedAt: null, expiresAt: null, lastUsedAt: new Date(), ...over });

  it('accepts a valid key and returns its workspace and scopes', async () => {
    const { svc, prisma } = build();
    const { key, hash } = generateApiKey();
    prisma.apiKey.findUnique.mockResolvedValue(row());
    const res = await svc.authenticate(key);
    expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({ where: { keyHash: hash } });
    expect(res).toEqual({ id: 'k1', name: 'Make', workspaceId: 'w1', scopes: ['clients:read'] });
  });

  it('rejects malformed keys without touching the database', async () => {
    const { svc, prisma } = build();
    await expect(svc.authenticate('eyJ.jwt.token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
  });

  it('rejects unknown, revoked and expired keys', async () => {
    const { svc, prisma } = build();
    const { key } = generateApiKey();
    prisma.apiKey.findUnique.mockResolvedValue(null);
    await expect(svc.authenticate(key)).rejects.toBeInstanceOf(UnauthorizedException);
    prisma.apiKey.findUnique.mockResolvedValue(row({ revokedAt: new Date() }));
    await expect(svc.authenticate(key)).rejects.toBeInstanceOf(UnauthorizedException);
    prisma.apiKey.findUnique.mockResolvedValue(row({ expiresAt: new Date(Date.now() - 1000) }));
    await expect(svc.authenticate(key)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
