import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, FontAwesome6 } from '@expo/vector-icons';
import { ActionRow, ActionTile } from '../../actions';
import { request } from '../../api/client';
import { presets } from '../../create/PublishPanel';
import PlatformIcon, { platformColor } from '../../platform';
import { platformName, statusMeta, when } from '../../posts/components';
import { Button, Card, ErrorText, Field, Pill, Screen, Text } from '../../ui';
import { colors, radius, space } from '../../theme';

type Detail = {
  id: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  errorMessage: string | null;
  updatedAt: string;
  platform: string | null;
  accountName: string | null;
  mediaUrls?: string[];
  approval: { status: string; clientName: string | null; revisionNote: string | null; respondedAt: string | null } | null;
  canEdit: boolean;
};

const APPROVAL_LABEL: Record<string, string> = {
  PENDING: 'Waiting for a reply',
  APPROVED: 'Approved',
  REVISION_REQUESTED: 'Changes requested',
};

const LIMITS: Record<string, number> = { TWITTER: 280, BLUESKY: 300, THREADS: 500, INSTAGRAM: 2200, LINKEDIN: 3000, TIKTOK: 2200, YOUTUBE: 5000, FACEBOOK: 5000 };

/** Drafts, scheduled posts and failed posts can still be changed. */
const CHANGEABLE = ['DRAFT', 'SCHEDULED', 'FAILED'];

