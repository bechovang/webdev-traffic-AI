/**
 * Centralized Design Token System for HCM Traffic AI
 * All colors, typography, elevations, and radii are declared here for single-source maintenance.
 */

export const tokens = {
  colors: {
    // Quick LOS Hex Map for direct access
    los: {
      A: '#059669',
      B: '#10b981',
      C: '#f59e0b',
      D: '#f97316',
      E: '#e11d48',
      F: '#be123c',
    },

    // Traffic Level of Service (LOS A - F) Full Specs
    traffic: {
      losA: {
        hex: '#059669',
        label: 'A: Free Flow',
        bgSubtle: '#ecfdf5',
        text: '#065f46',
        border: '#a7f3d0',
      },
      losB: {
        hex: '#10b981',
        label: 'B: Smooth Flow',
        bgSubtle: '#f0fdf4',
        text: '#166534',
        border: '#bbf7d0',
      },
      losC: {
        hex: '#f59e0b',
        label: 'C: Stable Flow',
        bgSubtle: '#fffbeb',
        text: '#92400e',
        border: '#fde68a',
      },
      losD: {
        hex: '#f97316',
        label: 'D: Approaching Congestion',
        bgSubtle: '#fff7ed',
        text: '#9a3412',
        border: '#fed7aa',
      },
      losE: {
        hex: '#e11d48',
        label: 'E: Congested',
        bgSubtle: '#fff1f2',
        text: '#9f1239',
        border: '#fecdd3',
      },
      losF: {
        hex: '#be123c',
        label: 'F: Severe Breakdown',
        bgSubtle: '#ffe4e6',
        text: '#881337',
        border: '#fda4af',
      },
    },

    // Brand Palette
    brand: {
      primary: '#2563eb', // Blue 600
      primaryHover: '#1d4ed8',
      primaryActive: '#1e40af',
      primaryLight: '#eff6ff',
      primarySubtle: 'rgba(37, 99, 235, 0.1)',
      accent: '#6366f1', // Indigo 500
    },

    // UI Neutral Surfaces
    surface: {
      canvas: '#f8fafc',
      card: '#ffffff',
      glass: 'rgba(255, 255, 255, 0.88)',
      glassHeavy: 'rgba(255, 255, 255, 0.95)',
      glassBorder: 'rgba(226, 232, 240, 0.8)',
      subtle: '#f1f5f9',
      border: '#e2e8f0',
      borderHover: '#cbd5e1',
    },

    // Typography Colors
    text: {
      primary: '#0f172a', // Slate 900
      secondary: '#334155', // Slate 700
      muted: '#64748b', // Slate 500
      disabled: '#94a3b8', // Slate 400
      inverse: '#ffffff',
    },

    // Status Colors
    status: {
      online: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#3b82f6',
    },
  },

  typography: {
    fontFamily: {
      sans: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      black: '800',
    },
  },

  radii: {
    xs: '0.25rem', // 4px
    sm: '0.375rem', // 6px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
    '2xl': '1.25rem', // 20px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },

  shadows: {
    hud: '0 20px 40px -15px rgba(15, 23, 42, 0.12), 0 0 1px 1px rgba(255, 255, 255, 0.9)',
    card: '0 4px 14px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -2px rgba(15, 23, 42, 0.04)',
    float: '0 12px 28px -6px rgba(15, 23, 42, 0.15)',
    glowBlue: '0 0 20px rgba(37, 99, 235, 0.35)',
    glowRed: '0 0 20px rgba(225, 29, 72, 0.35)',
  },

  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '400ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;

export type DesignTokens = typeof tokens;

/** Helper to get exact color token for LOS grade */
export function getTrafficToken(los: string) {
  const t = tokens.colors.traffic;
  switch (los?.toUpperCase()) {
    case 'A':
      return t.losA;
    case 'B':
      return t.losB;
    case 'C':
      return t.losC;
    case 'D':
      return t.losD;
    case 'E':
      return t.losE;
    case 'F':
      return t.losF;
    default:
      return {
        hex: '#64748b',
        label: 'Unknown',
        bgSubtle: '#f8fafc',
        text: '#475569',
        border: '#cbd5e1',
      };
  }
}
