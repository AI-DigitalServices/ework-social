import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { request } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { StepHero } from '../../onboarding/delight';
import PlatformIcon from '../../platform';
import { Button, Card, ErrorText, FadeIn, Field, Pill, Screen, Text } from '../../ui';
import { colors, radius, space } from '../../theme';

// The API sends the user here when the provider is done (MOBILE_OAUTH_RETURN_URL on the server).
const RETURN_URL = 'eworksocial://oauth-return';

type Account = { id: string; platform: string; accountName: string };

type Provider = {
  id: string;
  platforms: string[];
  title: string;
  text: string;
  path: string;
  noPages?: string;
};

// Providers that sign in through the browser. Each route already supports "started from the app".
const PROVIDERS: Provider[] = [
  {
    id: 'meta',
    platforms: ['FACEBOOK', 'INSTAGRAM'],
    title: 'Facebook and Instagram',
    text: 'Connects the Facebook Pages you manage, and the Instagram business accounts linked to them.',
    path: '/social/facebook/auth-url',
    noPages: 'We could not find a Facebook Page you manage. Instagram connects through a Facebook Page, so link yours first and try again.',
  },
  {
    id: 'linkedin',
    platforms: ['LINKEDIN'],
    title: 'LinkedIn profile',
    text: 'Post to your personal LinkedIn profile.',
    path: '/social/linkedin/auth-url',
  },
  {
    id: 'linkedin-org',
    platforms: ['LINKEDIN'],
    title: 'LinkedIn Company Page',
    text: 'Post to a company page you manage.',
    path: '/social/linkedin-org/auth-url',
    noPages: 'We could not find a LinkedIn Company Page you manage.',
  },
  {
    id: 'threads',
    platforms: ['THREADS'],
    title: 'Threads',
    text: 'Post to your Threads profile.',
    path: '/social/threads/auth-url',
  },
];

// Still to come in the app. The web dashboard connects these today.
const LATER: { platform: string; label: string; hint: string }[] = [
  { platform: 'TWITTER', label: 'X', hint: 'Short updates' },
  { platform: 'TIKTOK', label: 'TikTok', hint: 'Short videos' },
  { platform: 'YOUTUBE', label: 'YouTube', hint: 'Videos and Shorts' },
];

function platformName(p: string): string {
  if (p === 'TWITTER') return 'X';
  return p.charAt(0) + p.slice(1).toLowerCase();
}

/** Server setup messages are for us, not for customers. */
function friendly(err: any, fallback: string): string {
  const m = String(err?.message || '');
  if (/not configured/i.test(m)) return 'This connection is not available yet. We are still setting it up.';
  return m || fallback;
}

/** Reads success= / error= off the return address, if the browser handed it back. */
function readOutcome(url: string | undefined): { ok?: boolean; error?: string } {
  if (!url) return {};
  const q = url.split('?')[1] ?? '';
  const pairs = q.split('&').map((kv) => kv.split('='));
  const get = (k: string) => pairs.find((p) => p[0] === k)?.[1];
  if (get('error')) return { error: get('error') };
  if (get('success')) return { ok: true };
  return {};
}

const ERRORS: Record<string, string> = {
  cancelled: 'Connection cancelled. Nothing was changed.',
  failed: 'Something went wrong while connecting. Please try again.',
};

