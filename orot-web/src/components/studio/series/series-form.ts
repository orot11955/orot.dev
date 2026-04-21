import type { Series } from '@/types';

export type SeriesEditorState =
  | { mode: 'create' }
  | { mode: 'edit'; series: Series };

export interface SeriesFormState {
  title: string;
  slug: string;
  description: string;
}

export function createSeriesFormState(): SeriesFormState {
  return {
    title: '',
    slug: '',
    description: '',
  };
}

export function toSeriesFormState(
  series: Pick<Series, 'title' | 'slug' | 'description'>,
): SeriesFormState {
  return {
    title: series.title,
    slug: series.slug,
    description: series.description ?? '',
  };
}
