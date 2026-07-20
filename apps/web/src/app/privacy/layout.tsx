import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — eWork Social',
  description: 'Read how eWork Social collects, uses and protects your personal data when you use our social media management platform.',
  openGraph: {
    title: 'Privacy Policy — eWork Social',
    url: 'https://www.eworksocial.com/privacy',
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
