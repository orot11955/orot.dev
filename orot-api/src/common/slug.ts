type SlugRecord = { id: number };

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}\s_-]+/gu, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function resolveBaseSlug(
  defaultSlug: string,
  ...candidates: Array<string | null | undefined>
): string {
  const normalizedDefaultSlug = slugify(defaultSlug) || 'item';

  for (const candidate of candidates) {
    const normalized = slugify(candidate ?? '');
    if (normalized) {
      return normalized;
    }
  }

  return normalizedDefaultSlug;
}

export async function ensureUniqueSlug(options: {
  base: string;
  defaultSlug: string;
  findBySlug: (slug: string) => Promise<SlugRecord | null>;
  excludeId?: number;
}): Promise<string> {
  const normalizedBase = resolveBaseSlug(options.defaultSlug, options.base);
  let slug = normalizedBase;
  let count = 0;

  while (true) {
    const existing = await options.findBySlug(slug);
    if (!existing || existing.id === options.excludeId) {
      return slug;
    }

    count += 1;
    slug = `${normalizedBase}-${count}`;
  }
}
