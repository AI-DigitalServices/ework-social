import { View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { platformColors } from './theme';

// Brand glyphs come from the Font Awesome set that ships with Expo, so nothing is hand-drawn.
const GLYPH: Record<string, string> = {
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  LINKEDIN: 'linkedin-in',
  TWITTER: 'x-twitter',
  TIKTOK: 'tiktok',
  YOUTUBE: 'youtube',
  THREADS: 'threads',
  BLUESKY: 'bluesky',
  WHATSAPP: 'whatsapp',
};

const COLORS: Record<string, string> = {
  ...platformColors,
  THREADS: '#3A3F4B',
  BLUESKY: '#1185FE',
  WHATSAPP: '#25D366',
};

// Light brand colours need a dark glyph to stay readable.
const DARK_GLYPH = ['TWITTER', 'TIKTOK'];

export function platformColor(platform: string | null | undefined): string {
  return (platform && COLORS[platform]) || '#4C9BFF';
}

/** A rounded badge in the platform's colour with its icon. Renders nothing without a platform. */
export default function PlatformIcon({ platform, size = 40 }: { platform: string | null | undefined; size?: number }) {
  if (!platform) return null;
  const name = GLYPH[platform];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: platformColor(platform),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {name ? (
        <FontAwesome6 name={name as any} brand size={size * 0.5} color={DARK_GLYPH.includes(platform) ? '#08111B' : '#FFFFFF'} />
      ) : null}
    </View>
  );
}
