import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui';
import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { request } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { canSetUp } from '../onboarding/api';
import { Pill } from '../ui';
import { colors, radius, space } from '../theme';

function Row({
  icon,
  title,
  sub,
  soon,
  tint = colors.primaryBright,
  soft = colors.primarySoft,
  onPress,
  right,
}: {
  icon: string;
  title: string;
  sub: string;
  soon?: boolean;
  tint?: string;
  soft?: string;
  onPress?: () => void;
  right?: ReactNode;
}) {
  return (
    <Pressable
      disabled={soon || !onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, soon && { opacity: 0.6 }, pressed && !soon && { backgroundColor: colors.cardAlt }]}
    >
      <View style={[styles.icon, { backgroundColor: soft }]}>
        <Text style={[styles.iconText, { color: tint }]}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      {soon ? <Pill label="Soon" color={colors.accent} soft={colors.accentSoft} /> : (right ?? <Text style={styles.chev}>›</Text>)}
    </Pressable>
  );
}

export default function CreateSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { workspace } = useAuth();
  const wid = workspace?.id;
  const writer = canSetUp(workspace?.role);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!visible || !wid || !writer) return;
    let cancelled = false;
    request<{ items: unknown[] }>(`/mobile/v1/workspaces/${wid}/ideas`)
      .then((r) => {
        if (!cancelled) setCount(r.items.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, wid, writer]);

  const go = (path: string) => {
    onClose();
    // Let the sheet finish closing first; a route pushed mid-dismissal is dropped by the native modal.
    setTimeout(() => router.navigate(path as Href), 350);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.head}>What would you like to create?</Text>

          {writer ? (
            <>
              <Row
                icon="✎"
                title="Write an idea"
                sub="One sentence in, three posts in your voice"
                tint={colors.primaryBright}
                soft={colors.primarySoft}
                onPress={() => go('/idea')}
              />
              <Row
                icon="▣"
                title="Upload a photo"
                sub="We write the post around it"
                tint={colors.accent}
                soft={colors.accentSoft}
                onPress={() => go('/idea?photo=1')}
              />
              <Row icon="▶" title="Upload a video" sub="Short clips for Reels and TikTok" soon tint={colors.accent} soft={colors.accentSoft} />
              <Row icon="♪" title="Talk to your AI assistant" sub="Say it out loud, we turn it into a post" soon tint={colors.accent} soft={colors.accentSoft} />

              <View style={styles.divider} />
              <Row
                icon="✧"
                title="Your saved ideas"
                sub={count === null ? 'Posts you kept for later' : count === 1 ? '1 post waiting' : `${count} posts waiting`}
                tint={colors.ok}
                soft={colors.okSoft}
                onPress={() => go('/ideas')}
              />
            </>
          ) : (
            <Text style={styles.viewer}>Creating posts needs an Editor, Admin or Owner role on this workspace.</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  head: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginBottom: 8, paddingHorizontal: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 6, borderRadius: radius.md },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20, fontWeight: '800' },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  chev: { color: colors.muted, fontSize: 24 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 8 },
  viewer: { color: colors.muted, fontSize: 15, lineHeight: 22, padding: 8 },
});
