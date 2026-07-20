import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Content Approval — eWork Social',
  description: 'Review and approve social media content submitted for your approval.',
  robots: { index: false, follow: false },
};

export default function ApproveLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
