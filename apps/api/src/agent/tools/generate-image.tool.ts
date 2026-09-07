import { Injectable } from '@nestjs/common';
import { AssetsService } from '../../assets/assets.service';
import { AgentTool } from './tool.interface';

/**
 * Creates a NEW on-brand image and saves it to the Creative Hub, returning its
 * url for the agent to attach to a draft. Costs one image-generation credit
 * (metered + plan-gated inside AssetsService), so the prompt tells the model to
 * use it sparingly and to prefer search_assets first.
 */
@Injectable()
export class GenerateImageTool implements AgentTool {
  name = 'generate_image';
  description =
    'Create a NEW image from a text prompt and save it to the Creative Hub, returning its url. ' +
    'Use ONLY when search_assets finds no suitable existing asset and the post clearly benefits from a ' +
    'visual. Put the returned url in draft_post.mediaUrls. This costs an image-generation credit, so use ' +
    'it at most once or twice per run, and write a detailed, on-brand prompt.';
  input_schema = {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'A detailed, on-brand description of the image to generate.',
      },
      size: {
        type: 'string',
        description: 'Aspect: 1024x1024 (default), 1024x1536 (portrait), or 1536x1024 (landscape).',
      },
    },
    required: ['prompt'],
  };

  constructor(private assets: AssetsService) {}

  async execute(workspaceId: string, input: any) {
    return this.assets.generateAndStoreImage(workspaceId, input.prompt, input.size);
  }
}
