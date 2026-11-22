import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { request } from '../api/client';

export type Picked = { uri: string; width: number; height: number };
type Ticket = { exists: boolean; path: string; publicUrl: string; token?: string };

const MAX_WIDTH = 1600;
const MARKER = '/storage/v1/object/public/';

/** Opens the gallery or the camera. Returns null when the person closes it without choosing. */
export async function pickPhoto(source: 'library' | 'camera'): Promise<Picked | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Allow camera access in your phone settings to take a photo.');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9, allowsEditing: false, exif: false };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return { uri: a.uri, width: a.width, height: a.height };
}

/** Shrinks big phone photos and always produces a JPEG (also turns HEIC photos into something every platform accepts). */
async function prepare(p: Picked): Promise<string> {
  let ctx = ImageManipulator.manipulate(p.uri);
  if (p.width > MAX_WIDTH) ctx = ctx.resize({ width: MAX_WIDTH });
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  return out.uri;
}

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Uploads a photo to the workspace's media storage and returns its public link.
 * The API checks the workspace, type and size and hands back a one-time upload token (or the link of an identical
 * file that is already stored); the bytes then go straight to storage.
 */
export async function uploadPhoto(workspaceId: string, picked: Picked): Promise<string> {
  const jpegUri = await prepare(picked);
  const bytes = await new File(jpegUri).bytes();
  const sha256 = hex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes));

  const ticket = await request<Ticket>(`/assets/${workspaceId}/upload-url`, {
    method: 'POST',
    body: { fileName: 'photo.jpg', mimeType: 'image/jpeg', sizeBytes: bytes.byteLength, sha256 },
  });
  if (ticket.exists || !ticket.token) return ticket.publicUrl;

  const i = ticket.publicUrl.indexOf(MARKER);
  if (i < 0) throw new Error('Could not upload the photo. Please try again.');
  const base = ticket.publicUrl.slice(0, i);
  const rest = ticket.publicUrl.slice(i + MARKER.length);
  let res: Awaited<ReturnType<typeof expoFetch>>;
  try {
    res = await expoFetch(`${base}/storage/v1/object/upload/sign/${rest}?token=${encodeURIComponent(ticket.token)}`, {
      method: 'PUT',
      headers: { 'content-type': 'image/jpeg', 'cache-control': 'max-age=3600' },
      body: bytes as never,
    });
  } catch {
    throw new Error('Cannot reach eWork Social. Check your internet connection and try again.');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // Two uploads of the same photo at once: the second finds it already stored.
    if (!/exists|duplicate/i.test(text)) throw new Error('Could not upload the photo. Please try again.');
  }
  return ticket.publicUrl;
}

/** Instagram only accepts photos from 4:5 (tall) to 1.91:1 (wide). */
const IG_MIN = 0.8;
const IG_MAX = 1.91;

export function needsInstagramCrop(p: { width: number; height: number }): boolean {
  if (!p.width || !p.height) return false;
  const r = p.width / p.height;
  return r < IG_MIN - 0.005 || r > IG_MAX + 0.005;
}

/** Centre-crops a photo to the nearest shape Instagram accepts. */
export async function cropForInstagram(p: Picked): Promise<Picked> {
  const r = p.width / p.height;
  let w = p.width;
  let h = p.height;
  if (r < IG_MIN) h = Math.floor(p.width / IG_MIN);
  else if (r > IG_MAX) w = Math.floor(p.height * IG_MAX);
  const ctx = ImageManipulator.manipulate(p.uri).crop({
    originX: Math.floor((p.width - w) / 2),
    originY: Math.floor((p.height - h) / 2),
    width: w,
    height: h,
  });
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
  return { uri: out.uri, width: out.width, height: out.height };
}
