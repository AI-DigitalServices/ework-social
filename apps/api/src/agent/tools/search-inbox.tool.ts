import { Injectable } from '@nestjs/common';
import { InboxService } from '../../inbox/inbox.service';
import { AgentTool } from './tool.interface';

/** Read-only. Lets the agent check recent audience engagement before proposing content. */
@Injectable()
export class SearchInboxTool implements AgentTool {
  name = 'search_inbox';
  description =
    'Read-only. Search the Engagement Hub inbox (comments and DMs) for this workspace. Use this to ' +
    'understand audience sentiment or find recent engagement before proposing content.';
  input_schema = {
    type: 'object',
    properties: {
      platform: {
        type: 'string',
        description: 'Filter by platform, e.g. FACEBOOK, INSTAGRAM, LINKEDIN, TWITTER.',
      },
      search: {
        type: 'string',
        description: 'Free-text search across message content and sender name.',
      },
      limit: {
        type: 'number',
        description: 'Max messages to return. Default 10.',
      },
    },
    required: [],
  };

  constructor(private inbox: InboxService) {}

  async execute(workspaceId: string, input: any) {
    return this.inbox.getMessages(workspaceId, {
      platform: input.platform,
      search: input.search,
      limit: input.limit || 10,
      page: 1,
    });
  }
}
