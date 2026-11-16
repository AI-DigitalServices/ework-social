import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common';
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
