# eWork Social — Security Audit & Architecture Review
**Prepared:** July 24, 2026
**Scope:** Full-platform review — authentication, authorization, API surface, data handling, infrastructure
**Reviewer perspective:** Production security + 5-year technical lead

---

## Executive Summary

eWork Social has a solid security foundation for a platform at this stage: passwords are properly hashed with bcrypt, all database access goes through Prisma (so classic SQL injection is effectively off the table), rate limiting is in place, security headers are set, and the Paystack billing webhook verifies its signature correctly before processing.

However, this audit found **one critical, systemic vulnerability** that must be fixed before further scaling: the platform does not verify that an authenticated user actually belongs to the workspace whose data they are requesting. Because eWork Social is a multi-tenant product where each workspace holds a different client's private social accounts, contacts, and messages, this is the single most important issue in the codebase and is treated as the top priority below.

The remaining findings are a mix of high, medium, and low severity items — most are quick, contained fixes. This report lists each finding, explains the risk in plain terms, and gives a production-grade fix. The final section steps back and looks at the platform the way a technical lead responsible for it over the next five years would: where it will strain as it grows, and what to change now while changes are still cheap.

Severity counts: **1 Critical · 3 High · 5 Medium · 3 Low**

---

## Critical Findings

### C-1 — Broken tenant isolation (IDOR across the whole API)

**What it is.** Almost every data endpoint — CRM, scheduler, social accounts, inbox, AI, analytics — accepts a `workspaceId` from the client as a query parameter or request body, then returns or modifies that workspace's data. The `JwtGuard` confirms the caller is *logged in*, but nothing confirms the caller is a *member of that workspace*.

