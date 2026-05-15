import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JVP Document Intelligence',
  description: 'Compliance documental para empresas mexicanas: CFDI, laboral y contratos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
