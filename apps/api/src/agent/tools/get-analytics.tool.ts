import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '../../analytics/analytics.service';
import { AgentTool } from './tool.interface';

/** Read-only. Lets the agent ground its proposals in the workspace's real numbers. */
@Injectable()
export class GetAnalyticsTool implements AgentTool {
  name = 'get_analytics';
  description =
    'Read-only. Returns current dashboard stats for the workspace: post counts, client counts, ' +
    'connected social accounts, team size, and active automation rules. Use this before proposing ' +
    'a campaign strategy to ground it in the workspace\'s real numbers.';
  input_schema = {
    type: 'object',
    properties: {},
    required: [],
  };

  constructor(private analytics: AnalyticsService) {}

  async execute(workspaceId: string) {
    return this.analytics.getDashboardStats(workspaceId);
  }
}
