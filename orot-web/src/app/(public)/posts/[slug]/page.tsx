import type { Metadata } from 'next';
import { cache } from 'react';
import { PostDetailClientPage } from '@/components/public/posts/PostDetailClientPage';
import { serverGet } from '@/utils/server-api';
import { splitTags } from '@/utils/content';
import { createPublicMetadata } from '@/utils/metadata';
import { getPublicSettings } from '@/utils/public-settings';
import { normalizeSlugParam } from '@/utils/slug';
import type { PostDetail } from '@/types';

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

export async function generateMetadata(
  { params }: PostDetailRouteProps,
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlugParam(rawSlug);
  const [post, settings] = await Promise.all([
    getPublicPostDetail(slug),
    getPublicSettings(),
  ]);

  if (!post) {
    return createPublicMetadata({
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
  const post = await getPublicPostDetail(slug);

  return <PostDetailClientPage slug={slug} initialPost={post} />;
}
