import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { request } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { canSetUp } from '../../onboarding/api';
import type { OnboardingState } from '../../onboarding/api';
import { wasSkipped } from '../../onboarding/session';
import { Avatar, Button, Card, ErrorText, FadeIn, Pill, SectionTitle } from '../../ui';
import { colors, platformColors, radius, shadow, space } from '../../theme';

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

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { config, workspace, setActiveWorkspace } = useAuth();
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

  const fullName = config?.user.name || '';
  const firstName = fullName.split(' ')[0] || 'there';
  const ent = workspace?.entitlements ?? null;
  const multi = !!config && config.workspaces.length > 1;
  const attention = data
    ? [
        { n: data.needsAttention.failedPosts, text: 'posts failed to publish', color: colors.danger, soft: colors.dangerSoft },
        { n: data.needsAttention.awaitingClientApproval, text: 'waiting for client approval', color: colors.warn, soft: colors.warnSoft },
        { n: data.needsAttention.unreadInbox, text: 'unread messages', color: colors.primaryBright, soft: colors.primarySoft },
      ].filter((a) => a.n > 0)
    : [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View pointerEvents="none" style={styles.glow} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
        <FadeIn>
          <View style={styles.header}>
            <Avatar name={fullName || firstName} />
            <View style={{ flex: 1 }}>
              <Text style={styles.hello}>{greeting()}</Text>
              <Text style={styles.hi}>{firstName}</Text>
            </View>
            <Pressable
              onPress={() => (multi ? setPicker(true) : undefined)}
              style={({ pressed }) => [styles.wsChip, pressed && multi && { opacity: 0.8 }]}
            >
              <Text style={styles.wsText} numberOfLines={1}>
                {workspace?.name ?? 'No workspace'}
                {multi ? '  ▾' : ''}
              </Text>
            </Pressable>
          </View>
        </FadeIn>

        {ent?.isTrialing ? (
          <FadeIn delay={60}>
            <View style={styles.trial}>
              <Pill label="Free trial" />
              <Text style={styles.trialText}>
                {ent.trialDaysLeft ?? 0} {ent.trialDaysLeft === 1 ? 'day' : 'days'} left to try everything
              </Text>
            </View>
          </FadeIn>
        ) : null}
        {ent && !ent.canWrite ? (
          <Card tone="warn">
            <Text style={styles.cardTitle}>{ent.readOnlyReason || 'This workspace is read only right now.'}</Text>
          </Card>
        ) : null}

        {onb?.shouldOnboard ? (
          <FadeIn delay={100}>
            <Card tone="primary" onPress={() => router.push('/onboarding' as Href)}>
              <Pill label="Quick setup" />
              <Text style={[styles.cardTitle, { marginTop: 10, fontSize: 18 }]}>Finish setting up your business</Text>
              <Text style={styles.muted}>A few quick questions so your posts sound like you.</Text>
              <Text style={styles.cta}>Continue  →</Text>
            </Card>
          </FadeIn>
        ) : null}

        {!onb?.shouldOnboard && canSetUp(workspace?.role) ? (
          <FadeIn delay={120}>
            <Card tone="accent" onPress={() => router.push('/idea' as Href)}>
              <Pill label="New" color={colors.accent} soft={colors.accentSoft} />
              <Text style={[styles.cardTitle, { marginTop: 10, fontSize: 18 }]}>Give us an idea</Text>
              <Text style={styles.muted}>One sentence, and we write three posts in your voice.</Text>
              <Text style={[styles.cta, { color: colors.accent }]}>Write a post  →</Text>
            </Card>
          </FadeIn>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.primaryBright} style={{ marginTop: 48 }} />
        ) : error ? (
          <>
            <ErrorText>{error}</ErrorText>
            <Button title="Try again" variant="secondary" onPress={() => void load('initial')} />
          </>
        ) : !data ? null : (
          <>
            <FadeIn delay={140}>
              <View style={styles.grid}>
                <Stat label="Scheduled" value={data.posts.scheduled} color={colors.primaryBright} soft={colors.primarySoft} />
                <Stat label="Drafts" value={data.posts.drafts} color={colors.accent} soft={colors.accentSoft} />
                <Stat label="Published, 7 days" value={data.posts.publishedLast7Days} color={colors.ok} soft={colors.okSoft} />
                <Stat label="Awaiting approval" value={data.posts.pendingApproval} color={colors.warn} soft={colors.warnSoft} />
              </View>
            </FadeIn>

            <FadeIn delay={200}>
              <SectionTitle>Needs your attention</SectionTitle>
              <Card>
                {attention.length === 0 ? (
                  <View style={styles.row}>
                    <View style={[styles.dot, { backgroundColor: colors.okSoft }]}>
                      <Text style={{ color: colors.ok, fontWeight: '900' }}>✓</Text>
                    </View>
                    <Text style={styles.rowText}>You are all caught up.</Text>
                  </View>
                ) : (
                  attention.map((a) => (
                    <View key={a.text} style={styles.row}>
                      <View style={[styles.dot, { backgroundColor: a.soft }]}>
                        <Text style={[styles.count, { color: a.color }]}>{a.n}</Text>
                      </View>
                      <Text style={styles.rowText}>{a.text}</Text>
                    </View>
                  ))
                )}
              </Card>
            </FadeIn>

            <FadeIn delay={260}>
              <SectionTitle>Coming up</SectionTitle>
              {data.upcoming.length === 0 ? (
                <Card>
                  <Text style={styles.cardTitle}>Nothing scheduled yet</Text>
                  <Text style={styles.muted}>Your next posts will show up here.</Text>
                </Card>
              ) : (
                data.upcoming.map((p) => <PostRow key={p.id} post={p} />)
              )}
            </FadeIn>

            {data.recentFailures.length > 0 ? (
              <>
                <SectionTitle>Needs fixing</SectionTitle>
                {data.recentFailures.map((p) => (
                  <PostRow key={p.id} post={p} failed />
                ))}
              </>
            ) : null}

            <SectionTitle>Connected accounts</SectionTitle>
            <Card>
              {data.accounts.length === 0 ? (
                <Text style={styles.muted}>No accounts connected yet. Connecting from the app is coming next.</Text>
              ) : (
                <View style={styles.chips}>
                  {data.accounts.map((a) => (
                    <View key={a.id} style={styles.chip}>
                      <View style={[styles.chipDot, { backgroundColor: platformColors[a.platform] ?? colors.primaryBright }]} />
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

      </ScrollView>

      <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPicker(false)}>
          <View style={styles.sheet}>
            <Text style={[styles.cardTitle, { marginBottom: space.sm }]}>Switch workspace</Text>
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

function Stat({ label, value, color, soft }: { label: string; value: number; color: string; soft: string }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statBar, { backgroundColor: soft }]}>
        <View style={[styles.statBarFill, { backgroundColor: color }]} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PostRow({ post, failed }: { post: HomePost; failed?: boolean }) {
  const color = platformColors[post.platform ?? ''] ?? colors.primaryBright;
  return (
    <View style={[styles.post, failed && { borderColor: colors.danger }]}>
      <View style={[styles.postStripe, { backgroundColor: failed ? colors.danger : color }]} />
      <View style={{ flex: 1, padding: space.md }}>
        <Text style={styles.postMeta}>
          {platformName(post.platform)}
          {post.accountName ? ` · ${post.accountName}` : ''}
          {'  ·  '}
          {failed ? 'Failed' : when(post.scheduledAt)}
        </Text>
        <Text style={styles.postText} numberOfLines={3}>
          {post.content || '(no text)'}
        </Text>
        {failed && post.errorMessage ? <Text style={styles.err}>{post.errorMessage}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  glow: {
    position: 'absolute',
    top: -200,
    right: -140,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: colors.primary,
    opacity: 0.16,
  },
  content: { padding: space.lg, paddingBottom: 56 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: space.lg },
  hello: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  hi: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  wsChip: {
    maxWidth: 150,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  wsText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  trial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: space.md,
  },
  trialText: { color: colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cta: { color: colors.primaryBright, fontSize: 15, fontWeight: '700', marginTop: 12 },
  muted: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 12 },
  dot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  count: { fontSize: 17, fontWeight: '800' },
  rowText: { color: colors.text, fontSize: 15, flexShrink: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: space.sm },
  stat: {
    width: '47.8%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow,
  },
  statBar: { height: 4, borderRadius: 2, marginBottom: 14, overflow: 'hidden' },
  statBarFill: { height: 4, width: '45%', borderRadius: 2 },
  statValue: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  statLabel: { color: colors.muted, fontSize: 13, marginTop: 2 },
  post: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginBottom: 12,
    overflow: 'hidden',
  },
  postStripe: { width: 4 },
  postMeta: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  postText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  err: { color: colors.danger, fontSize: 13, marginTop: 8, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: space.lg },
  sheet: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, borderWidth: 1, borderColor: colors.border },
  pick: { paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
