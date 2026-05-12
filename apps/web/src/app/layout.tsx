import type { Metadata, Viewport } from 'next';
import { Fraunces, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';
import { ConfirmProvider } from '../components/confirm-modal';

/**
 * Fraunces: serifada variavel com eixos opsz/wght/soft; usada em
 * titulos e rotulos do mapa para dar um tom editorial distinto.
 * JetBrains Mono: coordenadas e metadados tecnicos no mapa.
 */
const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz', 'SOFT'],
  display: 'swap',
  variable: '--font-display',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'EventPass',
  description: 'Passaporte digital, QR scanner e gamificacao para eventos.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EventPass',
  },
};

export const viewport: Viewport = {
  themeColor: '#0057A3',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh bg-slate-50 text-slate-900 antialiased">
        <AuthProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
