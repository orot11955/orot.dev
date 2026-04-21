import { ensureUniqueSlug, resolveBaseSlug, slugify } from './slug';

describe('slug utilities', () => {
  it('normalizes unicode-safe slugs consistently', () => {
    expect(slugify('  Café 테스트  _Hello!!  ')).toBe('cafe-테스트-hello');
  });

  it('falls back to the default slug when candidates normalize to empty', () => {
    expect(resolveBaseSlug('series', '!!!', '   ')).toBe('series');
  });

  it('allows the current record to keep its slug while avoiding collisions', async () => {
    const findBySlug = jest
      .fn<Promise<{ id: number } | null>, [string]>()
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 });

    await expect(
      ensureUniqueSlug({
        base: 'Hello World',
        defaultSlug: 'item',
        excludeId: 2,
        findBySlug,
      }),
    ).resolves.toBe('hello-world-1');
  });
});
