import { Libre_Baskerville } from 'next/font/google';

// Matches the serif headline treatment used on eworksocial.com's marketing
// pages — used selectively on dashboard page titles for brand consistency,
// while body text/buttons stay on the existing Geist sans-serif.
export const libreBaskerville = Libre_Baskerville({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-libre-baskerville',
});
