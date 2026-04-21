import type { Metadata } from 'next';
import { PostDetailClientPage } from '@/components/public/posts/PostDetailClientPage';
import { serverGet } from '@/utils/server-api';
import { resolveAssetUrl, splitTags } from '@/utils/content';
import { normalizeSlugParam } from '@/utils/slug';
import type { PostDetail, PublicSettings } from '@/types';

interface PostDetailRouteProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(
  { params }: PostDetailRouteProps,
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlugParam(rawSlug);
  const [post, settings] = await Promise.all([
    serverGet<PostDetail>(`/public/posts/${slug}`, undefined, {
      cache: 'no-store',
      revalidate: false,
    }),
    serverGet<PublicSettings>('/public/settings', undefined, {
      cache: 'no-store',
      revalidate: false,
    }),
  ]);

  if (!post) {
    return { title: '글을 찾을 수 없음 | orot.dev' };
  }

  const siteName = settings?.site_name || 'orot.dev';
  const title = post.metaTitle?.trim() || post.title;
  const description =
    post.metaDesc?.trim() ||
    post.excerpt?.trim() ||
    settings?.site_description ||
    '';
  const imageUrl =
    resolveAssetUrl(post.coverImage) ||
    resolveAssetUrl(settings?.site_og_image) ||
    undefined;
  const tags = splitTags(post.tags);
  const publishedTime = post.publishedAt ?? post.createdAt;
  const modifiedTime = post.updatedAt;

  return {
    title: `${title} | ${siteName}`,
    description,
    keywords: tags.length > 0 ? tags : undefined,
    alternates: {
      canonical: `/posts/${post.slug}`,
    },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `/posts/${post.slug}`,
      siteName,
      publishedTime,
      modifiedTime,
      tags: tags.length > 0 ? tags : undefined,
      images: imageUrl ? [{ url: imageUrl, alt: title }] : undefined,
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function PostDetailRoute({ params }: PostDetailRouteProps) {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlugParam(rawSlug);
  const post = await serverGet<PostDetail>(`/public/posts/${slug}`, undefined, {
    cache: 'no-store',
    revalidate: false,
  });

  return <PostDetailClientPage slug={slug} initialPost={post} />;
}
