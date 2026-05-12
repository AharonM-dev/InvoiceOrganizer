/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--wf-bg)',
        surface: 'var(--wf-surface)',
        'surface-2': 'var(--wf-surface-2)',
        'wf-border': 'var(--wf-border)',
        'wf-text': 'var(--wf-text)',
        'text-sec': 'var(--wf-text-secondary)',
        muted: 'var(--wf-text-muted)',
        bar: 'var(--wf-bar)',
        accent: 'var(--wf-accent)',
        'accent-on': 'var(--wf-accent-on)',
        'accent-dim': 'var(--wf-accent-dim)',
        success: 'var(--wf-success)',
        'success-dim': 'var(--wf-success-dim)',
        warn: 'var(--wf-warn)',
        'warn-dim': 'var(--wf-warn-dim)',
        danger: 'var(--wf-danger)',
        'danger-dim': 'var(--wf-danger-dim)',
      },
      fontFamily: {
        sans: ['Heebo', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'wf-sm': '8px',
        'wf-md': '12px',
        'wf-lg': '14px',
      },
      fontSize: {
        'wf-label': ['11px', { lineHeight: '1.3', letterSpacing: '0.04em' }],
      },
    },
  },
  plugins: [],
}
