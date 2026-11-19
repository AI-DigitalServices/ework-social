import { ForbiddenException, NotFoundException } from '@nestjs/common';

jest.mock('./automation.service', () => ({ AutomationService: class {} }));
jest.mock('../analytics/posthog.service', () => ({ PostHogService: class {} }));
jest.mock('../webhooks/webhooks.service', () => ({ WebhooksService: class {} }));
jest.mock('../common/plan-guard.service', () => ({ PlanGuardService: class {} }));

import { CrmService } from './crm.service';

const CLIENT = {
  id: 'c1', workspaceId: 'w1', name: 'Ada', email: 'ada@x.com', company: 'Acme',
  stage: 'LEAD', dealValue: 100, assignedToId: null, tags: [] as string[],
};

function build(role: string | null = 'EDITOR', ownerId = 'someone-else') {
  const prisma: any = {
    client: {
      findUnique: jest.fn().mockResolvedValue(CLIENT),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ ...CLIENT, ...data })),
      delete: jest.fn().mockResolvedValue(CLIENT),
    },
    workspaceMember: { findFirst: jest.fn().mockResolvedValue(role ? { role } : null) },
    workspace: { findUnique: jest.fn().mockResolvedValue({ ownerId }) },
    activity: { create: jest.fn().mockResolvedValue({}) },
    note: { create: jest.fn().mockResolvedValue({ id: 'n1', content: 'hi' }) },
    task: {
      create: jest.fn().mockResolvedValue({ id: 't1', title: 'T', dueDate: null }),
      findUnique: jest.fn().mockResolvedValue({ id: 't1', clientId: 'c1', title: 'T', isDone: false }),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 't1', title: 'T', ...data })),
    },
  };
  const automation: any = { triggerStageAutomation: jest.fn().mockResolvedValue(undefined) };
  const posthog: any = { capture: jest.fn() };
  const webhooks: any = { dispatch: jest.fn().mockResolvedValue(undefined) };
  const planGuard: any = { assertCanWrite: jest.fn().mockResolvedValue({}) };
  const svc = new CrmService(prisma, automation, posthog, webhooks, planGuard);
  return { svc, prisma, planGuard };
}

const WRITES: Array<[string, (s: CrmService) => Promise<any>]> = [
  ['updateClient', s => s.updateClient('c1', { name: 'X', userId: 'u1' })],
  ['updateStage', s => s.updateStage('c1', 'PROPOSAL', 'u1')],
  ['deleteClient', s => s.deleteClient('c1', 'u1')],
  ['addNote', s => s.addNote({ clientId: 'c1', content: 'hi', userId: 'u1' } as any)],
  ['addTask', s => s.addTask({ clientId: 'c1', title: 'T', userId: 'u1' } as any)],
  ['toggleTask', s => s.toggleTask('t1', 'u1')],
];

const noMutations = (prisma: any) => {
  expect(prisma.client.update).not.toHaveBeenCalled();
  expect(prisma.client.delete).not.toHaveBeenCalled();
  expect(prisma.note.create).not.toHaveBeenCalled();
  expect(prisma.task.create).not.toHaveBeenCalled();
  expect(prisma.task.update).not.toHaveBeenCalled();
};

describe('CRM write access', () => {
  const original = process.env.WRITE_CHECKS;
  afterEach(() => {
    if (original === undefined) delete process.env.WRITE_CHECKS;
    else process.env.WRITE_CHECKS = original;
  });

  it.each(WRITES)('%s: a viewer is refused and nothing is written', async (_name, call) => {
    const { svc, prisma } = build('VIEWER');
    await expect(call(svc)).rejects.toBeInstanceOf(ForbiddenException);
    noMutations(prisma);
  });

  it.each(WRITES)('%s: someone outside the workspace gets a 404', async (_name, call) => {
    const { svc, prisma } = build(null);
    await expect(call(svc)).rejects.toBeInstanceOf(NotFoundException);
    noMutations(prisma);
  });

  it.each(WRITES)('%s: an editor can do it, and the workspace write check runs', async (_name, call) => {
    const { svc, planGuard } = build('EDITOR');
    await expect(call(svc)).resolves.toBeDefined();
    expect(planGuard.assertCanWrite).toHaveBeenCalledWith('w1');
  });

  it.each(WRITES)('%s: a read-only workspace (trial ended) is refused', async (_name, call) => {
    const { svc, prisma, planGuard } = build('OWNER');
    planGuard.assertCanWrite.mockRejectedValue(new ForbiddenException('Your free trial has ended.'));
    await expect(call(svc)).rejects.toBeInstanceOf(ForbiddenException);
    noMutations(prisma);
  });

  it('the workspace owner with no membership row still works', async () => {
    const { svc } = build(null, 'u1');
    await expect(svc.updateStage('c1', 'PROPOSAL', 'u1')).resolves.toBeDefined();
  });

  it('WRITE_CHECKS=off lifts the role and plan checks but never the tenant check', async () => {
    process.env.WRITE_CHECKS = 'off';
    const viewer = build('VIEWER');
    await expect(viewer.svc.updateStage('c1', 'PROPOSAL', 'u1')).resolves.toBeDefined();
    expect(viewer.planGuard.assertCanWrite).not.toHaveBeenCalled();
    const outsider = build(null);
    await expect(outsider.svc.updateStage('c1', 'PROPOSAL', 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
