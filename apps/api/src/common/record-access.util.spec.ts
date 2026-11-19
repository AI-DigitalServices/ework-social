import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { assertRecordWriteAccess } from './record-access.util';

function build(opts: { record?: any; role?: string | null; ownerId?: string } = {}) {
  const record = 'record' in opts ? opts.record : { workspaceId: 'w1' };
  const role = 'role' in opts ? opts.role : 'EDITOR';
  const prisma: any = {
    automationRule: { findUnique: jest.fn().mockResolvedValue(record) },
    workspaceMember: { findFirst: jest.fn().mockResolvedValue(role ? { role } : null) },
    workspace: { findUnique: jest.fn().mockResolvedValue({ ownerId: opts.ownerId || 'someone-else' }) },
  };
  const planGuard = { assertCanWrite: jest.fn().mockResolvedValue({}) };
  const run = () => assertRecordWriteAccess(prisma, planGuard, { model: 'automationRule', id: 'r1', userId: 'u1', label: 'Rule' });
  return { prisma, planGuard, run };
}

describe('assertRecordWriteAccess', () => {
  const original = process.env.WRITE_CHECKS;
  afterEach(() => {
    if (original === undefined) delete process.env.WRITE_CHECKS;
    else process.env.WRITE_CHECKS = original;
  });

  it('a writer in the record\'s workspace gets through, and the plan is checked for that workspace', async () => {
    const { run, planGuard } = build();
    await expect(run()).resolves.toBe('w1');
    expect(planGuard.assertCanWrite).toHaveBeenCalledWith('w1');
  });

  it('a record that does not exist is a 404', async () => {
    const { run } = build({ record: null });
    await expect(run()).rejects.toBeInstanceOf(NotFoundException);
  });

  it('someone in a DIFFERENT workspace gets a 404 and learns nothing', async () => {
    const { run, planGuard } = build({ role: null });
    await expect(run()).rejects.toBeInstanceOf(NotFoundException);
    expect(planGuard.assertCanWrite).not.toHaveBeenCalled();
  });

  it('a viewer is refused', async () => {
    const { run } = build({ role: 'VIEWER' });
    await expect(run()).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a read-only workspace is refused', async () => {
    const { run, planGuard } = build();
    planGuard.assertCanWrite.mockRejectedValue(new ForbiddenException('read-only'));
    await expect(run()).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('the owner with no member row still works', async () => {
    const { run } = build({ role: null, ownerId: 'u1' });
    await expect(run()).resolves.toBe('w1');
  });

  it('WRITE_CHECKS=off skips role and plan checks but never the tenant check', async () => {
    process.env.WRITE_CHECKS = 'off';
    const viewer = build({ role: 'VIEWER' });
    await expect(viewer.run()).resolves.toBe('w1');
    expect(viewer.planGuard.assertCanWrite).not.toHaveBeenCalled();
    const outsider = build({ role: null });
    await expect(outsider.run()).rejects.toBeInstanceOf(NotFoundException);
  });
});
