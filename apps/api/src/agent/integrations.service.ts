import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingsService, EmbeddingProvider } from './embeddings.service';
import { BrandBrainService } from './brand-brain.service';

/**
 * BYOK (bring-your-own-key) integrations for AI providers. A subscriber can
 * connect their own Voyage/OpenAI key; the embeddings layer then prefers it
 * over the platform key. Keys are validated before saving, stored encrypted
 * (AES-256, same scheme as social tokens) in raw Workspace columns, and never
 * returned to the client.
 */
@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private prisma: PrismaService,
    private embeddings: EmbeddingsService,
    private brandBrain: BrandBrainService,
  ) {}

  async getStatus(workspaceId: string) {
    let provider: string | null = null;
    let connected = false;
    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<{ p: string | null; k: string | null }>>(
        `SELECT "embeddingProvider" AS p, "embeddingApiKeyEnc" AS k FROM "Workspace" WHERE id = $1`,
        workspaceId,
      );
      const row = rows?.[0];
      if (row?.p && row?.k) {
        provider = row.p;
        connected = true;
      }
    } catch {
      // columns not created yet
    }
    return {
      connected,
      provider,
      platformFallback: this.embeddings.isConfigured(),
      activeSource: connected ? 'workspace' : this.embeddings.isConfigured() ? 'platform' : 'none',
    };
  }

  async connect(workspaceId: string, provider: string, apiKey: string) {
    if (provider !== 'voyage' && provider !== 'openai') {
      throw new BadRequestException('provider must be "voyage" or "openai".');
    }
    if (!apiKey?.trim()) throw new BadRequestException('apiKey is required.');

    // Validate before storing — a bad key should never be saved.
    try {
      await this.embeddings.testKey(provider as EmbeddingProvider, apiKey.trim());
    } catch (err: any) {
      throw new BadRequestException(`${provider} rejected the key: ${err.message}`);
    }

    const enc = this.embeddings.encrypt(apiKey.trim());
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "Workspace" SET "embeddingProvider" = $1, "embeddingApiKeyEnc" = $2 WHERE id = $3`,
        provider,
        enc,
        workspaceId,
      );
    } catch (err: any) {
      this.logger.error(`connect() failed to persist key: ${err.message}`);
      throw new BadRequestException(
        'Integrations storage is not initialized. Run the Workspace embeddingProvider/embeddingApiKeyEnc column migration on the database first.',
      );
    }

    // Old embeddings were made with a different provider/model — re-embed so
    // semantic retrieval works against the new key immediately.
    const re = await this.brandBrain.reembedAll(workspaceId);
    this.logger.log(`Workspace ${workspaceId} connected BYOK provider ${provider}; re-embedded ${re.reembedded}.`);
    return { connected: true, provider, reembedded: re.reembedded };
  }

  async disconnect(workspaceId: string) {
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "Workspace" SET "embeddingProvider" = NULL, "embeddingApiKeyEnc" = NULL WHERE id = $1`,
        workspaceId,
      );
    } catch (err: any) {
      this.logger.error(`disconnect() failed: ${err.message}`);
      throw new BadRequestException('Could not disconnect — storage not initialized.');
    }
    // Fall back to the platform key: re-embed with it.
    const re = await this.brandBrain.reembedAll(workspaceId);
    return { connected: false, reembedded: re.reembedded };
  }
}
