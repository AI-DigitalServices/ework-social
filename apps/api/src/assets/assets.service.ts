import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { createDecipheriv } from 'crypto';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { RecordAssetDto } from './dto/record-asset.dto';
import { AiUsageService } from '../ai/ai-usage.service';

const IMAGE_SIZES = ['1024x1024', '1024x1536', '1536x1024', 'auto'];

// Cheap, fast model for tagging — this is a one-shot "describe this image"
// call, not reasoning, so Haiku is the right cost/quality tradeoff (matches
// the blueprint's "one cheap vision call" framing).
const TAGGING_MODEL = 'claude-haiku-4-5-20251001';
// Voyage is Anthropic's recommended embedding partner — Claude itself has
// no embeddings API. voyage-3-lite outputs 512-dim vectors, matching the
// Asset.embedding column.
const EMBEDDING_MODEL = 'voyage-3-lite';

/**
 * Creative Hub (AI OS v2, section 13.1). Storage is the existing Supabase
 * "media" bucket — file bytes never touch this service, only the resulting
 * public URL. Tagging and embedding are best-effort: if either fails, the
 * asset still exists and is browsable, just not tagged/searchable yet.
 */
@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);
  private anthropic: Anthropic;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private aiUsage: AiUsageService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async recordUpload(workspaceId: string, dto: RecordAssetDto) {
    // GENERATED assets are already metered at generation time — don't double-count.
    if (dto.source !== 'GENERATED') {
      await this.aiUsage.checkAndIncrement(workspaceId, 'ASSET_UPLOAD');
    }

    const asset = await this.prisma.asset.create({
      data: {
        workspaceId,
        clientId: dto.clientId || null,
        campaignId: dto.campaignId || null,
        kind: dto.kind as any,
        source: (dto.source as any) || 'UPLOADED',
        url: dto.url,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        tags: [],
      },
    });

    // Fire-and-forget — don't make the upload response wait on two extra
    // API calls. Tags/embedding land a few seconds later via update.
    this.tagAndEmbed(asset.id, dto).catch((err) => {
      this.logger.warn(`Tagging/embedding failed for asset ${asset.id}: ${err?.message}`);
    });

    return asset;
  }

  /**
   * Generate an image from a text prompt with OpenAI gpt-image-1. Returns the
   * image as base64 for the frontend to upload to the Supabase bucket (bytes
   * never touch this service on the storage path, matching the upload flow).
   * Key resolution: the workspace's connected OpenAI BYOK key first, else the
   * platform OPENAI_API_KEY. Metered once here (record step skips GENERATED).
   */
  async generateImage(
    workspaceId: string,
    prompt: string,
    size = '1024x1024',
    requestedProvider?: string,
  ): Promise<{ b64: string; mimeType: string; size: string; provider: string }> {
    if (!prompt?.trim()) throw new BadRequestException('A prompt is required.');
    const useSize = IMAGE_SIZES.includes(size) ? size : '1024x1024';

    const resolved = await this.resolveImageProvider(workspaceId, requestedProvider);
    if (!resolved) {
      throw new BadRequestException(
        'Image generation is not configured. Connect an OpenAI or Google Gemini key in Settings → Integrations, or ask an admin to set OPENAI_API_KEY / GEMINI_API_KEY.',
      );
    }

    // Premium-gated meter (aiImageGenPerMonth: 0 on Free/Starter → throws upgrade prompt).
    await this.aiUsage.checkAndIncrement(workspaceId, 'IMAGE_GEN');

    try {
      if (resolved.provider === 'gemini') {
        const model = this.config.get<string>('GEMINI_IMAGE_MODEL') || 'gemini-2.5-flash-image';
        const res = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(resolved.key)}`,
          { contents: [{ parts: [{ text: prompt.trim() }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } },
          { headers: { 'Content-Type': 'application/json' }, timeout: 120000 },
        );
        const parts = res.data?.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find((p: any) => p?.inlineData?.data || p?.inline_data?.data);
        const b64 = imgPart?.inlineData?.data || imgPart?.inline_data?.data;
        if (!b64) throw new Error('Gemini returned no image');
        const mimeType = imgPart?.inlineData?.mimeType || imgPart?.inline_data?.mime_type || 'image/png';
        return { b64, mimeType, size: useSize, provider: 'gemini' };
      }

      // openai (gpt-image-1)
      const res = await axios.post(
        'https://api.openai.com/v1/images/generations',
        { model: 'gpt-image-1', prompt: prompt.trim(), size: useSize, n: 1 },
        { headers: { Authorization: `Bearer ${resolved.key}`, 'Content-Type': 'application/json' }, timeout: 120000 },
      );
      const b64 = res.data?.data?.[0]?.b64_json;
      if (!b64) throw new Error('provider returned no image');
      return { b64, mimeType: 'image/png', size: useSize, provider: 'openai' };
    } catch (err: any) {
      const detail = err?.response?.data?.error?.message || err?.message || 'unknown error';
      this.logger.error(`Image generation failed (${resolved.provider}): ${detail}`);
      throw new BadRequestException(`Image generation failed: ${detail}`);
    }
  }

  /**
   * Pick an image provider + key. Workspace BYOK first (if it's an image-capable
   * provider), else platform keys, honoring a requested provider when possible.
   */
  private async resolveImageProvider(
    workspaceId: string,
    requested?: string,
  ): Promise<{ provider: 'openai' | 'gemini'; key: string } | null> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<{ p: string | null; k: string | null }>>(
        `SELECT "embeddingProvider" AS p, "embeddingApiKeyEnc" AS k FROM "Workspace" WHERE id = $1`,
        workspaceId,
      );
      const row = rows?.[0];
      if (row?.k && (row.p === 'openai' || row.p === 'gemini') && (!requested || requested === row.p)) {
        const key = this.decryptKey(row.k);
        if (key) return { provider: row.p, key };
      }
    } catch {
      // column may not exist — fall through to platform keys
    }

    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');
    if (requested === 'openai' && openaiKey) return { provider: 'openai', key: openaiKey };
    if (requested === 'gemini' && geminiKey) return { provider: 'gemini', key: geminiKey };
    if (openaiKey) return { provider: 'openai', key: openaiKey };
    if (geminiKey) return { provider: 'gemini', key: geminiKey };
    return null;
  }

  private decryptKey(enc: string): string | null {
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

  private async tagAndEmbed(assetId: string, dto: RecordAssetDto) {
    let tags: string[] = [];

    if (dto.kind === 'IMAGE') {
      tags = await this.generateTags(dto.url, dto.mimeType);
      if (tags.length > 0) {
        await this.prisma.asset.update({ where: { id: assetId }, data: { tags } });
      }
    }

    const embeddingText = [dto.fileName, ...tags].filter(Boolean).join(', ');
    if (!embeddingText) return;

    const embedding = await this.generateEmbedding(embeddingText, 'document');
    if (embedding) {
      const vectorLiteral = `[${embedding.join(',')}]`;
      await this.prisma.$executeRaw`UPDATE "Asset" SET embedding = ${vectorLiteral}::vector WHERE id = ${assetId}`;
    }
  }

  private async generateTags(url: string, mimeType?: string): Promise<string[]> {
    try {
      const imageResp = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
      const base64 = Buffer.from(imageResp.data).toString('base64');
      const media = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';

      const msg = await this.anthropic.messages.create({
        model: TAGGING_MODEL,
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: media as any, data: base64 } },
            { type: 'text', text: "Produce 5-8 concise, lowercase tags describing this image's subject, style, color palette and likely marketing use. Respond with ONLY a JSON array of strings, nothing else." },
          ],
        }],
      });

      const textBlock = msg.content.find((b: any) => b.type === 'text') as any;
      // Claude sometimes wraps the array in a markdown code fence despite
      // being told not to — extract the first [...] substring instead of
      // trusting the whole response to be bare JSON.
      const raw = textBlock.text.trim();
      const match = raw.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(match ? match[0] : raw);
      return Array.isArray(parsed) ? parsed.filter((t: any) => typeof t === 'string').slice(0, 8) : [];
    } catch (err: any) {
      this.logger.warn(`Auto-tagging failed: ${err?.message}`);
      return [];
    }
  }

  private async generateEmbedding(text: string, inputType: 'document' | 'query'): Promise<number[] | null> {
    try {
      const apiKey = this.config.get<string>('VOYAGE_API_KEY');
      if (!apiKey) {
        this.logger.warn('VOYAGE_API_KEY not set — skipping embedding');
        return null;
      }
      const resp = await axios.post(
        'https://api.voyageai.com/v1/embeddings',
        { input: [text], model: EMBEDDING_MODEL, input_type: inputType },
        { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 15000 },
      );
      return resp.data?.data?.[0]?.embedding || null;
    } catch (err: any) {
      this.logger.warn(`Embedding generation failed: ${err?.response?.data ? JSON.stringify(err.response.data) : err?.message}`);
      return null;
    }
  }

  async list(workspaceId: string, filters: { kind?: string; clientId?: string; campaignId?: string; tag?: string }) {
    const where: any = { workspaceId };
    if (filters.kind) where.kind = filters.kind;
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.campaignId) where.campaignId = filters.campaignId;
    if (filters.tag) where.tags = { has: filters.tag };

    return this.prisma.asset.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async search(workspaceId: string, query: string, limit = 20) {
    const embedding = await this.generateEmbedding(query, 'query');
    if (!embedding) {
      // Embedding call failed (or no VOYAGE_API_KEY) — fall back to plain
      // tag/filename matching so search still works, just not semantically.
      return this.prisma.asset.findMany({
        where: {
          workspaceId,
          OR: [
            { tags: { has: query.toLowerCase() } },
            { fileName: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    }

    const vectorLiteral = `[${embedding.join(',')}]`;
    return this.prisma.$queryRaw`
      SELECT id, "workspaceId", "clientId", "campaignId", kind, source, url, "fileName",
             "mimeType", "sizeBytes", tags, "createdAt", "updatedAt",
             1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "Asset"
      WHERE "workspaceId" = ${workspaceId} AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${limit}
    `;
  }

  async remove(workspaceId: string, id: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset || asset.workspaceId !== workspaceId) throw new NotFoundException('Asset not found');
    await this.prisma.asset.delete({ where: { id } });
    return { success: true };
  }
}
