import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

// The scheduler pulls in every social SDK; none of it is needed to test the access rules.
jest.mock('../social/social.service', () => ({ SocialService: class {} }));
jest.mock('../twitter/twitter-poller.service', () => ({ TwitterPollerService: class {} }));
jest.mock('../webhooks/webhooks.service', () => ({ WebhooksService: class {} }));
jest.mock('../analytics/posthog.service', () => ({ PostHogService: class {} }));

import { SchedulerService } from './scheduler.service';

function build(status = 'DRAFT', role: string | null = 'EDITOR') {
  const post = { id: 'p1', workspaceId: 'w1', status, socialAccount: { platform: 'LINKEDIN' } };
  const prisma: any = {
    post: {
      findUnique: jest.fn().mockResolvedValue(post),
      update: jest.fn().mockResolvedValue({ id: 'p1' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn().mockResolvedValue({ id: 'p1' }),
      create: jest.fn().mockResolvedValue({ id: 'new', socialAccount: { platform: 'LINKEDIN' } }),
    },
    workspaceMember: { findFirst: jest.fn().mockResolvedValue(role ? { role } : null) },
    workspace: { findUnique: jest.fn().mockResolvedValue({ ownerId: 'someone-else' }) },
  };
  const planGuard: any = {
    assertCanWrite: jest.fn().mockResolvedValue({}),
    checkPostLimit: jest.fn().mockResolvedValue(undefined),
  };
  const social: any = { publishToLinkedIn: jest.fn().mockResolvedValue({ ok: true }) };
  const posthog: any = { capture: jest.fn() };
  const svc = new SchedulerService(prisma, planGuard, {} as any, social, posthog, {} as any, {} as any);
  return { prisma, planGuard, social, svc };
}

describe('SchedulerService write access', () => {
  const original = process.env.WRITE_CHECKS;
  afterEach(() => {
    if (original === undefined) delete process.env.WRITE_CHECKS;
    else process.env.WRITE_CHECKS = original;
  });

  it('a non-member still gets a 404 (no hint the post exists)', async () => {
    const { svc } = build('DRAFT', null);
    await expect(svc.updatePost('p1', { content: 'x' }, 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('a viewer cannot update, delete, retry or publish', async () => {
    const { svc, prisma, social } = build('FAILED', 'VIEWER');
    await expect(svc.updatePost('p1', { content: 'x' }, 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.deletePost('p1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.retryPost('p1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.publishNow('p1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.post.update).not.toHaveBeenCalled();
    expect(prisma.post.delete).not.toHaveBeenCalled();
    expect(social.publishToLinkedIn).not.toHaveBeenCalled();
  });

  it('an editor can still update and delete', async () => {
    const { svc, prisma } = build('DRAFT', 'EDITOR');
    await svc.updatePost('p1', { content: 'x' }, 'u1');
    await svc.deletePost('p1', 'u1');
    expect(prisma.post.update).toHaveBeenCalledTimes(1);
    expect(prisma.post.delete).toHaveBeenCalledTimes(1);
  });

  it('a legacy owner with no membership row keeps access', async () => {
    const { svc, prisma } = build('DRAFT', null);
    prisma.workspace.findUnique.mockResolvedValue({ ownerId: 'u1' });
    await expect(svc.updatePost('p1', { content: 'x' }, 'u1')).resolves.toBeDefined();
  });

  it('a read-only workspace (trial ended) is refused for every record write', async () => {
    const { svc, planGuard, prisma, social } = build('FAILED', 'OWNER');
    planGuard.assertCanWrite.mockRejectedValue(new ForbiddenException('Your free trial has ended.'));
    await expect(svc.updatePost('p1', { content: 'x' }, 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.deletePost('p1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.retryPost('p1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.publishNow('p1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.post.update).not.toHaveBeenCalled();
    expect(social.publishToLinkedIn).not.toHaveBeenCalled();
  });

  it('publish-now refuses a post waiting for client approval, and one already published', async () => {
    const pending = build('PENDING_APPROVAL');
    await expect(pending.svc.publishNow('p1', 'u1')).rejects.toBeInstanceOf(BadRequestException);
    expect(pending.social.publishToLinkedIn).not.toHaveBeenCalled();

    const done = build('PUBLISHED');
    await expect(done.svc.publishNow('p1', 'u1')).rejects.toBeInstanceOf(BadRequestException);
    expect(done.social.publishToLinkedIn).not.toHaveBeenCalled();
  });

  it('publish-now still works for draft, scheduled and failed posts', async () => {
    for (const s of ['DRAFT', 'SCHEDULED', 'FAILED']) {
      const { svc, social } = build(s);
      await svc.publishNow('p1', 'u1');
      expect(social.publishToLinkedIn).toHaveBeenCalledWith('p1');
    }
  });

  it('retry accepts failed posts only', async () => {
    const ok = build('FAILED');
    await ok.svc.retryPost('p1', 'u1');
    expect(ok.prisma.post.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { status: 'SCHEDULED' } });
    for (const s of ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'PENDING_APPROVAL']) {
      const b = build(s);
      await expect(b.svc.retryPost('p1', 'u1')).rejects.toBeInstanceOf(BadRequestException);
      expect(b.prisma.post.update).not.toHaveBeenCalled();
    }
  });

  it('createPost from HTTP needs a writing role; internal callers (no role) are unaffected', async () => {
    const dto: any = { workspaceId: 'w1', socialAccountId: 's1', content: 'hi', status: 'DRAFT' };
    const { svc, prisma } = build();
    await expect(svc.createPost(dto, 'VIEWER')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.createPost(dto, 'NONE')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.post.create).not.toHaveBeenCalled();
    await svc.createPost(dto, 'EDITOR');
    await svc.createPost(dto); // e.g. the AI agent
    expect(prisma.post.create).toHaveBeenCalledTimes(2);
  });

  it('WRITE_CHECKS=off disables the role and read-only checks but keeps the status checks', async () => {
    process.env.WRITE_CHECKS = 'off';
    const viewer = build('DRAFT', 'VIEWER');
    viewer.planGuard.assertCanWrite.mockRejectedValue(new ForbiddenException('ended'));
    await expect(viewer.svc.updatePost('p1', { content: 'x' }, 'u1')).resolves.toBeDefined();
    expect(viewer.planGuard.assertCanWrite).not.toHaveBeenCalled();

    const published = build('PUBLISHED', 'VIEWER');
    await expect(published.svc.publishNow('p1', 'u1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