**Why it matters.** Any logged-in user can change one number in a request and read or modify another customer's data. For example, a free-tier user could call `GET /api/crm/clients?workspaceId=<someone-else's-id>` and receive that agency's entire client list — names, emails, pipeline notes. The same pattern exposes connected social accounts, scheduled posts, and private inbox messages. For a platform holding multiple businesses' client data and social credentials, this is the highest-impact class of vulnerability there is (OWASP calls it Broken Access Control — the #1 web risk).

**Confirmed in:** `crm.controller.ts`, `scheduler.controller.ts`, `social.controller.ts`, `inbox.controller.ts`, `ai.controller.ts`, and any other controller that takes `workspaceId` as input. Ownership *is* correctly checked in `workspace.service.ts` for rename/delete/invite — that pattern simply needs to be applied everywhere else.

**Production-grade fix.** Introduce a single reusable membership check so it can't be forgotten per-endpoint. Two layers, defence in depth:

1. A `WorkspaceMemberGuard` that reads `workspaceId` from the request (query, body, or param), reads `userId` from the JWT, and confirms a `WorkspaceMember` row links them — throwing `ForbiddenException` otherwise.

```typescript
// apps/api/src/common/workspace-member.guard.ts
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.sub;
    const workspaceId =
      req.query.workspaceId || req.body?.workspaceId || req.params.workspaceId;

    if (!userId || !workspaceId) {
      throw new ForbiddenException('Workspace context required');
    }

    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
      select: { role: true },
    });
    if (!member) throw new ForbiddenException('Not a member of this workspace');

    req.workspaceRole = member.role; // available downstream for role checks
    return true;
  }
}
```

2. Apply it alongside `JwtGuard` on every workspace-scoped controller:

```typescript
@Controller('crm')
@UseGuards(JwtGuard, WorkspaceMemberGuard)
export class CrmController { /* ... */ }
```

3. As a second layer, service methods that operate on a single record by `id` (e.g. `getClient(id)`, `updateClient(id)`) should also confirm that record's `workspaceId` is one the user belongs to — because those endpoints take a record id, not a workspace id, and so bypass the guard above. The cleanest approach is to pass the verified `workspaceId` into the query: `findFirst({ where: { id, workspaceId } })` returns nothing if the record belongs to another tenant.

**Priority:** Fix before any paid customer onboards a second workspace. This is the one item that should block everything else.

---

## High Findings

### H-1 — Forged webhooks are processed even when the signature fails

**What it is.** The Meta/Facebook webhook (`responder/webhook.controller.ts`) computes the expected `x-hub-signature-256`, compares it, and on mismatch it logs a warning and **processes the event anyway**.

**Why it matters.** The signature is the only thing proving a webhook actually came from Meta. Because a failed check doesn't block, anyone who discovers the webhook URL can POST fabricated events — fake incoming DMs, fake comments — which then flow into customers' inboxes and can trigger auto-responder replies. The billing webhook (`billing.service.ts`) does this correctly and should be the template.

**Fix.** Make the check blocking, and use the correct app secret. If Instagram and Facebook use different secrets, verify against both and accept if either matches, rather than skipping verification:

```typescript
const valid = [metaSecret, instagramSecret].filter(Boolean).some((secret) => {
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  return signature && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
});
if (!valid) return res.status(401).send('invalid signature');
```

Note the use of `crypto.timingSafeEqual` rather than `!==` — string comparison leaks timing information that can, in theory, be used to forge a signature byte by byte.

### H-2 — Refresh tokens can't be revoked

**What it is.** Refresh tokens are stateless JWTs with a 30-day life. There is no server-side record of issued tokens, so there is no way to invalidate one. Logout only clears the browser; the token remains valid for its full 30 days if copied.

**Why it matters.** If a refresh token leaks (shared device, XSS, a logged URL), the attacker has a month of access and the user has no way to cut it off. "Log out everywhere" and "a stolen session was revoked" are both impossible today.

**Fix.** Store a hash of each issued refresh token (or a per-user `tokenVersion` integer) in the database. On refresh, check it still exists / matches; on logout or password change, delete it / bump the version. This turns refresh tokens into something you can actually revoke. A `tokenVersion` column is the lightest-weight option: include it in the JWT payload, compare on refresh, increment to invalidate all sessions at once.

### H-3 — Auth tokens stored in `localStorage` (XSS → full account takeover)

**What it is.** Access and refresh tokens are persisted in `localStorage` (`web/src/lib/api.ts`).

**Why it matters.** Any cross-site-scripting bug anywhere in the frontend — or in a third-party script — can read `localStorage` and exfiltrate both tokens. Combined with H-2 (no revocation), a single XSS becomes a 30-day account takeover. `localStorage` is convenient but is the least safe place to keep credentials.

**Fix.** Move the refresh token to an `HttpOnly`, `Secure`, `SameSite=Strict` cookie so JavaScript cannot read it, and keep only the short-lived (15-min) access token in memory (not `localStorage`). This is a larger change touching the auth callback and API client, so it can follow C-1 and H-1, but it should be on the roadmap because it caps the blast radius of any future XSS. Pair it with a Content-Security-Policy header (see M-3) to reduce XSS risk in the first place.

---

## Medium Findings

### M-1 — OAuth debug logging leaks flow details

`social.service.ts` logs the app ID and each step of the Facebook token exchange, and the webhook controller logs the first 500 characters of every webhook body — which can include private message content. Even where token *values* aren't logged, message bodies and identifiers are PII. Logs are often shipped to third-party services and retained for a long time. **Fix:** strip these `console.log` calls (or gate them behind `if (process.env.NODE_ENV !== 'production')`), and never log webhook payload bodies in production.

### M-2 — `ValidationPipe` doesn't reject unknown fields or enforce types strictly

`main.ts` uses `new ValidationPipe({ whitelist: true })`. `whitelist` strips unknown properties silently, but adding `forbidNonWhitelisted: true` makes malformed requests fail loudly, and `transform: true` ensures payloads are cast to their DTO types. **Fix:** `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.

### M-3 — No Content-Security-Policy header

The inline security headers in `main.ts` are good (HSTS, nosniff, frame-deny) but there's no CSP. CSP is the strongest single defence against XSS, which is the root enabler of H-3. **Fix:** add a CSP header (start in report-only mode to catch breakage, then enforce). Consider adopting `helmet` to manage all security headers in one place rather than hand-maintaining them.

### M-4 — Admin access is a hardcoded email list

