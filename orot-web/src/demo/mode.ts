export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

export const DEMO_STORAGE_KEY = 'orot:demo-store:v1';
export const DEMO_AUTH_STORAGE_KEY = 'orot:demo-auth:v1';

export const DEMO_USER = {
  id: 1,
  username: 'demo',
  role: 'ADMIN' as const,
};
