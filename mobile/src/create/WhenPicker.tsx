import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Button, Text } from '../ui';
import { colors, radius } from '../theme';

/** When a post goes out. at = null means "keep it as a draft". */
export type When = { id: string; label: string; at: Date | null };

export const DRAFT_WHEN: When = { id: 'DRAFT', label: 'Save as draft', at: null };

const HOUR = 3600_000;
/** The server wants at least a minute of notice; ask for a little more so a slow tap cannot miss it. */
const MIN_NOTICE = 2 * 60_000;

function tomorrowAt(h: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(h, 0, 0, 0);
  return d;
}

/** Quick choices, worked out at the moment they are tapped. */
const PRESETS: { id: string; label: string; at: () => Date | null }[] = [
  { id: 'DRAFT', label: 'Save as draft', at: () => null },
  { id: '1h', label: 'In 1 hour', at: () => new Date(Date.now() + HOUR) },
  { id: 't9', label: 'Tomorrow 9:00', at: () => tomorrowAt(9) },
  { id: 't18', label: 'Tomorrow 18:00', at: () => tomorrowAt(18) },
];

export function formatWhen(d: Date): string {
  return d.toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Quick time chips plus "Pick date & time" (the phone's own picker).
 * value null means "keep as it is", shown only when keepLabel is given (editing an existing post).
 */
export default function WhenPicker({
  value,
  onChange,
  keepLabel,
}: {
  value: When | null;
  onChange: (w: When | null) => void;
  keepLabel?: string;
}) {
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDate, setIosDate] = useState(() => new Date(Date.now() + HOUR));
  const [error, setError] = useState<string | null>(null);

  const choose = (at: Date) => {
    if (at.getTime() < Date.now() + MIN_NOTICE) {
      setError('Pick a time a few minutes from now or later.');
      return;
    }
    setError(null);
    onChange({ id: 'custom', label: formatWhen(at), at });
  };

  const openPicker = () => {
    setError(null);
    const start = value?.id === 'custom' && value.at ? value.at : new Date(Date.now() + HOUR);
    if (Platform.OS === 'android') {
      // Android shows the date, then the time, as two native dialogs.
      DateTimePickerAndroid.open({
        value: start,
        mode: 'date',
        minimumDate: new Date(),
        onChange: (e, day) => {
          if (e.type !== 'set' || !day) return;
          DateTimePickerAndroid.open({
            value: day,
            mode: 'time',
            is24Hour: true,
            onChange: (e2, time) => {
              if (e2.type !== 'set' || !time) return;
              const at = new Date(day);
              at.setHours(time.getHours(), time.getMinutes(), 0, 0);
              choose(at);
            },
          });
        },
      });
    } else {
      setIosDate(start);
      setIosOpen(true);
    }
  };

  const customOn = value?.id === 'custom';

  return (
    <View>
      <Text style={styles.cap}>When</Text>
      <View style={styles.wrap}>
        {keepLabel ? (
          <Chip label={keepLabel} on={value === null} onPress={() => { setIosOpen(false); setError(null); onChange(null); }} />
        ) : null}
        {PRESETS.map((p) => (
          <Chip
            key={p.id}
            label={p.label}
            on={value?.id === p.id}
            onPress={() => {
              setIosOpen(false);
              setError(null);
              onChange({ id: p.id, label: p.label, at: p.at() });
            }}
          />
        ))}
        <Chip
          label={customOn && value ? value.label : 'Pick date & time'}
          on={customOn || iosOpen}
          icon
          onPress={openPicker}
        />
      </View>

      {iosOpen ? (
        <View style={styles.iosBox}>
          <DateTimePicker
            value={iosDate}
            mode="datetime"
            display="spinner"
            themeVariant="dark"
            minimumDate={new Date()}
            minuteInterval={5}
            onChange={(_e, d) => {
              if (d) setIosDate(d);
            }}
          />
          <Button
            title="Use this time"
            onPress={() => {
              choose(iosDate);
              setIosOpen(false);
            }}
          />
          <Button title="Cancel" variant="link" onPress={() => setIosOpen(false)} />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function Chip({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, on && { backgroundColor: colors.primary, borderColor: colors.primaryBright }, pressed && { opacity: 0.85 }]}
    >
      {icon ? <Feather name="calendar" size={15} color={colors.text} /> : null}
      <Text style={[styles.chipText, on && { fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cap: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: { color: colors.text, fontSize: 14 },
  iosBox: { marginBottom: 14, gap: 4 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
});
