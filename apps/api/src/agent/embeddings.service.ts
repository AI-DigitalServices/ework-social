import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Embeddings provider abstraction for semantic Brand Brain memory.
 *
 * Platform default is Voyage AI (Anthropic's recommended embeddings partner).
 * A per-workspace "bring your own key" (BYOK) override slots in via
 * resolveProvider() — that method currently returns the platform key, and the
 * BYOK Integrations feature will later have it read an encrypted workspace key
 * first. All calls go over plain HTTPS (axios) so there is no new npm package.
 *
 * Everything here is best-effort: if no key is configured, or the provider
 * errors, embed() returns null and callers fall back to keyword memory. That
 * keeps the whole feature safe to deploy before the pgvector column even exists.
 */
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  /** Fixed vector width across all providers so one pgvector column works for
   *  everyone. Voyage/OpenAI/Cohere can all emit 1024 dims. */
  readonly DIM = 1024;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  /** True when at least a platform embeddings key exists. */
  isConfigured(): boolean {
    return !!this.config.get<string>('VOYAGE_API_KEY');
  }

  /**
   * Resolves which provider/key to use for a workspace. Today: platform Voyage.
   * BYOK will extend this to read an encrypted per-workspace key + provider.
   */
  private async resolveProvider(_workspaceId: string): Promise<
    { provider: 'voyage'; key: string; model: string } | null
  > {
    const key = this.config.get<string>('VOYAGE_API_KEY');
    if (key) {
      // voyage-3.5-lite defaults to 1024 dims and is the cheapest current model.
      return { provider: 'voyage', key, model: this.config.get<string>('VOYAGE_MODEL') || 'voyage-3.5-lite' };
    }
    return null;
  }

  /**
   * Embed a single string. inputType tunes retrieval quality: 'document' for
   * stored memories, 'query' for the campaign brief we search with.
   * Returns { vector, model } or null (→ caller uses keyword fallback).
   */
  async embed(
    workspaceId: string,
    text: string,
    inputType: 'document' | 'query' = 'document',
  ): Promise<{ vector: number[]; model: string } | null> {
    const clean = (text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return null;

    const resolved = await this.resolveProvider(workspaceId);
    if (!resolved) return null;

    try {
      if (resolved.provider === 'voyage') {
        const res = await axios.post(
          'https://api.voyageai.com/v1/embeddings',
          {
            input: [clean.slice(0, 8000)],
            model: resolved.model,
            input_type: inputType,
            output_dimension: this.DIM,
          },
          {
            headers: { Authorization: `Bearer ${resolved.key}`, 'Content-Type': 'application/json' },
            timeout: 20000,
          },
        );
        const vector = res.data?.data?.[0]?.embedding;
        if (!Array.isArray(vector) || vector.length !== this.DIM) {
          this.logger.warn(`Voyage returned unexpected embedding shape (len=${vector?.length}).`);
          return null;
        }
        return { vector, model: `voyage:${resolved.model}` };
      }
      return null;
    } catch (err: any) {
      this.logger.error(
        `Embedding failed (${resolved.provider}): ${err?.response?.data ? JSON.stringify(err.response.data) : err.message}`,
      );
      return null;
    }
  }

  /** pgvector literal, e.g. "[0.1,0.2,...]". */
  toVectorLiteral(vector: number[]): string {
    return `[${vector.join(',')}]`;
  }

  /**
   * Best-effort: write an embedding onto an existing WorkspaceMemory row via
   * raw SQL (the pgvector column isn't in the Prisma schema). Never throws —
   * a missing column or provider just means the row stays keyword-only.
   */
  async storeEmbedding(memoryId: string, workspaceId: string, text: string): Promise<void> {
    const emb = await this.embed(workspaceId, text, 'document');
    if (!emb) return;
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "WorkspaceMemory" SET embedding = $1::vector, "embeddingModel" = $2 WHERE id = $3`,
        this.toVectorLiteral(emb.vector),
        emb.model,
        memoryId,
      );
    } catch (err: any) {
      this.logger.warn(`storeEmbedding skipped (pgvector column not ready?): ${err.message}`);
    }
  }
}
