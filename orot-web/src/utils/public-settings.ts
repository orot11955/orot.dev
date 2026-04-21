import { cache } from 'react';
import type { PublicSettings } from '@/types';
import { serverGet } from './server-api';

export const getPublicSettings = cache(async (): Promise<PublicSettings | null> =>
  serverGet<PublicSettings>('/public/settings', undefined, {
    cache: 'no-store',
    revalidate: false,
  }),
);
