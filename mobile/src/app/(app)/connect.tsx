import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { ActionRow, ActionTile } from '../../actions';
import { request } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import PlatformIcon from '../../platform';
import { Button, Card, ErrorText, Field, Pill, Screen, Text } from '../../ui';
import { colors, radius, space } from '../../theme';

// The API sends the user here when the provider is done (MOBILE_OAUTH_RETURN_URL on the server).
const RETURN_URL = 'eworksocial://oauth-return';

type Account = { id: string; platform: string; accountName: string };

type Provider = {
  id: string;
  platforms: string[];
  title: string;
  short: string; // one line for the list
  tile: string; // label on the "add or reconnect" tile inside a platform's sheet
  path: string;
  noPages?: string;
};

// Providers that sign in through the browser. Each route already supports "started from the app".
const PROVIDERS: Provider[] = [
  {
    id: 'meta',
    platforms: ['FACEBOOK', 'INSTAGRAM'],
    title: 'Facebook and Instagram',
    short: 'Your Pages and linked Instagram',
    tile: 'Reconnect',
    path: '/social/facebook/auth-url',
    noPages: 'We could not find a Facebook Page you manage. Instagram connects through a Facebook Page, so link yours first and try again.',
  },
  { id: 'linkedin', platforms: ['LINKEDIN'], title: 'LinkedIn profile', short: 'Post as yourself', tile: 'Profile', path: '/social/linkedin/auth-url' },
  {
    id: 'linkedin-org',
    platforms: ['LINKEDIN'],
    title: 'LinkedIn Company Page',
    short: 'Post to a page you manage',
    tile: 'Company page',
    path: '/social/linkedin-org/auth-url',
    noPages: 'We could not find a LinkedIn Company Page you manage.',
  },
  { id: 'threads', platforms: ['THREADS'], title: 'Threads', short: 'Your Threads profile', tile: 'Reconnect', path: '/social/threads/auth-url' },
  { id: 'youtube', platforms: ['YOUTUBE'], title: 'YouTube channel', short: 'Video posting coming soon', tile: 'Reconnect', path: '/social/youtube/auth-url' },
  { id: 'tiktok', platforms: ['TIKTOK'], title: 'TikTok', short: 'Video posting coming soon', tile: 'Reconnect', path: '/social/tiktok/auth-url' },
  { id: 'x', platforms: ['TWITTER'], title: 'X', short: 'Short updates', tile: 'Reconnect', path: '/twitter/auth-url' },
];

/** Which sign-in can add or reconnect each platform. Bluesky signs in with a form instead. */
const PLATFORM_PROVIDERS: Record<string, string[]> = {
  FACEBOOK: ['meta'],
  INSTAGRAM: ['meta'],
  LINKEDIN: ['linkedin', 'linkedin-org'],
  THREADS: ['threads'],
  YOUTUBE: ['youtube'],
  TIKTOK: ['tiktok'],
  TWITTER: ['x'],
  BLUESKY: [],
};

const ORDER = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'THREADS', 'TWITTER', 'YOUTUBE', 'TIKTOK', 'BLUESKY'];

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

