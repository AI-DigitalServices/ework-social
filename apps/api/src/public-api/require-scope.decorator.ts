import { SetMetadata } from '@nestjs/common';

export const REQUIRED_SCOPE = 'api_required_scope';

/** Marks a public-API route with the API-key scope it needs, e.g. 'clients:write'. */
export const RequireScope = (scope: string) => SetMetadata(REQUIRED_SCOPE, scope);
