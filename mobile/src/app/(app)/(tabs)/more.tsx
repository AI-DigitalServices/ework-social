import { readOnlyInfo } from '../../../plan';
import { PLAN_LINKS } from '../../../storePolicy';
import Feather from '@expo/vector-icons/Feather';
import { Linking } from 'react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useAuth } from '../../../auth/AuthContext';
import { Avatar, Button, Card, FadeIn, Pill, SectionTitle } from '../../../ui';
import { colors, radius, space, type } from '../../../theme';

function roleLabel(role: string | undefined | null): string {
  if (!role) return '';
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export default function More() {
  const router = useRouter();
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
                {config?.user.email ? (
                  <Text style={styles.sub} numberOfLines={1}>
                    {config.user.email}
                  </Text>
                ) : null}
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
                {PLAN_LINKS ? (
                  <Text onPress={() => void Linking.openURL('https://www.eworksocial.com/#pricing')} style={styles.upgrade}>
                    Upgrade
                  </Text>
                ) : null}
              </View>
            ) : null}
            {ent && !ent.canWrite ? (
              <Text style={styles.readOnly}>{readOnlyInfo(ent.readOnlyReason).title}. {readOnlyInfo(ent.readOnlyReason).text}</Text>
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

        <FadeIn delay={120}>
          <SectionTitle>Accounts</SectionTitle>
          <Card>
            <MoreRow
              icon="user"
              label="Profile and account"
              text={config?.user.email ?? 'Your details, delete account'}
              onPress={() => router.navigate('/profile' as Href)}
            />
            <MoreRow
              icon="link"
              label="Connected accounts"
              text="Facebook, Instagram, LinkedIn, X, YouTube and more"
              onPress={() => router.navigate('/connect' as Href)}
              last
            />
          </Card>
        </FadeIn>

        <FadeIn delay={160}>
          <Text style={styles.webNote}>Inbox, CRM and analytics are on the web dashboard.</Text>
        </FadeIn>

        <FadeIn delay={200}>
          <SectionTitle>Help and about</SectionTitle>
          <Card>
            <MoreRow
              icon="life-buoy"
              label="Help and support"
              text="support@eworksocial.com"
              onPress={() => void Linking.openURL('mailto:support@eworksocial.com')}
            />
            <MoreRow icon="file-text" label="Terms of Service" onPress={() => void Linking.openURL('https://app.eworksocial.com/terms')} />
            <MoreRow icon="shield" label="Privacy Policy" onPress={() => void Linking.openURL('https://app.eworksocial.com/privacy')} last />
          </Card>
        </FadeIn>

        <View style={{ marginTop: space.lg }}>
          <Button title="Log out" variant="secondary" onPress={() => void signOut()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MoreRow({
  icon,
  label,
  text,
  onPress,
  last,
}: {
  icon: string;
  label: string;
  text?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.moreRow, !last && styles.wsBorder, pressed && { opacity: 0.8 }]}>
      <View style={styles.iconTile}>
        <Feather name={icon as never} size={18} color={colors.primaryBright} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.wsName}>{label}</Text>
        {text ? <Text style={styles.sub}>{text}</Text> : null}
      </View>
      <Feather name="chevron-right" size={20} color={colors.muted} />
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
  content: { padding: space.lg, paddingBottom: 40 },
  title: { color: colors.text, ...type.title, fontSize: 30, lineHeight: 38, marginBottom: space.md, marginTop: space.sm },
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
  upgrade: { color: colors.primaryBright, fontSize: 14, fontWeight: '700', textDecorationLine: 'underline', marginLeft: 'auto' },
  readOnly: { color: colors.warn, fontSize: 13, lineHeight: 19, marginTop: 12 },
  ws: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  wsBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  wsName: { color: colors.text, fontSize: 15, flexShrink: 1 },
  webNote: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: space.lg },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  iconTile: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
