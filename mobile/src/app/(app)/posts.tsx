import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { request } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Button, ErrorText } from '../../ui';
import { EmptyState, FilterChips, PostCard } from '../../posts/components';
import type { PostItem } from '../../posts/components';
import { colors, space } from '../../theme';

type Page = { items: PostItem[]; nextCursor: string | null };

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'SCHEDULED', label: 'Scheduled' },
  { id: 'DRAFT', label: 'Drafts' },
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'PENDING_APPROVAL', label: 'Approval' },
  { id: 'FAILED', label: 'Failed' },
];

const EMPTY_TEXT: Record<string, string> = {
  '': 'Your posts will appear here once you create them.',
  SCHEDULED: 'Nothing is scheduled right now.',
  DRAFT: 'No drafts. Anything you start will be saved here.',
  PUBLISHED: 'Nothing published yet.',
  PENDING_APPROVAL: 'No posts are waiting for a client to approve.',
  FAILED: 'No failed posts. Nice.',
};

export default function Posts() {
  const { workspace } = useAuth();
  const wid = workspace?.id;
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'more') => {
      if (!wid) {
        setLoading(false);
        return;
      }
      if (mode === 'more' && !cursorRef.current) return;
      const id = ++seq.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'more') setLoadingMore(true);
      setError(null);
      try {
        const qs = [
          filter ? `status=${filter}` : '',
          mode === 'more' && cursorRef.current ? `cursor=${encodeURIComponent(cursorRef.current)}` : '',
          'limit=20',
        ]
          .filter(Boolean)
          .join('&');
        const page = await request<Page>(`/mobile/v1/workspaces/${wid}/posts?${qs}`);
        if (id !== seq.current) return;
        cursorRef.current = page.nextCursor;
        setItems((prev) => (mode === 'more' ? [...prev, ...page.items] : page.items));
      } catch (err: any) {
        if (id === seq.current) setError(err?.message || 'Could not load your posts.');
      } finally {
        if (id === seq.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [wid, filter],
  );

  useEffect(() => {
    cursorRef.current = null;
    setItems([]);
    void load('initial');
  }, [load]);

  const header = (
    <View style={{ paddingTop: space.md }}>
      <Text style={styles.title}>Posts</Text>
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View pointerEvents="none" style={styles.glow} />
      <FlatList
        data={loading ? [] : items}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} />}
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
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (!loadingMore && cursorRef.current) void load('more');
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primaryBright} style={{ marginTop: 48 }} />
          ) : error ? (
            <View>
              <ErrorText>{error}</ErrorText>
              <Button title="Try again" variant="secondary" onPress={() => void load('initial')} />
            </View>
          ) : (
            <EmptyState icon="▤" title="No posts here" text={EMPTY_TEXT[filter] ?? EMPTY_TEXT['']} />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primaryBright} style={{ marginVertical: 16 }} /> : undefined}
      />
    </SafeAreaView>
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
  title: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: space.md },
});
