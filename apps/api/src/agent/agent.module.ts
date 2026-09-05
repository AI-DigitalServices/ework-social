import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { BrandBrainService } from './brand-brain.service';
import { EmbeddingsService } from './embeddings.service';
import { ToolRegistryService } from './tools/tool-registry.service';
import { DraftPostTool } from './tools/draft-post.tool';
import { GetAnalyticsTool } from './tools/get-analytics.tool';
import { SearchInboxTool } from './tools/search-inbox.tool';
import { ListSocialAccountsTool } from './tools/list-social-accounts.tool';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { InboxModule } from '../inbox/inbox.module';

// AI Operating System (Phase 1) — additive module, off by default per
// workspace (Workspace.agentEnabled). See AI_OS_Blueprint for the full
// design; this is the orchestrator + Tool Registry v1 (3 tools), shadow
// mode only, no auto-publish anywhere in this module.
@Module({
  imports: [CommonModule, AuthModule, AiModule, SchedulerModule, AnalyticsModule, InboxModule],
  controllers: [AgentController],
  providers: [AgentService, BrandBrainService, EmbeddingsService, ToolRegistryService, DraftPostTool, GetAnalyticsTool, SearchInboxTool, ListSocialAccountsTool],
  exports: [AgentService],
})
export class AgentModule {}
