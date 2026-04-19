import type { Metadata } from 'next';
import { ClientLogBridge } from '@/components/ClientLogBridge';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import '@/styles/globals.css';

function parseUrl(value?: string | null): URL | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function resolveMetadataBase(): URL {
  const configuredUrl =
    parseUrl(process.env.SITE_URL) ??
    parseUrl(process.env.NEXT_PUBLIC_SITE_URL);

  if (configuredUrl) {
    return configuredUrl;
  }

  return new URL(`http://localhost:${process.env.PORT ?? '3000'}`);
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
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
