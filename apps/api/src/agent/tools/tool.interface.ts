/**
 * Contract every Tool Registry entry must satisfy.
 *
 * Tools are the ONLY way the agent touches real data or services — the model
 * never gets direct database or credential access. Read-only tools (analytics,
 * inbox search) can execute freely; the one mutating tool in Phase 1
 * (draft_post) enforces its own safety rules independent of the caller
 * (see draft-post.tool.ts) as defense in depth against a bad prompt or a
 * bug in the orchestrator loop.
 */
export interface AgentToolContext {
  campaignId?: string;
}

export interface AgentTool {
  /** Must match the name the model is given in the Anthropic tool definition. */
  name: string;
  description: string;
  /** JSON schema, passed straight through as the Anthropic tool's input_schema. */
  input_schema: Record<string, any>;
  execute(workspaceId: string, input: any, ctx: AgentToolContext): Promise<any>;
}
