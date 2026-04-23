import type { Theme } from '@/types';

export const THEME_STORAGE_KEY = 'orot-theme';
export const DEFAULT_THEME: Theme = 'light';
export const THEMES: Theme[] = ['light', 'dark', 'sepia', 'forest', 'ocean'];
export const DARK_COLOR_SCHEME_THEMES: Theme[] = ['dark', 'forest', 'ocean'];

const serializedThemes = JSON.stringify(THEMES);
const serializedDarkThemes = JSON.stringify(DARK_COLOR_SCHEME_THEMES);

export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var themes = ${serializedThemes};
    var darkThemes = ${serializedDarkThemes};
    var root = document.documentElement;
    var stored = window.localStorage.getItem('${THEME_STORAGE_KEY}');
    var theme = themes.indexOf(stored) >= 0 ? stored : null;

    if (!theme) {
      theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : '${DEFAULT_THEME}';
    }

    root.setAttribute('data-orot-theme', theme);
    root.style.colorScheme = darkThemes.indexOf(theme) >= 0 ? 'dark' : 'light';
  } catch (_) {
    document.documentElement.setAttribute('data-orot-theme', '${DEFAULT_THEME}');
    document.documentElement.style.colorScheme = 'light';
  }
})();
`.trim();
