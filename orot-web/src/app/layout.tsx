import type { Metadata } from 'next';
import { ClientLogBridge } from '@/components/ClientLogBridge';
import { ScrollPositionGauge } from '@/components/ScrollPositionGauge';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { getPublicSettings } from '@/utils/public-settings';
import { resolveSiteUrl } from '@/utils/site-url';
import { createThemeInitScript, resolveTheme } from '@/utils/theme-init';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: resolveSiteUrl(),
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getPublicSettings();
  const defaultTheme = resolveTheme(settings?.default_theme);

  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: createThemeInitScript(defaultTheme),
          }}
        />
        <ClientLogBridge />
        <ThemeProvider defaultTheme={defaultTheme}>
          {children}
          <ScrollPositionGauge />
        </ThemeProvider>
      </body>
    </html>
  );
}
