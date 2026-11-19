import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('axios', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('./webhook-url.util', () => {
  const actual = jest.requireActual('./webhook-url.util');
  return { ...actual, assertPublicHost: jest.fn().mockResolvedValue(undefined) };
});

import axios from 'axios';
import { WebhooksService, decideNext, isRetryable, RETRY_DELAYS_MS, MAX_ATTEMPTS } from './webhooks.service';
import { assertPublicHost } from './webhook-url.util';

const HOOK = {
  id: 'h1', workspaceId: 'w1', url: 'https://hooks.zapier.com/hooks/catch/1/abc/',
  events: ['post.published'], secret: 'whsec_x', enabled: true,
};
const ROW = {
  id: 'evt_abc', webhookId: 'h1', workspaceId: 'w1', event: 'post.published',
  body: JSON.stringify({ id: 'evt_abc', event: 'post.published', createdAt: '2026-11-19T10:00:00.000Z', data: {} }),
  status: 500, state: 'RETRYING', attempts: 1, error: 'x', nextRetryAt: new Date(Date.now() - 1000),
};

function build() {
  const prisma: any = {
    workspaceWebhook: {
      findMany: jest.fn().mockResolvedValue([HOOK]),
      findUnique: jest.fn().mockResolvedValue(HOOK),
      update: jest.fn().mockResolvedValue({}),
    },
    webhookDelivery: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(ROW),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
    },
  };
  return { prisma, svc: new WebhooksService(prisma, {} as any) };
}

const flush = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  (axios.post as jest.Mock).mockReset().mockResolvedValue({ status: 200 });
  (assertPublicHost as jest.Mock).mockReset().mockResolvedValue(undefined);
});

describe('retry policy', () => {
  it('retries network errors, 408, 429 and 5xx only', () => {
    for (const s of [0, 408, 429, 500, 502, 503]) expect(isRetryable(s)).toBe(true);
    for (const s of [200, 301, 400, 401, 404, 410, 422]) expect(isRetryable(s)).toBe(false);
  });

  it('success, retry schedule and give-up', () => {
    const now = 1_000_000;
    expect(decideNext(1, { status: 200 }, true, now).state).toBe('SUCCESS');
    const r = decideNext(1, { status: 503 }, true, now);
    expect(r.state).toBe('RETRYING');
    expect(r.nextRetryAt!.getTime()).toBe(now + RETRY_DELAYS_MS[0]);
    expect(decideNext(3, { status: 0 }, true, now).nextRetryAt!.getTime()).toBe(now + RETRY_DELAYS_MS[2]);
    expect(decideNext(MAX_ATTEMPTS, { status: 500 }, true, now).state).toBe('FAILED');
    expect(decideNext(1, { status: 404 }, true, now).state).toBe('FAILED');
    expect(decideNext(1, { status: 500 }, false, now).state).toBe('FAILED');
    expect(decideNext(1, { status: 0, permanent: true }, true, now).state).toBe('FAILED');
  });
});

describe('delivery log', () => {
  it('a delivered event is logged as SUCCESS with its body', async () => {
    const { svc, prisma } = build();
    await svc.dispatch('w1', 'post.published', { postId: 'p1' });
    await flush();
    const data = prisma.webhookDelivery.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ webhookId: 'h1', workspaceId: 'w1', event: 'post.published', state: 'SUCCESS', attempts: 1, status: 200, nextRetryAt: null });
    expect(JSON.parse(data.body).id).toBe(data.id);
  });

  it('a 500 is logged as RETRYING with a next retry time', async () => {
    const { svc, prisma } = build();
    (axios.post as jest.Mock).mockResolvedValue({ status: 500 });
    await svc.dispatch('w1', 'post.published', {});
    await flush();
    const data = prisma.webhookDelivery.create.mock.calls[0][0].data;
    expect(data.state).toBe('RETRYING');
    expect(data.nextRetryAt).toBeInstanceOf(Date);
  });

  it('a 404 fails at once and a blocked host is never retried', async () => {
    const a = build();
    (axios.post as jest.Mock).mockResolvedValue({ status: 404 });
    await a.svc.dispatch('w1', 'post.published', {});
    await flush();
    expect(a.prisma.webhookDelivery.create.mock.calls[0][0].data.state).toBe('FAILED');

    const b = build();
    (assertPublicHost as jest.Mock).mockRejectedValueOnce(new Error('Blocked'));
    await b.svc.dispatch('w1', 'post.published', {});
    await flush();
    expect(b.prisma.webhookDelivery.create.mock.calls[0][0].data.state).toBe('FAILED');
  });

  it('a failed test ping is logged but never retried', async () => {
    const { svc, prisma } = build();
    (axios.post as jest.Mock).mockResolvedValue({ status: 500 });
    await svc.sendTest('w1', 'h1');
    expect(prisma.webhookDelivery.create.mock.calls[0][0].data.state).toBe('FAILED');
  });

  it('a logging failure never breaks delivery', async () => {
    const { svc, prisma } = build();
    prisma.webhookDelivery.create.mockRejectedValue(new Error('no table'));
    await expect(svc.sendTest('w1', 'h1')).resolves.toEqual({ delivered: true, status: 200 });
  });
});

