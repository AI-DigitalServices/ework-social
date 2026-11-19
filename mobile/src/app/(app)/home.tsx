import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { request } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Button, Card } from '../../ui';
import { colors, radius, space } from '../../theme';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { canSetUp } from '../../onboarding/api';
import type { OnboardingState } from '../../onboarding/api';
import { wasSkipped } from '../../onboarding/session';

type HomePost = {
  id: string;
  content: string;
  scheduledAt: string | null;
  errorMessage: string | null;
  mediaCount: number;
  platform: string | null;
  accountName: string | null;
};

type HomeData = {
  workspaceId: string;
  posts: { scheduled: number; drafts: number; failed: number; pendingApproval: number; publishedLast7Days: number };
  needsAttention: { failedPosts: number; awaitingClientApproval: number; unreadInbox: number; unreadNotifications: number };
  upcoming: HomePost[];
  recentFailures: HomePost[];
  accounts: { id: string; platform: string; accountName: string }[];
};

function platformName(p: string | null): string {
  if (!p) return 'Post';
  if (p === 'TWITTER') return 'X';
  return p.charAt(0) + p.slice(1).toLowerCase();
}

function when(iso: string | null): string {
  if (!iso) return 'Not scheduled';
  try {
    return new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function Home() {
  const { config, workspace, setActiveWorkspace, signOut } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const router = useRouter();
  const [onb, setOnb] = useState<OnboardingState | null>(null);

  const workspaceId = workspace?.id;

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!workspaceId) {
        setLoading(false);
        return;
      }
      if (mode === 'initial') setLoading(true);
      setError(null);
      try {
        const d = await request<HomeData>(`/mobile/v1/workspaces/${workspaceId}/home`);
        setData(d);
      } catch (err: any) {
        setError(err?.message || 'Could not load your home screen.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [workspaceId],
  );

  useEffect(() => {
    setData(null);
    void load('initial');
  }, [load]);

  // New businesses are guided through setup once. Existing customers never see it.
  useEffect(() => {
    if (!workspaceId || !canSetUp(workspace?.role)) return;
    let cancelled = false;
    request<OnboardingState>(`/mobile/v1/workspaces/${workspaceId}/onboarding`)
      .then((s) => {
        if (cancelled) return;
        setOnb(s);
        if (s.shouldOnboard && !wasSkipped()) router.replace('/onboarding' as Href);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [workspaceId, workspace?.role, router]);

  const firstName = (config?.user.name || '').split(' ')[0] || 'there';
  const ent = workspace?.entitlements ?? null;
  const attention = data
    ? [
        { n: data.needsAttention.failedPosts, text: 'posts failed to publish', color: colors.danger },
        { n: data.needsAttention.awaitingClientApproval, text: 'waiting for client approval', color: colors.warn },
        { n: data.needsAttention.unreadInbox, text: 'unread messages', color: colors.primaryBright },
      ].filter((a) => a.n > 0)
    : [];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load('refresh');
            }}
            tintColor={colors.primaryBright}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hi}>Hi {firstName}</Text>
            <Pressable onPress={() => (config && config.workspaces.length > 1 ? setPicker(true) : undefined)}>
              <Text style={styles.ws}>
                {workspace?.name ?? 'No workspace'}
                {config && config.workspaces.length > 1 ? '  ▾' : ''}
              </Text>
            </Pressable>
          </View>
        </View>

        {ent?.isTrialing ? (
          <View style={[styles.banner, { borderColor: colors.primaryBright }]}>
            <Text style={styles.bannerText}>
              Free trial: {ent.trialDaysLeft ?? 0} {ent.trialDaysLeft === 1 ? 'day' : 'days'} left
            </Text>
          </View>
        ) : null}
        {ent && !ent.canWrite ? (
          <View style={[styles.banner, { borderColor: colors.warn }]}>
            <Text style={styles.bannerText}>{ent.readOnlyReason || 'This workspace is read only right now.'}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.primaryBright} style={{ marginTop: 48 }} />
        ) : error ? (
          <Card>
            <Text style={styles.err}>{error}</Text>
            <Button title="Try again" onPress={() => void load('initial')} />
          </Card>
        ) : !data ? null : (
          <>
            {onb?.shouldOnboard ? (
              <Pressable onPress={() => router.push('/onboarding' as Href)}>
                <View style={[styles.banner, { borderColor: colors.primaryBright }]}>
                  <Text style={styles.bannerText}>Finish setting up your business</Text>
                  <Text style={styles.muted}>A few quick questions so your posts sound like you.</Text>
                </View>
              </Pressable>
            ) : null}
            <Text style={styles.section}>Needs your attention</Text>
            <Card>
              {attention.length === 0 ? (
                <Text style={styles.muted}>You are all caught up.</Text>
              ) : (
                attention.map((a) => (
                  <View key={a.text} style={styles.row}>
                    <Text style={[styles.count, { color: a.color }]}>{a.n}</Text>
                    <Text style={styles.rowText}>{a.text}</Text>
                  </View>
                ))
              )}
            </Card>

            <View style={styles.grid}>
              <Stat label="Scheduled" value={data.posts.scheduled} />
              <Stat label="Drafts" value={data.posts.drafts} />
              <Stat label="Published (7 days)" value={data.posts.publishedLast7Days} />
              <Stat label="Awaiting approval" value={data.posts.pendingApproval} />
            </View>

            <Text style={styles.section}>Coming up</Text>
            {data.upcoming.length === 0 ? (
              <Card>
                <Text style={styles.muted}>Nothing scheduled yet. Your next posts will show up here.</Text>
              </Card>
            ) : (
              data.upcoming.map((p) => <PostRow key={p.id} post={p} />)
            )}

            {data.recentFailures.length > 0 ? (
              <>
                <Text style={styles.section}>Needs fixing</Text>
                {data.recentFailures.map((p) => (
                  <PostRow key={p.id} post={p} failed />
                ))}
              </>
            ) : null}

            <Text style={styles.section}>Connected accounts</Text>
            <Card>
              {data.accounts.length === 0 ? (
                <Text style={styles.muted}>No accounts connected yet. Connecting from the app is coming next.</Text>
              ) : (
                <View style={styles.chips}>
                  {data.accounts.map((a) => (
                    <View key={a.id} style={styles.chip}>
                      <Text style={styles.chipText}>
                        {platformName(a.platform)} · {a.accountName}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </>
        )}

        <View style={{ marginTop: space.lg }}>
          <Button title="Log out" variant="link" onPress={() => void signOut()} />
        </View>
      </ScrollView>

      <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPicker(false)}>
          <View style={styles.sheet}>
            <Text style={styles.section}>Switch workspace</Text>
            {(config?.workspaces ?? []).map((w) => (
              <Pressable
                key={w.id}
                style={styles.pick}
                onPress={() => {
                  setActiveWorkspace(w.id);
                  setPicker(false);
                }}
              >
                <Text style={[styles.rowText, w.id === workspace?.id && { color: colors.primaryBright, fontWeight: '700' }]}>
                  {w.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PostRow({ post, failed }: { post: HomePost; failed?: boolean }) {
  return (
    <Card>
      <Text style={styles.postMeta}>
        {platformName(post.platform)}
        {post.accountName ? ` · ${post.accountName}` : ''} · {failed ? 'Failed' : when(post.scheduledAt)}
      </Text>
      <Text style={styles.postText} numberOfLines={3}>
        {post.content || '(no text)'}
      </Text>
      {failed && post.errorMessage ? <Text style={styles.err}>{post.errorMessage}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space.md },
  hi: { color: colors.text, fontSize: 26, fontWeight: '800' },
  ws: { color: colors.muted, fontSize: 15, marginTop: 2 },
  banner: { borderWidth: 1, borderRadius: radius.md, padding: 12, marginBottom: space.md, backgroundColor: colors.card },
  bannerText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  section: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: space.md, marginBottom: space.sm },
  muted: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  count: { fontSize: 22, fontWeight: '800', width: 44 },
  rowText: { color: colors.text, fontSize: 15, flexShrink: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: space.sm },
  stat: {
    width: '48%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.md,
  },
  statValue: { color: colors.text, fontSize: 28, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 13, marginTop: 2 },
  postMeta: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  postText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  err: { color: colors.danger, fontSize: 13, marginTop: 6, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.cardAlt, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: colors.text, fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: space.lg },
  sheet: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md },
  pick: { paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
