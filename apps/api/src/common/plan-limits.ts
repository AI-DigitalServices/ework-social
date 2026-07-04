export const PLAN_LIMITS = {
  FREE: {
    // ── Core limits ──────────────────────────────────────
    maxSocialAccounts:      3,        // Reduced from 5 — still beats Buffer free (3 channels)
    maxPostsPerMonth:       30,       // Enough to feel the scheduler; not enough to run a business
    maxTeamMembers:         1,
    maxClients:             5,        // Increased from 3 — generous enough to explore CRM
    analyticsHistoryDays:   7,

    // ── Platform access ───────────────────────────────────
    allowedPlatforms:       ['FACEBOOK', 'INSTAGRAM'],
    twitterEnabled:         false,

    // ── Scheduling ────────────────────────────────────────
    watermarkEnabled:           true,
    whiteLabelEnabled:          false,
    apiAccessEnabled:           false,
    bulkSchedulingEnabled:      false,
    perPlatformEditorEnabled:   false,
    automationEnabled:          false,

    // ── Auto-responder ────────────────────────────────────
    autoResponder:              'none' as const,
    maxAutoResponderRules:      0,

    // ── Engagement Hub (Inbox) ────────────────────────────
    inboxEnabled:               true,   // Basic inbox — view & reply
    inboxTagsEnabled:           false,  // Tags unlock at Starter
    inboxCrmLinkEnabled:        false,  // CRM link unlocks at Starter
    inboxAssignEnabled:         false,  // Assign unlocks at Growth (needs team)

    // ── AI features ───────────────────────────────────────
    aiCaptionsPerMonth:     3,          // Taste of AI — enough to show value
    aiHashtagsEnabled:      false,
    aiRewriteEnabled:       false,
    aiReplyEnabled:         false,
    aiReplyPerMonth:        0,
    aiCrmInsightsEnabled:   false,

    // ── Collaboration ─────────────────────────────────────
    clientApprovalEnabled:  false,
  },

  STARTER: {
    // ── Core limits ──────────────────────────────────────
    maxSocialAccounts:      10,
    maxPostsPerMonth:       200,
    maxTeamMembers:         1,
    maxClients:             15,       // Increased from 10 — freelancers have 10-20 clients
    analyticsHistoryDays:   30,

    // ── Platform access ───────────────────────────────────
    allowedPlatforms:       ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN'],
    twitterEnabled:         false,    // Twitter inbox = Growth upgrade hook

    // ── Scheduling ────────────────────────────────────────
    watermarkEnabled:           false,  // Watermark removed at Starter ✅
    whiteLabelEnabled:          false,
    apiAccessEnabled:           false,
    bulkSchedulingEnabled:      false,
    perPlatformEditorEnabled:   false,
    automationEnabled:          false,

    // ── Auto-responder ────────────────────────────────────
    autoResponder:              'basic' as const,  // Comments only
    maxAutoResponderRules:      5,

    // ── Engagement Hub (Inbox) ────────────────────────────
    inboxEnabled:               true,
    inboxTagsEnabled:           true,   // Tags unlock at Starter ✅
    inboxCrmLinkEnabled:        true,   // CRM link unlocks at Starter ✅
    inboxAssignEnabled:         false,  // No team members on Starter — assign stays locked

    // ── AI features ───────────────────────────────────────
    aiCaptionsPerMonth:     20,         // Increased from 5 — ~5 posts/week, actually useful
    aiHashtagsEnabled:      false,
    aiRewriteEnabled:       false,
    aiReplyEnabled:         true,
    aiReplyPerMonth:        25,         // Increased from 10 — ~1 AI reply per day
    aiCrmInsightsEnabled:   false,

    // ── Collaboration ─────────────────────────────────────
    clientApprovalEnabled:  false,      // Collaboration feature — unlocks at Growth
  },

  GROWTH: {
    // ── Core limits ──────────────────────────────────────
    maxSocialAccounts:      30,
    maxPostsPerMonth:       2000,
    maxTeamMembers:         5,
    maxClients:             999999,
    analyticsHistoryDays:   180,

    // ── Platform access ───────────────────────────────────
    allowedPlatforms:       ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TWITTER', 'TIKTOK'],
    twitterEnabled:         true,     // Twitter inbox unlocks at Growth ✅

    // ── Scheduling ────────────────────────────────────────
    watermarkEnabled:           false,
    whiteLabelEnabled:          false,
    apiAccessEnabled:           false,
    bulkSchedulingEnabled:      true,
    perPlatformEditorEnabled:   true,
    automationEnabled:          true,

    // ── Auto-responder ────────────────────────────────────
    autoResponder:              'advanced' as const, // Comments + DMs
    maxAutoResponderRules:      25,

    // ── Engagement Hub (Inbox) ────────────────────────────
    inboxEnabled:               true,
    inboxTagsEnabled:           true,
    inboxCrmLinkEnabled:        true,
    inboxAssignEnabled:         true,  // Assign unlocks at Growth ✅ (has team members)

    // ── AI features ───────────────────────────────────────
    aiCaptionsPerMonth:     100,        // Increased from 50 — enough for a team of 5
    aiHashtagsEnabled:      true,
    aiRewriteEnabled:       true,
    aiReplyEnabled:         true,
    aiReplyPerMonth:        150,        // Increased from 50 — teams handle multiple client inboxes
    aiCrmInsightsEnabled:   true,       // Moved from AGENCY_PRO — makes Growth feel complete ✅

    // ── Collaboration ─────────────────────────────────────
    clientApprovalEnabled:  true,       // Moved from AGENCY_PRO — core agency workflow ✅
  },

  AGENCY_PRO: {
    // ── Core limits ──────────────────────────────────────
    maxSocialAccounts:      100,
    maxPostsPerMonth:       10000,
    maxTeamMembers:         15,
    maxClients:             999999,
    analyticsHistoryDays:   365,

    // ── Platform access ───────────────────────────────────
    allowedPlatforms:       ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE'],
    twitterEnabled:         true,

    // ── Scheduling ────────────────────────────────────────
    watermarkEnabled:           false,
    whiteLabelEnabled:          true,   // AGENCY_PRO exclusive ✅
    apiAccessEnabled:           true,   // AGENCY_PRO exclusive ✅
    bulkSchedulingEnabled:      true,
    perPlatformEditorEnabled:   true,
    automationEnabled:          true,

    // ── Auto-responder ────────────────────────────────────
    autoResponder:              'full' as const, // All types + keyword chains
    maxAutoResponderRules:      999999,

    // ── Engagement Hub (Inbox) ────────────────────────────
    inboxEnabled:               true,
    inboxTagsEnabled:           true,
    inboxCrmLinkEnabled:        true,
    inboxAssignEnabled:         true,

    // ── AI features ───────────────────────────────────────
    aiCaptionsPerMonth:     999999,
    aiHashtagsEnabled:      true,
    aiRewriteEnabled:       true,
    aiReplyEnabled:         true,
    aiReplyPerMonth:        999999,
    aiCrmInsightsEnabled:   true,

    // ── Collaboration ─────────────────────────────────────
    clientApprovalEnabled:  true,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;
export type PlanLimitsType = typeof PLAN_LIMITS[PlanName];

export function getPlanLimits(plan: string): PlanLimitsType {
  return PLAN_LIMITS[plan as PlanName] || PLAN_LIMITS.FREE;
}

/** Human-readable plan name for error messages */
export function getPlanDisplayName(plan: string): string {
  const names: Record<string, string> = {
    FREE: 'Free',
    STARTER: 'Starter',
    GROWTH: 'Growth',
    AGENCY_PRO: 'Agency Pro',
  };
  return names[plan] || plan;
}

/** Minimum plan required for a feature — used for upgrade prompts */
export const FEATURE_MIN_PLAN: Record<string, string> = {
  inboxTags:          'STARTER',
  inboxCrmLink:       'STARTER',
  inboxAssign:        'GROWTH',
  twitter:            'GROWTH',
  clientApproval:     'GROWTH',
  aiCrmInsights:      'GROWTH',
  bulkScheduling:     'GROWTH',
  teamMembers:        'GROWTH',
  whiteLabel:         'AGENCY_PRO',
  apiAccess:          'AGENCY_PRO',
};