export default function PostDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // edit mode
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [whenId, setWhenId] = useState('KEEP');
  const options = useMemo(() => presets(), []);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setPost(await request<Detail>(`/mobile/v1/posts/${id}`));
    } catch (err: any) {
      setError(err?.message || 'Could not open this post.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const act = async (kind: 'publish-now' | 'retry') => {
    if (!post) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await request(`/mobile/v1/posts/${post.id}/${kind}`, { method: 'POST', body: { expectedUpdatedAt: post.updatedAt } });
      setNote(kind === 'retry' ? 'Trying again. Pull down on the Posts tab to see the result.' : 'On its way. Pull down on the Posts tab to see the result.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'That did not work. Please try again.');
      void load();
    } finally {
      setBusy(false);
    }
  };

  const confirmPublish = () => {
    if (!post) return;
    Alert.alert('Publish now?', `This posts to ${platformName(post.platform)}${post.accountName ? ` (${post.accountName})` : ''} right away.`, [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Publish', onPress: () => void act('publish-now') },
    ]);
  };

  const startEdit = () => {
    if (!post) return;
    setDraft(post.content);
    setWhenId('KEEP');
    setError(null);
    setNote(null);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!post) return;
    const body: Record<string, unknown> = { expectedUpdatedAt: post.updatedAt };
    const text = draft.trim();
    if (text !== post.content) body.content = text;
    if (whenId !== 'KEEP') {
      const o = options.find((x) => x.id === whenId);
      if (o?.at) {
        body.status = 'SCHEDULED';
        body.scheduledAt = o.at.toISOString();
      } else {
        body.status = 'DRAFT';
      }
    }
    if (Object.keys(body).length === 1) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await request(`/mobile/v1/posts/${post.id}`, { method: 'PATCH', body });
      setEditing(false);
      setNote('Saved.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not save your changes.');
      void load();
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!post) return;
    Alert.alert('Delete this post?', 'It will be removed. This cannot be undone.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          setError(null);
          try {
            await request(`/mobile/v1/posts/${post.id}/delete`, { method: 'POST', body: { expectedUpdatedAt: post.updatedAt } });
            router.back();
          } catch (err: any) {
            setError(err?.message || 'Could not delete this post.');
            void load();
            setBusy(false);
          }
        },
      },
    ]);
  };

  /**
   * Hand-off: eWork Social prepares the message, WhatsApp opens so you choose who gets it. Nothing is published.
   * A draft gets a review link (the reviewer can approve or ask for changes); anything else shares its text.
   */
  const shareToWhatsApp = async () => {
    if (!post) return;
    let msg = `Please have a look at this ${platformName(post.platform)} post:\n\n${post.content}`;
    if (post.canEdit && post.status === 'DRAFT') {
      setBusy(true);
      setError(null);
      try {
        const r = await request<{ url: string }>(`/mobile/v1/posts/${post.id}/review-link`, {
          method: 'POST',
          body: { expectedUpdatedAt: post.updatedAt },
        });
        msg = `Hi, could you review this ${platformName(post.platform)} post before I publish it? You can approve it or ask for changes here:\n${r.url}`;
        void load();
      } catch (err: any) {
        // Still let the person share the words; show why there is no review link.
        setError(err?.message || 'Could not make a review link, so the text is shared instead.');
      } finally {
        setBusy(false);
      }
    }
    try {
      await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`);
    } catch {
      Alert.alert('Could not open WhatsApp', 'Make sure WhatsApp is installed on this phone.');
    }
  };

  const changeable = !!post && post.canEdit && CHANGEABLE.includes(post.status);
  const canPublish = !!post && post.canEdit && (post.status === 'DRAFT' || post.status === 'SCHEDULED');
  const canRetry = !!post && post.canEdit && post.status === 'FAILED';
  const meta = post ? statusMeta(post.status) : null;
  const limit = LIMITS[post?.platform ?? ''] ?? 2200;
  const tooLong = draft.length > limit;
  const time = !post
    ? ''
    : post.status === 'PUBLISHED'
      ? when(post.publishedAt, 'Published')
      : post.status === 'DRAFT'
        ? 'Draft, not scheduled'
        : when(post.scheduledAt);

  const timeChoices = [{ id: 'KEEP', label: post?.status === 'SCHEDULED' ? 'Keep the time' : 'Keep as it is' }, ...options.map((o) => ({ id: o.id, label: o.label }))];

  return (
    <Screen>
      <Pressable hitSlop={12} onPress={() => (editing && !busy ? setEditing(false) : router.back())} style={{ paddingTop: space.md }}>
        <Text style={styles.back}>{editing ? '‹  Cancel' : '‹  Back'}</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator color={colors.primaryBright} style={{ marginTop: 48 }} />
      ) : !post ? (
        <View style={{ marginTop: space.lg }}>
          <ErrorText>{error || 'This post could not be found.'}</ErrorText>
          <Button title="Try again" variant="secondary" onPress={() => void load()} />
        </View>
      ) : (
        <View style={{ marginTop: space.md }}>
          <View style={styles.top}>
            <View style={styles.who}>
              <PlatformIcon platform={post.platform} size={28} />
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.platform}>{platformName(post.platform)}</Text>
                {post.accountName ? (
                  <Text style={styles.account} numberOfLines={1}>
                    {post.accountName}
                  </Text>
                ) : null}
              </View>
            </View>
            {meta ? <Pill label={meta.label} color={meta.color} soft={meta.soft} /> : null}
          </View>

          {editing ? (
            <View>
              <Field
                label={`Your post (${draft.length}/${limit})`}
                value={draft}
                onChangeText={setDraft}
                autoCapitalize="sentences"
                multiline
                style={{ minHeight: 160, textAlignVertical: 'top' }}
              />
              <Text style={styles.cap}>When</Text>
              <View style={styles.wrap}>
                {timeChoices.map((o) => {
                  const on = o.id === whenId;
                  return (
                    <Pressable
                      key={o.id}
                      onPress={() => setWhenId(o.id)}
                      style={({ pressed }) => [styles.chip, on && { backgroundColor: colors.primary, borderColor: colors.primaryBright }, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={[styles.chipText, on && { fontWeight: '700' }]}>{o.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <ErrorText>{error}</ErrorText>
              <Button title="Save changes" loading={busy} disabled={tooLong || draft.trim().length === 0} onPress={() => void saveEdit()} />
              {tooLong ? <Text style={styles.warn}>This is too long for {platformName(post.platform)}. Shorten it to save.</Text> : null}
            </View>
          ) : (
            <View>
              <Text style={[styles.time, { color: platformColor(post.platform) }]}>{time}</Text>

              <Card>
                <Text style={styles.content} selectable>
                  {post.content || '(no text)'}
                </Text>
                {post.mediaUrls && post.mediaUrls.length > 0 ? (
                  <Text style={styles.media}>
                    {post.mediaUrls.length} {post.mediaUrls.length === 1 ? 'photo' : 'photos'} attached
                  </Text>
                ) : null}
              </Card>

              {post.status === 'FAILED' && post.errorMessage ? <ErrorText>{post.errorMessage}</ErrorText> : null}

              {post.approval ? (
                <Card tone={post.approval.status === 'APPROVED' ? 'ok' : post.approval.status === 'REVISION_REQUESTED' ? 'warn' : 'primary'}>
                  <Text style={styles.approvalTitle}>{APPROVAL_LABEL[post.approval.status] ?? 'Client review'}</Text>
                  {post.approval.clientName ? <Text style={styles.approvalText}>{post.approval.clientName}</Text> : null}
                  {post.approval.revisionNote ? <Text style={styles.approvalText}>“{post.approval.revisionNote}”</Text> : null}
                </Card>
              ) : null}

              <ErrorText>{error}</ErrorText>
              {note ? <Text style={styles.ok}>{note}</Text> : null}

              <View style={{ gap: space.md, marginTop: space.md }}>
                {canPublish ? <Button title="Publish now" loading={busy} onPress={confirmPublish} /> : null}
                {canRetry ? <Button title="Try again" loading={busy} onPress={() => void act('retry')} /> : null}
                <ActionRow>
                  {changeable ? (
                    <ActionTile label="Edit" disabled={busy} icon={(c) => <Feather name="edit-2" size={22} color={c} />} onPress={startEdit} />
                  ) : null}
                  <ActionTile
                    label="WhatsApp"
                    accent={platformColor('WHATSAPP')}
                    disabled={busy}
                    icon={(c) => <FontAwesome6 name="whatsapp" size={22} color={c} />}
                    onPress={() => void shareToWhatsApp()}
                  />
                  {changeable ? (
                    <ActionTile label="Delete" tone="danger" disabled={busy} icon={(c) => <Feather name="trash-2" size={22} color={c} />} onPress={confirmDelete} />
                  ) : null}
                </ActionRow>
              </View>
              <Text style={styles.hint}>
                {post.canEdit && post.status === 'DRAFT'
                  ? 'WhatsApp opens with a review link. Whoever has it can approve the post or ask for changes. It never publishes anything.'
                  : 'WhatsApp opens with the text ready and you choose who gets it. Nothing is published from WhatsApp.'}
              </Text>
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.primaryBright, fontSize: 16, fontWeight: '700' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  platform: { color: colors.text, fontSize: 18, fontWeight: '800' },
  account: { color: colors.muted, fontSize: 13 },
  time: { fontSize: 14, fontWeight: '700', marginBottom: space.md },
  content: { color: colors.text, fontSize: 16, lineHeight: 24 },
  media: { color: colors.muted, fontSize: 13, marginTop: space.sm },
  approvalTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  approvalText: { color: colors.muted, fontSize: 14, marginTop: 4 },
  ok: { color: colors.ok, fontSize: 14, fontWeight: '600', marginTop: space.sm },
  warn: { color: colors.danger, fontSize: 13, marginTop: space.sm, textAlign: 'center' },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: space.sm, textAlign: 'center' },
  cap: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: { color: colors.text, fontSize: 14 },
});
