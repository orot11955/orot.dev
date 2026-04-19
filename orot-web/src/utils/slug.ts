export function normalizeSlugParam(slug: string): string {
  const trimmed = slug.trim();

  if (!trimmed) {
    return '';
  }

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}
