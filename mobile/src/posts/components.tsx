import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../ui';
import { Pill } from '../ui';
import { colors, platformColors, radius, space } from '../theme';

export type PostItem = {
  id: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  errorMessage: string | null;
  updatedAt: string;
  mediaCount: number;
  platform: string | null;
  accountName: string | null;
};

export function platformName(p: string | null): string {
  if (!p) return 'Post';
  if (p === 'TWITTER') return 'X';
  return p.charAt(0) + p.slice(1).toLowerCase();
}

export function when(iso: string | null, fallback = 'Not scheduled'): string {
  if (!iso) return fallback;
  try {
    return new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function statusMeta(status: string): { label: string; color: string; soft: string } {
  switch (status) {
    case 'SCHEDULED':
      return { label: 'Scheduled', color: colors.primaryBright, soft: colors.primarySoft };
    case 'PUBLISHED':
      return { label: 'Published', color: colors.ok, soft: colors.okSoft };
    case 'FAILED':
      return { label: 'Failed', color: colors.danger, soft: colors.dangerSoft };
    case 'PENDING_APPROVAL':
      return { label: 'Approval', color: colors.warn, soft: colors.warnSoft };
    default:
      return { label: 'Draft', color: colors.accent, soft: colors.accentSoft };
  }
}

export function FilterChips({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id || 'all'}
            onPress={() => onChange(o.id)}
            style={({ pressed }) => [styles.filter, on && styles.filterOn, pressed && { opacity: 0.8 }]}
          >
            <Text style={[styles.filterText, on && { color: '#fff', fontWeight: '700' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function PostCard({ post }: { post: PostItem }) {
  const meta = statusMeta(post.status);
  const stripe = post.status === 'FAILED' ? colors.danger : (platformColors[post.platform ?? ''] ?? colors.primaryBright);
  const time =
    post.status === 'PUBLISHED' ? when(post.publishedAt, 'Published') : post.status === 'DRAFT' ? 'Draft' : when(post.scheduledAt);
  return (
    <View style={[styles.post, post.status === 'FAILED' && { borderColor: colors.danger }]}>
      <View style={[styles.stripe, { backgroundColor: stripe }]} />
      <View style={{ flex: 1, padding: space.md }}>
        <View style={styles.postTop}>
          <Text style={styles.meta} numberOfLines={1}>
            {platformName(post.platform)}
            {post.accountName ? ` · ${post.accountName}` : ''}
          </Text>
          <Pill label={meta.label} color={meta.color} soft={meta.soft} />
        </View>
        <Text style={styles.text} numberOfLines={3}>
          {post.content || '(no text)'}
        </Text>
        <Text style={styles.time}>
          {time}
          {post.mediaCount > 0 ? `  ·  ${post.mediaCount} ${post.mediaCount === 1 ? 'photo' : 'photos'}` : ''}
        </Text>
        {post.status === 'FAILED' && post.errorMessage ? <Text style={styles.err}>{post.errorMessage}</Text> : null}
      </View>
    </View>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyBadge}>
        <Text style={styles.emptyIcon}>{icon}</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { gap: 8, paddingBottom: space.md, paddingRight: space.lg },
  filter: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  filterOn: { backgroundColor: colors.primary, borderColor: colors.primaryBright },
  filterText: { color: colors.text, fontSize: 14 },
  post: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginBottom: 12,
    overflow: 'hidden',
  },
  stripe: { width: 4 },
  postTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  meta: { color: colors.muted, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  text: { color: colors.text, fontSize: 15, lineHeight: 22 },
  time: { color: colors.muted, fontSize: 12, marginTop: 8 },
  err: { color: colors.danger, fontSize: 13, marginTop: 8, lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: space.lg },
  emptyBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: { color: colors.primaryBright, fontSize: 26, fontWeight: '800' },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
