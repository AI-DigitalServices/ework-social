import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PlanGuardService } from '../common/plan-guard.service';
import { getAgentActionLimit, getPlanDisplayName, getPlanLimits } from '../common/plan-limits';
import { describeKeyError, looksLikeAnthropicKey } from './llm-client.util';

// The model the agent runs on. The validation call uses the same one, so a key
// that passes validation is known to be able to run the agent.
const AGENT_MODEL = 'claude-sonnet-4-5';

export interface ResolvedLlm {
  client: Anthropic;
  /** 'workspace' = the customer's own Claude key; 'platform' = the eWork Social key. */
  source: 'workspace' | 'platform';
}

/**
 * Which Claude key the AI Agent and Brand Brain use for a workspace.
 *
 *   1. The workspace's own connected Anthropic key - their account, their cost,
 *      and runs are NOT counted against the plan's monthly agent cap.
 *   2. Otherwise the platform key - metered by plan, as before.
 *
 * There is deliberately NO silent fallback from 1 to 2: if a connected key is
 * unreadable or rejected, the run fails with a clear message rather than
 * quietly spending platform credit.
 *
 * The key is validated with a live call before it is saved, stored encrypted
 * (AES-256-CBC, same scheme as social tokens) in raw Workspace columns
 * "llmProvider" / "llmApiKeyEnc", and never returned by any route.
 */
@Injectable()
export class LlmClientService {
  private readonly logger = new Logger(LlmClientService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private planGuard: PlanGuardService,
  ) {}

  // ── Encryption (same scheme as EmbeddingsService / social tokens) ─────────

  private encrypt(plain: string): string {
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

  /** Reads the stored key row. Returns null when none is set or the columns do not exist yet. */
  private async readRow(workspaceId: string): Promise<{ p: string | null; k: string | null } | null> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<{ p: string | null; k: string | null }>>(
        `SELECT "llmProvider" AS p, "llmApiKeyEnc" AS k FROM "Workspace" WHERE id = $1`,
        workspaceId,
      );
      return rows?.[0] ?? null;
    } catch {
      return null; // columns not created yet - behave as "no key connected"
    }
  }

  // ── Resolution ────────────────────────────────────────────────────────────

  /**
   * Returns the client to use for this workspace: its own key when connected,
   * otherwise the caller's platform client.
   */
  async resolve(workspaceId: string, platformClient: Anthropic): Promise<ResolvedLlm> {
    const row = await this.readRow(workspaceId);
    if (row?.p === 'anthropic' && row.k) {
      const key = this.decrypt(row.k);
      if (!key) {
        throw new BadRequestException(
          'Your connected Claude key could not be read. Reconnect it in Settings > Integrations.',
        );
      }
      return { client: new Anthropic({ apiKey: key }), source: 'workspace' };
    }
    return { client: platformClient, source: 'platform' };
  }

  /**
   * Own-key runs skip the monthly cap, but the plan must still include the
   * agent and bring-your-own-key (e.g. a workspace that downgraded to Starter).
   */
  async assertOwnKeyAllowed(workspaceId: string): Promise<void> {
    const plan = await this.planGuard.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);
    if (limits.agentActionsPerMonth === 0 || !limits.byokEnabled) {
      throw new ForbiddenException(
        `The AI Agent with your own Claude key is available on the Growth plan and above. Your ${getPlanDisplayName(plan)} plan does not include it - upgrade to keep using it.`,
      );
    }
  }

  // ── Settings: status / connect / disconnect ───────────────────────────────

  async getStatus(workspaceId: string) {
    const row = await this.readRow(workspaceId);
    const connected = row?.p === 'anthropic' && !!row.k;
    const effective = await this.planGuard.getEffectivePlan(workspaceId);
    const limits = getPlanLimits(effective.plan);
    return {
      connected,
      provider: connected ? 'anthropic' : null,
      activeSource: connected ? 'workspace' : 'platform',
      /** Whether this plan may connect its own key at all. */
      ownKeyAllowed: limits.byokEnabled && limits.agentActionsPerMonth > 0,
      /** Monthly agent-run cap on the platform key (0 = no agent on this plan, 999999 = unlimited). */
      monthlyRunLimit: getAgentActionLimit(effective.plan, effective.isTrialing),
      planDisplay: getPlanDisplayName(effective.plan),
    };
  }

  async connect(workspaceId: string, apiKey: string) {
    const key = (apiKey || '').trim();
    if (!key) throw new BadRequestException('apiKey is required.');
    if (!looksLikeAnthropicKey(key)) {
      throw new BadRequestException(
        'That does not look like an Anthropic API key - they start with "sk-ant-". Create one at console.anthropic.com.',
      );
    }
    await this.assertOwnKeyAllowed(workspaceId);

    // Validate before storing - a bad key must never be saved.
    try {
      await new Anthropic({ apiKey: key, maxRetries: 0, timeout: 20000 }).messages.create({
        model: AGENT_MODEL,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
    } catch (err: any) {
      throw new BadRequestException(`Anthropic did not accept the key: ${describeKeyError(err)}`);
    }

    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "Workspace" SET "llmProvider" = $1, "llmApiKeyEnc" = $2 WHERE id = $3`,
        'anthropic',
        this.encrypt(key),
        workspaceId,
      );
    } catch (err: any) {
      this.logger.error(`connect() failed to persist key: ${err.message}`);
      throw new BadRequestException(
        'Agent key storage is not initialized. Run the Workspace llmProvider/llmApiKeyEnc column migration on the database first.',
      );
    }
    this.logger.log(`Workspace ${workspaceId} connected its own Claude key for the agent.`);
    return { connected: true, provider: 'anthropic' };
  }

  async disconnect(workspaceId: string) {
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "Workspace" SET "llmProvider" = NULL, "llmApiKeyEnc" = NULL WHERE id = $1`,
        workspaceId,
      );
    } catch (err: any) {
      this.logger.error(`disconnect() failed: ${err.message}`);
      throw new BadRequestException('Could not disconnect - agent key storage is not initialized.');
    }
    return { connected: false };
  }
}
