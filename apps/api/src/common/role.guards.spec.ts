import { ForbiddenException } from '@nestjs/common';
import { ManagerRoleGuard, WriterRoleGuard } from './role.guards';

function ctx(req: any): any {
  return { switchToHttp: () => ({ getRequest: () => req }) };
}

describe('role guards', () => {
  const original = process.env.WRITE_CHECKS;
  afterEach(() => {
    if (original === undefined) delete process.env.WRITE_CHECKS;
    else process.env.WRITE_CHECKS = original;
  });

  it('ManagerRoleGuard lets owners and admins through and refuses everyone else', () => {
    const g = new ManagerRoleGuard();
    expect(g.canActivate(ctx({ workspaceRole: 'OWNER' }))).toBe(true);
    expect(g.canActivate(ctx({ workspaceRole: 'ADMIN' }))).toBe(true);
    for (const role of ['EDITOR', 'VIEWER', 'NONE', undefined]) {
      expect(() => g.canActivate(ctx({ workspaceRole: role }))).toThrow(ForbiddenException);
    }
  });

  it('WriterRoleGuard lets owners, admins and editors through, refuses viewers', () => {
    const g = new WriterRoleGuard();
    for (const role of ['OWNER', 'ADMIN', 'EDITOR']) {
      expect(g.canActivate(ctx({ workspaceRole: role }))).toBe(true);
    }
    expect(() => g.canActivate(ctx({ workspaceRole: 'VIEWER' }))).toThrow(ForbiddenException);
  });

  it('fails closed when no role was resolved for the request', () => {
    expect(() => new ManagerRoleGuard().canActivate(ctx({}))).toThrow(ForbiddenException);
    expect(() => new WriterRoleGuard().canActivate(ctx({}))).toThrow(ForbiddenException);
  });

  it('CORS preflight is never blocked', () => {
    expect(new ManagerRoleGuard().canActivate(ctx({ method: 'OPTIONS' }))).toBe(true);
    expect(new WriterRoleGuard().canActivate(ctx({ method: 'OPTIONS' }))).toBe(true);
  });

  it('WRITE_CHECKS=off disables both guards', () => {
    process.env.WRITE_CHECKS = 'off';
    expect(new ManagerRoleGuard().canActivate(ctx({ workspaceRole: 'VIEWER' }))).toBe(true);
    expect(new WriterRoleGuard().canActivate(ctx({ workspaceRole: undefined }))).toBe(true);
  });
});
