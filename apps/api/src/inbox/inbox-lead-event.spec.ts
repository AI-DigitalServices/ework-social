import { NotFoundException } from '@nestjs/common';

jest.mock('@anthropic-ai/sdk', () => ({ __esModule: true, default: class {} }));
jest.mock('../ai/ai-usage.service', () => ({ AiUsageService: class {} }));
jest.mock('../analytics/posthog.service', () => ({ PostHogService: class {} }));
jest.mock('../webhooks/webhooks.service', () => ({ WebhooksService: class {} }));

import { InboxService } from './inbox.service';

const MSG = {
  id: 'm1', workspaceId: 'w1', platform: 'INSTAGRAM', type: 'DM', senderName: 'Ada', senderId: 'ig1',
  content: 'Hi, I need a quote for your services',
};

function build(msg: any = MSG, dispatch?: jest.Mock) {
  const prisma: any = {
    inboxMessage: {
      findUnique: jest.fn().mockResolvedValue(msg),
      update: jest.fn().mockResolvedValue({}),
    },
    client: {
      create: jest.fn().mockImplementation(async ({ data }: any) => ({
        id: 'c1', email: null, company: null, ...data,
      })),
    },
    activity: { create: jest.fn().mockResolvedValue({}) },
  };
  const webhooks: any = { dispatch: dispatch || jest.fn().mockResolvedValue(undefined) };
  const svc = new InboxService(prisma, {} as any, { capture: jest.fn() } as any, webhooks);
  return { svc, prisma, webhooks };
}

describe('InboxService.createCrmContactFromMessage', () => {
  it('fires lead.created for the new contact', async () => {
    const { svc, webhooks } = build();
    const client = await svc.createCrmContactFromMessage('m1', 'w1');
    expect(client.id).toBe('c1');
    expect(webhooks.dispatch).toHaveBeenCalledWith('w1', 'lead.created', {
      clientId: 'c1',
      name: 'Ada',
      email: null,
      company: null,
      stage: 'LEAD',
      source: 'INSTAGRAM_DM',
      platform: 'INSTAGRAM',
      inboxMessageId: 'm1',
    });
  });

  it('a message from another workspace is a 404 and nothing fires', async () => {
    const { svc, prisma, webhooks } = build({ ...MSG, workspaceId: 'OTHER' });
    await expect(svc.createCrmContactFromMessage('m1', 'w1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.client.create).not.toHaveBeenCalled();
    expect(webhooks.dispatch).not.toHaveBeenCalled();
  });

  it('a failing webhook never breaks creating the contact', async () => {
    const { svc } = build(MSG, jest.fn().mockRejectedValue(new Error('endpoint down')));
    await expect(svc.createCrmContactFromMessage('m1', 'w1')).resolves.toMatchObject({ id: 'c1' });
  });
});
