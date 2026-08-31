/**
 * Design tokens.
 *
 * The category colours are the important part of this file: yellow, red, blue and
 * white/general are not a palette choice, they are the colour code mandated by
 * Schedule I of the Bio-Medical Waste Management Rules 2016 (India). A designer
 * cannot "improve" them without breaking the thing the product is for, so they
 * live here as named tokens with that stated plainly.
 *
 * Everything else is the enterprise-medical direction: a near-white canvas, teal
 * as the single brand accent, and one deliberately dark surface for the 3D
 * viewport so the digital twin reads as an instrument panel rather than a page.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F9FB',
        surface: '#FFFFFF',
        // A second surface for nested panels — cards on cards need a half-step,
        // not another border.
        subtle: '#F1F5F9',
        line: '#E8EDF2',
        ink: '#0F172A',
        muted: '#64748B',
        faint: '#94A3B8',

        brand: {
          DEFAULT: '#0D9488',
          deep: '#0F766E',   // active nav pill, pressed states
          bright: '#14B8A6', // gradient start
          cyan: '#06B6D4',   // gradient end
          wash: '#F0FDFA',   // tinted backgrounds, selected rows
          edge: '#CCFBF1',   // borders on tinted surfaces
        },

        // The regulatory colour code. Each category carries a saturated value for
        // dots and icons, plus a tint/ink pair for badges that has to stay legible
        // against white at small sizes.
        waste: {
          yellow: '#EAB308',
          'yellow-tint': '#FEF9C3',
          'yellow-ink': '#854D0E',
          red: '#EF4444',
          'red-tint': '#FEE2E2',
          'red-ink': '#991B1B',
          blue: '#3B82F6',
          'blue-tint': '#DBEAFE',
          'blue-ink': '#1E40AF',
          general: '#64748B',
          'general-tint': '#F1F5F9',
          'general-ink': '#334155',
        },

        state: {
          ok: '#10B981',
          'ok-tint': '#D1FAE5',
          warn: '#F59E0B',
          'warn-tint': '#FEF3C7',
          danger: '#DC2626',
          'danger-tint': '#FEE2E2',
          info: '#0EA5E9',
          'info-tint': '#E0F2FE',
        },

        // The 3D viewport and its furniture. Kept as its own scale because these
        // are the only dark surfaces in the product and they need to work together.
        twin: {
          void: '#0B1120',
          floor: '#111C33',
          grid: '#1E293B',
          edge: '#334155',
        },
      },

      fontFamily: {
        // Inter for the interface; JetBrains Mono for anything an operator reads
        // character by character — waste ids, compartment ids, coordinates,
        // telemetry. Proportional digits are genuinely harder to compare in a
        // column, so the distinction is functional.
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        // A dense-dashboard scale. The eyebrow size is a real role here: it labels
        // every card in the reference layout.
        eyebrow: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
        metric: ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.02em' }],
        'metric-lg': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em' }],
      },

      borderRadius: {
        card: '0.875rem',
        pill: '999px',
      },

      boxShadow: {
        // Shadows stay very light. On a near-white canvas anything heavier reads
        // as a modal, and everything on these pages is flat content.
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.03)',
        raised: '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
        pop: '0 12px 32px rgba(15, 23, 42, 0.12)',
        'brand-glow': '0 6px 20px rgba(13, 148, 136, 0.22)',
      },

      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #14B8A6 0%, #06B6D4 100%)',
        'brand-gradient-deep': 'linear-gradient(135deg, #0F766E 0%, #0891B2 100%)',
        // Faint grid behind the hero, echoing the robot's occupancy grid.
        'grid-fade':
          'linear-gradient(to right, rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.045) 1px, transparent 1px)',
      },

      backgroundSize: {
        grid: '32px 32px',
      },

      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Used on live telemetry dots. Deliberately slow — a fast blink on a
        // monitoring screen reads as an alarm.
        breathe: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(0.9)' },
        },
        'sweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        'ring-out': {
          '0%': { transform: 'scale(0.7)', opacity: '0.55' },
          '100%': { transform: 'scale(2.1)', opacity: '0' },
        },
      },

      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        breathe: 'breathe 2.4s ease-in-out infinite',
        sweep: 'sweep 1.9s ease-in-out infinite',
        'ring-out': 'ring-out 2s ease-out infinite',
      },
    },
  },
  plugins: [],
};
