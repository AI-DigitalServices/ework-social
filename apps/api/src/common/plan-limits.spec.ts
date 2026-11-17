import {
  PLAN_LIMITS,
  FEATURE_MIN_PLAN,
  TRIAL_AGENT_ACTIONS,
  getAgentActionLimit,
  getAutopilotCadences,
  resolveAutopilotCadence,
} from './plan-limits';

describe('plan limits: Growth agent cap and Autopilot cadence', () => {
  it('caps Growth at 20 agent runs a month and leaves the upper tiers unlimited', () => {
    expect(PLAN_LIMITS.GROWTH.agentActionsPerMonth).toBe(20);
    expect(PLAN_LIMITS.AGENCY_PRO.agentActionsPerMonth).toBe(999999);
    expect(PLAN_LIMITS.ENTERPRISE.agentActionsPerMonth).toBe(999999);
    expect(PLAN_LIMITS.FREE.agentActionsPerMonth).toBe(0);
    expect(PLAN_LIMITS.STARTER.agentActionsPerMonth).toBe(0);
  });

  it('gives Growth weekly Autopilot only', () => {
    expect(PLAN_LIMITS.GROWTH.autopilotEnabled).toBe(true);
    expect(getAutopilotCadences('GROWTH')).toEqual(['weekly']);
    expect(FEATURE_MIN_PLAN.autopilot).toBe('GROWTH');
  });

  it('gives Agency Pro and Enterprise daily and weekly, and the lower tiers nothing', () => {
    expect(getAutopilotCadences('AGENCY_PRO')).toEqual(['daily', 'weekly']);
    expect(getAutopilotCadences('ENTERPRISE')).toEqual(['daily', 'weekly']);
    expect(getAutopilotCadences('STARTER')).toEqual([]);
    expect(getAutopilotCadences('FREE')).toEqual([]);
    expect(getAutopilotCadences('NOT_A_PLAN')).toEqual([]);
  });

  it('resolves a requested cadence against the plan', () => {
    expect(resolveAutopilotCadence('GROWTH', 'weekly')).toBe('weekly');
    expect(resolveAutopilotCadence('GROWTH', 'daily')).toBeNull();
    expect(resolveAutopilotCadence('AGENCY_PRO', 'daily')).toBe('daily');
    expect(resolveAutopilotCadence('AGENCY_PRO', 'weekly')).toBe('weekly');
    expect(resolveAutopilotCadence('STARTER', 'weekly')).toBeNull();
  });

  it('defaults to the fastest cadence the plan allows when none is requested', () => {
    expect(resolveAutopilotCadence('GROWTH')).toBe('weekly');
    expect(resolveAutopilotCadence('GROWTH', null)).toBe('weekly');
    expect(resolveAutopilotCadence('GROWTH', 'hourly')).toBe('weekly');
    expect(resolveAutopilotCadence('AGENCY_PRO')).toBe('daily');
    expect(resolveAutopilotCadence('FREE')).toBeNull();
  });

  it('tightens the agent-run cap during a trial, and never raises it', () => {
    expect(TRIAL_AGENT_ACTIONS).toBe(5);
    expect(getAgentActionLimit('GROWTH', true)).toBe(5);
    expect(getAgentActionLimit('GROWTH', false)).toBe(20);
    expect(getAgentActionLimit('AGENCY_PRO', false)).toBe(999999);
    expect(getAgentActionLimit('FREE', true)).toBe(0);
  });
});
