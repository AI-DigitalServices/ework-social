/* ─────────────────────────────────────────────────────────────────
   PlatformIcon — single source of truth for platform SVG icons.
   Usage (light bg):  <PlatformIcon platform="FACEBOOK" size="md" />
   Usage (dark bg):   <PlatformIcon platform="INSTAGRAM" size="md" glow />
   ──────────────────────────────────────────────────────────────── */

interface Props {
  platform: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  /** Adds a coloured glow boxShadow — use on dark backgrounds */
  glow?: boolean;
}

const sizes = { xs: 20, sm: 24, md: 32, lg: 40 };

/* Per-platform glow shadow (used when glow=true) */
const GLOW_SHADOWS: Record<string, string> = {
  FACEBOOK:  '0 0 14px rgba(24,119,242,0.65)',
  INSTAGRAM: '0 0 14px rgba(225,48,108,0.65)',
  TWITTER:   '0 0 14px rgba(29,161,242,0.55)',
  X:         '0 0 14px rgba(29,161,242,0.55)',
  LINKEDIN:  '0 0 14px rgba(10,102,194,0.65)',
  TIKTOK:    '0 0 14px rgba(105,201,208,0.45)',
  YOUTUBE:   '0 0 14px rgba(255,0,0,0.6)',
  THREADS:   '0 0 14px rgba(120,120,120,0.45)',
  BLUESKY:   '0 0 14px rgba(0,133,255,0.65)',
  PINTEREST: '0 0 14px rgba(230,0,35,0.6)',
  WHATSAPP:  '0 0 14px rgba(37,211,102,0.55)',
  REDDIT:    '0 0 14px rgba(255,69,0,0.6)',
  TELEGRAM:  '0 0 14px rgba(42,171,238,0.55)',
};

/* Per-platform ring colour (used when glow=false, light bg) */
const RING_CLASSES: Record<string, string> = {
  FACEBOOK:  'ring-blue-200',  INSTAGRAM: 'ring-pink-200',
  LINKEDIN:  'ring-blue-200',  TWITTER:   'ring-slate-200',
  X:         'ring-slate-200', TIKTOK:    'ring-slate-200',
  YOUTUBE:   'ring-red-200',   THREADS:   'ring-slate-200',
  BLUESKY:   'ring-sky-200',   PINTEREST: 'ring-red-200',
  WHATSAPP:  'ring-green-200', TELEGRAM:  'ring-sky-200',
  REDDIT:    'ring-orange-200',
};

