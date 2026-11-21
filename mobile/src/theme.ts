// design system v2
export const colors = {
  bg: '#070B13',
  card: '#0E1624',
  cardAlt: '#15213A',
  border: '#1D2B44',
  text: '#F4F8FF',
  muted: '#8FA3BC',
  primary: '#2269C9',
  primaryBright: '#4C9BFF',
  primarySoft: 'rgba(76,155,255,0.14)',
  accent: '#8B7CFF',
  accentSoft: 'rgba(139,124,255,0.16)',
  danger: '#F2555A',
  dangerSoft: 'rgba(242,85,90,0.14)',
  warn: '#F5A524',
  warnSoft: 'rgba(245,165,36,0.14)',
  ok: '#34C58A',
  okSoft: 'rgba(52,197,138,0.14)',
};

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

// Brand fonts, same pairing as the website: serif for headlines, Inter for everything else.
// Custom fonts have one family per weight, so Text picks the Inter family from fontWeight (see ui.tsx).
export const fonts = {
  sans: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extra: 'Inter_800ExtraBold',
  },
  serif: 'LibreBaskerville_400Regular',
  serifBold: 'LibreBaskerville_700Bold',
  serifItalic: 'LibreBaskerville_400Regular_Italic',
};

export const type = {
  display: { fontFamily: fonts.serifBold, fontSize: 30, letterSpacing: -0.3, lineHeight: 40 },
  title: { fontFamily: fonts.serifBold, fontSize: 24, letterSpacing: -0.2, lineHeight: 32 },
  heading: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.6 },
};

export const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.28,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 5,
};

export const platformColors: Record<string, string> = {
  INSTAGRAM: '#E1306C',
  FACEBOOK: '#1877F2',
  LINKEDIN: '#2A8BE0',
  TWITTER: '#C9D1DB',
  TIKTOK: '#25D5CE',
  YOUTUBE: '#FF3B3B',
};
