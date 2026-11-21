import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Text } from '../../../ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { request } from '../../../api/client';
import { useAuth } from '../../../auth/AuthContext';
import { Button, ErrorText, Pill } from '../../../ui';
import { router, useLocalSearchParams } from 'expo-router';
import { EmptyState, FilterChips, platformName, when } from '../../../posts/components';
import type { PostItem } from '../../../posts/components';
import { colors, platformColors, radius, space, type } from '../../../theme';

type Approval = {
  id: string;
  status: string;
  clientName: string;
  clientEmail: string;
  revisionNote: string | null;
  sentAt: string;
  respondedAt: string | null;
  post: PostItem | null;
};

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'PENDING', label: 'Waiting' },
  { id: 'REVISION_REQUESTED', label: 'Changes asked' },
  { id: 'APPROVED', label: 'Approved' },
];

const EMPTY_TEXT: Record<string, string> = {
  '': 'When you send a post to a client for approval, or share a draft for review, it shows up here.',
  PENDING: 'Nothing is waiting on a reply right now.',
  REVISION_REQUESTED: 'No client has asked for changes.',
  APPROVED: 'No approved posts yet.',
};

function meta(status: string): { label: string; color: string; soft: string } {
  if (status === 'APPROVED') return { label: 'Approved', color: colors.ok, soft: colors.okSoft };
  if (status === 'REVISION_REQUESTED') return { label: 'Changes asked', color: colors.danger, soft: colors.dangerSoft };
  return { label: 'Waiting', color: colors.warn, soft: colors.warnSoft };
}

export default function Approvals() {
  const { workspace } = useAuth();
  const wid = workspace?.id;
  const [filter, setFilter] = useState('');
  const params = useLocalSearchParams<{ status?: string; t?: string }>();
  // A tap on a Home item arrives with ?status=...: show that filter. t makes a repeat tap count as new.
  useEffect(() => {
    if (params.status === undefined) return;
    setFilter(FILTERS.some((f) => f.id === params.status) ? String(params.status) : '');
  }, [params.status, params.t]);
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!wid) {
        setLoading(false);
        return;
      }
      const id = ++seq.current;
      if (mode === 'initial') setLoading(true);
      setError(null);
      try {
        const r = await request<{ items: Approval[] }>(
          `/mobile/v1/workspaces/${wid}/approvals${filter ? `?status=${filter}` : ''}`,
        );
        if (id === seq.current) setItems(r.items);
      } catch (err: any) {
        if (id === seq.current) setError(err?.message || 'Could not load approvals.');
      } finally {
        if (id === seq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [wid, filter],
  );

  useEffect(() => {
    setItems([]);
    void load('initial');
  }, [load]);

  const header = (
    <View style={{ paddingTop: space.md }}>
      <Text style={styles.title}>Approvals</Text>
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View pointerEvents="none" style={styles.glow} />
      <FlatList
        data={loading ? [] : items}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <ApprovalCard a={item} onPress={item.post ? () => router.navigate(`/post?id=${item.post!.id}` as never) : undefined} />
        )}
        ListHeaderComponent={header}
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
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primaryBright} style={{ marginTop: 48 }} />
          ) : error ? (
            <View>
              <ErrorText>{error}</ErrorText>
              <Button title="Try again" variant="secondary" onPress={() => void load('initial')} />
            </View>
          ) : (
            <EmptyState icon="✓" title="Nothing here" text={EMPTY_TEXT[filter] ?? EMPTY_TEXT['']} />
          )
        }
      />
    </SafeAreaView>
  );
}

function ApprovalCard({ a, onPress }: { a: Approval; onPress?: () => void }) {
  const m = meta(a.status);
  const stripe = a.status === 'APPROVED' ? colors.ok : a.status === 'REVISION_REQUESTED' ? colors.danger : colors.warn;
  const accent = platformColors[a.post?.platform ?? ''] ?? colors.primaryBright;
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.88 }]}>
      <View style={[styles.stripe, { backgroundColor: stripe }]} />
      <View style={{ flex: 1, padding: space.md }}>
        <View style={styles.top}>
          <Text style={styles.client} numberOfLines={1}>
            {a.clientName}
          </Text>
          <Pill label={m.label} color={m.color} soft={m.soft} />
        </View>
        {a.post ? (
          <>
            <Text style={[styles.meta, { color: accent }]} numberOfLines={1}>
              {platformName(a.post.platform)}
              {a.post.accountName ? ` · ${a.post.accountName}` : ''}
            </Text>
            <Text style={styles.text} numberOfLines={3}>
              {a.post.content || '(no text)'}
            </Text>
          </>
        ) : (
          <Text style={styles.muted}>This post is no longer available.</Text>
        )}
        {a.status === 'REVISION_REQUESTED' && a.revisionNote ? (
          <View style={styles.note}>
            <Text style={styles.noteLabel}>They asked for</Text>
            <Text style={styles.noteText}>{a.revisionNote}</Text>
          </View>
        ) : null}
        <View style={styles.timeRow}>
          <Feather
            name={(a.status === 'APPROVED' ? 'check-circle' : a.status === 'REVISION_REQUESTED' ? 'message-circle' : 'clock') as never}
            size={13}
            color={m.color}
          />
          <Text style={styles.time}>
            {a.respondedAt ? `Replied ${when(a.respondedAt, '')}` : `Sent ${when(a.sentAt, '')}`}
          </Text>
        </View>
      </View>
    </Pressable>
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
    opacity: 0.14,
  },
  content: { paddingHorizontal: space.lg, paddingBottom: 32 },
  title: { color: colors.text, ...type.title, fontSize: 30, lineHeight: 38, marginBottom: space.md },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginBottom: 12,
    overflow: 'hidden',
  },
  stripe: { width: 4 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  client: { color: colors.text, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  meta: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  text: { color: colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 14 },
  note: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: 12, marginTop: 10 },
  noteLabel: { color: colors.danger, fontSize: 12, fontWeight: '800', marginBottom: 4 },
  noteText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  time: { color: colors.muted, fontSize: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
});
