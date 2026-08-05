import { Injectable } from '@nestjs/common';
import { DraftPostTool } from './draft-post.tool';
import { GetAnalyticsTool } from './get-analytics.tool';
import { SearchInboxTool } from './search-inbox.tool';
import { AgentTool, AgentToolContext } from './tool.interface';

/**
 * Tool Registry v1 — the single boundary between the model and everything
 * else. The orchestrator only ever calls execute() by name; it never touches
 * PrismaService, SchedulerService, etc. directly. Add new tools here as
 * Phase 1 grows (three to start: draft_post, get_analytics, search_inbox).
 */
@Injectable()
export class ToolRegistryService {
  private tools = new Map<string, AgentTool>();

  constructor(
    draftPost: DraftPostTool,
    getAnalytics: GetAnalyticsTool,
    searchInbox: SearchInboxTool,
  ) {
    for (const tool of [draftPost, getAnalytics, searchInbox]) {
      this.tools.set(tool.name, tool);
    }
  }

  /** Anthropic-shaped tool definitions for the messages.create() call. */
  getAnthropicToolDefs() {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));
  }

  async execute(name: string, workspaceId: string, input: any, ctx: AgentToolContext = {}) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return tool.execute(workspaceId, input, ctx);
  }
}
