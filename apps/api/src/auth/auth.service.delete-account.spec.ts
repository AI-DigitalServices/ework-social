import { AuthService } from './auth.service';

// Every model call is recorded in order, so the test can check that parents are deleted after their children.
function build() {
  const calls: string[] = [];
  const model = (name: string) =>
    new Proxy(
      {},
      {
        get: (_t, method) => (..._args: unknown[]) => {
          calls.push(`${name}.${String(method)}`);
          return `${name}.${String(method)}`;
        },
      },
    );
  const workspace = {
    findMany: jest.fn().mockResolvedValue([{ id: 'w1' }]),
    deleteMany: () => {
      calls.push('workspace.deleteMany');
      return 'workspace.deleteMany';
    },
  };
  const tx = jest.fn(async (ops: unknown[]) => ops);
  const prisma: any = new Proxy({}, { get: (_t, name) => (name === '$transaction' ? tx : name === 'workspace' ? workspace : model(String(name))) });
  const svc = new AuthService(prisma, null as any, null as any, null as any, null as any);
  return { svc, calls, tx };
}

describe('AuthService.deleteAccount', () => {
  it('runs everything in one transaction and removes the user last', async () => {
    const { svc, tx } = build();
    await svc.deleteAccount('u1');
    expect(tx).toHaveBeenCalledTimes(1);
    const ops = tx.mock.calls[0][0] as string[];
    expect(ops[ops.length - 1]).toBe('user.delete');
  });

  it('clears the tables that used to block deletion', async () => {
    const { svc, calls } = build();
    await svc.deleteAccount('u1');
    for (const c of ['aiUsage.deleteMany', 'asset.deleteMany', 'campaign.deleteMany', 'inboxMessage.deleteMany', 'workspaceWebhook.deleteMany', 'postIdea.deleteMany', 'note.deleteMany', 'task.deleteMany']) {
      expect(calls).toContain(c);
    }
  });

  it('deletes children before the rows they point at', async () => {
    const { svc, calls } = build();
    await svc.deleteAccount('u1');
    const at = (c: string) => calls.indexOf(c);
    expect(at('campaignTask.deleteMany')).toBeLessThan(at('campaign.deleteMany'));
    expect(at('post.deleteMany')).toBeLessThan(at('socialAccount.deleteMany'));
    expect(at('post.deleteMany')).toBeLessThan(at('client.deleteMany'));
    expect(at('inboxMessage.deleteMany')).toBeLessThan(at('client.deleteMany'));
    expect(at('client.deleteMany')).toBeLessThan(at('workspace.deleteMany'));
    expect(at('workspace.deleteMany')).toBeLessThan(at('user.delete'));
  });
});
