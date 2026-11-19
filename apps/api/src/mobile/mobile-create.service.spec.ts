import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MobileCreateService } from './mobile-create.service';

function build(over: { profile?: any; idea?: any; account?: any; open?: number } = {}) {
  const prisma: any = {
    workspace: { findUnique: jest.fn().mockResolvedValue({ name: "Ada's Bakery" }) },
    workspaceProfile: {
      findUnique: jest.fn().mockResolvedValue(
        over.profile === undefined
          ? { category: 'food', tone: 'PLAYFUL', platforms: ['FACEBOOK'], offerings: [], contentTypes: [] }
          : over.profile,
      ),
    },
    postIdea: {
      count: jest.fn().mockResolvedValue(over.open ?? 0),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'i1', createdAt: new Date(), ...data })),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(over.idea === undefined ? { id: 'i1', content: 'Hello', usedPostId: null } : over.idea),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    socialAccount: {
      findFirst: jest.fn().mockResolvedValue(over.account === undefined ? { id: 'a1', platform: 'INSTAGRAM' } : over.account),
    },
    workspaceMember: { findFirst: jest.fn().mockResolvedValue({ role: 'OWNER' }) },
  };
  const ai: any = { generateFromIdea: jest.fn().mockResolvedValue({ options: ['One', 'Two', 'Three'] }) };
  const scheduler: any = {
    createPost: jest.fn().mockResolvedValue({ id: 'p1', content: 'Hello', status: 'DRAFT', updatedAt: new Date(), mediaUrls: [] }),
  };
  const planGuard: any = { assertCanWrite: jest.fn().mockResolvedValue({}) };
  const svc = new MobileCreateService(prisma, ai, scheduler, planGuard);
  return { svc, prisma, ai, scheduler, planGuard };
}

describe('suggest', () => {
  it('uses the first saved platform when none is given, and passes the saved voice through', async () => {
    const { svc, ai } = build();
    const r = await svc.suggest('w1', { idea: 'New red velvet cake' });
    expect(r.platform).toBe('FACEBOOK');
    expect(r.options).toHaveLength(3);
    const arg = ai.generateFromIdea.mock.calls[0][1];
    expect(arg.business.name).toBe("Ada's Bakery");
    expect(arg.business.tone).toBe('PLAYFUL');
  });

  it('honours a valid platform, ignores an unknown one, defaults to Instagram with no profile', async () => {
    expect((await build().svc.suggest('w1', { idea: 'cake please', platform: 'linkedin' })).platform).toBe('LINKEDIN');
    expect((await build().svc.suggest('w1', { idea: 'cake please', platform: 'myspace' })).platform).toBe('FACEBOOK');
    expect((await build({ profile: null }).svc.suggest('w1', { idea: 'cake please' })).platform).toBe('INSTAGRAM');
  });

  it('rejects an idea that is too short and does not call the AI', async () => {
    const { svc, ai } = build();
    await expect(svc.suggest('w1', { idea: ' a ' })).rejects.toBeInstanceOf(BadRequestException);
    expect(ai.generateFromIdea).not.toHaveBeenCalled();
  });

  it('refuses a read-only workspace before spending any AI usage', async () => {
    const { svc, ai, planGuard } = build();
    planGuard.assertCanWrite.mockRejectedValue(new Error('read only'));
    await expect(svc.suggest('w1', { idea: 'cake please' })).rejects.toThrow('read only');
    expect(ai.generateFromIdea).not.toHaveBeenCalled();
  });
});

