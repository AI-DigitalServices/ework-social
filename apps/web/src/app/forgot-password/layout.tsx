import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Your Password — eWork Social',
  description: 'Forgot your password? Enter your email address and we will send you a secure link to reset it.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
