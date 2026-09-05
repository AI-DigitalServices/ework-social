import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export type EmbeddingProvider = 'voyage' | 'openai' | 'gemini';

/**
 * Embeddings provider abstraction for semantic Brand Brain memory.
 *
 * Resolution order per workspace:
 *   1. The workspace's own connected key (BYOK) — their provider, their cost.
 *   2. The platform Voyage key (env) — your cost, metered by plan.
 *   3. Nothing → embed() returns null and callers use keyword memory.
 *
 * All calls go over plain HTTPS (axios) so there's no new npm package, and
 * everything is best-effort: any failure degrades to keyword memory rather than
 * breaking a write or a campaign run.
 */
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  /** Fixed vector width so one pgvector column works for every provider. */
  readonly DIM = 1024;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  /** True when at least a platform embeddings key exists. */
  isConfigured(): boolean {
    return !!this.config.get<string>('VOYAGE_API_KEY');
  }

  defaultModel(provider: EmbeddingProvider): string {
    if (provider === 'openai') return 'text-embedding-3-small';
    if (provider === 'gemini') return 'gemini-embedding-001';
    return 'voyage-3.5-lite';
  }

  // ── Key encryption (same AES-256-CBC scheme as social/twitter tokens) ────
  encrypt(plain: string): string {
    const key = Buffer.from(this.config.get<string>('ENCRYPTION_KEY')!, 'hex');
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    return iv.toString('hex') + ':' + cipher.update(plain, 'utf8', 'hex') + cipher.final('hex');
  }

  private decrypt(enc: string): string | null {
    try {
      const [ivHex, data] = enc.split(':');
      if (!ivHex || !data) return null;
      const key = Buffer.from(this.config.get<string>('ENCRYPTION_KEY')!, 'hex');
      const decipher = createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
      return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
    } catch {
      return null;
    }
  }

  /**
   * Resolve which provider/key to use for a workspace: BYOK first, then the
   * platform Voyage key. Returns null when neither is available.
   */
  private async resolveProvider(
    workspaceId: string,
  ): Promise<{ provider: EmbeddingProvider; key: string; model: string; source: 'workspace' | 'platform' } | null> {
    // 1. Workspace BYOK (columns added via raw SQL; read defensively)
    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<{ p: string | null; k: string | null }>>(
        `SELECT "embeddingProvider" AS p, "embeddingApiKeyEnc" AS k FROM "Workspace" WHERE id = $1`,
        workspaceId,
      );
      const row = rows?.[0];
      if (row?.p && row?.k && (row.p === 'voyage' || row.p === 'openai' || row.p === 'gemini')) {
        const key = this.decrypt(row.k);
        if (key) {
          return { provider: row.p as EmbeddingProvider, key, model: this.defaultModel(row.p as EmbeddingProvider), source: 'workspace' };
        }
      }
    } catch {
      // column may not exist yet — fall through to platform key
    }

    // 2. Platform Voyage key
    const vk = this.config.get<string>('VOYAGE_API_KEY');
    if (vk) {
      return { provider: 'voyage', key: vk, model: this.config.get<string>('VOYAGE_MODEL') || 'voyage-3.5-lite', source: 'platform' };
    }
    return null;
  }

  /** Low-level embedding call for a specific provider/key/model. Throws on error. */
  private async callProvider(
    provider: EmbeddingProvider,
    key: string,
    model: string,
    text: string,
    inputType: 'document' | 'query',
  ): Promise<number[]> {
    const clean = (text || '').replace(/\s+/g, ' ').trim().slice(0, 8000);

    if (provider === 'voyage') {
      const res = await axios.post(
        'https://api.voyageai.com/v1/embeddings',
        { input: [clean], model, input_type: inputType, output_dimension: this.DIM },
        { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 },
      );
      return res.data?.data?.[0]?.embedding;
    }

    if (provider === 'gemini') {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${encodeURIComponent(key)}`,
        {
          content: { parts: [{ text: clean }] },
          taskType: inputType === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
          outputDimensionality: this.DIM,
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 20000 },
      );
      return res.data?.embedding?.values;
    }

    // openai
    const res = await axios.post(
      'https://api.openai.com/v1/embeddings',
      { input: clean, model, dimensions: this.DIM },
      { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 },
    );
    return res.data?.data?.[0]?.embedding;
  }

  /**
   * Embed a single string with the workspace's resolved provider.
   * Returns { vector, model } (model is "provider:name") or null → keyword fallback.
   */
  async embed(
    workspaceId: string,
    text: string,
    inputType: 'document' | 'query' = 'document',
  ): Promise<{ vector: number[]; model: string } | null> {
    if (!(text || '').trim()) return null;
    const resolved = await this.resolveProvider(workspaceId);
    if (!resolved) return null;

    try {
      const vector = await this.callProvider(resolved.provider, resolved.key, resolved.model, text, inputType);
      if (!Array.isArray(vector) || vector.length !== this.DIM) {
        this.logger.warn(`Embedding returned unexpected shape (len=${vector?.length}) from ${resolved.provider}.`);
        return null;
      }
      return { vector, model: `${resolved.provider}:${resolved.model}` };
    } catch (err: any) {
      this.logger.error(
        `Embedding failed (${resolved.provider}/${resolved.source}): ${err?.response?.data ? JSON.stringify(err.response.data) : err.message}`,
      );
      return null;
    }
  }

  /**
   * Validate a candidate BYOK key by making one tiny embedding call. Throws a
   * readable error if the key/provider is rejected.
   */
  async testKey(provider: EmbeddingProvider, key: string): Promise<void> {
    try {
      const v = await this.callProvider(provider, key, this.defaultModel(provider), 'connection test', 'query');
      if (!Array.isArray(v) || v.length !== this.DIM) {
        throw new Error('provider returned an unexpected embedding shape');
      }
    } catch (err: any) {
      const detail = err?.response?.data?.error?.message || err?.response?.data?.detail || err?.message || 'key rejected';
      throw new Error(detail);
    }
  }

  /** pgvector literal, e.g. "[0.1,0.2,...]". */
  toVectorLiteral(vector: number[]): string {
    return `[${vector.join(',')}]`;
  }

  /** Best-effort: attach an embedding to a memory row via raw SQL. Never throws. */
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
