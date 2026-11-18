import { ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';

jest.mock('../common/plan-guard.service', () => ({ PlanGuardService: class {} }));
jest.mock('./api-keys.service', () => ({ ApiKeysService: class {} }));

import { ApiKeyGuard } from './api-key.guard';
import { apiKeyLimiter } from './api-key.util';

const KEY = 'ewk_live_' + 'a'.repeat(32);

function ctxFor(req: any) {
  const res = { setHeader: jest.fn() };
  return {
    ctx: { switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }), getHandler: () => null, getClass: () => null } as any,
    res,
  };
}

function build(opts: { plan?: string; scopes?: string[]; required?: string; keyId?: string } = {}) {
  const authed = { id: opts.keyId || 'key-' + Math.random(), name: 'Make', workspaceId: 'w1', scopes: opts.scopes || ['clients:write'] };
  const keys: any = { authenticate: jest.fn().mockResolvedValue(authed) };
  const planGuard: any = {
    getWorkspacePlan: jest.fn().mockResolvedValue(opts.plan || 'AGENCY_PRO'),
    assertCanWrite: jest.fn().mockResolvedValue({}),
  };
  const reflector: any = { getAllAndOverride: jest.fn().mockReturnValue(opts.required) };
  return { guard: new ApiKeyGuard(keys, planGuard, reflector), keys, planGuard, authed };
}

describe('ApiKeyGuard', () => {
  it('401 when no key is sent', async () => {
    const { guard } = build();
    await expect(guard.canActivate(ctxFor({ method: 'GET', headers: {} }).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a valid key and attaches it to the request', async () => {
    const { guard, authed } = build();
    const req: any = { method: 'GET', headers: { authorization: `Bearer ${KEY}` } };
    await expect(guard.canActivate(ctxFor(req).ctx)).resolves.toBe(true);
    expect(req.apiKey).toEqual(authed);
  });

  it('403 when the workspace no longer has API access', async () => {
    const { guard } = build({ plan: 'GROWTH' });
    await expect(guard.canActivate(ctxFor({ method: 'GET', headers: { 'x-api-key': KEY } }).ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('403 when the key lacks the required scope; write scope covers read', async () => {
    const lacking = build({ scopes: ['clients:read'], required: 'clients:write' });
    await expect(lacking.guard.canActivate(ctxFor({ method: 'POST', headers: { 'x-api-key': KEY } }).ctx)).rejects.toBeInstanceOf(ForbiddenException);
    const covers = build({ scopes: ['clients:write'], required: 'clients:read' });
    await expect(covers.guard.canActivate(ctxFor({ method: 'GET', headers: { 'x-api-key': KEY } }).ctx)).resolves.toBe(true);
  });

  it('read-only workspaces cannot write but can still read', async () => {
    const ro = build();
    ro.planGuard.assertCanWrite.mockRejectedValue(new ForbiddenException('read-only'));
    await expect(ro.guard.canActivate(ctxFor({ method: 'POST', headers: { 'x-api-key': KEY } }).ctx)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(ro.guard.canActivate(ctxFor({ method: 'GET', headers: { 'x-api-key': KEY } }).ctx)).resolves.toBe(true);
  });

  it('429 with Retry-After once the per-key limit is used up', async () => {
    const { guard } = build({ keyId: 'rate-limited-key' });
    for (let i = 0; i < 120; i++) apiKeyLimiter.hit('rate-limited-key', 120);
    const { ctx, res } = ctxFor({ method: 'GET', headers: { 'x-api-key': KEY } });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(HttpException);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });

  it('never blocks CORS preflight', async () => {
    const { guard } = build();
    await expect(guard.canActivate(ctxFor({ method: 'OPTIONS', headers: {} }).ctx)).resolves.toBe(true);
  });
});
