'use client';

import { useCallback, useEffect, useState } from 'react';
import { Spin } from 'orot-ui';
import { PageErrorState } from '@/components/PageErrorState';
import { useAuth } from '@/contexts/AuthContext';
import { hasAuthSessionHint } from '@/services/auth-session';
import { publicPostsService, studioPostsService } from '@/services';
import type { PostDetail } from '@/types';
import { getErrorMessage } from '@/utils/content';
import { PostDetailPage } from './PostDetailPage';

interface PostDetailClientPageProps {
  slug: string;
  initialPost: PostDetail | null;
}

const VIEWED_POST_STORAGE_PREFIX = 'orot:post-viewed:';

function formatSessionDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function PostDetailClientPage({
  slug,
  initialPost,
}: PostDetailClientPageProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [post, setPost] = useState<PostDetail | null>(initialPost);
  const [loading, setLoading] = useState(!initialPost);
  const [error, setError] = useState<string | null>(null);

  const canPreview = user?.role === 'ADMIN' || user?.role === 'EDITOR';
  const canAttemptPreview = canPreview || hasAuthSessionHint();

  const loadPreview = useCallback(async () => {
    if (!canAttemptPreview) {
      setPost(null);
      setLoading(false);
      setError('발행되지 않은 글은 권한이 있는 로그인 상태에서만 확인할 수 있습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await studioPostsService.getBySlug(slug);
      setPost(result);
    } catch (err) {
      setPost(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [canAttemptPreview, slug]);

  const handleRetry = useCallback(() => {
    void loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    setPost(initialPost);
    setLoading(!initialPost);
    setError(null);
  }, [initialPost, slug]);

  useEffect(() => {
    if (initialPost) {
      return;
    }

    if (authLoading) {
      return;
    }

    void loadPreview();
  }, [authLoading, initialPost, loadPreview]);

  useEffect(() => {
    if (!post || post.status !== 'PUBLISHED' || post.slug !== slug) {
      return;
    }

    const storageKey = `${VIEWED_POST_STORAGE_PREFIX}${post.slug}:${formatSessionDateKey(new Date())}`;

    try {
      if (window.sessionStorage.getItem(storageKey) === '1') {
        return;
      }

      // 같은 탭의 재마운트/Strict Mode 중복 호출을 먼저 차단합니다.
      window.sessionStorage.setItem(storageKey, '1');
    } catch {
      // storage 접근 불가 시 서버 쿠키 기반 중복 방지에 맡깁니다.
    }

    let cancelled = false;

    publicPostsService
      .recordView(post.slug)
      .then(({ viewCount }) => {
        if (cancelled) {
          return;
        }

        setPost((current) => {
          if (!current || current.slug !== post.slug) {
            return current;
          }

          if (current.viewCount === viewCount) {
            return current;
          }

          return {
            ...current,
            viewCount,
          };
        });
      })
      .catch(() => {
        try {
          window.sessionStorage.removeItem(storageKey);
        } catch {
          // noop
        }
      });

    return () => {
      cancelled = true;
    };
  }, [post, slug]);

  if (post) {
    return <PostDetailPage post={post} />;
  }

  if (loading || authLoading) {
    return (
      <section
        style={{
          width: '100%',
          padding: 'clamp(var(--orot-space-8), 7vw, var(--orot-space-16)) 0',
        }}
      >
        <div
          style={{
            maxWidth: 'var(--public-shell-max-width)',
            margin: '0 auto',
            padding: '0 var(--public-shell-padding)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Spin size="lg" />
        </div>
      </section>
    );
  }

  return (
    <PageErrorState
      status="404"
      eyebrow={canAttemptPreview ? 'Preview' : 'Post'}
      title="글을 찾을 수 없습니다."
      description={error ?? '요청하신 글이 없거나 아직 공개되지 않았습니다.'}
      onRetry={canAttemptPreview ? handleRetry : undefined}
      retryLabel={canAttemptPreview ? '미리보기 다시 확인' : '다시 시도'}
    />
  );
}
