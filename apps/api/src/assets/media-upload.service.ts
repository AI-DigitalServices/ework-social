import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SignUploadDto } from './dto/sign-upload.dto';
import { buildMediaPath, storageAuthHeaders, validateUpload } from './media-upload.util';

export interface UploadTicket {
  /** true = identical content is already stored; use publicUrl, nothing to upload. */
  exists: boolean;
  path: string;
  publicUrl: string;
  /** One-time token for supabase.storage.uploadToSignedUrl (absent when exists). */
  token?: string;
}

/**
 * Signed, deduplicated uploads. File bytes still go straight from the client
 * to Supabase Storage, but only with a one-time token issued here after the
 * workspace-membership, type and size checks. Objects are content-addressed
 * (workspaceId/<sha256>.<ext>), so the same file is stored once per workspace.
 */
@Injectable()
export class MediaUploadService {
  private readonly logger = new Logger(MediaUploadService.name);

  constructor(private config: ConfigService) {}

  async createUpload(workspaceId: string, dto: SignUploadDto): Promise<UploadTicket> {
    const problem = validateUpload(workspaceId, dto);
    if (problem) throw new BadRequestException(problem);

    const base = this.config.get<string>('SUPABASE_URL');
    // Signing needs the secret key. The anon/publishable key is deliberately
    // not accepted here.
    const key =
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      this.config.get<string>('SUPABASE_SERVICE_KEY');
    const bucket = this.config.get<string>('SUPABASE_BUCKET') || 'media';
    if (!base || !key) {
      throw new ServiceUnavailableException('Signed uploads are not configured on this server.');
    }

    const path = buildMediaPath(workspaceId, dto);
    const publicUrl = `${base}/storage/v1/object/public/${bucket}/${path}`;
    const headers = storageAuthHeaders(key);

    // 1. Already stored? Then there is nothing to upload.
    const head = await axios.head(`${base}/storage/v1/object/${bucket}/${path}`, {
      headers,
      validateStatus: () => true,
      timeout: 15000,
    });
    if (head.status === 200) return { exists: true, path, publicUrl };

    // 2. Issue a one-time signed upload token for exactly this path.
    const res = await axios.post(
      `${base}/storage/v1/object/upload/sign/${bucket}/${path}`,
      {},
      {
        headers: { ...headers, 'Content-Type': 'application/json' },
        validateStatus: () => true,
        timeout: 15000,
      },
    );
    if (res.status >= 200 && res.status < 300 && typeof res.data?.url === 'string') {
      const token = new URL(res.data.url, 'http://placeholder').searchParams.get('token');
      if (token) return { exists: false, path, token, publicUrl };
    }

    // Storage reports "already exists" when another upload of the same content
    // won the race — that is a success for us.
    const body = JSON.stringify(res.data ?? {});
    if (/"409"|already exists|duplicate/i.test(body)) return { exists: true, path, publicUrl };

    this.logger.warn(`Signed upload failed (${res.status}): ${body.slice(0, 300)}`);
    throw new BadGatewayException('Could not prepare the upload. Please try again.');
  }
}
