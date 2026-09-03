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
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
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
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 6px)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        card: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        panel: 'var(--shadow-panel)',
      },
      fontFamily: {
        display: ['Poppins', 'Inter Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Échelle rem fixe (registre produit) — pas de clamp.
        title: ['1.375rem', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.02em' }],
        section: ['1rem', { lineHeight: '1.35', fontWeight: '600', letterSpacing: '-0.011em' }],
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
