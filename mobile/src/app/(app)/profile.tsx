import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { request } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { ActionRow, ActionTile } from '../../actions';
import { Avatar, Button, Card, ErrorText, Field, Screen, Text } from '../../ui';
import { colors, space } from '../../theme';

function roleLabel(role: string | undefined | null): string {
  if (!role) return '';
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function Profile() {
  const router = useRouter();
  const { config, workspace, signOut } = useAuth();
  const name = config?.user.name || 'You';
  const email = config?.user.email || '';
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await request('/auth/delete-account', { method: 'DELETE' });
      await signOut();
    } catch (err: any) {
      setError(err?.message || 'We could not delete your account. Please try again, or write to support@eworksocial.com.');
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Text style={styles.back}>{'‹  Back'}</Text>
        </Pressable>
      </View>

      <View style={styles.head}>
        <Avatar name={name} size={64} />
        <Text style={styles.name}>{name}</Text>
        {email ? <Text style={styles.email}>{email}</Text> : null}
      </View>

      <Card>
        <Row label="Workspace" value={workspace?.name ?? 'None'} />
        <Row label="Your role" value={roleLabel(workspace?.role) || 'None'} last />
      </Card>

      <Text style={styles.cap}>Delete account</Text>
      {confirming ? (
        <Card tone="danger">
          <Text style={styles.warnTitle}>This cannot be undone</Text>
          <Text style={styles.warnBody}>
            We permanently delete your account and every workspace you own: posts, connected accounts, clients, ideas, photos and videos. If you pay for a plan, cancel it on eworksocial.com first so you are not charged again.
          </Text>
          <Field label="Type DELETE to confirm" value={typed} onChangeText={setTyped} autoCapitalize="characters" placeholder="DELETE" />
          <ErrorText>{error}</ErrorText>
          <Button title="Delete my account" onPress={() => void remove()} loading={busy} disabled={typed.trim().toUpperCase() !== 'DELETE'} />
          <Button
            title="Keep my account"
            variant="link"
            onPress={() => {
              setConfirming(false);
              setTyped('');
              setError(null);
            }}
          />
        </Card>
      ) : (
        <ActionRow>
          <ActionTile tone="danger" label="Delete account" icon={(c) => <Feather name="trash-2" size={22} color={c} />} onPress={() => setConfirming(true)} />
        </ActionRow>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  back: { color: colors.primaryBright, fontSize: 15, fontWeight: '600' },
  head: { alignItems: 'center', marginBottom: space.lg, gap: 6 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 8 },
  email: { color: colors.muted, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, gap: 16 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { color: colors.muted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  cap: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: space.lg, marginBottom: 8 },
  warnTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  warnBody: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 14 },
});
