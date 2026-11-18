import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../common/plan-guard.service', () => ({ PlanGuardService: class {} }));
jest.mock('../webhooks/webhooks.service', () => ({ WebhooksService: class {} }));
jest.mock('../crm/automation.service', () => ({ AutomationService: class {} }));
jest.mock('../scheduler/scheduler.service', () => ({ SchedulerService: class {} }));

import { PublicApiService } from './public-api.service';

const CLIENT = { id: 'c1', workspaceId: 'w1', name: 'Ada', email: 'ada@x.com', company: 'Acme', stage: 'LEAD', dealValue: 100, assignedToId: null, tags: [] as string[] };

function build() {
  const prisma: any = {
    workspace: { findUnique: jest.fn().mockResolvedValue({ id: 'w1', name: 'Acme Agency' }) },
    socialAccount: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue({ id: 'sa1' }) },
    client: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(CLIENT),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'new1', ...data })),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ ...CLIENT, ...data })),
    },
    activity: { create: jest.fn().mockResolvedValue({}) },
    note: { create: jest.fn().mockResolvedValue({ id: 'n1', content: 'hello', createdAt: new Date() }) },
    task: {
      create: jest.fn().mockResolvedValue({ id: 't1', title: 'Call', dueDate: null, isDone: false, createdAt: new Date() }),
      findFirst: jest.fn().mockResolvedValue({ id: 't1', clientId: 'c1', title: 'Call', isDone: false, client: { id: 'c1', name: 'Ada' } }),
      update: jest.fn().mockResolvedValue({ id: 't1', title: 'Call', isDone: true }),
    },
    post: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const planGuard: any = { getWorkspacePlan: jest.fn().mockResolvedValue('AGENCY_PRO'), checkClientLimit: jest.fn().mockResolvedValue(undefined) };
  const webhooks: any = { dispatch: jest.fn().mockResolvedValue(undefined) };
  const automation: any = { triggerStageAutomation: jest.fn().mockResolvedValue(undefined) };
  const scheduler: any = {
    createPost: jest.fn().mockResolvedValue({
      id: 'p1', status: 'SCHEDULED', content: 'Hi', mediaUrls: [], scheduledAt: new Date(), socialAccountId: 'sa1', clientId: null,
      createdAt: new Date(), socialAccount: { platform: 'INSTAGRAM', accessToken: 'SECRET', refreshToken: 'SECRET2' },
    }),
  };
  return { prisma, planGuard, webhooks, automation, scheduler, svc: new PublicApiService(prisma, planGuard, webhooks, automation, scheduler) };
}

const inOneHour = () => new Date(Date.now() + 3_600_000).toISOString();

