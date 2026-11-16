// Pure helpers for signed, deduplicated media uploads. No framework imports,
// so they are trivially unit-testable.

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const ALLOWED_PREFIXES = ['image/', 'video/', 'audio/'];

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
};

export interface UploadRequest {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}

function cleanMime(mimeType: string): string {
  return (mimeType || '').toLowerCase().split(';')[0].trim();
}

/** Returns a user-facing error message, or null when the request is acceptable. */
export function validateUpload(workspaceId: string, req: UploadRequest): string | null {
  if (!/^[a-z0-9]{8,64}$/i.test(workspaceId || '')) return 'Invalid workspace.';
  if (!req || typeof req.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(req.sha256)) {
    return 'Invalid file checksum.';
  }
  if (!Number.isInteger(req.sizeBytes) || req.sizeBytes < 1) return 'Invalid file size.';
  if (req.sizeBytes > MAX_UPLOAD_BYTES) {
    return `File is too large. The limit is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`;
  }
  const mime = cleanMime(req.mimeType);
  if (!ALLOWED_PREFIXES.some((p) => mime.startsWith(p))) {
    return 'Unsupported file type. Upload an image, video or audio file.';
  }
  return null;
}

/**
 * Content-addressed path: the same bytes in the same workspace always map to
 * the same object, so re-uploading a file can never create a duplicate.
 */
export function buildMediaPath(workspaceId: string, req: UploadRequest): string {
  const fromName = /\.([a-z0-9]{1,5})$/i.exec(req.fileName || '')?.[1]?.toLowerCase();
  const ext = EXT_BY_MIME[cleanMime(req.mimeType)] || fromName || 'bin';
  return `${workspaceId}/${req.sha256}.${ext}`;
}

/**
 * New-style Supabase secret keys (sb_secret_...) are not JWTs and must be sent
 * in the apikey header only. Legacy JWT keys are sent in both headers.
 */
export function storageAuthHeaders(key: string): Record<string, string> {
  return key.startsWith('sb_') ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
}
