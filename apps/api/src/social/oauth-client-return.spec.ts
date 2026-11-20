import { buildClientReturnUrl, buildOAuthReturnUrl } from './oauth-state.util';

describe('buildClientReturnUrl', () => {
  const web = 'https://app.eworksocial.com';

  it('sends app sign-ins to the app return address with the result appended', () => {
    expect(buildClientReturnUrl('app', web, 'success=connected', 'eworksocial://oauth-return')).toBe(
      'eworksocial://oauth-return?success=connected',
    );
  });

  it('sends web sign-ins to the dashboard, exactly as before', () => {
    expect(buildClientReturnUrl('web', web, 'error=failed', 'eworksocial://oauth-return')).toBe(
      'https://app.eworksocial.com/dashboard/settings?tab=social&error=failed',
    );
  });

  it('falls back to the dashboard when the app return address is missing or unsafe', () => {
    for (const bad of [undefined, '', 'javascript://x', 'http://evil.test']) {
      expect(buildClientReturnUrl('app', web, 'success=connected', bad)).toBe(
        'https://app.eworksocial.com/dashboard/settings?tab=social&success=connected',
      );
    }
  });

  it('keeps buildOAuthReturnUrl behaving the same for states that do not say app', () => {
    expect(buildOAuthReturnUrl('not-a-state', web, 'error=cancelled', 'eworksocial://oauth-return')).toBe(
      'https://app.eworksocial.com/dashboard/settings?tab=social&error=cancelled',
    );
  });
});