describe('tenant isolation', () => {
  it('looks contacts up by id AND workspace', async () => {
    const { svc, prisma } = build();
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(svc.getClient('w1', 'other-ws-client')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.client.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'other-ws-client', workspaceId: 'w1' } }));
    await expect(svc.moveStage('w1', 'x', { stage: 'ACTIVE' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.addNote('w1', 'x', { content: 'hi' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('finds tasks only through a contact in the same workspace', async () => {
    const { svc, prisma } = build();
    prisma.task.findFirst.mockResolvedValue(null);
    await expect(svc.completeTask('w1', 't9')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.task.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 't9', client: { workspaceId: 'w1' } } }));
  });

  it('lists accounts without tokens', async () => {
    const { svc, prisma } = build();
    await svc.listAccounts('w1');
    const arg = prisma.socialAccount.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({ workspaceId: 'w1', isActive: true });
    expect(arg.select.accessToken).toBeUndefined();
    expect(arg.select.refreshToken).toBeUndefined();
  });
});

describe('contacts', () => {
  it('create checks the plan limit first, rejects duplicates, then emits lead.created', async () => {
    const { svc, prisma, planGuard, webhooks } = build();
    prisma.client.findFirst.mockResolvedValueOnce({ id: 'existing' });
    await expect(svc.createClient('w1', { name: 'Ada', email: 'ada@x.com' })).rejects.toBeInstanceOf(ConflictException);
    expect(planGuard.checkClientLimit).toHaveBeenCalledWith('w1');
    expect(prisma.client.create).not.toHaveBeenCalled();

    prisma.client.findFirst.mockResolvedValue(null);
    await svc.createClient('w1', { name: 'Bola', email: 'bola@x.com', stage: 'contacted', source: 'website' });
    expect(prisma.client.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ workspaceId: 'w1', stage: 'CONTACTED', source: 'WEBSITE', email: 'bola@x.com' }),
    }));
    expect(webhooks.dispatch).toHaveBeenCalledWith('w1', 'lead.created', expect.objectContaining({ clientId: 'new1' }));
  });

  it('create refuses when the plan limit is hit', async () => {
    const { svc, prisma, planGuard } = build();
    planGuard.checkClientLimit.mockRejectedValue(new BadRequestException('limit'));
    await expect(svc.createClient('w1', { name: 'X' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.client.create).not.toHaveBeenCalled();
  });

  it('create validates input', async () => {
    const { svc } = build();
    await expect(svc.createClient('w1', {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.createClient('w1', { name: 'X', stage: 'WON' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.createClient('w1', { name: 'X', email: 'bad' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update emits client.updated with changed fields; empty update is a 400', async () => {
    const { svc, webhooks } = build();
    await svc.updateClient('w1', 'c1', { dealValue: 500 });
    expect(webhooks.dispatch).toHaveBeenCalledWith('w1', 'client.updated', expect.objectContaining({
      changedFields: ['dealValue'], previous: expect.objectContaining({ dealValue: 100 }),
    }));
    await expect(svc.updateClient('w1', 'c1', {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('stage move emits client.stage_changed and runs stage automation; same stage emits nothing', async () => {
    const { svc, webhooks, automation } = build();
    await svc.moveStage('w1', 'c1', { stage: 'PROPOSAL' });
    expect(webhooks.dispatch).toHaveBeenCalledWith('w1', 'client.stage_changed', expect.objectContaining({ from: 'LEAD', to: 'PROPOSAL' }));
    expect(automation.triggerStageAutomation).toHaveBeenCalledWith('w1', 'c1', 'PROPOSAL');

    webhooks.dispatch.mockClear();
    await svc.moveStage('w1', 'c1', { stage: 'LEAD' });
    expect(webhooks.dispatch).not.toHaveBeenCalled();
    await expect(svc.moveStage('w1', 'c1', {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('notes and tasks emit their events and validate input', async () => {
    const { svc, webhooks } = build();
    await svc.addNote('w1', 'c1', { content: 'hello' });
    expect(webhooks.dispatch).toHaveBeenCalledWith('w1', 'note.added', expect.objectContaining({ noteId: 'n1' }));
    await svc.addTask('w1', 'c1', { title: 'Call' });
    expect(webhooks.dispatch).toHaveBeenCalledWith('w1', 'task.created', expect.objectContaining({ taskId: 't1' }));
    await expect(svc.addNote('w1', 'c1', { content: '' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.addTask('w1', 'c1', { title: 'x', dueDate: 'soon' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('completing a task emits once; completing it again does nothing', async () => {
    const { svc, prisma, webhooks } = build();
    await svc.completeTask('w1', 't1');
    expect(webhooks.dispatch).toHaveBeenCalledWith('w1', 'task.completed', expect.objectContaining({ taskId: 't1' }));
    webhooks.dispatch.mockClear();
    prisma.task.findFirst.mockResolvedValue({ id: 't1', clientId: 'c1', title: 'Call', isDone: true, client: { id: 'c1', name: 'Ada' } });
    await svc.completeTask('w1', 't1');
    expect(webhooks.dispatch).not.toHaveBeenCalled();
  });

  it('pagination returns a cursor only when there is more', async () => {
    const { svc, prisma } = build();
    prisma.client.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const page = await svc.listClients('w1', { limit: '2' });
    expect(page.data).toHaveLength(2);
    expect(page.nextCursor).toBe('b');
    prisma.client.findMany.mockResolvedValue([{ id: 'a' }]);
    expect((await svc.listClients('w1', { limit: '2' })).nextCursor).toBeNull();
  });
});

describe('posts', () => {
  it('rejects a social account from another workspace and never reaches the scheduler', async () => {
    const { svc, prisma, scheduler } = build();
    prisma.socialAccount.findFirst.mockResolvedValue(null);
    await expect(svc.createPost('w1', { content: 'Hi', socialAccountId: 'foreign', status: 'DRAFT' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.socialAccount.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'foreign', workspaceId: 'w1', isActive: true } }));
    expect(scheduler.createPost).not.toHaveBeenCalled();
  });

  it('only drafts and future scheduled posts are allowed', async () => {
    const { svc, scheduler } = build();
    await expect(svc.createPost('w1', { content: 'Hi', socialAccountId: 'sa1', status: 'PUBLISHED' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.createPost('w1', { content: 'Hi', socialAccountId: 'sa1', status: 'SCHEDULED' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.createPost('w1', { content: 'Hi', socialAccountId: 'sa1', status: 'SCHEDULED', scheduledAt: '2020-01-01T00:00:00Z' })).rejects.toBeInstanceOf(BadRequestException);
    expect(scheduler.createPost).not.toHaveBeenCalled();
  });

  it('creates through the scheduler as EDITOR and never leaks account tokens', async () => {
    const { svc, scheduler } = build();
    const res: any = await svc.createPost('w1', { content: 'Hi', socialAccountId: 'sa1', status: 'SCHEDULED', scheduledAt: inOneHour() });
    expect(scheduler.createPost).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: 'w1', socialAccountId: 'sa1', status: 'SCHEDULED' }), 'EDITOR');
    expect(res.platform).toBe('INSTAGRAM');
    expect(JSON.stringify(res)).not.toContain('SECRET');
  });

  it('a contact attached to a post must belong to the workspace', async () => {
    const { svc, prisma, scheduler } = build();
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(svc.createPost('w1', { content: 'Hi', socialAccountId: 'sa1', clientId: 'foreign-client' })).rejects.toBeInstanceOf(NotFoundException);
    expect(scheduler.createPost).not.toHaveBeenCalled();
  });

  it('list rejects unknown statuses', async () => {
    const { svc } = build();
    await expect(svc.listPosts('w1', { status: 'NOPE' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