describe('retry worker', () => {
  it('resends the same id and body, then marks the delivery SUCCESS', async () => {
    const { svc, prisma } = build();
    prisma.webhookDelivery.findMany.mockResolvedValue([ROW]);
    await svc.processRetries();
    const [, body, cfg] = (axios.post as jest.Mock).mock.calls[0];
    expect(body).toBe(ROW.body);
    expect(cfg.headers['X-EWork-Delivery']).toBe('evt_abc');
    expect(cfg.headers['X-EWork-Attempt']).toBe('2');
    expect(cfg.headers['X-EWork-Timestamp']).toBe('2026-11-19T10:00:00.000Z');
    expect(prisma.webhookDelivery.update).toHaveBeenCalledWith({
      where: { id: 'evt_abc' },
      data: expect.objectContaining({ state: 'SUCCESS', attempts: 2, status: 200, nextRetryAt: null }),
    });
  });

  it('schedules another retry on failure and gives up on the last attempt', async () => {
    const a = build();
    (axios.post as jest.Mock).mockResolvedValue({ status: 502 });
    a.prisma.webhookDelivery.findMany.mockResolvedValue([ROW]);
    await a.svc.processRetries();
    expect(a.prisma.webhookDelivery.update.mock.calls[0][0].data.state).toBe('RETRYING');

    const b = build();
    b.prisma.webhookDelivery.findMany.mockResolvedValue([{ ...ROW, attempts: MAX_ATTEMPTS - 1 }]);
    await b.svc.processRetries();
    expect(b.prisma.webhookDelivery.update.mock.calls[0][0].data.state).toBe('FAILED');
  });

  it('skips a row another worker already claimed', async () => {
    const { svc, prisma } = build();
    prisma.webhookDelivery.findMany.mockResolvedValue([ROW]);
    prisma.webhookDelivery.updateMany.mockResolvedValue({ count: 0 });
    await svc.processRetries();
    expect(axios.post).not.toHaveBeenCalled();
    expect(prisma.webhookDelivery.update).not.toHaveBeenCalled();
  });

  it('stops retrying when the webhook was deleted or disabled', async () => {
    const { svc, prisma } = build();
    prisma.webhookDelivery.findMany.mockResolvedValue([ROW]);
    prisma.workspaceWebhook.findUnique.mockResolvedValue({ ...HOOK, enabled: false });
    await svc.processRetries();
    expect(axios.post).not.toHaveBeenCalled();
    expect(prisma.webhookDelivery.update.mock.calls[0][0].data.state).toBe('FAILED');
  });

  it('does nothing when the table is missing', async () => {
    const { svc, prisma } = build();
    prisma.webhookDelivery.findMany.mockRejectedValue(new Error('no table'));
    await expect(svc.processRetries()).resolves.toBeUndefined();
  });

  it('purges deliveries older than 14 days', async () => {
    const { svc, prisma } = build();
    await svc.purgeOldDeliveries();
    const cutoff = prisma.webhookDelivery.deleteMany.mock.calls[0][0].where.createdAt.lt as Date;
    const days = (Date.now() - cutoff.getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(13.9);
    expect(days).toBeLessThan(14.1);
  });
});

describe('listDeliveries / redeliver', () => {
  it('lists only for the right workspace and never selects the body', async () => {
    const { svc, prisma } = build();
    await svc.listDeliveries('w1', 'h1', 500);
    const q = prisma.webhookDelivery.findMany.mock.calls[0][0];
    expect(q.where).toEqual({ webhookId: 'h1', workspaceId: 'w1' });
    expect(q.take).toBe(100);
    expect(q.select.body).toBeUndefined();
    await expect(svc.listDeliveries('other', 'h1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('resend uses the same id and body, and records the result', async () => {
    const { svc, prisma } = build();
    prisma.webhookDelivery.findFirst.mockResolvedValue({ ...ROW, state: 'FAILED' });
    await expect(svc.redeliver('w1', 'h1', 'evt_abc')).resolves.toEqual({ delivered: true, status: 200 });
    expect((axios.post as jest.Mock).mock.calls[0][1]).toBe(ROW.body);
    expect(prisma.webhookDelivery.update.mock.calls[0][0].data).toMatchObject({ state: 'SUCCESS', attempts: 2 });
  });

  it('refuses a delivery that is still retrying, another workspace, or an unknown id', async () => {
    const a = build();
    await expect(a.svc.redeliver('w1', 'h1', 'evt_abc')).rejects.toBeInstanceOf(BadRequestException);
    await expect(a.svc.redeliver('other', 'h1', 'evt_abc')).rejects.toBeInstanceOf(NotFoundException);
    const b = build();
    b.prisma.webhookDelivery.findFirst.mockResolvedValue(null);
    await expect(b.svc.redeliver('w1', 'h1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
    expect(axios.post).not.toHaveBeenCalled();
  });
});
