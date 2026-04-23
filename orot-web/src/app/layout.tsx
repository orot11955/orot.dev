import type { Metadata } from 'next';
import { ClientLogBridge } from '@/components/ClientLogBridge';
import { ScrollPositionGauge } from '@/components/ScrollPositionGauge';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { getPublicSettings } from '@/utils/public-settings';
import {
  createPublicMetadata,
  resolveSiteDescription,
  resolveSiteIcon,
  resolveSiteImage,
  resolveSiteName,
} from '@/utils/metadata';
import { resolveSiteUrl } from '@/utils/site-url';
import { createThemeInitScript, resolveTheme } from '@/utils/theme-init';
import '@/styles/globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const siteName = resolveSiteName(settings);
  const description = resolveSiteDescription(settings);
  const imageUrl = resolveSiteImage(settings);
  const iconUrl = resolveSiteIcon(settings);
  const baseMetadata = createPublicMetadata({
    absoluteTitle: siteName,
    description,
    settings,
    image: imageUrl,
  });

  return {
    metadataBase: resolveSiteUrl(),
    applicationName: siteName,
    manifest: '/manifest.webmanifest',
    title: {
      default: siteName,
      template: '%s',
    },
    description,
    robots: baseMetadata.robots,
    twitter: baseMetadata.twitter,
    openGraph: {
      ...baseMetadata.openGraph,
      url: '/',
    },
    icons: iconUrl
      ? {
          icon: [{ url: iconUrl }],
          shortcut: [{ url: iconUrl }],
          apple: [{ url: iconUrl }],
        }
      : undefined,
  };
}

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
