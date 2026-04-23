import type { Metadata } from 'next';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { PostDetailClientPage } from '@/components/public/posts/PostDetailClientPage';
import { AuthProvider } from '@/contexts/AuthContext';
import { serverGet } from '@/utils/server-api';
import { splitTags } from '@/utils/content';
import {
  createNoIndexRobots,
  createPublicMetadata,
  createPublicNotFoundMetadata,
} from '@/utils/metadata';
import { getPublicSettings } from '@/utils/public-settings';
import { normalizeSlugParam } from '@/utils/slug';
import type { PostDetail, Series } from '@/types';

interface PostDetailRouteProps {
  params: Promise<{
    slug: string;
  }>;
}

const getPublicPostDetail = cache(async (slug: string): Promise<PostDetail | null> =>
  serverGet<PostDetail>(`/public/posts/${slug}`, undefined, {
    cache: 'no-store',
    revalidate: false,
  }),
);

const getPublicSeries = cache(async (slug: string): Promise<Series | null> =>
  serverGet<Series>(`/public/series/${slug}`, undefined, {
    cache: 'no-store',
    revalidate: false,
  }),
);

async function hasPreviewSession(): Promise<boolean> {
  try {
    const requestCookies = await cookies();
    return Boolean(requestCookies.get('refresh_token')?.value);
  } catch {
    return false;
  }
}

export async function generateMetadata(
  { params }: PostDetailRouteProps,
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlugParam(rawSlug);
  const [post, settings, previewSession] = await Promise.all([
    getPublicPostDetail(slug),
    getPublicSettings(),
    hasPreviewSession(),
  ]);

  if (!post) {
    if (previewSession) {
      return createPublicMetadata({
        title: '비공개 글 미리보기',
        description: '발행 전 글을 미리 확인하는 경로입니다.',
        settings,
        robots: createNoIndexRobots(),
      });
    }

    return createPublicNotFoundMetadata({
      title: '글을 찾을 수 없음',
      description: '요청한 글을 찾을 수 없습니다.',
      settings,
    });
  }

  const title = post.metaTitle?.trim() || post.title;
  const description =
    post.metaDesc?.trim() ||
    post.excerpt?.trim() ||
    undefined;
  const tags = splitTags(post.tags);
  const publishedTime = post.publishedAt ?? post.createdAt;
  const modifiedTime = post.updatedAt;

  return createPublicMetadata({
    title,
    description,
    path: `/posts/${post.slug}`,
    settings,
    keywords: tags,
    image: post.coverImage,
    type: 'article',
    publishedTime,
    modifiedTime,
    tags,
  });
}

export default async function PostDetailRoute({ params }: PostDetailRouteProps) {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlugParam(rawSlug);
  const [post, previewSession] = await Promise.all([
    getPublicPostDetail(slug),
    hasPreviewSession(),
  ]);

  if (!post && !previewSession) {
    notFound();
  }

  const initialSeries =
    post?.series?.slug ? await getPublicSeries(post.series.slug) : null;

  return (
    <AuthProvider>
      <PostDetailClientPage
        slug={slug}
        initialPost={post}
        initialSeries={initialSeries}
      />
    </AuthProvider>
  );
}
