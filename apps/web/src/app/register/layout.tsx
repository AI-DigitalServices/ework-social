import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Start Your Free 7-Day Trial — eWork Social',
  description: 'Join eWork Social free for 7 days — no credit card required. Connect Instagram, Facebook, LinkedIn, TikTok and YouTube and manage all your social media clients from one dashboard.',
  openGraph: {
    title: 'Start Your Free 7-Day Trial — eWork Social',
    description: 'No credit card required. Manage every client, platform and campaign from one place.',
    url: 'https://www.eworksocial.com/register',
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
