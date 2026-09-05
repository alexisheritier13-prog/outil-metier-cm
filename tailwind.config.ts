import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          sunk: 'var(--surface-sunk)',
          inverse: 'var(--surface-inverse)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
          surface: 'var(--primary-surface)',
          strong: 'var(--primary-strong)',
          border: 'var(--primary-border)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        success: {
          DEFAULT: 'var(--success)',
          foreground: 'var(--success-foreground)',
          surface: 'var(--success-surface)',
          strong: 'var(--success-strong)',
          border: 'var(--success-border)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          foreground: 'var(--warning-foreground)',
          surface: 'var(--warning-surface)',
          strong: 'var(--warning-strong)',
          border: 'var(--warning-border)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          foreground: 'var(--danger-foreground)',
          surface: 'var(--danger-surface)',
          strong: 'var(--danger-strong)',
          border: 'var(--danger-border)',
        },
        info: {
          DEFAULT: 'var(--info)',
          foreground: 'var(--info-foreground)',
          surface: 'var(--info-surface)',
          strong: 'var(--info-strong)',
          border: 'var(--info-border)',
        },
        keydate: {
          DEFAULT: 'var(--keydate)',
          foreground: 'var(--keydate-foreground)',
          surface: 'var(--keydate-surface)',
          strong: 'var(--keydate-strong)',
          border: 'var(--keydate-border)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        'surface-inverse-foreground': 'var(--surface-inverse-foreground)',
        'label-foreground': 'var(--label-foreground)',
        'ink-faint': 'var(--ink-faint)',
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
      },
      borderRadius: {
        xl: 'calc(var(--radius) + 4px)', // 16px — tuiles internes (lignes, cases)
        lg: 'var(--radius)', // 12px — boutons, champs
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 6px)',
        '2xl': 'var(--radius-card)', // 20px — cartes
        '3xl': 'var(--radius-panel)', // 22px — panneaux flottants (sidebar, tiroirs)
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        card: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        panel: 'var(--shadow-panel)',
        primary: 'var(--shadow-primary)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Échelle rem fixe (registre produit) — pas de clamp.
        title: ['1.375rem', { lineHeight: '1.2', fontWeight: '800', letterSpacing: '-0.03em' }],
        section: ['1rem', { lineHeight: '1.35', fontWeight: '700', letterSpacing: '-0.014em' }],
        dense: ['0.8125rem', { lineHeight: '1.45' }],
      },
      zIndex: {
        dropdown: '1000',
        sticky: '1100',
        panel: '1200',
        'modal-backdrop': '1300',
        modal: '1400',
        toast: '1500',
        tooltip: '1600',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
