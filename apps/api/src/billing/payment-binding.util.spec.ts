import { paymentBelongsToWorkspace } from './payment-binding.util';

describe('paymentBelongsToWorkspace', () => {
  it('accepts a payment stamped with the same workspace', () => {
    expect(paymentBelongsToWorkspace({ workspaceId: 'w1', userId: 'u1' }, 'w1')).toBe(true);
  });

  it('accepts metadata that came back as a JSON string', () => {
    expect(paymentBelongsToWorkspace(JSON.stringify({ workspaceId: 'w1' }), 'w1')).toBe(true);
  });

  it('refuses a payment made for a different workspace', () => {
    expect(paymentBelongsToWorkspace({ workspaceId: 'w2' }, 'w1')).toBe(false);
  });

  it('refuses missing, empty or malformed metadata', () => {
    for (const bad of [undefined, null, '', 'not json', '{"workspaceId":', 42, [], {}, { workspaceId: '' }]) {
      expect(paymentBelongsToWorkspace(bad as any, 'w1')).toBe(false);
    }
  });

  it('refuses when the requested workspace id is empty', () => {
    expect(paymentBelongsToWorkspace({ workspaceId: '' }, '')).toBe(false);
    expect(paymentBelongsToWorkspace({ workspaceId: 'w1' }, '')).toBe(false);
  });
});
