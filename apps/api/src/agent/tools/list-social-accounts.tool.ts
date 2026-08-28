import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentTool, AgentToolContext } from './tool.interface';

/**
 * Read-only. draft_post requires a real socialAccountId, not a platform
 * name — the model has no other way to discover which connected account
 * corresponds to FACEBOOK/INSTAGRAM/etc. for this workspace. Without this
 * tool the model would either guess an id (unsafe) or give up and describe
 * the post in prose instead of actually calling draft_post (observed in
 * testing 2026-08-28 — a 4-platform brief produced zero drafts because the
 * model had no way to resolve account ids).
 */
@Injectable()
export class ListSocialAccountsTool implements AgentTool {
  name = 'list_social_accounts';
  description =
    'List every connected social account for this workspace — id, platform, and account name. ' +
    'Call this before draft_post whenever you do not already know the socialAccountId for the ' +
    'platform you want to draft for. Only accounts returned here can be used with draft_post.';
  input_schema = {
    type: 'object',
    properties: {},
  };

  constructor(private prisma: PrismaService) {}

  async execute(workspaceId: string, _input: any, _ctx: AgentToolContext) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, platform: true, accountName: true },
    });
    return { accounts };
  }
}