`admin.controller.ts` gates admin routes against a hardcoded array of emails in source. This works but is brittle: rotating an admin means a code deploy, the list lives in version control, and there's no audit trail. **Fix:** move to a `role` field on the `User` model (or a dedicated `isAdmin` boolean) checked by an `AdminGuard`, and log admin actions.

### M-5 — Password reset / verification tokens are single-use but not rate-limited per-account

`forgot-password` is throttled globally and correctly avoids leaking whether an email exists (good). But there's no per-account cap, so an attacker can repeatedly trigger reset emails to one address (email bombing) within the global limit. **Fix:** add a short cooldown per email address (e.g. one reset email per 5 minutes) alongside the existing global throttle.

---

## Low Findings

### L-1 — bcrypt work factor could be raised
Passwords use bcrypt with 10 rounds. 12 is the current sensible default and is barely noticeable in login latency. Bump `bcrypt.hash(password, 12)`.

### L-2 — `deleteAccount` isn't wrapped in a transaction
`auth.service.ts` deletes across many tables sequentially. If the process dies midway, data is left half-deleted. Wrap the whole sequence in `prisma.$transaction([...])` so it's all-or-nothing — this also matters for GDPR "right to erasure" correctness.

### L-3 — No account lockout after repeated failed logins
Login is rate-limited by IP (10/min), which is reasonable, but a distributed attempt across IPs isn't slowed. Consider a per-account failed-attempt counter with exponential backoff for defence in depth. Low priority given the existing throttle.

---

## What's Already Done Well

It's worth stating the positives, because they're load-bearing and shouldn't be regressed: Prisma everywhere means no string-built SQL and effectively no injection surface; bcrypt is used correctly for password storage; rate limiting is configured with sensible per-route tiers; the Paystack webhook verifies its signature and blocks on failure; `forgot-password` doesn't reveal whether an account exists; JWT_SECRET has no insecure fallback, so a missing secret fails closed rather than open; and HSTS plus the core security headers are present. This is a healthier baseline than most products have at launch.

---

## Prioritized Remediation Plan

| Order | Item | Severity | Effort | Blocks scaling? |
|-------|------|----------|--------|-----------------|
| 1 | C-1 Workspace membership guard | Critical | ~1 day | Yes — do first |
| 2 | H-1 Blocking webhook signature check | High | ~1 hour | No |
| 3 | M-1 Remove OAuth/webhook debug logging | Medium | ~30 min | No |
| 4 | M-2 Stricter ValidationPipe | Medium | ~10 min | No |
| 5 | H-2 Revocable refresh tokens (tokenVersion) | High | ~half day | Soon |
| 6 | M-4 DB-backed admin role | Medium | ~2 hours | No |
| 7 | H-3 HttpOnly cookie for refresh token | High | ~1 day | Soon |
| 8 | M-3 Content-Security-Policy (+ helmet) | Medium | ~half day | No |
| 9 | M-5 Per-account reset cooldown | Medium | ~1 hour | No |
| 10 | L-1/L-2/L-3 hardening | Low | ~2 hours total | No |

