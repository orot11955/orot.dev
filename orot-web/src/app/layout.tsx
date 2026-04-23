import type { Metadata } from 'next';
import { ClientLogBridge } from '@/components/ClientLogBridge';
import { ScrollPositionGauge } from '@/components/ScrollPositionGauge';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { resolveSiteUrl } from '@/utils/site-url';
import { THEME_INIT_SCRIPT } from '@/utils/theme-init';
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
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ClientLogBridge />
        <ThemeProvider>
          {children}
          <ScrollPositionGauge />
        </ThemeProvider>
      </body>
    </html>
  );
}
