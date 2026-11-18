import {
  CanActivate, ExecutionContext, ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanGuardService } from '../common/plan-guard.service';
import { getPlanDisplayName, getPlanLimits } from '../common/plan-limits';
import { ApiKeysService } from './api-keys.service';
import { apiKeyLimiter, extractApiKey, scopeAllows } from './api-key.util';
import { REQUIRED_SCOPE } from './require-scope.decorator';

/**
 * Authenticates public-API requests with a workspace API key.
 * Order: key valid -> plan still includes API access -> rate limit -> scope ->
 * write gate (read-only workspaces cannot write). Sets req.apiKey.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private keys: ApiKeysService,
    private planGuard: PlanGuardService,
    private reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const http = ctx.switchToHttp();
    const req = http.getRequest();
    if (req.method === 'OPTIONS') return true;

    const raw = extractApiKey(req.headers);
    if (!raw) {
      throw new UnauthorizedException(
        'Missing API key. Send it as "Authorization: Bearer ewk_live_..." or in an "X-API-Key" header.',
      );
    }
    const key = await this.keys.authenticate(raw);

    // A key stops working if the workspace drops below a plan with API access.
    const plan = await this.planGuard.getWorkspacePlan(key.workspaceId);
    if (!getPlanLimits(plan).apiAccessEnabled) {
      throw new ForbiddenException(
        `API access is not included in the ${getPlanDisplayName(plan)} plan. Upgrade to Agency Pro to use API keys.`,
      );
    }

    const perMinute = plan === 'ENTERPRISE' ? 600 : 120;
    const rl = apiKeyLimiter.hit(key.id, perMinute);
    if (!rl.ok) {
      http.getResponse()?.setHeader?.('Retry-After', String(rl.retryAfterSec));
      throw new HttpException(
        `Rate limit exceeded (${perMinute} requests per minute per key). Retry in ${rl.retryAfterSec}s.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const required = this.reflector.getAllAndOverride<string | undefined>(REQUIRED_SCOPE, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (required && !scopeAllows(key.scopes, required)) {
      throw new ForbiddenException(`This API key does not have the "${required}" permission.`);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      await this.planGuard.assertCanWrite(key.workspaceId);
    }

    req.apiKey = key;
    return true;
  }
}
