/**
 * useThemeClass — Resolves a theme prop ('light' | 'dark' | 'system') to the
 * CSS theme class for the panel root.
 *
 * 'system' is resolved via matchMedia and stays reactive to OS theme changes.
 * Resolving in JS (instead of a @media (prefers-color-scheme) block) lets the
 * stylesheet keep a single dark-token rule (.aa-dark) for both the manual and
 * system-preference paths.
 *
 * SSR note: the server snapshot is light; dark-preferring users get the dark
 * class on hydration.
 */

import { useSyncExternalStore } from 'react';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(DARK_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(DARK_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useThemeClass(theme: 'light' | 'dark' | 'system' = 'system'): string {
  const prefersDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (theme === 'dark') return 'aa-dark';
  if (theme === 'light') return 'aa-light';
  return prefersDark ? 'aa-dark' : 'aa-light';
}
