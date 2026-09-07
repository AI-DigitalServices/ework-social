import { Injectable } from '@nestjs/common';
import { AssetsService } from '../../assets/assets.service';
import { AgentTool } from './tool.interface';

/**
 * Read-only. Gives the agent eyes on the Creative Hub library so it can attach
 * a real brand asset to a draft instead of describing one. Wraps the existing
 * semantic search() — no new data path.
 */
@Injectable()
export class SearchAssetsTool implements AgentTool {
  name = 'search_assets';
  description =
    'Read-only. Search the Creative Hub asset library by meaning (logos, product shots, brand graphics, ' +
    'videos). Use this to find an existing on-brand asset to attach to a draft rather than describing one. ' +
    'Returns matching assets with their url, kind, filename, and tags — put an asset url in draft_post\'s mediaUrls.';
  input_schema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'What to look for, e.g. "company logo", "blue summer sale graphic", "team photo".',
      },
      limit: { type: 'number', description: 'Max assets to return. Default 8.' },
    },
    required: ['query'],
  };

  constructor(private assets: AssetsService) {}

  async execute(workspaceId: string, input: any) {
    const results = (await this.assets.search(workspaceId, input.query || '', input.limit || 8)) as any[];
    return results.map((a) => ({
      id: a.id,
      kind: a.kind,
      url: a.url,
      fileName: a.fileName,
      tags: a.tags,
    }));
  }
}
