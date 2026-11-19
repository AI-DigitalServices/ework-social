export type Category = {
  id: string;
  label: string;
  audienceExamples: string[];
  contentTypes: string[];
  ideaChips: string[];
  toneSamples: Record<string, string>;
};

export type Options = {
  categories: Category[];
  tones: { id: string; label: string }[];
  frequencies: { id: string; label: string; hint: string }[];
  platforms: string[];
};

export type Profile = {
  category: string | null;
  website: string | null;
  description: string | null;
  audience: string | null;
  offerings: string[];
  tone: string | null;
  brandColors: string[];
  language: string | null;
  postingFrequency: string | null;
  platforms: string[];
  contentTypes: string[];
  step: number;
  completed: boolean;
};

export type OnboardingState = {
  workspaceId: string;
  businessName: string | null;
  step: number;
  completed: boolean;
  shouldOnboard: boolean;
  profile: Profile | null;
};

export type Analysis = {
  businessName: string | null;
  description: string | null;
  offerings: string[];
  audience: string | null;
  tone: string | null;
  category: string | null;
  brandColors: string[];
  language: string | null;
};

export type AnalyzeResponse = { website: string; found: Analysis; siteThemeColor: string | null };

const WRITER_ROLES = ['OWNER', 'ADMIN', 'EDITOR'];
export function canSetUp(role: string | undefined | null): boolean {
  return !!role && WRITER_ROLES.includes(role);
}

export function platformLabel(p: string): string {
  if (p === 'TWITTER') return 'X';
  return p.charAt(0) + p.slice(1).toLowerCase();
}