A realistic sequencing: ship items 1–4 this week (they're small and high-value), then 5–8 over the following two weeks, then the low-severity hardening whenever there's slack.

---

## Five-Year Architecture Review

Security fixes address what's wrong today. This section looks at where the platform will strain as it grows, from the perspective of someone who has to keep it running and evolving for years — not to alarm, but to flag the decisions that are cheap to change now and expensive to change later.

### Multi-tenancy needs to become a first-class concept, not a parameter

The root cause of C-1 is that "which workspace" is a value passed around loosely rather than a property of the request enforced in one place. As the team grows and more endpoints are added, the odds that someone forgets the membership check approach certainty. The guard in C-1 fixes the immediate problem, but the durable pattern is to derive workspace context centrally (from the guard, attached to the request) and to make service methods incapable of querying without it — for example, a thin data-access layer that always injects the verified `workspaceId` into Prisma `where` clauses. Invest in this pattern once and every future endpoint inherits isolation for free.

### The polling model will not scale — move to a queue

Today the scheduler and the Twitter/LinkedIn pollers run on cron ticks inside the single API process ("Cron tick — checking scheduled posts" every two minutes; "Polling Twitter mentions" every ten). This is fine for tens of workspaces. It breaks in three predictable ways as you grow: the work runs on the same process that serves user requests, so a heavy poll cycle slows the app for everyone; if you ever run more than one API instance for redundancy, every instance runs every cron, doubling API calls and risking duplicate posts; and a single failing account can throw and interrupt the batch. The long-term fix is a proper job queue (BullMQ on Redis is the standard fit for a Node/Nest stack): each scheduled post or poll becomes an individual job with its own retry and backoff, workers run in a separate process you can scale independently of the web tier, and platform rate limits become something you manage centrally rather than hope to avoid. This is the single highest-leverage architectural change for the next stage and is much easier to do at 50 workspaces than at 5,000.

### Encrypted tokens need a key-rotation story

Social tokens are encrypted at rest with AES-256 using a single `ENCRYPTION_KEY` env var. That's the right call. The gap is what happens when that key must change — after an employee departs, a suspected leak, or routine hygiene. Today a key change would make every stored token undecryptable and force every customer to reconnect every account. Before you have thousands of connected accounts, add a key **version** tag to each encrypted value (store `v1:iv:ciphertext`) so you can introduce a new key, decrypt-old/encrypt-new lazily as accounts are used, and retire the old key without a mass reconnect. Consider a managed secrets store (Doppler, AWS Secrets Manager, or Infisical) rather than raw Railway env vars once the team is more than one person.

### Observability before you need it

There's Sentry for errors (good) and PostHog for product analytics (good), but no structured application logging or audit trail. When a customer asks "who deleted this client?" or "why did this post publish twice?", today's answer is grep through ephemeral console logs. Two additions pay for themselves quickly: a structured logger (pino) emitting JSON with a request id and workspace id on every line, and an append-only `AuditLog` table recording security-relevant actions (logins, permission changes, account connects/disconnects, deletions). The audit log also becomes a selling point for agency customers who need to answer their own clients' compliance questions.

### Database and migration discipline

Two things will bite at scale if left alone. First, migrations: this platform has already hit a case (the `googleId` column) where the schema and the database drifted because `prisma generate` ran without a matching migration. Adopt the rule that schema changes only ship via `prisma migrate` (never `db push` against production), and that `migrate deploy` runs in the release step — which it now does. Second, indexing: as `Post`, `Client`, and `SocialAccount` tables grow into the millions of rows, the queries that filter by `workspaceId` (soon to be every query) must have composite indexes like `@@index([workspaceId, createdAt])`. Add them now while the tables are small and the migration is instant.

### Dependency and supply-chain hygiene

The app pulls in OAuth libraries, `atproto`, payment SDKs, and more. Over five years the biggest realistic source of a breach is not custom code but a vulnerable or compromised dependency. Turn on automated dependency scanning (GitHub Dependabot is free and native), pin versions via the lockfile (already in place), and schedule a quarterly dependency-update pass so you're never so far behind that patching a critical CVE means a risky big-bang upgrade.

### A pragmatic sequencing for the architecture work

None of this needs to happen at once, and doing it all today would be over-engineering for the current size. A sensible order: solidify tenant isolation as a pattern (flows directly out of the C-1 fix); add composite indexes while tables are small; introduce the job queue when poll volume or workspace count starts making cron cycles visibly slow; add structured logging and the audit table when you take on your first agency customer who cares about compliance; and formalize key rotation and a secrets manager when the team grows past one person. The theme throughout is that each of these is dramatically cheaper to do early, and the goal of flagging them now is simply to make sure none of them becomes a forced, painful migration later.

---

## Closing Note

The critical item (C-1) is genuinely urgent for a multi-tenant product and should be fixed before onboarding customers who will each hold private client data. Everything else is normal, healthy hardening for a platform moving from launch into growth. The codebase is in good shape overall — the fixes here are about protecting the trust of the agencies and creators who are about to put their clients' data and social presence in eWork Social's hands.

I can start implementing the fixes in priority order whenever you're ready — C-1 through M-2 are small and could ship this week.
