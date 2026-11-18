import { isPrivateIp, validateWebhookUrl } from './webhook-url.util';

describe('isPrivateIp', () => {
  it('flags private, loopback, link-local and reserved IPv4', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.1', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '224.0.0.1', '255.255.255.255']) {
      expect(isPrivateIp(ip)).toBe(true);
    }
  });

  it('allows ordinary public IPv4', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '172.15.0.1', '203.0.113.5']) {
      expect(isPrivateIp(ip)).toBe(false);
    }
  });

  it('flags private IPv6 and mapped IPv4', () => {
    for (const ip of ['::1', '::', 'fe80::1', 'fd00::1', 'fc00::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:10.0.0.1']) {
      expect(isPrivateIp(ip)).toBe(true);
    }
    expect(isPrivateIp('2606:4700:4700::1111')).toBe(false);
  });

  it('treats non-IP strings as unsafe', () => {
    expect(isPrivateIp('not-an-ip')).toBe(true);
    expect(isPrivateIp('')).toBe(true);
  });
});

describe('validateWebhookUrl', () => {
  it('accepts normal automation-platform URLs', () => {
    for (const u of [
      'https://hooks.zapier.com/hooks/catch/123/abc/',
      'https://hook.eu1.make.com/abcdef',
      'https://n8n.example.com:5678/webhook/x',
      'https://8.8.8.8/hook',
    ]) {
      expect(validateWebhookUrl(u).ok).toBe(true);
    }
  });

  it('refuses non-https, credentials and junk', () => {
    for (const u of ['http://hooks.zapier.com/x', 'ftp://x.com', 'https://user:pw@hooks.zapier.com/x', 'nonsense', '', undefined, null, 42]) {
      expect(validateWebhookUrl(u as any).ok).toBe(false);
    }
  });

  it('refuses internal targets however they are written', () => {
    for (const u of [
      'https://localhost/x',
      'https://127.0.0.1/x',
      'https://[::1]/x',
      'https://169.254.169.254/latest/meta-data',
      'https://10.0.0.5/x',
      'https://2130706433/x',
      'https://[::ffff:127.0.0.1]/x',
      'https://intranet/x',
      'https://db.internal/x',
      'https://printer.local/x',
    ]) {
      expect(validateWebhookUrl(u).ok).toBe(false);
    }
  });
});