/* ── SVG icons ──────────────────────────────────────────────────── */
function PlatformSVG({ platform, px }: { platform: string; px: number }) {
  const r = Math.round(px * 0.22);

  switch (platform) {
    case 'FACEBOOK':
      return (
        <svg width={px} height={px} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" fill="#1877F2"/>
          <path d="M22.5 20h3l0.6-4H22.5v-2c0-1.1 0.5-2 2-2H26v-3.4S24.8 8 23 8c-3.5 0-5.5 2.1-5.5 5.5V16H14v4h3.5v10h5V20z" fill="white"/>
        </svg>
      );

    case 'INSTAGRAM':
      return (
        <svg width={px} height={px} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`ig-${px}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#f09433"/>
              <stop offset="35%"  stopColor="#dc2743"/>
              <stop offset="100%" stopColor="#bc1888"/>
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx={r} fill={`url(#ig-${px})`}/>
          <rect x="7" y="7" width="26" height="26" rx="7" fill="none" stroke="white" strokeWidth="2.5"/>
          <circle cx="20" cy="20" r="7" fill="none" stroke="white" strokeWidth="2.2"/>
          <circle cx="29" cy="11" r="2" fill="white"/>
        </svg>
      );

    case 'LINKEDIN':
      return (
        <svg width={px} height={px} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx={r} fill="#0A66C2"/>
          <rect x="7" y="14" width="6" height="19" fill="white"/>
          <circle cx="10" cy="9" r="3.5" fill="white"/>
          <path d="M18 14h6v3c1.2-2 3.5-3.2 6-3.2 5.5 0 6.5 3.6 6.5 8.2V33H30V23c0-2.5-0.5-4.5-3-4.5-2.5 0-3.5 1.8-3.5 4.2V33H18V14z" fill="white"/>
        </svg>
      );

    case 'TWITTER':
    case 'X':
      return (
        <svg width={px} height={px} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx={r} fill="#000000"/>
          <path d="M7 7L17.5 21.5L7 33H10L19 23.5L27 33H33L22 18L32.5 7H29.5L20.5 16L13 7H7Z" fill="white"/>
        </svg>
      );

    case 'TIKTOK':
      return (
        <svg width={px} height={px} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx={r} fill="#010101"/>
          {/* teal layer */}
          <rect x="10" y="9" width="3.5" height="17" rx="1.5" fill="#69C9D0"/>
          <path d="M13.5 9c0 0 5-1.2 6.5-4.5" stroke="#69C9D0" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          <path d="M20 4.5c2.5 0 5.5 1.5 5.5 4.5 0 2.5-2 3.5-3.5 3" stroke="#69C9D0" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          <ellipse cx="8" cy="26" rx="5" ry="4" fill="#69C9D0"/>
          {/* red layer */}
          <rect x="14" y="6" width="3.5" height="17" rx="1.5" fill="#EE1D52"/>
          <path d="M17.5 6c0 0 5-1.2 6.5-4.5" stroke="#EE1D52" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          <path d="M24 1.5c2.5 0 5.5 1.5 5.5 4.5 0 2.5-2 3.5-3.5 3" stroke="#EE1D52" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          <ellipse cx="12" cy="23" rx="5" ry="4" fill="#EE1D52"/>
          {/* white main */}
          <rect x="12" y="7.5" width="3.5" height="17" rx="1.5" fill="white"/>
          <path d="M15.5 7.5c0 0 5-1.2 6.5-4.5" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <path d="M22 3c2.5 0 5.5 1.5 5.5 4.5 0 2.5-2 3.5-3.5 3" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <ellipse cx="10" cy="24.5" rx="5" ry="4" fill="white"/>
        </svg>
      );

    case 'YOUTUBE':
      return (
        <svg width={px} height={px} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx={r} fill="#ffffff"/>
          <rect x="2" y="10" width="36" height="20" rx="6" fill="#FF0000"/>
          <polygon points="16,14 16,26 28,20" fill="white"/>
        </svg>
      );

    case 'THREADS':
      return (
        <svg width={px} height={px} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx={r} fill="#101010"/>
          <circle cx="20" cy="22" r="6" fill="none" stroke="white" strokeWidth="3"/>
          <path d="M26 22c0-5-3.5-8.5-8-8.5-4.5 0-8 3-8 8s3 8 7.5 8c3.5 0 6-2 7-5" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          <line x1="26" y1="22" x2="26" y2="13" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          <path d="M26 13c0-3.5-3-5-6-4.5" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      );

    case 'BLUESKY':
      return (
        <svg width={px} height={px} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" fill="#0085FF"/>
          <path d="M20 24c-5-5-13-8-13-14 0-4 4-6 7-4 3 2 5 6 6 8 1-2 3-6 6-8 3-2 7 0 7 4 0 6-8 9-13 14z" fill="white"/>
          <path d="M15 30c2 3 5 4 5 4s3-1 5-4" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      );

    case 'PINTEREST':
      return (
        <svg width={px} height={px} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" fill="#E60023"/>
          <path d="M20 6C12 6 6 12 6 20c0 5.9 3.5 11 8.5 13.3-0.1-1.1-0.2-2.8 0-4 0.2-1.1 1.5-6.2 1.5-6.2s-0.4-0.8-0.4-1.9c0-1.8 1-3.1 2.3-3.1 1.1 0 1.6 0.8 1.6 1.8 0 1.1-0.7 2.7-1.1 4.2-0.3 1.2 0.6 2.2 1.8 2.2 2.2 0 3.7-2.8 3.7-6.2 0-2.6-1.7-4.5-4.8-4.5-3.5 0-5.6 2.6-5.6 5.5 0 1 0.3 1.7 0.8 2.2 0.2 0.3 0.3 0.4 0.2 0.7-0.1 0.2-0.2 0.8-0.3 1-0.1 0.3-0.3 0.4-0.6 0.3-1.6-0.7-2.4-2.6-2.4-4.8 0-3.5 2.9-7.6 8.7-7.6 4.6 0 7.7 3.4 7.7 7 0 4.7-2.7 8.2-6.6 8.2-1.3 0-2.6-0.7-3-1.5l-0.8 3.2c-0.3 1.1-1 2.5-1.5 3.4 1.1 0.4 2.3 0.5 3.5 0.5 8 0 14-6 14-14S28 6 20 6z" fill="white"/>
        </svg>
      );

    case 'WHATSAPP':
      return (
        <svg width={px} height={px} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" fill="#25D366"/>
          <path d="M20 8C13.4 8 8 13.4 8 20c0 2.2 0.6 4.3 1.7 6.1L8 32l6.1-1.6C15.8 31.4 17.9 32 20 32c6.6 0 12-5.4 12-12S26.6 8 20 8zm6.5 16.5c-0.3 0.8-1.5 1.5-2.1 1.6-0.5 0.1-1.2 0.1-1.9-0.1-0.4-0.1-1-0.3-1.7-0.6-3-1.3-4.9-4.3-5.1-4.5-0.1-0.2-1.1-1.5-1.1-2.8s0.7-2 1-2.3c0.3-0.3 0.5-0.4 0.7-0.4h0.5c0.2 0 0.4 0 0.5 0.4 0.2 0.5 0.8 1.8 0.8 2 0.1 0.1 0.1 0.3 0 0.5-0.1 0.1-0.2 0.3-0.3 0.4l-0.4 0.4c-0.1 0.1-0.3 0.3-0.1 0.6 0.2 0.3 0.8 1.2 1.7 2 1.2 1 2.1 1.4 2.4 1.5 0.3 0.1 0.5 0.1 0.6-0.1 0.2-0.2 0.7-0.8 0.9-1.1 0.2-0.3 0.4-0.2 0.7-0.1 0.3 0.1 1.8 0.8 2.1 1 0.3 0.1 0.5 0.2 0.6 0.3 0.1 0.2 0.1 0.9-0.2 1.7z" fill="white"/>
        </svg>
      );

    case 'TELEGRAM':
      return (
        <svg width={px} height={px} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" fill="#2AABEE"/>
          <path d="M8 19.5l5 1.8 2 6.2 3-3.5 5.5 4L31 10 8 19.5z" fill="white"/>
          <path d="M13 21.3l-1.5 7 3-3.5" fill="#d0e6f0"/>
        </svg>
      );

    case 'REDDIT':
      return (
        <svg width={px} height={px} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" fill="#FF4500"/>
          <circle cx="20" cy="22" r="9" fill="white"/>
          <circle cx="16" cy="21" r="2" fill="#FF4500"/>
          <circle cx="24" cy="21" r="2" fill="#FF4500"/>
          <path d="M15 26c1.5 1.5 8.5 1.5 10 0" fill="none" stroke="#FF4500" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="20" cy="12" r="3" fill="white"/>
          <line x1="20" y1="15" x2="20" y2="13" stroke="white" strokeWidth="2"/>
          <circle cx="32" cy="16" r="2.5" fill="white"/>
          <circle cx="8" cy="16" r="2.5" fill="white"/>
          <line x1="11" y1="17" x2="14" y2="20" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="29" y1="17" x2="26" y2="20" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      );

    default:
      return (
        <svg width={px} height={px} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx={r} fill="#64748b"/>
          <text x="20" y="26" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="sans-serif">
            {platform.slice(0, 2)}
          </text>
        </svg>
      );
  }
}

/* ── Public component ───────────────────────────────────────────── */
export default function PlatformIcon({ platform, size = 'md', className = '', glow = false }: Props) {
  const px = sizes[size];
  const borderRadius = Math.max(6, Math.round(px * 0.28));

  if (glow) {
    const shadow = GLOW_SHADOWS[platform] || '0 0 12px rgba(100,116,139,0.4)';
    return (
      <div
        className={`overflow-hidden flex-shrink-0 ${className}`}
        style={{ width: px, height: px, borderRadius, boxShadow: shadow, display: 'inline-block' }}
      >
        <PlatformSVG platform={platform} px={px} />
      </div>
    );
  }

  const ring = RING_CLASSES[platform] || 'ring-slate-200';
  return (
    <div className={`rounded-lg overflow-hidden flex-shrink-0 ring-2 ${ring} ${className}`} style={{ width: px, height: px }}>
      <PlatformSVG platform={platform} px={px} />
    </div>
  );
}