describe('saveIdea / listIdeas / removeIdea', () => {
  it('saves with the owner and a normalised platform', async () => {
    const { svc, prisma } = build();
    const r = await svc.saveIdea('w1', 'u1', { idea: 'cake', content: ' Fresh cake! ', platform: 'instagram' });
    expect(r.content).toBe('Fresh cake!');
    expect(prisma.postIdea.create.mock.calls[0][0].data).toMatchObject({ workspaceId: 'w1', createdById: 'u1', platform: 'INSTAGRAM' });
  });

  it('refuses when the shelf is full', async () => {
    await expect(build({ open: 100 }).svc.saveIdea('w1', 'u1', { idea: 'cake', content: 'x' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses empty text', async () => {
    await expect(build().svc.saveIdea('w1', 'u1', { idea: 'cake', content: '   ' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists only unused ideas of this workspace', async () => {
    const { svc, prisma } = build();
    await svc.listIdeas('w1');
    expect(prisma.postIdea.findMany.mock.calls[0][0].where).toEqual({ workspaceId: 'w1', usedPostId: null });
  });

  it('removes only inside the workspace, and says so when nothing matched', async () => {
    const { svc, prisma } = build();
    await svc.removeIdea('w1', 'i1');
    expect(prisma.postIdea.deleteMany.mock.calls[0][0].where).toMatchObject({ id: 'i1', workspaceId: 'w1' });
    prisma.postIdea.deleteMany.mockResolvedValue({ count: 0 });
    await expect(svc.removeIdea('w1', 'zzz')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ideaToPost', () => {
  const soon = () => new Date(Date.now() + 3600_000).toISOString();

  it('creates a draft, marks the idea used, and returns the post summary', async () => {
    const { svc, scheduler, prisma } = build();
    const r = await svc.ideaToPost('w1', 'u1', 'i1', { socialAccountId: 'a1', status: 'DRAFT' });
    expect(r.post.id).toBe('p1');
    expect(scheduler.createPost.mock.calls[0][0]).toMatchObject({ workspaceId: 'w1', socialAccountId: 'a1', status: 'DRAFT' });
    expect(scheduler.createPost.mock.calls[0][1]).toBe('OWNER');
    expect(prisma.postIdea.update).toHaveBeenCalledWith({ where: { id: 'i1' }, data: { usedPostId: 'p1' } });
  });

  it('schedules for a future time', async () => {
    const { svc, scheduler } = build();
    await svc.ideaToPost('w1', 'u1', 'i1', { socialAccountId: 'a1', status: 'SCHEDULED', scheduledAt: soon() });
    expect(scheduler.createPost.mock.calls[0][0].status).toBe('SCHEDULED');
    expect(scheduler.createPost.mock.calls[0][0].scheduledAt).toBeTruthy();
  });

  it('rejects scheduling in the past or with no time', async () => {
    const { svc, scheduler } = build();
    await expect(
      svc.ideaToPost('w1', 'u1', 'i1', { socialAccountId: 'a1', status: 'SCHEDULED', scheduledAt: new Date(Date.now() - 1000).toISOString() }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.ideaToPost('w1', 'u1', 'i1', { socialAccountId: 'a1', status: 'SCHEDULED' })).rejects.toBeInstanceOf(BadRequestException);
    expect(scheduler.createPost).not.toHaveBeenCalled();
  });

  it('rejects an account that is not an active account of this workspace', async () => {
    const { svc } = build({ account: null });
    await expect(svc.ideaToPost('w1', 'u1', 'i1', { socialAccountId: 'other', status: 'DRAFT' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects text that is too long for the platform', async () => {
    const { svc } = build({ idea: { id: 'i1', content: 'a'.repeat(400), usedPostId: null }, account: { id: 'a1', platform: 'TWITTER' } });
    await expect(svc.ideaToPost('w1', 'u1', 'i1', { socialAccountId: 'a1', status: 'DRAFT' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('answers 404 for a missing idea and 409 for one already used', async () => {
    await expect(build({ idea: null }).svc.ideaToPost('w1', 'u1', 'i1', { socialAccountId: 'a1', status: 'DRAFT' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      build({ idea: { id: 'i1', content: 'x', usedPostId: 'p9' } }).svc.ideaToPost('w1', 'u1', 'i1', { socialAccountId: 'a1', status: 'DRAFT' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('two quick taps: the loser of the claim gets a 409 and no second post', async () => {
    const { svc, prisma, scheduler } = build();
    prisma.postIdea.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(svc.ideaToPost('w1', 'u1', 'i1', { socialAccountId: 'a1', status: 'DRAFT' })).rejects.toBeInstanceOf(ConflictException);
    expect(scheduler.createPost).not.toHaveBeenCalled();
  });

  it('gives the idea back if creating the post fails (for example the plan limit)', async () => {
    const { svc, prisma, scheduler } = build();
    scheduler.createPost.mockRejectedValue(new Error('post limit'));
    await expect(svc.ideaToPost('w1', 'u1', 'i1', { socialAccountId: 'a1', status: 'DRAFT' })).rejects.toThrow('post limit');
    expect(prisma.postIdea.updateMany).toHaveBeenLastCalledWith({ where: { id: 'i1', usedPostId: 'pending' }, data: { usedPostId: null } });
  });
});

describe('updateIdea', () => {
  it('changes the text of an idea on the shelf, only inside the workspace and only while unused', async () => {
    const { svc, prisma } = build();
    prisma.postIdea.findFirst.mockResolvedValue({ id: 'i1', idea: 'x', content: 'New text', platform: null, createdAt: new Date() });
    const r = await svc.updateIdea('w1', 'i1', '  New text  ');
    expect(r.content).toBe('New text');
    expect(prisma.postIdea.updateMany.mock.calls[0][0]).toEqual({
      where: { id: 'i1', workspaceId: 'w1', usedPostId: null },
      data: { content: 'New text' },
    });
  });

  it('refuses empty text and answers 404 when nothing matched', async () => {
    const { svc, prisma } = build();
    await expect(svc.updateIdea('w1', 'i1', '   ')).rejects.toBeInstanceOf(BadRequestException);
    prisma.postIdea.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.updateIdea('w1', 'zzz', 'text')).rejects.toBeInstanceOf(NotFoundException);
  });
});
