import {
  MAX_UPLOAD_BYTES,
  buildMediaPath,
  storageAuthHeaders,
  validateUpload,
} from './media-upload.util';

const WS = 'cmml1f5io0001jxq6xj09b08i';
const SHA = 'a'.repeat(64);
const ok = { fileName: 'clip.mp4', mimeType: 'video/mp4', sizeBytes: 1024, sha256: SHA };

describe('media-upload util', () => {
  it('accepts a normal image, video and audio upload', () => {
    expect(validateUpload(WS, ok)).toBeNull();
    expect(validateUpload(WS, { ...ok, mimeType: 'image/png' })).toBeNull();
    expect(validateUpload(WS, { ...ok, mimeType: 'audio/mpeg' })).toBeNull();
  });

  it('rejects unsupported types', () => {
    expect(validateUpload(WS, { ...ok, mimeType: 'application/x-msdownload' })).toMatch(/Unsupported/);
    expect(validateUpload(WS, { ...ok, mimeType: '' })).toMatch(/Unsupported/);
  });

  it('rejects files over the size limit and invalid sizes', () => {
    expect(validateUpload(WS, { ...ok, sizeBytes: MAX_UPLOAD_BYTES + 1 })).toMatch(/too large/);
    expect(validateUpload(WS, { ...ok, sizeBytes: MAX_UPLOAD_BYTES })).toBeNull();
    expect(validateUpload(WS, { ...ok, sizeBytes: 0 })).toMatch(/size/);
    expect(validateUpload(WS, { ...ok, sizeBytes: 1.5 })).toMatch(/size/);
  });

  it('rejects a bad checksum or workspace id', () => {
    expect(validateUpload(WS, { ...ok, sha256: 'xyz' })).toMatch(/checksum/);
    expect(validateUpload(WS, { ...ok, sha256: SHA.toUpperCase() })).toMatch(/checksum/);
    expect(validateUpload('../other', ok)).toMatch(/workspace/);
    expect(validateUpload('', ok)).toMatch(/workspace/);
  });

  it('builds the same path for the same content, whatever the file is called', () => {
    const a = buildMediaPath(WS, ok);
    const b = buildMediaPath(WS, { ...ok, fileName: 'renamed copy (2).MP4' });
    expect(a).toBe(`${WS}/${SHA}.mp4`);
    expect(b).toBe(a);
  });

  it('keeps workspaces separate and never lets the file name escape the folder', () => {
    expect(buildMediaPath('cmmkiwsh7000111enffefpcgs', ok)).not.toBe(buildMediaPath(WS, ok));
    const p = buildMediaPath(WS, { ...ok, mimeType: 'image/x-unknown', fileName: '../../etc/passwd' });
    expect(p).toBe(`${WS}/${SHA}.bin`);
  });

  it('falls back to the file extension for unlisted media types', () => {
    expect(buildMediaPath(WS, { ...ok, mimeType: 'image/heic', fileName: 'IMG_1.HEIC' })).toBe(`${WS}/${SHA}.heic`);
  });

  it('sends new-style secret keys in the apikey header only', () => {
    expect(storageAuthHeaders('sb_secret_abc')).toEqual({ apikey: 'sb_secret_abc' });
    expect(storageAuthHeaders('eyJ.x.y')).toEqual({ apikey: 'eyJ.x.y', Authorization: 'Bearer eyJ.x.y' });
  });
});
