import { createClient } from '@supabase/supabase-js';
import api from '@/lib/api';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Legacy direct upload with the public key. Kept ONLY as a fallback while the
// signed-upload endpoint rolls out; remove once the anon insert policies on the
// bucket are dropped (it will stop working at that point anyway).
async function legacyUpload(file: File, workspaceId: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const fileName = `${workspaceId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage
    .from('media')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from('media')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Uploads a file for a workspace and returns its public URL.
 * The backend checks membership, type and size, then either returns the URL of
 * an identical file that is already stored, or a one-time upload token.
 */
export async function uploadMedia(file: File, workspaceId: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return legacyUpload(file, workspaceId);

  let ticket: { exists: boolean; path: string; publicUrl: string; token?: string };
  try {
    const sha256 = await sha256Hex(file);
    const res = await api.post(`/assets/${workspaceId}/upload-url`, {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      sha256,
    });
    ticket = res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    // Endpoint not deployed (404) or not configured (503) yet → old behaviour.
    if (status === 404 || status === 502 || status === 503) return legacyUpload(file, workspaceId);
    const msg = err?.response?.data?.message;
    throw new Error(`Upload failed: ${Array.isArray(msg) ? msg.join(', ') : msg || err?.message || 'unknown error'}`);
  }

  if (ticket.exists || !ticket.token) return ticket.publicUrl;

  const { error } = await supabase.storage
    .from('media')
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      cacheControl: '3600',
      contentType: file.type,
    });

  // Two uploads of the same file at once: the second finds it already stored.
  if (error && !/exists|duplicate/i.test(error.message)) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return ticket.publicUrl;
}
