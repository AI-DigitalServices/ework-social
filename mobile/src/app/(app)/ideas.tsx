import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { request } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import PublishPanel from '../../create/PublishPanel';
import type { Account } from '../../create/PublishPanel';
import { EmptyState, platformName, when } from '../../posts/components';
import { Button, ErrorText, Field, Pill } from '../../ui';
import { colors, platformColors, radius, space } from '../../theme';

type Idea = { id: string; idea: string; content: string; platform: string | null; createdAt: string };

const LIMITS: Record<string, number> = { TWITTER: 280, BLUESKY: 300, THREADS: 500, INSTAGRAM: 2200, LINKEDIN: 3000, TIKTOK: 2200, YOUTUBE: 5000 };

export default function Ideas() {
  const router = useRouter();
  const { workspace } = useAuth();
  const wid = workspace?.id;
  const [items, setItems] = useState<Idea[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // the idea open in the sheet, its edited text, and which half of the sheet is showing
  const [open, setOpen] = useState<Idea | null>(null);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<'edit' | 'publish'>('edit');
  const [busy, setBusy] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const load = useCallback(
    async (kind: 'initial' | 'refresh') => {
      if (!wid) {
        setLoading(false);
        return;
      }
      if (kind === 'initial') setLoading(true);
      setError(null);
      try {
        const [list, home] = await Promise.all([
          request<{ items: Idea[] }>(`/mobile/v1/workspaces/${wid}/ideas`),
          request<{ accounts: Account[] }>(`/mobile/v1/workspaces/${wid}/home`).catch(() => ({ accounts: [] as Account[] })),
        ]);
        setItems(list.items);
        setAccounts(home.accounts ?? []);
      } catch (err: any) {
        setError(err?.message || 'Could not load your ideas.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [wid],
  );

  useEffect(() => {
    void load('initial');
  }, [load]);

  const openIdea = (i: Idea) => {
    setOpen(i);
    setDraft(i.content);
    setMode('edit');
    setSheetError(null);
  };

  const close = () => {
    if (!busy) setOpen(null);
  };

  const limit = LIMITS[open?.platform ?? ''] ?? 3000;
  const dirty = !!open && draft.trim() !== open.content;
  const tooLong = draft.length > limit;

  /** Returns true when the text is saved (or nothing needed saving). */
  const save = async (): Promise<boolean> => {
    if (!open || !wid) return false;
    if (!dirty) return true;
    setBusy(true);
    setSheetError(null);
    try {
      const updated = await request<Idea>(`/mobile/v1/workspaces/${wid}/ideas/${open.id}`, {
        method: 'PATCH',
        body: { content: draft.trim() },
      });
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setOpen(updated);
      setDraft(updated.content);
      return true;
    } catch (err: any) {
      setSheetError(err?.message || 'Could not save your changes.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const startPublish = async () => {
    if (await save()) setMode('publish');
  };

  const confirm = async (accountId: string, status: 'DRAFT' | 'SCHEDULED', scheduledAt?: string) => {
    if (!open || !wid) return;
    setBusy(true);
    setSheetError(null);
    try {
      await request(`/mobile/v1/workspaces/${wid}/ideas/${open.id}/post`, {
        method: 'POST',
        body: { socialAccountId: accountId, status, ...(scheduledAt ? { scheduledAt } : {}) },
      });
      setItems((prev) => prev.filter((x) => x.id !== open.id));
      setOpen(null);
    } catch (err: any) {
      setSheetError(err?.message || 'Could not create the post.');
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!open || !wid) return;
    const target = open;
    Alert.alert('Delete this idea?', 'It will be removed from your ideas.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await request(`/mobile/v1/workspaces/${wid}/ideas/${target.id}`, { method: 'DELETE' });
            setItems((prev) => prev.filter((x) => x.id !== target.id));
            setOpen(null);
          } catch (err: any) {
            setSheetError(err?.message || 'Could not delete it.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const header = (
    <View style={{ paddingTop: space.md }}>
      <Pressable hitSlop={12} onPress={() => router.back()}>
        <Text style={styles.back}>‹  Back</Text>
      </Pressable>
      <Text style={styles.title}>Your ideas</Text>
      <Text style={styles.sub}>Posts you kept for later. Tap one to edit it, schedule it, or delete it.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={loading ? [] : items}
        keyExtractor={(i) => i.id}
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
        renderItem={({ item }) => {
          const c = platformColors[item.platform ?? ''] ?? colors.primaryBright;
          return (
            <Pressable onPress={() => openIdea(item)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
              <View style={[styles.stripe, { backgroundColor: c }]} />
              <View style={{ flex: 1, padding: space.md }}>
                <View style={styles.cardTop}>
                  <Text style={styles.meta}>{item.platform ? platformName(item.platform) : 'Any platform'}</Text>
                  <Text style={styles.meta}>{when(item.createdAt, '')}</Text>
                </View>
                <Text style={styles.text} numberOfLines={4}>
                  {item.content}
                </Text>
                <Text style={styles.tap}>Tap to edit or post  ›</Text>
              </View>
            </Pressable>
          );
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
            <EmptyState
              icon="✧"
              title="No saved ideas yet"
              text="Write a one-sentence idea and we turn it into posts you can keep here."
              action={
                <View style={{ marginTop: 20, alignSelf: 'stretch' }}>
                  <Button title="Write an idea" onPress={() => router.navigate('/idea' as Href)} />
                </View>
              }
            />
          )
        }
      />

      <Modal visible={!!open} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={close}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.handle} />
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {open?.platform ? (
                  <View style={{ marginBottom: 10 }}>
                    <Pill label={platformName(open.platform)} color={platformColors[open.platform] ?? colors.primaryBright} />
                  </View>
                ) : null}

                {mode === 'edit' ? (
                  <>
                    <Field
                      label={`Your post (${draft.length}/${limit})`}
                      value={draft}
                      onChangeText={setDraft}
                      autoCapitalize="sentences"
                      multiline
                      style={{ minHeight: 150, textAlignVertical: 'top' }}
                    />
                    <ErrorText>{tooLong ? 'This is too long. Shorten it a little.' : sheetError}</ErrorText>
                    <Button title="Save changes" onPress={() => void save()} loading={busy} disabled={!dirty || !draft.trim() || tooLong} />
                    {accounts.length > 0 ? (
                      <Button title="Make a post" variant="secondary" onPress={() => void startPublish()} disabled={busy || !draft.trim() || tooLong} />
                    ) : (
                      <Text style={styles.note}>Connect a social account to turn this into a post.</Text>
                    )}
                    <Pressable onPress={remove} hitSlop={10} style={{ alignSelf: 'center', marginTop: 8, padding: 8 }}>
                      <Text style={styles.del}>Delete this idea</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.sheetTitle}>When should it go out?</Text>
                    <Text style={styles.sheetText} numberOfLines={4}>
                      {draft}
                    </Text>
                    <ErrorText>{sheetError}</ErrorText>
                    <PublishPanel accounts={accounts} busy={busy} onConfirm={(a, s, at) => void confirm(a, s, at)} />
                    <Button title="Back to editing" variant="link" onPress={() => setMode('edit')} />
                  </>
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, paddingBottom: 40 },
  back: { color: colors.primaryBright, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 6, marginBottom: space.md },
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  meta: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  text: { color: colors.text, fontSize: 15, lineHeight: 22 },
  tap: { color: colors.primaryBright, fontSize: 13, fontWeight: '700', marginTop: 12 },
  del: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    paddingBottom: 30,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 },
  sheetTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  sheetText: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 14 },
});
