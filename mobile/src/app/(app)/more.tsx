import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { Avatar, Button, Card, FadeIn, Pill, SectionTitle } from '../../ui';
import { colors, radius, space } from '../../theme';

function roleLabel(role: string | undefined | null): string {
  if (!role) return '';
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export default function More() {
  const { config, workspace, setActiveWorkspace, signOut } = useAuth();
  const name = config?.user.name || 'You';
  const ent = workspace?.entitlements ?? null;
  const workspaces = config?.workspaces ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View pointerEvents="none" style={styles.glow} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>More</Text>

        <FadeIn>
          <Card>
            <View style={styles.profile}>
              <Avatar name={name} size={52} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.sub}>
                  {workspace?.name ?? 'No workspace'}
                  {workspace?.role ? `  ·  ${roleLabel(workspace.role)}` : ''}
                </Text>
              </View>
            </View>
            {ent?.isTrialing ? (
              <View style={styles.trial}>
                <Pill label="Free trial" />
                <Text style={styles.trialText}>
                  {ent.trialDaysLeft ?? 0} {ent.trialDaysLeft === 1 ? 'day' : 'days'} left
                </Text>
              </View>
            ) : null}
            {ent && !ent.canWrite ? (
              <Text style={styles.readOnly}>{ent.readOnlyReason || 'This workspace is read only right now.'}</Text>
            ) : null}
          </Card>
        </FadeIn>

        {workspaces.length > 1 ? (
          <FadeIn delay={80}>
            <SectionTitle>Your workspaces</SectionTitle>
            <Card>
              {workspaces.map((w, i) => {
                const active = w.id === workspace?.id;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => setActiveWorkspace(w.id)}
                    style={({ pressed }) => [styles.ws, i > 0 && styles.wsBorder, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={[styles.wsName, active && { color: colors.primaryBright, fontWeight: '700' }]} numberOfLines={1}>
                      {w.name}
                    </Text>
                    {active ? <Text style={{ color: colors.primaryBright, fontWeight: '900' }}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </Card>
          </FadeIn>
        ) : null}

        <FadeIn delay={160}>
          <SectionTitle>Coming soon</SectionTitle>
          <Card>
            <Soon label="Inbox" text="Reply to messages and comments." />
            <Soon label="Connect accounts" text="Link your social accounts." last />
          </Card>
        </FadeIn>

        <View style={{ marginTop: space.lg }}>
          <Button title="Log out" variant="secondary" onPress={() => void signOut()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Soon({ label, text, last }: { label: string; text: string; last?: boolean }) {
  return (
    <View style={[styles.soon, !last && styles.wsBorder]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.wsName}>{label}</Text>
        <Text style={styles.sub}>{text}</Text>
      </View>
      <Pill label="Soon" color={colors.accent} soft={colors.accentSoft} />
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
    opacity: 0.14,
  },
  content: { padding: space.lg, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: space.md, marginTop: space.sm },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  trial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  trialText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  readOnly: { color: colors.warn, fontSize: 13, lineHeight: 19, marginTop: 12 },
  ws: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  wsBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  wsName: { color: colors.text, fontSize: 15, flexShrink: 1 },
  soon: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
