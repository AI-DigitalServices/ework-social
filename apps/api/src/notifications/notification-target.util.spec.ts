import { toMobileTarget } from './notification-target.util';

describe('toMobileTarget', () => {
  it('maps the dashboard pages to app screens', () => {
    expect(toMobileTarget('/dashboard')).toEqual({ screen: 'home' });
    expect(toMobileTarget('/dashboard/inbox')).toEqual({ screen: 'inbox' });
    expect(toMobileTarget('/dashboard/approvals')).toEqual({ screen: 'approvals' });
    expect(toMobileTarget('/dashboard/scheduler')).toEqual({ screen: 'scheduler' });
    expect(toMobileTarget('/dashboard/agent')).toEqual({ screen: 'agent' });
  });

  it('settings: the social tab means the accounts screen', () => {
    expect(toMobileTarget('/dashboard/settings?tab=social')).toEqual({ screen: 'accounts' });
    expect(toMobileTarget('/dashboard/settings?tab=social&success=connected')).toEqual({ screen: 'accounts' });
    expect(toMobileTarget('/dashboard/settings')).toEqual({ screen: 'settings' });
    expect(toMobileTarget('/dashboard/settings?tab=team')).toEqual({ screen: 'settings' });
  });

  it('handles absolute URLs and trailing slashes', () => {
    expect(toMobileTarget('https://app.eworksocial.com/dashboard/inbox/')).toEqual({ screen: 'inbox' });
  });

  it('returns null for empty, unknown or unusable links', () => {
    for (const bad of [undefined, null, '', '/somewhere/else', '/pricing', 42 as any]) {
      expect(toMobileTarget(bad as any)).toBeNull();
    }
  });
});
