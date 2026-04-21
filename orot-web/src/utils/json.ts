export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function safeParseJson(raw?: string | null): unknown | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function safeParseJsonArray<T>(
  raw: string | null | undefined,
  fallback: T[],
  isItem?: (value: unknown) => value is T,
): T[] {
  const parsed = safeParseJson(raw);

  if (!Array.isArray(parsed)) {
    return fallback;
  }

  if (!isItem) {
    return parsed as T[];
  }

  const items = parsed.filter(isItem);
  return items.length > 0 ? items : fallback;
}
