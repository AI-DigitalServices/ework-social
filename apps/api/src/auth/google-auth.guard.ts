import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { signGoogleAppState } from './google-app.util';

/**
 * Google sign-in guard. Same as AuthGuard('google') with two additions:
 *  - /auth/google?client=app sends a signed "from the app" state to Google, so the callback can send the user
 *    back into the app instead of the website;
 *  - a failed or cancelled sign-in no longer throws inside the guard; the callback decides what that looks like
 *    (a link back into the app, or the usual 401 for the website).
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    return req?.query?.client === 'app' ? { state: signGoogleAppState() } : {};
  }

  handleRequest(_err: unknown, user: any) {
    return user || null;
  }
}
