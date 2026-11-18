import { createHmac } from 'crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('axios', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('./webhook-url.util', () => {
  const actual = jest.requireActual('./webhook-url.util');
  return { ...actual, assertPublicHost: jest.fn().mockResolvedValue(undefined) };
});

import axios from 'axios';
import { WebhooksService } from './webhooks.service';
import { assertPublicHost } from './webhook-url.util';

const HOOK = {
  id: 'h1',
  workspaceId: 'w1',
  url: 'https://hooks.zapier.com/hooks/catch/1/abc/',
  events: ['post.published'],
  secret: 'whsec_testsecret',
  enabled: true,
};

function build() {
  const prisma: any = {
    workspaceWebhook: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'new1', enabled: true, ...data })),
      findUnique: jest.fn().mockResolvedValue(HOOK),
      update: jest.fn().mockResolvedValue({ ...HOOK, lastStatus: 200 }),
      delete: jest.fn().mockResolvedValue({}),
    },
  };
  const planGuard: any = { getWorkspacePlan: jest.fn().mockResolvedValue('AGENCY_PRO') };
  return { prisma, planGuard, svc: new WebhooksService(prisma, planGuard) };
}

const flush = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  (axios.post as jest.Mock).mockReset().mockResolvedValue({ status: 200 });
  (assertPublicHost as jest.Mock).mockReset().mockResolvedValue(undefined);
});

describe('WebhooksService.create', () => {
  it('rejects non-https, localhost and private-IP targets', async () => {
    const { svc, prisma } = build();
    for (const url of ['http://hooks.zapier.com/x', 'https://localhost/x', 'https://169.254.169.254/x', 'https://10.0.0.1/x']) {
      await expect(svc.create('w1', url, ['post.published'])).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(prisma.workspaceWebhook.create).not.toHaveBeenCalled();
  });

  it('accepts a valid URL and the new CRM events, returns the secret once', async () => {
    const { svc, prisma } = build();
    const res = await svc.create('w1', HOOK.url, ['client.stage_changed', 'note.added', 'bogus.event']);
    expect(res.secret).toMatch(/^whsec_/);
    expect(prisma.workspaceWebhook.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ workspaceId: 'w1', events: ['client.stage_changed', 'note.added'] }),
    });
  });

  it('requires at least one known event', async () => {
    const { svc } = build();
    await expect(svc.create('w1', HOOK.url, ['nope'])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('caps the number of webhooks per workspace', async () => {
    const { svc, prisma } = build();
    prisma.workspaceWebhook.count.mockResolvedValue(10);
    await expect(svc.create('w1', HOOK.url, ['post.published'])).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.workspaceWebhook.create).not.toHaveBeenCalled();
  });
});

describe('WebhooksService.setEnabled', () => {
  it('does not return the signing secret', async () => {
    const { svc } = build();
    const res: any = await svc.setEnabled('w1', 'h1', false);
    expect(res.secret).toBeUndefined();
    expect(res.id).toBe('h1');
  });

  it('refuses another workspace\'s webhook', async () => {
    const { svc } = build();
    await expect(svc.setEnabled('other', 'h1', false)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('WebhooksService delivery', () => {
  it('sends a signed envelope with delivery headers and no redirects', async () => {
    const { svc } = build();
    const res = await svc.sendTest('w1', 'h1');
    expect(res.delivered).toBe(true);

    const [url, body, config] = (axios.post as jest.Mock).mock.calls[0];
    expect(url).toBe(HOOK.url);
    const parsed = JSON.parse(body);
    expect(parsed.id).toMatch(/^evt_[0-9a-f]{24}$/);
    expect(parsed.event).toBe('webhook.test');
    expect(parsed.workspaceId).toBe('w1');
    expect(parsed.createdAt).toBeTruthy();
    expect(parsed.firedAt).toBe(parsed.createdAt);
    expect(parsed.data).toBeDefined();

    const sig = createHmac('sha256', HOOK.secret).update(body).digest('hex');
    expect(config.headers['X-EWork-Signature']).toBe(`sha256=${sig}`);
    expect(config.headers['X-EWork-Delivery']).toBe(parsed.id);
    expect(config.headers['X-EWork-Event']).toBe('webhook.test');
    expect(config.headers['X-EWork-Timestamp']).toBe(parsed.createdAt);
    expect(config.maxRedirects).toBe(0);
  });

  it('does not call out when the host resolves to a private address', async () => {
    const { svc } = build();
    (assertPublicHost as jest.Mock).mockRejectedValueOnce(new Error('Blocked'));
    const res = await svc.sendTest('w1', 'h1');
    expect(res).toEqual({ delivered: false, status: 0 });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('dispatch fans out to every matching hook and filters by event', async () => {
    const { svc, prisma } = build();
    prisma.workspaceWebhook.findMany.mockResolvedValue([HOOK, { ...HOOK, id: 'h2' }]);
    await svc.dispatch('w1', 'client.stage_changed', { clientId: 'c1' });
    await flush();
    expect(prisma.workspaceWebhook.findMany).toHaveBeenCalledWith({
      where: { workspaceId: 'w1', enabled: true, events: { has: 'client.stage_changed' } },
    });
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  it('dispatch never throws when the lookup fails', async () => {
    const { svc, prisma } = build();
    prisma.workspaceWebhook.findMany.mockRejectedValue(new Error('db down'));
    await expect(svc.dispatch('w1', 'post.failed', {})).resolves.toBeUndefined();
  });
});
