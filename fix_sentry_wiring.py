import pathlib

# ---------- 1. Frontend: instrumentation.ts (new) ----------
instr_path = pathlib.Path("apps/web/instrumentation.ts")
if instr_path.exists():
    raise SystemExit("apps/web/instrumentation.ts already exists - not overwriting, check it manually")
instr_path.write_text(
    """import * as Sentry from '@sentry/nextjs';

// Next.js App Router requires this file to actually load sentry.server.config.ts /
// sentry.edge.config.ts - without it, those files exist but are never imported,
// and nothing ever reaches Sentry regardless of DSN being set.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
""",
    encoding="utf-8",
)
print("Created apps/web/instrumentation.ts")

# ---------- 2. Frontend: sentry.edge.config.ts (new) ----------
edge_path = pathlib.Path("apps/web/sentry.edge.config.ts")
if edge_path.exists():
    raise SystemExit("apps/web/sentry.edge.config.ts already exists - not overwriting, check it manually")
edge_path.write_text(
    """import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
});
""",
    encoding="utf-8",
)
print("Created apps/web/sentry.edge.config.ts")

# ---------- 3. Frontend: wrap next.config.ts export with withSentryConfig ----------
nc_path = pathlib.Path("apps/web/next.config.ts")
nc_text = nc_path.read_text(encoding="utf-8")
nc_original = nc_text

old_import = 'import type { NextConfig } from "next";'
new_import = 'import type { NextConfig } from "next";\nimport { withSentryConfig } from "@sentry/nextjs";'
if old_import not in nc_text:
    raise SystemExit("Anchor not found: next.config.ts import line - aborting, no changes made")
nc_text = nc_text.replace(old_import, new_import, 1)

old_export = "export default nextConfig;"
new_export = """export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});"""
if old_export not in nc_text:
    raise SystemExit("Anchor not found: next.config.ts export line - aborting, no changes made")
nc_text = nc_text.replace(old_export, new_export, 1)

if nc_text == nc_original:
    raise SystemExit("No changes made to next.config.ts - aborting")
nc_path.write_text(nc_text, encoding="utf-8")
print("Patched apps/web/next.config.ts to wrap export with withSentryConfig")

# ---------- 4. Backend: global exception filter (new) ----------
filt_dir = pathlib.Path("apps/api/src/common/filters")
filt_dir.mkdir(parents=True, exist_ok=True)
filt_path = filt_dir / "sentry-exception.filter.ts"
if filt_path.exists():
    raise SystemExit("apps/api/src/common/filters/sentry-exception.filter.ts already exists - not overwriting")
filt_path.write_text(
    """import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

// Reports every unhandled exception to Sentry, then falls through to NestJS's
// normal exception handling (via BaseExceptionFilter) so response behavior is
// unchanged. Only genuine server-side failures (5xx, or non-HttpException
// throws) are reported - expected 4xx client errors (validation, auth,
// not-found) are skipped to keep signal high.
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      Sentry.captureException(exception);
    }

    super.catch(exception, host);
  }
}
""",
    encoding="utf-8",
)
print("Created apps/api/src/common/filters/sentry-exception.filter.ts")

# ---------- 5. Backend: register the filter in main.ts ----------
main_path = pathlib.Path("apps/api/src/main.ts")
main_text = main_path.read_text(encoding="utf-8")
main_original = main_text

old_imports = """import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';"""
new_imports = """import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';"""
if old_imports not in main_text:
    raise SystemExit("Anchor not found: main.ts imports block - aborting, no changes made")
main_text = main_text.replace(old_imports, new_imports, 1)

old_bootstrap = """  const app = await NestFactory.create(AppModule, {
      rawBody: true,
    });"""
if old_bootstrap not in main_text:
    old_bootstrap = """  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });"""
if old_bootstrap not in main_text:
    raise SystemExit("Anchor not found: NestFactory.create block - aborting, no changes made")

new_bootstrap = old_bootstrap + """

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));"""
main_text = main_text.replace(old_bootstrap, new_bootstrap, 1)

if main_text == main_original:
    raise SystemExit("No changes made to main.ts - aborting")
main_path.write_text(main_text, encoding="utf-8")
print("Patched apps/api/src/main.ts to register SentryExceptionFilter globally")

print("\nAll done. Review the diffs, then typecheck both apps before committing.")
