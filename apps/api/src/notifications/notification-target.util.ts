// Maps the web paths stored in Notification.link to a screen the mobile app can open.
// Pure and framework-free. Unknown links return null: the app just opens the notification list.

export interface MobileTarget {
  screen: 'home' | 'inbox' | 'approvals' | 'scheduler' | 'agent' | 'accounts' | 'settings';
}

export function toMobileTarget(link?: string | null): MobileTarget | null {
  if (!link || typeof link !== 'string') return null;

  let path: string;
  let query: string;
  try {
    const u = new URL(link.trim(), 'https://placeholder.local');
    path = u.pathname.replace(/\/+$/, '') || '/';
    query = u.search;
  } catch {
    return null;
  }

  if (path === '/dashboard') return { screen: 'home' };
  if (path.startsWith('/dashboard/inbox')) return { screen: 'inbox' };
  if (path.startsWith('/dashboard/approvals')) return { screen: 'approvals' };
  if (path.startsWith('/dashboard/scheduler')) return { screen: 'scheduler' };
  if (path.startsWith('/dashboard/agent')) return { screen: 'agent' };
  if (path.startsWith('/dashboard/settings')) {
    return /[?&]tab=social(&|$)/.test(query) ? { screen: 'accounts' } : { screen: 'settings' };
  }
  return null;
}
