export type ApiScope = 'auth' | 'public' | 'editor' | 'studio';

type ApiPathSegment = string | number;

function normalizeSegment(segment: ApiPathSegment): string {
  return encodeURIComponent(String(segment).replace(/^\/+|\/+$/g, ''));
}

export function buildApiPath(...segments: ApiPathSegment[]): string {
  const normalized = segments
    .map(normalizeSegment)
    .filter(Boolean)
    .join('/');

  return `/${normalized}`;
}

export const apiPaths = {
  auth: (...segments: ApiPathSegment[]) => buildApiPath('auth', ...segments),
  public: (...segments: ApiPathSegment[]) =>
    buildApiPath('public', ...segments),
  editor: (...segments: ApiPathSegment[]) =>
    buildApiPath('editor', ...segments),
  studio: (...segments: ApiPathSegment[]) =>
    buildApiPath('studio', ...segments),
};

export function createAreaRoutes(resource: string) {
  return {
    public: (...segments: ApiPathSegment[]) =>
      apiPaths.public(resource, ...segments),
    editor: (...segments: ApiPathSegment[]) =>
      apiPaths.editor(resource, ...segments),
    studio: (...segments: ApiPathSegment[]) =>
      apiPaths.studio(resource, ...segments),
  };
}
