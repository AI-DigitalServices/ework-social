import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanGuardService } from '../common/plan-guard.service';
import { getPlanDisplayName, getPlanLimits } from '../common/plan-limits';
import { AuthedApiKey, generateApiKey, hashApiKey, looksLikeApiKey, normalizeScopes } from './api-key.util';
import { cleanString } from './public-api.validate';

@Injectable()
export class ApiKeysService {
  constructor(
    private prisma: PrismaService,
    private planGuard: PlanGuardService,
  ) {}

  async list(workspaceId: string) {
    return this.prisma.apiKey.findMany({
      where: { workspaceId },
      select: {
        id: true, name: true, prefix: true, scopes: true,
        lastUsedAt: true, expiresAt: true, revokedAt: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async create(workspaceId: string, userId: string, body: any) {
    const { plan } = await this.planGuard.assertCanWrite(workspaceId);
    if (!getPlanLimits(plan).apiAccessEnabled) {
      throw new ForbiddenException(
        `API keys are available on the Agency Pro plan and above. Your ${getPlanDisplayName(plan)} plan doesn't include them yet.`,
      );
    }

    const name = cleanString(body?.name, 'name', 60, true)!;
    const scopes = normalizeScopes(body?.scopes);
    if (scopes.length === 0) {
      throw new BadRequestException('Choose at least one permission: clients:read, clients:write, posts:read, posts:write.');
    }

    let expiresAt: Date | null = null;
    if (body?.expiresInDays !== undefined && body?.expiresInDays !== null && body?.expiresInDays !== '') {
      const days = Number(body.expiresInDays);
      if (!Number.isInteger(days) || days < 1 || days > 730) {
        throw new BadRequestException('expiresInDays must be a whole number from 1 to 730.');
      }
      expiresAt = new Date(Date.now() + days * 86_400_000);
    }

    const max = plan === 'ENTERPRISE' ? 25 : 10;
    const active = await this.prisma.apiKey.count({ where: { workspaceId, revokedAt: null } });
    if (active >= max) {
      throw new BadRequestException(`You can have up to ${max} active API keys. Revoke one to create another.`);
    }

    const { key, prefix, hash } = generateApiKey();
    const row = await this.prisma.apiKey.create({
      data: { workspaceId, name, prefix, keyHash: hash, scopes, createdById: userId || null, expiresAt },
    });
    // The full key is returned exactly once; only its hash is stored.
    return { id: row.id, name: row.name, prefix: row.prefix, scopes: row.scopes, expiresAt: row.expiresAt, createdAt: row.createdAt, key };
  }

  async revoke(workspaceId: string, id: string) {
    const row = await this.prisma.apiKey.findFirst({ where: { id, workspaceId } });
    if (!row) throw new NotFoundException('API key not found.');
    if (!row.revokedAt) {
      await this.prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
    }
    return { id, revoked: true };
  }

  /** Resolve a raw key to its workspace and scopes, or throw 401. */
  async authenticate(raw: string): Promise<AuthedApiKey> {
    if (!looksLikeApiKey(raw)) throw new UnauthorizedException('Invalid API key.');
    const row = await this.prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(raw) } });
    if (!row || row.revokedAt) throw new UnauthorizedException('Invalid or revoked API key.');
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('This API key has expired.');
    }
    if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 5 * 60_000) {
      this.prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    }
    return { id: row.id, name: row.name, workspaceId: row.workspaceId, scopes: row.scopes };
  }
}
