import { ForbiddenException } from '@nestjs/common';
import { assertManagerRole, assertWriterRole, canManage, canWrite, writeChecksEnabled } from './roles';

describe('roles', () => {
  const original = process.env.WRITE_CHECKS;
  afterEach(() => {
    if (original === undefined) delete process.env.WRITE_CHECKS;
    else process.env.WRITE_CHECKS = original;
  });

  it('writers: owner, admin, editor; not viewer or unknown', () => {
    for (const r of ['OWNER', 'ADMIN', 'EDITOR']) expect(canWrite(r)).toBe(true);
    for (const r of ['VIEWER', 'NONE', '', undefined, null, 'owner']) expect(canWrite(r as any)).toBe(false);
  });

  it('managers: owner and admin only', () => {
    expect(canManage('OWNER')).toBe(true);
    expect(canManage('ADMIN')).toBe(true);
    for (const r of ['EDITOR', 'VIEWER', undefined, null]) expect(canManage(r as any)).toBe(false);
  });

  it('the assert helpers throw Forbidden with a customer-safe message', () => {
    expect(() => assertWriterRole('VIEWER')).toThrow(ForbiddenException);
    expect(() => assertWriterRole('EDITOR')).not.toThrow();
    expect(() => assertManagerRole('EDITOR')).toThrow(/owners and admins/);
    expect(() => assertManagerRole('ADMIN')).not.toThrow();
  });

  it('the kill switch is on unless WRITE_CHECKS=off', () => {
    delete process.env.WRITE_CHECKS;
    expect(writeChecksEnabled()).toBe(true);
    process.env.WRITE_CHECKS = 'off';
    expect(writeChecksEnabled()).toBe(false);
    process.env.WRITE_CHECKS = ' OFF ';
    expect(writeChecksEnabled()).toBe(false);
    process.env.WRITE_CHECKS = 'on';
    expect(writeChecksEnabled()).toBe(true);
  });
});
