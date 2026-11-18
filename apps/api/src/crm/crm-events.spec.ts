jest.mock('./automation.service', () => ({ AutomationService: class {} }));
jest.mock('../analytics/posthog.service', () => ({ PostHogService: class {} }));
jest.mock('../webhooks/webhooks.service', () => ({ WebhooksService: class {} }));

import { CrmService } from './crm.service';

const CLIENT = {
  id: 'c1',
  workspaceId: 'w1',
  name: 'Ada',
  email: 'ada@x.com',
  company: 'Acme',
  stage: 'LEAD',
  dealValue: 100,
  assignedToId: null,
  tags: [] as string[],
};

function build() {
  const prisma: any = {
    client: {
      findUnique: jest.fn().mockResolvedValue(CLIENT),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ ...CLIENT, ...data })),
      delete: jest.fn().mockResolvedValue(CLIENT),
    },
    activity: { create: jest.fn().mockResolvedValue({}) },
    note: { create: jest.fn().mockResolvedValue({ id: 'n1', content: 'hello there', clientId: 'c1' }) },
    task: {
      create: jest.fn().mockResolvedValue({ id: 't1', title: 'Call Ada', clientId: 'c1', dueDate: null }),
      findUnique: jest.fn().mockResolvedValue({ id: 't1', clientId: 'c1', title: 'Call Ada', isDone: false }),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 't1', clientId: 'c1', title: 'Call Ada', ...data })),
    },
  };
  const automation: any = { triggerStageAutomation: jest.fn().mockResolvedValue(undefined) };
  const posthog: any = { capture: jest.fn() };
  const webhooks: any = { dispatch: jest.fn().mockResolvedValue(undefined) };
  const svc = new CrmService(prisma, automation, posthog, webhooks);
  jest.spyOn(svc as any, 'assertClientAccess').mockResolvedValue(undefined);
  return { svc, prisma, webhooks };
}

describe('CRM outbound events', () => {
  it('stage change fires client.stage_changed with from/to', async () => {
    const { svc, webhooks } = build();
    await svc.updateStage('c1', 'PROPOSAL', 'u1');
    expect(webhooks.dispatch).toHaveBeenCalledWith(
      'w1',
      'client.stage_changed',
      expect.objectContaining({ clientId: 'c1', from: 'LEAD', to: 'PROPOSAL', name: 'Ada', dealValue: 100 }),
    );
  });

  it('moving to the same stage fires nothing', async () => {
    const { svc, webhooks } = build();
    await svc.updateStage('c1', 'LEAD', 'u1');
    expect(webhooks.dispatch).not.toHaveBeenCalled();
  });

  it('updating a client fires client.updated listing changed fields and previous values', async () => {
    const { svc, webhooks } = build();
    await svc.updateClient('c1', { dealValue: 500, userId: 'u1' });
    expect(webhooks.dispatch).toHaveBeenCalledWith(
      'w1',
      'client.updated',
      expect.objectContaining({
        clientId: 'c1',
        changedFields: ['dealValue'],
        previous: expect.objectContaining({ dealValue: 100 }),
      }),
    );
  });

  it('an update that changes nothing fires nothing', async () => {
    const { svc, webhooks } = build();
    await svc.updateClient('c1', { userId: 'u1' });
    expect(webhooks.dispatch).not.toHaveBeenCalled();
  });

  it('deleting a client fires client.deleted with the details captured before delete', async () => {
    const { svc, webhooks } = build();
    await svc.deleteClient('c1', 'u1');
    expect(webhooks.dispatch).toHaveBeenCalledWith(
      'w1',
      'client.deleted',
      expect.objectContaining({ clientId: 'c1', name: 'Ada' }),
    );
  });

  it('adding a note fires note.added', async () => {
    const { svc, webhooks } = build();
    await svc.addNote({ clientId: 'c1', content: 'hello there', userId: 'u1' } as any);
    expect(webhooks.dispatch).toHaveBeenCalledWith(
      'w1',
      'note.added',
      expect.objectContaining({ clientId: 'c1', noteId: 'n1', content: 'hello there' }),
    );
  });

  it('creating a task fires task.created', async () => {
    const { svc, webhooks } = build();
    await svc.addTask({ clientId: 'c1', title: 'Call Ada', userId: 'u1' } as any);
    expect(webhooks.dispatch).toHaveBeenCalledWith(
      'w1',
      'task.created',
      expect.objectContaining({ clientId: 'c1', taskId: 't1', title: 'Call Ada' }),
    );
  });

  it('completing a task fires task.completed; re-opening it does not', async () => {
    const { svc, webhooks, prisma } = build();
    await svc.toggleTask('t1', 'u1');
    expect(webhooks.dispatch).toHaveBeenCalledWith(
      'w1',
      'task.completed',
      expect.objectContaining({ clientId: 'c1', taskId: 't1' }),
    );

    webhooks.dispatch.mockClear();
    prisma.task.findUnique.mockResolvedValue({ id: 't1', clientId: 'c1', title: 'Call Ada', isDone: true });
    await svc.toggleTask('t1', 'u1');
    expect(webhooks.dispatch).not.toHaveBeenCalled();
  });

  it('a failing webhook never breaks the CRM action', async () => {
    const { svc, webhooks } = build();
    webhooks.dispatch.mockImplementation(() => {
      throw new Error('boom');
    });
    await expect(svc.updateStage('c1', 'PROPOSAL', 'u1')).resolves.toBeDefined();
    webhooks.dispatch.mockRejectedValue(new Error('async boom'));
    await expect(svc.addNote({ clientId: 'c1', content: 'x', userId: 'u1' } as any)).resolves.toBeDefined();
  });
});
