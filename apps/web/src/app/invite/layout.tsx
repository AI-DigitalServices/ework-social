import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accept Workspace Invitation — eWork Social',
  description: 'Accept your invitation to join a workspace on eWork Social.',
  robots: { index: false, follow: false },
};

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
