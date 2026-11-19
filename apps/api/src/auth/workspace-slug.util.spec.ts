import { slugBase, uniqueWorkspaceSlug } from './workspace-slug.util';

const prismaWith = (taken: (slug: string) => boolean) => ({
  workspace: { findUnique: jest.fn().mockImplementation(async ({ where }: any) => (taken(where.slug) ? { id: 'x' } : null)) },
});

describe('slugBase', () => {
  it('keeps the original recipe so existing addresses never change', () => {
    expect(slugBase('Ai Digital SERVICES')).toBe('ai-digital-services');
    expect(slugBase("Ada's  Bakery & Cakes")).toBe('adas-bakery--cakes');
  });

  it('falls back to "workspace" when nothing usable is left', () => {
    expect(slugBase('')).toBe('workspace');
    expect(slugBase('!!!')).toBe('workspace');
    expect(slugBase(undefined as any)).toBe('workspace');
  });

  it('caps the length', () => {
    expect(slugBase('a'.repeat(200)).length).toBe(60);
  });
});

describe('uniqueWorkspaceSlug', () => {
  it('returns the plain address when it is free', async () => {
    const p = prismaWith(() => false);
    expect(await uniqueWorkspaceSlug(p, 'Ai Digital SERVICES')).toBe('ai-digital-services');
    expect(p.workspace.findUnique).toHaveBeenCalledTimes(1);
  });

  it('adds a short suffix when the plain address is taken', async () => {
    const p = prismaWith((s) => s === 'ai-digital-services');
    const slug = await uniqueWorkspaceSlug(p, 'Ai Digital SERVICES');
    expect(slug).toMatch(/^ai-digital-services-[0-9a-f]{6}$/);
  });

  it('keeps trying a few times, then falls back to a timestamp, and never throws', async () => {
    const p = prismaWith(() => true);
    const slug = await uniqueWorkspaceSlug(p, 'Ada Bakery');
    expect(slug).toMatch(/^ada-bakery-\d+$/);
    expect(p.workspace.findUnique).toHaveBeenCalledTimes(6);
  });

  it('two sign-ups with the same business name get different addresses', async () => {
    const used = new Set<string>();
    const p = {
      workspace: {
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => (used.has(where.slug) ? { id: 'x' } : null)),
      },
    };
    const a = await uniqueWorkspaceSlug(p, 'Ada Bakery');
    used.add(a);
    const b = await uniqueWorkspaceSlug(p, 'Ada Bakery');
    expect(a).toBe('ada-bakery');
    expect(b).not.toBe(a);
  });
});
