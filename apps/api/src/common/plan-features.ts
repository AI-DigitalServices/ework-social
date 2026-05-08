/**
 * Plan-based feature gating for eWork Social.
 *
 * Each feature key maps to the minimum Plan tier required to access it.
 * Plans rank: FREE(0) < STARTER(1) < GROWTH(2) < AGENCY_PRO(3)
 */

export const PLAN_RANK: Record<string, number> = {
  FREE: 0,
  STARTER: 1,
  GROWTH: 2,
  AGENCY_PRO: 3,
};

export type PlanFeatureKey =
  // Scheduling
  | 'schedule_posts'
  | 'bulk_schedule'
  | 'schedule_reels'
  // Social Accounts
  | 'connect_social_accounts'    // max defined in PLAN_LIMITS
  // Auto-Responder
  | 'auto_responder'
  | 'auto_responder_rules'       // max defined in PLAN_LIMITS
  // CRM
  | 'crm_basic'                  // view & manage contacts (name, email, phone, stage, tags)
  | 'crm_full'                   // deal value, company, next follow-up, source
  | 'crm_pipeline'               // Kanban pipeline view
  | 'crm_activity_log'           // activity history per contact
  | 'crm_assign'                 // assign contacts to team members
  | 'crm_contact_enrichment'     // auto-enrich from Instagram/FB profile
  | 'crm_export'                 // CSV export
  // Analytics
  | 'analytics_basic'
  | 'analytics_advanced'
  // Team
  | 'team_members'               // max defined in PLAN_LIMITS
  | 'workspace_clients'          // max defined in PLAN_LIMITS
  // Automation
  | 'automation_rules'
  // AI
  | 'ai_caption'
  | 'ai_hashtag';

/** Minimum plan required for each feature */
export const PLAN_FEATURES: Record<PlanFeatureKey, string> = {
  // Free tier
  schedule_posts:           'FREE',
  connect_social_accounts:  'FREE',
  crm_basic:                'FREE',
  analytics_basic:          'FREE',

  // Starter tier
  auto_responder:           'STARTER',
  auto_responder_rules:     'STARTER',
  ai_caption:               'STARTER',
  ai_hashtag:               'STARTER',
  bulk_schedule:            'STARTER',
  schedule_reels:           'STARTER',

  // Growth tier
  crm_full:                 'GROWTH',
  crm_pipeline:             'GROWTH',
  crm_activity_log:         'GROWTH',
  crm_contact_enrichment:   'GROWTH',
  crm_export:               'GROWTH',
  analytics_advanced:       'GROWTH',
  automation_rules:         'GROWTH',
  team_members:             'GROWTH',

  // Agency Pro tier
  crm_assign:               'AGENCY_PRO',
  workspace_clients:        'AGENCY_PRO',
};

/** Hard limits per plan */
export const PLAN_LIMITS: Record<string, Record<string, number>> = {
  FREE: {
    social_accounts:       2,
    scheduled_posts_month: 30,
    auto_responder_rules:  0,
    crm_contacts:          25,
    team_members:          1,
    workspaces:            1,
  },
  STARTER: {
    social_accounts:       5,
    scheduled_posts_month: 150,
    auto_responder_rules:  3,
    crm_contacts:          100,
    team_members:          1,
    workspaces:            1,
  },
  GROWTH: {
    social_accounts:       10,
    scheduled_posts_month: 500,
    auto_responder_rules:  10,
    crm_contacts:          500,
    team_members:          5,
    workspaces:            3,
  },
  AGENCY_PRO: {
    social_accounts:       -1,   // unlimited
    scheduled_posts_month: -1,
    auto_responder_rules:  -1,
    crm_contacts:          -1,
    team_members:          -1,
    workspaces:            -1,
  },
};

/** Check if a plan has access to a feature */
export function planHasFeature(plan: string, feature: PlanFeatureKey): boolean {
  const required = PLAN_FEATURES[feature];
  if (!required) return false;
  return PLAN_RANK[plan] >= PLAN_RANK[required];
}

/** Check if a plan is within a numeric limit (returns true if unlimited or under limit) */
export function planWithinLimit(plan: string, limitKey: string, currentCount: number): boolean {
  const limits = PLAN_LIMITS[plan];
  if (!limits) return false;
  const limit = limits[limitKey];
  if (limit === undefined) return false;
  if (limit === -1) return true; // unlimited
  return currentCount < limit;
}

/** Get the limit value for a plan (-1 = unlimited) */
export function getPlanLimit(plan: string, limitKey: string): number {
  return PLAN_LIMITS[plan]?.[limitKey] ?? 0;
}
