import { Linking } from 'react-native';
import { PLAN_URL } from './plan';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode, Ref } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import type { StyleProp, TextInputProps, TextProps, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow, space, type } from './theme';

// Phones can enlarge all text a lot (Samsung's font size and screen zoom). Beyond 10% our layouts
// stop looking designed, so every Text and TextInput in the app goes through these.
const MAX_FONT_SCALE = 1.1;

// Inter has one font file per weight. Pick the family from fontWeight and drop the weight, so Android
// does not add a fake bold on top. A style that already sets fontFamily (the serif) is left as it is.
function brandText(style: StyleProp<TextStyle>): TextStyle {
  const flat = (StyleSheet.flatten(style) || {}) as TextStyle;
  const { fontWeight, fontStyle, ...rest } = flat;
  if (rest.fontFamily) return rest;
  const w = fontWeight === 'bold' ? 700 : fontWeight === 'normal' || fontWeight == null ? 400 : Number(fontWeight) || 400;
  const fontFamily =
    w >= 800 ? fonts.sans.extra : w >= 700 ? fonts.sans.bold : w >= 600 ? fonts.sans.semibold : w >= 500 ? fonts.sans.medium : fonts.sans.regular;
  return fontStyle ? { ...rest, fontFamily, fontStyle } : { ...rest, fontFamily };
}

export function Text({ style, ...props }: TextProps) {
  return <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} style={brandText(style)} {...props} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  return <RNTextInput maxFontSizeMultiplier={MAX_FONT_SCALE} style={brandText(style)} {...props} />;
}

export function Screen({
  children,
  scroll = true,
  scrollRef,
}: {
  children: ReactNode;
  scroll?: boolean;
  scrollRef?: Ref<{ scrollTo: (o: { y: number; animated?: boolean }) => void }>;
}) {
  const body = scroll ? (
    <ScrollView
      ref={scrollRef as never}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.scrollContent}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.screen}>
      <View pointerEvents="none" style={styles.glow} />
      <View pointerEvents="none" style={styles.glow2} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Softly fades and slides its content in when it first appears. */
export function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 380, delay, useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        style,
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <View style={styles.logoRow}>
      <Image
        source={require('../assets/images/logo-mark.png')}
        style={{ width: size + 12, height: size + 12, borderRadius: (size + 12) * 0.24 }}
      />
      <Text style={[styles.logo, { fontSize: size * 0.68, fontFamily: fonts.serif, letterSpacing: 0 }]}>eWork Social</Text>
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Body({ children, center }: { children: ReactNode; center?: boolean }) {
  return <Text style={[styles.body, center ? { textAlign: 'center' } : null]}>{children}</Text>;
}

export function Field(props: TextInputProps & { label: string }) {
  const { label, style, onFocus, onBlur, ...rest } = props;
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#5E7089"
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor={colors.primaryBright}
        style={[styles.input, focused && styles.inputFocused, style]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
    </View>
  );
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'link';
}) {
  const off = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  return (
    <Animated.View style={{ transform: [{ scale }], opacity: off ? 0.5 : 1, marginBottom: space.sm }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => to(0.97)}
        onPressOut={() => to(1)}
        disabled={off}
        style={[
          styles.btn,
          variant === 'primary' && styles.btnPrimary,
          variant === 'primary' && off && styles.btnOff,
          variant === 'secondary' && styles.btnSecondary,
          variant === 'link' && styles.btnLink,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.btnText, variant === 'link' && { color: colors.primaryBright }]}>{title}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

// Plan messages from the API end with the website's plan path. Show them as plain words plus a real button.
const PLAN_PATH = /\s*\/dashboard\/settings\?tab=plan/;

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  const needsPlan = PLAN_PATH.test(children);
  const text = needsPlan ? children.replace(PLAN_PATH, '').replace(/\s*Upgrade at\s*$/i, '').trim() : children;
  return (
    <View style={styles.errorBox}>
      <Text style={styles.error}>{text}</Text>
      {needsPlan ? (
        <Pressable onPress={() => void Linking.openURL(PLAN_URL)} hitSlop={8} style={{ marginTop: 10 }}>
          <Text style={{ color: colors.primaryBright, fontSize: 15, fontWeight: '700' }}>Choose a plan  →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({
  children,
  tone,
  onPress,
}: {
  children: ReactNode;
  tone?: 'primary' | 'accent' | 'warn' | 'danger' | 'ok';
  onPress?: () => void;
}) {
  const toneColor =
    tone === 'primary'
      ? colors.primaryBright
      : tone === 'accent'
        ? colors.accent
        : tone === 'warn'
          ? colors.warn
          : tone === 'danger'
            ? colors.danger
            : tone === 'ok'
              ? colors.ok
              : null;
  const style = [styles.card, toneColor ? { borderColor: toneColor } : null];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={style}>{children}</View>;
}

export function Pill({ label, color = colors.primaryBright, soft }: { label: string; color?: string; soft?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: soft ?? colors.primarySoft }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('') || 'e';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{children}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1, padding: space.lg },
  glow: {
    position: 'absolute',
    top: -170,
    right: -130,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: colors.primary,
    opacity: 0.18,
  },
  glow2: {
    position: 'absolute',
    bottom: -200,
    left: -160,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: colors.accent,
    opacity: 0.08,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow },
  logoMarkText: { color: '#fff', fontWeight: '900', marginTop: -2 },
  logo: { color: colors.text, fontWeight: '900', letterSpacing: -0.6 },
  title: { color: colors.text, ...type.title, marginBottom: space.sm },
  body: { color: colors.muted, ...type.body, fontSize: 16, lineHeight: 24, marginBottom: space.md },
  label: { color: colors.muted, ...type.small, fontWeight: '600', marginBottom: 7 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  inputFocused: { borderColor: colors.primaryBright, backgroundColor: colors.cardAlt },
  btn: {
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnPrimary: { backgroundColor: colors.primary, ...shadow, shadowColor: colors.primary, shadowOpacity: 0.45 },
  btnSecondary: { backgroundColor: colors.cardAlt, borderWidth: 1.5, borderColor: colors.border },
  btnLink: { backgroundColor: 'transparent' },
  // No shadow while faded: on Android it shows through as a darker rectangle inside the button.
  btnOff: { elevation: 0, shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.1 },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: space.md,
  },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.md,
  },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { ...type.label, textTransform: 'uppercase' },
  avatar: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md, marginBottom: space.sm },
  section: { color: colors.text, ...type.heading },
});
