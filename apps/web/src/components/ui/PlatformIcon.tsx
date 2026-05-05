interface Props {
  platform: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const platformConfig: Record<string, { label: string; bg: string; text: string; ring: string }> = {
  FACEBOOK:  { label: 'f',  bg: 'bg-[#1877F2]', text: 'text-white', ring: 'ring-blue-200' },
  INSTAGRAM: { label: 'IG', bg: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]', text: 'text-white', ring: 'ring-pink-200' },
  TWITTER:   { label: '𝕏',  bg: 'bg-black',     text: 'text-white', ring: 'ring-slate-200' },
  LINKEDIN:  { label: 'in', bg: 'bg-[#0A66C2]', text: 'text-white', ring: 'ring-blue-200' },
  TIKTOK:    { label: 'TT', bg: 'bg-black',     text: 'text-white', ring: 'ring-slate-200' },
  YOUTUBE:   { label: '▶',  bg: 'bg-[#FF0000]', text: 'text-white', ring: 'ring-red-200' },
  PINTEREST: { label: 'P',  bg: 'bg-[#E60023]', text: 'text-white', ring: 'ring-red-200' },
  THREADS:   { label: '@',  bg: 'bg-black',     text: 'text-white', ring: 'ring-slate-200' },
  WHATSAPP:  { label: 'W',  bg: 'bg-[#25D366]', text: 'text-white', ring: 'ring-green-200' },
  TELEGRAM:  { label: '✈',  bg: 'bg-[#2AABEE]', text: 'text-white', ring: 'ring-sky-200' },
  REDDIT:    { label: 'r/', bg: 'bg-[#FF4500]', text: 'text-white', ring: 'ring-orange-200' },
  BLUESKY:   { label: '🦋', bg: 'bg-[#0085FF]', text: 'text-white', ring: 'ring-sky-200' },
};

const sizes = {
  sm: { box: 'w-6 h-6',   font: 'text-[9px]'  },
  md: { box: 'w-8 h-8',   font: 'text-[11px]' },
  lg: { box: 'w-10 h-10', font: 'text-[13px]' },
};

export default function PlatformIcon({ platform, size = 'md', className = '' }: Props) {
  const config = platformConfig[platform] || {
    label: platform.slice(0, 2).toUpperCase(),
    bg: 'bg-slate-500',
    text: 'text-white',
    ring: 'ring-slate-200',
  };
  const { box, font } = sizes[size];

  return (
    <div className={`${box} ${config.bg} ${config.text} rounded-lg flex items-center justify-center font-black ring-2 ${config.ring} flex-shrink-0 ${className}`}>
      <span className={`${font} leading-none tracking-tight`}>{config.label}</span>
    </div>
  );
}
