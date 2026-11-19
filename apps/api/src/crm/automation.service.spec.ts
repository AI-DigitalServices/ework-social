import { BadRequestException } from '@nestjs/common';

jest.mock('../email/email.service', () => ({ EmailService: class {} }));

import { AutomationService } from './automation.service';

function build() {
  const prisma: any = {
    automationRule: {
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'r1', ...data })),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'r1', ...data })),
    },
  };
  return { prisma, svc: new AutomationService(prisma, {} as any) };
}

describe('AutomationService.updateRule', () => {
  it('only writes known fields: a caller cannot move a rule to another workspace or change its stage', async () => {
    const { svc, prisma } = build();
    await svc.updateRule('r1', {
      name: 'New name', isActive: false,
      workspaceId: 'OTHER', triggerStage: 'DORMANT', id: 'hijack',
    } as any);
    expect(prisma.automationRule.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { name: 'New name', isActive: false },
    });
  });

  it('refuses an empty update and bad values', async () => {
    const { svc } = build();
    await expect(svc.updateRule('r1', {} as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.updateRule('r1', { name: '' } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.updateRule('r1', { subject: 42 } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.updateRule('r1', { body: 'x'.repeat(10001) } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('an empty replyTo clears it', async () => {
    const { svc, prisma } = build();
    await svc.updateRule('r1', { replyTo: '' } as any);
    expect(prisma.automationRule.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { replyTo: null } });
  });
});

describe('AutomationService.createRule', () => {
  const ok = { name: 'Welcome', triggerStage: 'ACTIVE', subject: 'Hi {{name}}', body: 'Welcome aboard' };

  it('creates a valid rule in the given workspace', async () => {
    const { svc, prisma } = build();
    await svc.createRule('w1', ok);
    expect(prisma.automationRule.create).toHaveBeenCalledWith({ data: expect.objectContaining({ workspaceId: 'w1', name: 'Welcome' }) });
  });

  it('refuses a missing workspace, missing fields and an unknown stage', async () => {
    const { svc, prisma } = build();
    await expect(svc.createRule('', ok)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.createRule('w1', { ...ok, name: '' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.createRule('w1', { ...ok, triggerStage: 'WON' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.automationRule.create).not.toHaveBeenCalled();
  });
});
