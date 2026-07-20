import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verify Your Email — eWork Social',
  description: 'Click the link in your email to verify your address and activate your eWork Social account.',
  robots: { index: false, follow: false },
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
