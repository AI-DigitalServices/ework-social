import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

jest.mock('../email/email.service', () => ({ EmailService: class {} }));
jest.mock('../notifications/notifications.service', () => ({ NotificationsService: class {} }));
jest.mock('../analytics/posthog.service', () => ({ PostHogService: class {} }));
jest.mock('../common/plan-guard.service', () => ({ PlanGuardService: class {} }));

import { ApprovalService, escapeHtml } from './approval.service';

function build(opts: { postStatus?: string; clientFound?: boolean; won?: number; approvalStatus?: string } = {}) {
  const prisma: any = {
    post: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'p1', workspaceId: 'w1', status: opts.postStatus || 'DRAFT',
        content: 'Hello <script>alert(1)</script>', socialAccount: { platform: 'LINKEDIN' }, scheduledAt: null,
      }),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    client: { findFirst: jest.fn().mockResolvedValue(opts.clientFound === false ? null : { id: 'c1' }) },
    postApproval: {
      deleteMany: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({ token: 'tok' }),
      findUnique: jest.fn().mockResolvedValue({
        postId: 'p1', workspaceId: 'w1', clientName: 'Ada', status: opts.approvalStatus || 'PENDING',
      }),
      updateMany: jest.fn().mockResolvedValue({ count: opts.won === undefined ? 1 : opts.won }),
    },
    workspace: { findUnique: jest.fn().mockResolvedValue({ ownerId: 'o1' }) },
  };
  const email: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
  const config: any = { get: jest.fn().mockReturnValue('https://app.test') };
  const notifications: any = { createNotification: jest.fn().mockResolvedValue(undefined) };
  const posthog: any = { capture: jest.fn() };
  const planGuard: any = {
    checkClientApprovalAccess: jest.fn().mockResolvedValue(undefined),
    assertCanWrite: jest.fn().mockResolvedValue({}),
  };
  const svc = new ApprovalService(prisma, email, config, notifications, posthog, planGuard);
  return { svc, prisma, email, planGuard, notifications };
}

describe('ApprovalService.sendForApproval', () => {
  const send = (svc: ApprovalService, over: any = {}) =>
    svc.sendForApproval('p1', 'w1', over.email ?? 'a@b.com', over.name ?? 'Ada', over.clientId);

  it('sends for a draft and checks plan and write access', async () => {
    const { svc, planGuard, prisma, email } = build();
    await expect(send(svc)).resolves.toMatchObject({ success: true, token: 'tok' });
    expect(planGuard.checkClientApprovalAccess).toHaveBeenCalledWith('w1');
    expect(planGuard.assertCanWrite).toHaveBeenCalledWith('w1');
    expect(prisma.post.update).toHaveBeenCalled();
    expect(email.sendEmail).toHaveBeenCalled();
  });

  it('a plan without the portal is refused before anything is written', async () => {
    const { svc, planGuard, prisma } = build();
    planGuard.checkClientApprovalAccess.mockRejectedValue(new ForbiddenException('upgrade'));
    await expect(send(svc)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.postApproval.create).not.toHaveBeenCalled();
  });

  it('a read-only workspace is refused', async () => {
    const { svc, planGuard, prisma } = build();
    planGuard.assertCanWrite.mockRejectedValue(new ForbiddenException('trial ended'));
    await expect(send(svc)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.postApproval.create).not.toHaveBeenCalled();
  });

  it('a published post is refused and its status is untouched', async () => {
    const { svc, prisma } = build({ postStatus: 'PUBLISHED' });
    await expect(send(svc)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.post.update).not.toHaveBeenCalled();
    expect(prisma.postApproval.deleteMany).not.toHaveBeenCalled();
  });

  it('a clientId from another workspace is a 404', async () => {
    const { svc, prisma } = build({ clientFound: false });
    await expect(send(svc, { clientId: 'c-other' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.client.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'c-other', workspaceId: 'w1' } }));
    expect(prisma.postApproval.create).not.toHaveBeenCalled();
  });

  it('a post from another workspace is a 404', async () => {
    const { svc, prisma } = build();
    prisma.post.findUnique.mockResolvedValue({ id: 'p1', workspaceId: 'OTHER', status: 'DRAFT' });
    await expect(send(svc)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses a bad email or empty name', async () => {
    const { svc } = build();
    await expect(send(svc, { email: 'not-an-email' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(send(svc, { name: '  ' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('escapes the client name and post text in the email', async () => {
    const { svc, email } = build();
    await send(svc, { name: '<img src=x onerror=1>' });
    const html = email.sendEmail.mock.calls[0][0].html as string;
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img src=x');
  });
});

describe('ApprovalService.approvePost / requestRevision', () => {
  it('approve: the winner moves the post back to DRAFT only if still pending approval', async () => {
    const { svc, prisma } = build();
    await expect(svc.approvePost('tok')).resolves.toMatchObject({ success: true });
    expect(prisma.postApproval.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { token: 'tok', status: 'PENDING' } }));
    expect(prisma.post.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'p1', status: 'PENDING_APPROVAL' } }));
  });

  it('approve: losing the race changes nothing and notifies nobody', async () => {
    const { svc, prisma, notifications } = build({ won: 0 });
    await expect(svc.approvePost('tok')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.post.updateMany).not.toHaveBeenCalled();
    expect(notifications.createNotification).not.toHaveBeenCalled();
  });

  it('approve: an already-reviewed link is refused', async () => {
    const { svc } = build({ approvalStatus: 'APPROVED' });
    await expect(svc.approvePost('tok')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revision: same atomic rule, and the note is trimmed and capped', async () => {
    const { svc, prisma } = build();
    await svc.requestRevision('tok', '  ' + 'x'.repeat(5000));
    const call = prisma.postApproval.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ token: 'tok', status: 'PENDING' });
    expect(call.data.revisionNote.length).toBe(2000);
  });

  it('revision: losing the race changes nothing', async () => {
    const { svc, prisma } = build({ won: 0 });
    await expect(svc.requestRevision('tok', 'fix')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.post.updateMany).not.toHaveBeenCalled();
  });
});

describe('escapeHtml', () => {
  it('escapes the five dangerous characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});
