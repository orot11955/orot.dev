'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Theme } from '@/types';
import {
  DARK_COLOR_SCHEME_THEMES,
  DEFAULT_THEME,
  isTheme,
  THEMES,
  THEME_STORAGE_KEY,
} from '@/utils/theme-init';

// ─── Context ──────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useLayoutEffect(() => {
    const initial = resolveInitialTheme(defaultTheme);
    applyTheme(initial);
    setThemeState(initial);
  }, [defaultTheme]);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    setThemeState(next);
    writeStoredTheme(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── DOM helper ───────────────────────────────────────────────────────────────

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute('data-orot-theme', theme);
  root.style.colorScheme = DARK_COLOR_SCHEME_THEMES.includes(theme)
    ? 'dark'
    : 'light';
}

function resolveInitialTheme(defaultTheme: Theme): Theme {
  const current = document.documentElement.getAttribute('data-orot-theme');
  if (isTheme(current)) {
    return current;
  }

  const stored = readStoredTheme();
  if (isTheme(stored)) {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : defaultTheme;
}

function readStoredTheme(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Theme still applies for the current page even when storage is unavailable.
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
