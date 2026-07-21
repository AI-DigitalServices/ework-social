import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LinkedIn Integration — Schedule Posts & Manage Company Pages | eWork Social',
  description:
    'Connect your LinkedIn Company Pages to eWork Social. Schedule posts, reply to comments, and manage your LinkedIn presence alongside Facebook, Instagram, and more — from one unified dashboard for social media agencies worldwide.',
  openGraph: {
    title: 'LinkedIn Integration — eWork Social',
    description: 'Schedule LinkedIn posts and manage Company Page comments from a unified dashboard.',
    url: 'https://www.eworksocial.com/integrations/linkedin',
  },
};

export default function LinkedInIntegrationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
