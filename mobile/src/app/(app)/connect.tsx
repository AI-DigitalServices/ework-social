import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { request } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { StepHero } from '../../onboarding/delight';
import PlatformIcon from '../../platform';
import { Button, Card, FadeIn, Pill, Screen, Text } from '../../ui';
import { colors, radius, space } from '../../theme';

// The API sends the user here when the provider is done (MOBILE_OAUTH_RETURN_URL on the server).
const RETURN_URL = 'eworksocial://oauth-return';

type Account = { id: string; platform: string; accountName: string };

// Everything the web dashboard can connect. These go live one by one.
const LATER: { platform: string; label: string; hint: string }[] = [
  { platform: 'LINKEDIN', label: 'LinkedIn', hint: 'Profiles and company pages' },
  { platform: 'TWITTER', label: 'X', hint: 'Short updates' },
  { platform: 'TIKTOK', label: 'TikTok', hint: 'Short videos' },
  { platform: 'YOUTUBE', label: 'YouTube', hint: 'Videos and Shorts' },
  { platform: 'THREADS', label: 'Threads', hint: 'Casual text posts' },
  { platform: 'BLUESKY', label: 'Bluesky', hint: 'Short posts' },
];

function platformName(p: string): string {
  if (p === 'TWITTER') return 'X';
  return p.charAt(0) + p.slice(1).toLowerCase();
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
  no_pages: 'We could not find a Facebook Page you manage. Instagram connects through a Facebook Page, so link yours first and try again.',
  failed: 'Something went wrong while connecting. Please try again.',
};

export default function Connect() {
  const router = useRouter();
  const { workspace } = useAuth();
  const wid = workspace?.id;
  const canConnect = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

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

  const connectMeta = async () => {
    if (!wid) return;
    setBusy(true);
    setNote(null);
    const before = accounts.length;
    try {
      const r = await request<{ url?: string; authUrl?: string }>(
        `/social/facebook/auth-url?workspaceId=${encodeURIComponent(wid)}&client=app`,
      );
      const url = r.url ?? r.authUrl;
      if (!url) throw new Error('We could not start the connection. Please try again.');

      const result = await WebBrowser.openAuthSessionAsync(url, RETURN_URL);
      const outcome = result.type === 'success' ? readOutcome(result.url) : {};

      // Whatever the browser says, trust the server: look at what is actually connected now.
      const list = await refresh().catch(() => accounts);
      if (outcome.error) {
        setNote({ ok: false, text: ERRORS[outcome.error] ?? ERRORS.failed });
      } else if (list.length > before || outcome.ok) {
        setNote({ ok: true, text: 'Connected. You can now schedule posts to it.' });
      }
    } catch (err: any) {
      setNote({ ok: false, text: err?.message || 'Could not connect. Please try again.' });
    } finally {
      setBusy(false);
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
        <Card tone="primary">
          <View style={styles.pair}>
            <PlatformIcon platform="FACEBOOK" size={44} />
            <PlatformIcon platform="INSTAGRAM" size={44} />
          </View>
          <Text style={styles.cardTitle}>Facebook and Instagram</Text>
          <Text style={styles.sub}>
            Connects the Facebook Pages you manage, and the Instagram business accounts linked to them.
          </Text>
          <View style={{ height: 14 }} />
          {canConnect ? (
            <Button title={busy ? 'Opening Facebook...' : 'Connect'} onPress={() => void connectMeta()} loading={busy} />
          ) : (
            <Text style={styles.sub}>Only the owner or an admin of this workspace can connect accounts.</Text>
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
