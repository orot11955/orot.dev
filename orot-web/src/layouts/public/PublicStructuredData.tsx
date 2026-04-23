import { resolveSiteUrl } from '@/utils/site-url';

interface PublicStructuredDataProps {
  siteName: string;
  description: string;
  logoUrl?: string;
  imageUrl?: string;
  sameAs?: string[];
}

function normalizeUrls(urls?: string[]): string[] | undefined {
  const normalized = urls
    ?.map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url));

  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function PublicStructuredData({
  siteName,
  description,
  logoUrl,
  imageUrl,
  sameAs,
}: PublicStructuredDataProps) {
  const siteUrl = resolveSiteUrl().toString();
  const publisherId = `${siteUrl}#publisher`;
  const websiteId = `${siteUrl}#website`;
  const normalizedSiteUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
  const searchTarget = `${normalizedSiteUrl}/posts?search={search_term_string}`;
  const normalizedSameAs = normalizeUrls(sameAs);
  const primaryImage = logoUrl || imageUrl;

  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: siteUrl,
        name: siteName,
        description,
        inLanguage: 'ko-KR',
        publisher: {
          '@id': publisherId,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: searchTarget,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': publisherId,
        url: siteUrl,
        name: siteName,
        description,
        logo: logoUrl
          ? {
              '@type': 'ImageObject',
              url: logoUrl,
            }
          : undefined,
        image: primaryImage,
        sameAs: normalizedSameAs,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
