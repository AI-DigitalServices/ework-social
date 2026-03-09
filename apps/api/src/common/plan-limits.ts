export const PLAN_LIMITS = {
  FREE: {
    maxSocialAccounts: 2,
    maxPostsPerMonth: 15,
    maxTeamMembers: 1,
    maxClients: 3,
    analyticsHistoryDays: 7,
    watermarkEnabled: true,
    whiteLabelEnabled: false,
    apiAccessEnabled: false,
    bulkSchedulingEnabled: false,
    perPlatformEditorEnabled: false,
    autoResponder: 'none' as const,
    allowedPlatforms: ['FACEBOOK', 'INSTAGRAM'],
    twitterEnabled: false,
  },
  STARTER: {
    maxSocialAccounts: 5,
    maxPostsPerMonth: 100,
    maxTeamMembers: 1,
    maxClients: 10,
    analyticsHistoryDays: 30,
    watermarkEnabled: false,
    whiteLabelEnabled: false,
    apiAccessEnabled: false,
    bulkSchedulingEnabled: false,
    perPlatformEditorEnabled: false,
    autoResponder: 'basic' as const,
    allowedPlatforms: ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN'],
    twitterEnabled: false,
  },
  GROWTH: {
    maxSocialAccounts: 15,
    maxPostsPerMonth: 500,
    maxTeamMembers: 5,
    maxClients: 999999,
    analyticsHistoryDays: 180,
    watermarkEnabled: false,
    whiteLabelEnabled: false,
    apiAccessEnabled: false,
    bulkSchedulingEnabled: true,
    perPlatformEditorEnabled: true,
    autoResponder: 'advanced' as const,
    allowedPlatforms: ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TWITTER', 'TIKTOK'],
    twitterEnabled: true,
  },
  AGENCY_PRO: {
    maxSocialAccounts: 50,
    maxPostsPerMonth: 999999,
    maxTeamMembers: 15,
    maxClients: 999999,
    analyticsHistoryDays: 365,
    watermarkEnabled: false,
    whiteLabelEnabled: true,
    apiAccessEnabled: true,
    bulkSchedulingEnabled: true,
    perPlatformEditorEnabled: true,
    autoResponder: 'full' as const,
    allowedPlatforms: ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE'],
    twitterEnabled: true,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;
export type PlanLimitsType = typeof PLAN_LIMITS[PlanName];

export function getPlanLimits(plan: string): PlanLimitsType {
  return PLAN_LIMITS[plan as PlanName] || PLAN_LIMITS.FREE;
}
