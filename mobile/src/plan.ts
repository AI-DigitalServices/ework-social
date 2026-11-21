/** Where a person goes to pick or reactivate a plan (the website's plan page). */
export const PLAN_URL = 'https://app.eworksocial.com/dashboard/settings?tab=plan';

/** The API sends a code when a workspace is read only. This turns it into words a person can act on. */
export function readOnlyInfo(reason: string | null | undefined): { title: string; text: string } {
  switch (reason) {
    case 'TRIAL_EXPIRED':
      return {
        title: 'Your free trial has ended',
        text: 'Choose a plan to keep publishing. Your clients, posts and settings are all still here.',
      };
    case 'SUBSCRIPTION_ENDED':
      return {
        title: 'Your subscription has ended',
        text: 'Reactivate a plan to keep publishing. Nothing has been deleted.',
      };
    case 'NO_SUBSCRIPTION':
      return { title: 'No plan yet', text: 'Choose a plan to start publishing.' };
    default:
      return { title: 'Read only for now', text: reason || 'This workspace is read only right now.' };
  }
}
