import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'theme';
const DEFAULT_THEME: Theme = 'dark';

/**
 * Reads a persisted theme on construction and writes the active value
 * to `document.documentElement` as `data-theme`. The styles.css design
 * tokens are defined under `[data-theme="dark"]` (default + fallback)
 * and `[data-theme="light"]`; flipping the attribute swaps every
 * `var(--wf-*)` consumer instantly with no per-component work.
 *
 * The service is bootstrapped via APP_INITIALIZER in `app.config.ts`,
 * so the attribute is set before the first paint — no flash of wrong
 * theme on refresh.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(this.readStored());
  /** Reactive read access — components can bind to `theme()` if needed. */
  readonly theme = this._theme.asReadonly();

  /** Applies the persisted (or default) theme to `<html>`. Idempotent. */
  applyInitial(): void {
    this.apply(this._theme());
  }

  /** Persists the choice and updates the document attribute. */
  setTheme(next: Theme): void {
    if (next !== 'dark' && next !== 'light') return;
    this._theme.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore (private mode, quota, etc.) — applying the theme still works
    }
    this.apply(next);
  }

  toggleTheme(): void {
    this.setTheme(this._theme() === 'dark' ? 'light' : 'dark');
  }

  private apply(theme: Theme): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
  }

  private readStored(): Theme {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'light' || v === 'dark') return v;
    } catch {
      // ignore
    }
    return DEFAULT_THEME;
  }
}
