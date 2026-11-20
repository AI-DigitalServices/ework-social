import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { request } from '../../api/client';
import PlatformIcon, { platformColor } from '../../platform';
import { platformName, statusMeta, when } from '../../posts/components';
import { Button, Card, ErrorText, Pill, Screen, Text } from '../../ui';
import { colors, space } from '../../theme';

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
  PENDING: 'Waiting for the client',
  APPROVED: 'Approved by the client',
  REVISION_REQUESTED: 'The client asked for changes',
};

export default function PostDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
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

  /** Hand-off: eWork Social prepares the message, WhatsApp opens so you choose who gets it. Nothing is published. */
  const shareToWhatsApp = async () => {
    if (!post) return;
    const msg = `Please have a look at this ${platformName(post.platform)} post:\n\n${post.content}`;
    try {
      await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`);
    } catch {
      Alert.alert('Could not open WhatsApp', 'Make sure WhatsApp is installed on this phone.');
    }
  };

  const canPublish = !!post && post.canEdit && (post.status === 'DRAFT' || post.status === 'SCHEDULED');
  const canRetry = !!post && post.canEdit && post.status === 'FAILED';
  const meta = post ? statusMeta(post.status) : null;
  const time = !post
    ? ''
    : post.status === 'PUBLISHED'
      ? when(post.publishedAt, 'Published')
      : post.status === 'DRAFT'
        ? 'Draft, not scheduled'
        : when(post.scheduledAt);

  return (
    <Screen>
      <Pressable hitSlop={12} onPress={() => router.back()} style={{ paddingTop: space.md }}>
        <Text style={styles.back}>‹  Back</Text>
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

          <View style={{ gap: space.sm, marginTop: space.md }}>
            {canPublish ? <Button title="Publish now" loading={busy} onPress={confirmPublish} /> : null}
            {canRetry ? <Button title="Try again" loading={busy} onPress={() => void act('retry')} /> : null}
            <Button title="Send to WhatsApp for a look" variant="secondary" onPress={() => void shareToWhatsApp()} />
          </View>
          <Text style={styles.hint}>
            WhatsApp opens with the text ready, and you pick who gets it. It only shares the words. Nothing is published from WhatsApp.
          </Text>
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
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: space.sm, textAlign: 'center' },
});