export default function Connect() {
  const router = useRouter();
  const { workspace } = useAuth();
  const wid = workspace?.id;
  const canConnect = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const [bsky, setBsky] = useState(false);
  const [handle, setHandle] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [bskyError, setBskyError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<Account[]> => {
    if (!wid) return [];
    const h = await request<{ accounts: Account[] }>(`/mobile/v1/workspaces/${wid}/home`);
    const list = h.accounts ?? [];
    setAccounts(list);
    return list;
  }, [wid]);

  useEffect(() => {
    refresh()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh]);

  const connect = async (p: Provider) => {
    if (!wid) return;
    setBusy(p.id);
    setNote(null);
    const before = accounts.length;
    try {
      const r = await request<{ url?: string; authUrl?: string }>(`${p.path}?workspaceId=${encodeURIComponent(wid)}&client=app`);
      const url = r.url ?? r.authUrl;
      if (!url) throw new Error('We could not start the connection. Please try again.');

      const result = await WebBrowser.openAuthSessionAsync(url, RETURN_URL);
      const outcome = result.type === 'success' ? readOutcome(result.url) : {};

      // Whatever the browser says, trust the server: look at what is actually connected now.
      const list = await refresh().catch(() => accounts);
      if (outcome.error) {
        const text = outcome.error === 'no_pages' && p.noPages ? p.noPages : (ERRORS[outcome.error] ?? ERRORS.failed);
        setNote({ ok: false, text });
      } else if (list.length > before || outcome.ok) {
        setNote({ ok: true, text: 'Connected. You can now schedule posts to it.' });
      }
    } catch (err: any) {
      setNote({ ok: false, text: friendly(err, 'Could not connect. Please try again.') });
    } finally {
      setBusy(null);
    }
  };

  const connectBluesky = async () => {
    if (!wid) return;
    setBusy('bluesky');
    setBskyError(null);
    setNote(null);
    try {
      await request(`/social/bluesky/connect`, {
        method: 'POST',
        body: { workspaceId: wid, identifier: handle.trim().replace(/^@/, ''), appPassword: appPassword.trim() },
      });
      await refresh().catch(() => []);
      setBsky(false);
      setHandle('');
      setAppPassword('');
      setNote({ ok: true, text: 'Bluesky connected. You can now schedule posts to it.' });
    } catch {
      setBskyError(
        'Bluesky did not accept that handle and app password. Use an app password, not your normal password. You can create one in Bluesky under Settings, Privacy and security, App passwords.',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Pressable hitSlop={12} onPress={() => router.back()} style={{ marginBottom: 14 }}>
        <Text style={styles.back}>‹  Back</Text>
      </Pressable>

      <StepHero
        icon="◉"
        kicker="Your channels"
        title="Connect your accounts"
        sub="Once an account is connected, any post you write can be scheduled to it."
      />

      {note ? (
        <Card tone={note.ok ? 'ok' : 'danger'}>
          <Text style={styles.noteText}>{note.text}</Text>
        </Card>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primaryBright} style={{ marginVertical: 24 }} />
      ) : accounts.length > 0 ? (
        <FadeIn>
          <Text style={styles.cap}>Connected</Text>
          {accounts.map((a) => (
            <View key={a.id} style={styles.row}>
              <PlatformIcon platform={a.platform} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {a.accountName}
                </Text>
                <Text style={styles.sub}>{platformName(a.platform)}</Text>
              </View>
              <Pill label="Connected" color={colors.ok} soft={colors.okSoft} />
            </View>
          ))}
        </FadeIn>
      ) : null}

      <FadeIn delay={80}>
        <Text style={[styles.cap, { marginTop: 8 }]}>Add an account</Text>

        {PROVIDERS.map((p, i) => (
          <Card key={p.id} tone={i === 0 ? 'primary' : undefined}>
            <View style={styles.pair}>
              {p.platforms.map((pl) => (
                <PlatformIcon key={pl} platform={pl} size={44} />
              ))}
            </View>
            <Text style={styles.cardTitle}>{p.title}</Text>
            <Text style={styles.sub}>{p.text}</Text>
            <View style={{ height: 14 }} />
            {canConnect ? (
              <Button
                title={busy === p.id ? 'Opening...' : 'Connect'}
                variant={i === 0 ? 'primary' : 'secondary'}
                onPress={() => void connect(p)}
                loading={busy === p.id}
                disabled={busy !== null && busy !== p.id}
              />
            ) : (
              <Text style={styles.sub}>Only the owner or an admin of this workspace can connect accounts.</Text>
            )}
          </Card>
        ))}

        <Card>
          <View style={styles.pair}>
            <PlatformIcon platform="BLUESKY" size={44} />
          </View>
          <Text style={styles.cardTitle}>Bluesky</Text>
          <Text style={styles.sub}>Sign in with your handle and an app password.</Text>
          <View style={{ height: 14 }} />
          {!canConnect ? (
            <Text style={styles.sub}>Only the owner or an admin of this workspace can connect accounts.</Text>
          ) : bsky ? (
            <>
              <Field
                label="Your handle"
                value={handle}
                onChangeText={setHandle}
                placeholder="name.bsky.social"
                autoCapitalize="none"
              />
              <Field
                label="App password"
                value={appPassword}
                onChangeText={setAppPassword}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                secureTextEntry
                autoCapitalize="none"
              />
              <ErrorText>{bskyError}</ErrorText>
              <Button
                title="Connect Bluesky"
                onPress={() => void connectBluesky()}
                loading={busy === 'bluesky'}
                disabled={!handle.trim() || !appPassword.trim()}
              />
              <Button title="Cancel" variant="link" onPress={() => setBsky(false)} />
            </>
          ) : (
            <Button title="Connect" variant="secondary" onPress={() => setBsky(true)} disabled={busy !== null} />
          )}
        </Card>

        {LATER.map((l) => (
          <View key={l.platform} style={[styles.row, { opacity: 0.7 }]}>
            <PlatformIcon platform={l.platform} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{l.label}</Text>
              <Text style={styles.sub}>{l.hint}. Connect from the web dashboard for now.</Text>
            </View>
            <Pill label="Soon" color={colors.accent} soft={colors.accentSoft} />
          </View>
        ))}
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.primaryBright, fontSize: 15, fontWeight: '600' },
  cap: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  noteText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  sub: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  pair: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: space.sm + 4,
  },
});
