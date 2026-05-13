/**
 * Read a CSS custom property from `<html>` at call time. Used by Chart.js
 * dataset / option builders that need real color strings (Chart.js does
 * not consume `var(--…)` directly).
 *
 * Returns the trimmed value, or `fallback` if the variable is undefined
 * (e.g. during SSR / unit tests where `document` is not present).
 */
export function cssVar(name: string, fallback = ''): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return v ? v.trim() : fallback;
}

/**
 * Compose `rgba(r, g, b, a)` from a CSS variable that holds a `#rrggbb`
 * value. Useful for chart fills/translucent grids that need an alpha
 * channel — the design tokens themselves are opaque.
 */
export function cssVarWithAlpha(name: string, alpha: number, fallback = ''): string {
  const hex = cssVar(name, fallback);
  if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return hex;
  const full = hex.length === 4
    ? '#' + hex.slice(1).split('').map(c => c + c).join('')
    : hex;
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
