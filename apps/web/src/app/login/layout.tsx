import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log In to eWork Social',
  description: 'Sign in to your eWork Social dashboard to schedule posts, manage clients, track analytics and automate engagement across Instagram, Facebook, LinkedIn, TikTok and more.',
  openGraph: {
    title: 'Log In to eWork Social',
    description: 'Sign in to your eWork Social dashboard.',
    url: 'https://www.eworksocial.com/login',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
