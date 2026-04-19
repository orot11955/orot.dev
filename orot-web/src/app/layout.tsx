import type { Metadata } from 'next';
import { ClientLogBridge } from '@/components/ClientLogBridge';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { resolveSiteUrl } from '@/utils/site-url';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: resolveSiteUrl(),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ClientLogBridge />
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