/** One compact row: icon(s), title, one line, then whatever belongs on the right. */
function Row({
  icons,
  title,
  sub,
  right,
  onPress,
  disabled,
}: {
  icons: string[];
  title: string;
  sub: string;
  right: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || disabled}
      style={({ pressed }) => [styles.row, disabled && { opacity: 0.5 }, pressed && { backgroundColor: colors.cardAlt }]}
    >
      <View style={styles.icons}>
        {icons.map((p) => (
          <PlatformIcon key={p} platform={p} size={icons.length > 1 ? 26 : 38} />
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {right}
    </Pressable>
  );
}

export default function Connect() {
  const router = useRouter();
  const { workspace } = useAuth();
  const wid = workspace?.id;
  const canConnect = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  // the platform whose sheet is open, and the Bluesky sheet
  const [manage, setManage] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
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

  const disconnect = (a: Account) => {
    if (!wid) return;
    Alert.alert(`Disconnect ${a.accountName}?`, 'Posts scheduled to it will not be published. You can connect it again any time.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          setBusy(`d:${a.id}`);
          setSheetError(null);
          try {
            await request(`/social/accounts/${a.id}?workspaceId=${encodeURIComponent(wid)}`, {
              method: 'DELETE',
              body: { workspaceId: wid },
            });
            const list = await refresh().catch(() => accounts);
            if (!list.some((x) => x.platform === a.platform)) setManage(null);
            setNote({ ok: true, text: `${a.accountName} disconnected.` });
          } catch (err: any) {
            setSheetError(friendly(err, 'Could not disconnect. Please try again.'));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  /** A sheet must finish closing before the browser (or another sheet) opens over it. */
  const afterSheet = (fn: () => void) => {
    setManage(null);
    setTimeout(fn, 350);
  };

  const extras = Array.from(new Set(accounts.map((a) => a.platform))).filter((p) => !ORDER.includes(p));
  const groups = [...ORDER, ...extras]
    .map((platform) => ({ platform, items: accounts.filter((a) => a.platform === platform) }))
    .filter((g) => g.items.length > 0);

  const sheetItems = manage ? accounts.filter((a) => a.platform === manage) : [];
  const sheetProviders = manage ? (PLATFORM_PROVIDERS[manage] ?? []).map((id) => PROVIDERS.find((p) => p.id === id)!).filter(Boolean) : [];

  return (
    <Screen>
      <Pressable hitSlop={12} onPress={() => router.back()} style={{ marginBottom: 10 }}>
        <Text style={styles.back}>‹  Back</Text>
      </Pressable>

      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Accounts</Text>
          <Text style={styles.sub}>Connect, manage and disconnect.</Text>
        </View>
        {accounts.length > 0 ? (
          <Pill label={`${accounts.length} connected`} color={colors.ok} soft={colors.okSoft} />
        ) : null}
      </View>

      {note ? (
        <Card tone={note.ok ? 'ok' : 'danger'}>
          <Text style={styles.noteText}>{note.text}</Text>
        </Card>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primaryBright} style={{ marginVertical: 24 }} />
      ) : (
        <>
          <Text style={styles.cap}>Your accounts</Text>
          {groups.length === 0 ? (
            <Text style={[styles.sub, { marginBottom: space.md }]}>Nothing connected yet. Add your first account below.</Text>
          ) : (
            <View style={styles.list}>
              {groups.map((g, i) => (
                <View key={g.platform} style={i > 0 ? styles.sep : undefined}>
                  <Row
                    icons={[g.platform]}
                    title={platformName(g.platform)}
                    sub={g.items.length === 1 ? g.items[0].accountName : `${g.items.length} accounts`}
                    onPress={() => {
                      setSheetError(null);
                      setManage(g.platform);
                    }}
                    right={
                      <View style={styles.rightRow}>
                        <Pill label="Connected" color={colors.ok} soft={colors.okSoft} />
                        <Feather name="chevron-right" size={20} color={colors.muted} />
                      </View>
                    }
                  />
                </View>
              ))}
            </View>
          )}

          <Text style={styles.cap}>Add an account</Text>
          <View style={styles.list}>
            {PROVIDERS.map((p, i) => (
              <View key={p.id} style={i > 0 ? styles.sep : undefined}>
                <Row
                  icons={p.platforms}
                  title={p.title}
                  sub={p.short}
                  disabled={!canConnect || (busy !== null && busy !== p.id)}
                  onPress={canConnect ? () => void connect(p) : undefined}
                  right={
                    busy === p.id ? (
                      <ActivityIndicator color={colors.primaryBright} />
                    ) : canConnect ? (
                      <View style={styles.connectBtn}>
                        <Text style={styles.connectText}>Connect</Text>
                      </View>
                    ) : null
                  }
                />
              </View>
            ))}
            <View style={styles.sep}>
              <Row
                icons={['BLUESKY']}
                title="Bluesky"
                sub="Handle and app password"
                disabled={!canConnect || busy !== null}
                onPress={canConnect ? () => { setBskyError(null); setBsky(true); } : undefined}
                right={
                  canConnect ? (
                    <View style={styles.connectBtn}>
                      <Text style={styles.connectText}>Connect</Text>
                    </View>
                  ) : null
                }
              />
            </View>
          </View>
          {!canConnect ? <Text style={[styles.sub, { marginTop: 10 }]}>Only the owner or an admin of this workspace can connect or disconnect accounts.</Text> : null}
        </>
      )}

      {/* Manage one platform: see its accounts, disconnect one, add or reconnect */}
      <Modal visible={!!manage && sheetItems.length > 0} transparent animationType="slide" onRequestClose={() => setManage(null)}>
        <Pressable style={styles.backdrop} onPress={() => setManage(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <PlatformIcon platform={manage ?? ''} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{platformName(manage ?? '')}</Text>
                <Text style={styles.sub}>
                  {sheetItems.length} {sheetItems.length === 1 ? 'account' : 'accounts'} connected
                </Text>
              </View>
            </View>

            {sheetItems.map((a, i) => (
              <View key={a.id} style={[styles.acct, i > 0 && styles.sep]}>
                <Text style={styles.acctName} numberOfLines={1}>
                  {a.accountName}
                </Text>
                {canConnect ? (
                  <Pressable
                    hitSlop={8}
                    disabled={busy !== null}
                    onPress={() => disconnect(a)}
                    style={({ pressed }) => [styles.disc, pressed && { opacity: 0.7 }, busy !== null && { opacity: 0.5 }]}
                  >
                    {busy === `d:${a.id}` ? (
                      <ActivityIndicator color={colors.danger} size="small" />
                    ) : (
                      <Text style={styles.discText}>Disconnect</Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            ))}

            <ErrorText>{sheetError}</ErrorText>

            {canConnect && (sheetProviders.length > 0 || manage === 'BLUESKY') ? (
              <View style={{ marginTop: space.md }}>
                <Text style={styles.cap}>Add or reconnect</Text>
                <ActionRow>
                  {sheetProviders.map((p) => (
                    <ActionTile
                      key={p.id}
                      label={p.tile}
                      icon={(c) => <Feather name="plus" size={22} color={c} />}
                      onPress={() => afterSheet(() => void connect(p))}
                    />
                  ))}
                  {manage === 'BLUESKY' ? (
                    <ActionTile
                      label="Reconnect"
                      icon={(c) => <Feather name="plus" size={22} color={c} />}
                      onPress={() => afterSheet(() => { setBskyError(null); setBsky(true); })}
                    />
                  ) : null}
                </ActionRow>
              </View>
            ) : null}
            {!canConnect ? <Text style={[styles.sub, { marginTop: 10 }]}>Only the owner or an admin can change connected accounts.</Text> : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bluesky signs in with a form, so it gets its own small sheet */}
      <Modal visible={bsky} transparent animationType="slide" onRequestClose={() => setBsky(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={() => (busy === null ? setBsky(false) : undefined)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.handle} />
              <View style={styles.sheetHead}>
                <PlatformIcon platform="BLUESKY" size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>Connect Bluesky</Text>
                  <Text style={styles.sub}>Use an app password, not your normal one.</Text>
                </View>
              </View>
              <Field label="Your handle" value={handle} onChangeText={setHandle} placeholder="name.bsky.social" autoCapitalize="none" />
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
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.primaryBright, fontSize: 15, fontWeight: '600' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: space.md },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  cap: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  noteText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  sub: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  list: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: space.md,
  },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 64 },
  icons: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 38 },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  connectBtn: {
    borderWidth: 1.5,
    borderColor: colors.primaryBright,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  connectText: { color: colors.primaryBright, fontSize: 13, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingTop: 10,
    paddingBottom: 34,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  sheetTitle: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  acct: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  acctName: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  disc: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 92,
    alignItems: 'center',
  },
  discText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
});
