import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — eWork Social',
  description: 'Read the terms of service for eWork Social — the conditions for using our social media management and scheduling platform.',
  openGraph: {
    title: 'Terms of Service — eWork Social',
    url: 'https://www.eworksocial.com/terms',
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
