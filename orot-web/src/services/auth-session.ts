const AUTH_SESSION_HINT_KEY = 'orot:auth:session';

export function hasAuthSessionHint(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(AUTH_SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAuthSessionHint(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(AUTH_SESSION_HINT_KEY, '1');
  } catch {
    // noop
  }
}

export function clearAuthSessionHint(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(AUTH_SESSION_HINT_KEY);
  } catch {
    // noop
  }
}
