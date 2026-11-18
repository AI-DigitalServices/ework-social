import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../common/plan-guard.service', () => ({ PlanGuardService: class {} }));
jest.mock('../webhooks/webhooks.service', () => ({ WebhooksService: class {} }));

import { LeadCaptureService } from './lead-capture.service';

const TOKEN = 'lc_' + 'a'.repeat(24);
const LINK = { id: 'l1', workspaceId: 'w1', name: 'Contact page', token: TOKEN, enabled: true, defaultTags: ['site'], redirectUrl: null };

function build(plan = 'GROWTH') {
  const prisma: any = {
    leadCaptureLink: {
      findUnique: jest.fn().mockResolvedValue(LINK),
      findFirst: jest.fn().mockResolvedValue(LINK),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'l2', ...data })),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ ...LINK, ...data })),
      delete: jest.fn().mockResolvedValue({}),
    },
    client: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'c1', ...data })),
      update: jest.fn().mockResolvedValue({}),
    },
    note: { create: jest.fn().mockResolvedValue({ id: 'n1', content: 'x' }) },
    activity: { create: jest.fn().mockResolvedValue({}) },
  };
  const planGuard: any = {
    assertCanWrite: jest.fn().mockResolvedValue({ plan }),
    checkClientLimit: jest.fn().mockResolvedValue(undefined),
  };
  const webhooks: any = { dispatch: jest.fn().mockResolvedValue(undefined) };
  return { prisma, planGuard, webhooks, svc: new LeadCaptureService(prisma, planGuard, webhooks) };
}

describe('LeadCaptureService.capture', () => {
  it('unknown, malformed or disabled tokens are all a plain 404', async () => {
    const { svc, prisma } = build();
    await expect(svc.capture('nope', {})).rejects.toBeInstanceOf(NotFoundException);
    prisma.leadCaptureLink.findUnique.mockResolvedValue(null);
    await expect(svc.capture('lc_' + 'b'.repeat(24), {})).rejects.toBeInstanceOf(NotFoundException);
    prisma.leadCaptureLink.findUnique.mockResolvedValue({ ...LINK, enabled: false });
    await expect(svc.capture(TOKEN, { email: 'a@b.com' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('honeypot submissions look successful but store nothing', async () => {
    const { svc, prisma, webhooks } = build();
    const res = await svc.capture(TOKEN, { email: 'bot@spam.com', _gotcha: 'gotcha' });
    expect(res.created).toBe(false);
    expect(prisma.client.create).not.toHaveBeenCalled();
    expect(webhooks.dispatch).not.toHaveBeenCalled();
  });

  it('a new lead is created as WEBSITE/LEAD, tagged, noted, and announced', async () => {
    const { svc, prisma, planGuard, webhooks } = build();
    const res = await svc.capture(TOKEN, { name: 'Ada Obi', email: 'Ada@Acme.com', message: 'Need a quote', budget: '$5k' });
    expect(res.created).toBe(true);
    expect(planGuard.checkClientLimit).toHaveBeenCalledWith('w1');
    expect(prisma.client.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ workspaceId: 'w1', name: 'Ada Obi', email: 'ada@acme.com', stage: 'LEAD', source: 'WEBSITE', tags: ['site', 'website-form'] }),
    });
    const noteContent = prisma.note.create.mock.calls[0][0].data.content;
    expect(noteContent).toContain('Need a quote');
    expect(noteContent).toContain('budget: $5k');
    expect(webhooks.dispatch).toHaveBeenCalledWith('w1', 'lead.created', expect.objectContaining({ clientId: 'c1', source: 'WEBSITE', form: 'Contact page' }));
  });

  it('the same email again adds a note to the existing contact instead of a duplicate', async () => {
    const { svc, prisma, webhooks } = build();
    prisma.client.findFirst.mockResolvedValue({ id: 'existing', name: 'Ada' });
    const res = await svc.capture(TOKEN, { email: 'ada@acme.com', message: 'Following up' });
    expect(res.created).toBe(false);
    expect(prisma.client.create).not.toHaveBeenCalled();
    expect(prisma.note.create).toHaveBeenCalledWith({ data: expect.objectContaining({ clientId: 'existing' }) });
    expect(webhooks.dispatch).toHaveBeenCalledWith('w1', 'note.added', expect.objectContaining({ clientId: 'existing' }));
  });

  it('needs a valid email or a phone number', async () => {
    const { svc, prisma } = build();
    await expect(svc.capture(TOKEN, { name: 'No contact details' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.capture(TOKEN, { email: 'bad-email' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.client.create).not.toHaveBeenCalled();
    await expect(svc.capture(TOKEN, { name: 'Phone only', phone: '+2348000000' })).resolves.toMatchObject({ created: true });
  });

  it('respects the plan\'s contact limit', async () => {
    const { svc, prisma, planGuard } = build();
    planGuard.checkClientLimit.mockRejectedValue(new ForbiddenException('limit'));
    await expect(svc.capture(TOKEN, { email: 'a@b.com' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.client.create).not.toHaveBeenCalled();
  });
});

describe('LeadCaptureService management', () => {
  it('creates a link with a private token on Growth+', async () => {
    const { svc, prisma } = build();
    const link: any = await svc.create('w1', { name: 'Home page form', defaultTags: ['seo'] });
    expect(link.token).toMatch(/^lc_[A-Za-z0-9_-]{20,}$/);
    expect(prisma.leadCaptureLink.create).toHaveBeenCalledWith({ data: expect.objectContaining({ workspaceId: 'w1', defaultTags: ['seo'] }) });
  });

  it('is not available on lower plans and is capped', async () => {
    const free = build('FREE');
    await expect(free.svc.create('w1', { name: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
    const capped = build();
    capped.prisma.leadCaptureLink.count.mockResolvedValue(5);
    await expect(capped.svc.create('w1', { name: 'x' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('thank-you page must be a public https URL', async () => {
    const { svc } = build();
    await expect(svc.create('w1', { name: 'x', redirectUrl: 'http://site.com/thanks' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.create('w1', { name: 'x', redirectUrl: 'https://localhost/thanks' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.create('w1', { name: 'x', redirectUrl: 'https://site.com/thanks' })).resolves.toBeDefined();
  });

  it('only touches links in the caller\'s workspace; rotate issues a new token', async () => {
    const { svc, prisma } = build();
    prisma.leadCaptureLink.findFirst.mockResolvedValue(null);
    await expect(svc.update('w1', 'foreign', { enabled: false })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.remove('w1', 'foreign')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.leadCaptureLink.findFirst).toHaveBeenCalledWith({ where: { id: 'foreign', workspaceId: 'w1' } });

    prisma.leadCaptureLink.findFirst.mockResolvedValue(LINK);
    const rotated: any = await svc.rotate('w1', 'l1');
    expect(rotated.token).not.toBe(TOKEN);
    expect(rotated.token).toMatch(/^lc_/);
  });
});
