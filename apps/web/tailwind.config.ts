import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0057A3',   // cor primaria padrao (substitua pelo brand do evento)
          accent:  '#F0B323',
        },
        // Paleta dedicada ao canvas do mapa (editorial noturno).
        venue: {
          canvas: '#0B1220',
          canvas2: '#111A2E',
          ink: '#F3EFE6',
          mute: '#55607A',
          line: 'rgba(243,239,230,0.08)',
          glow: '#F0B323',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        'pin-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.4' },
          '50%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(200%)' },
        },
        'orbit': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pin-pulse': 'pin-pulse 2.6s ease-out infinite',
        'scanline': 'scanline 2s linear 1',
        'orbit': 'orbit 8s linear infinite',
        'fade-up': 'fade-up 0.35s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config;
