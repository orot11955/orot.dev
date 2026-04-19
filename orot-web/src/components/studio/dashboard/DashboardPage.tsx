'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Badge,
  Card,
  Empty,
  Spin,
  Statistic,
  Typography,
} from 'orot-ui';
import { useNotificationEffect } from '@/hooks';
import {
  studioAnalyticsService,
  studioCommentsService,
  studioPostsService,
} from '@/services';
import type {
  AnalyticsStats,
  Comment,
  PostListItem,
  PostStatus,
} from '@/types';
import { formatDate, getErrorMessage } from '@/utils/content';
import { VisitorTrendChart } from './VisitorTrendChart';
import { PostStatusChart, STATUS_META } from './PostStatusChart';
import styles from './Dashboard.module.css';

interface DashboardData {
  stats: AnalyticsStats;
  reviewPosts: PostListItem[];
  scheduledPosts: PostListItem[];
  pendingComments: Comment[];
  pendingTotal: number;
}

function countByStatus(
  distribution: AnalyticsStats['postStatusDistribution'],
  status: PostStatus,
): number {
  return distribution.find((d) => d.status === status)?.count ?? 0;
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useNotificationEffect(error, {
    type: 'error',
    title: '대시보드를 불러오지 못했습니다.',
  });

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [stats, review, scheduled, pending] = await Promise.all([
          studioAnalyticsService.getStats(),
          studioPostsService.getAll({ status: 'REVIEW', limit: 5, sort: 'latest' }),
          studioPostsService.getAll({ status: 'SCHEDULED', limit: 5, sort: 'latest' }),
          studioCommentsService.getAll({ status: 'pending', limit: 5 }),
        ]);

        if (!active) return;

        setData({
          stats,
          reviewPosts: review.data,
          scheduledPosts: scheduled.data,
          pendingComments: pending.data,
          pendingTotal: pending.total,
        });
      } catch (err) {
        if (!active) return;
        setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.center}>
        <Spin size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.center}>
        <Empty description={error ?? '잠시 후 다시 시도해주세요.'} />
      </div>
    );
  }

  const { stats, reviewPosts, scheduledPosts, pendingComments, pendingTotal } =
    data;

  const publishedCount = countByStatus(stats.postStatusDistribution, 'PUBLISHED');
  const reviewCount = countByStatus(stats.postStatusDistribution, 'REVIEW');
  const scheduledCount = countByStatus(
    stats.postStatusDistribution,
    'SCHEDULED',
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <Typography.Text className={styles.eyebrow}>Dashboard</Typography.Text>
          <Typography.Title level={2} className={styles.pageTitle}>
            사이트 운영 현황
          </Typography.Title>
          <Typography.Paragraph className={styles.pageSubtitle}>
            방문자와 콘텐츠 파이프라인, 댓글 모더레이션 지표를 한눈에 확인합니다.
          </Typography.Paragraph>
        </div>
        <div className={styles.pageBadges}>
          <Badge
            count={reviewCount}
            showZero
            color={reviewCount > 0 ? 'var(--public-accent)' : undefined}
          >
            <span className={styles.pageBadgeLabel}>검토 대기 글</span>
          </Badge>
          <Badge
            count={pendingTotal}
            showZero
            color={pendingTotal > 0 ? 'var(--orot-color-warning)' : undefined}
          >
            <span className={styles.pageBadgeLabel}>승인 대기 댓글</span>
          </Badge>
        </div>
      </header>

      <section className={styles.statsGrid}>
        <Card className={styles.statCard} bordered>
          <Statistic
            title="오늘 방문자"
            value={stats.visitors.today}
            suffix="명"
          />
          <Typography.Text className={styles.statHelper}>
            이번 주 누적 {stats.visitors.week.toLocaleString('ko-KR')}명
          </Typography.Text>
        </Card>
        <Card className={styles.statCard} bordered>
          <Statistic
            title="이번 달 방문자"
            value={stats.visitors.month}
            suffix="명"
          />
          <Typography.Text className={styles.statHelper}>
            전체 누적 {stats.visitors.total.toLocaleString('ko-KR')}명
          </Typography.Text>
        </Card>
        <Card className={styles.statCard} bordered>
          <Statistic title="발행된 글" value={publishedCount} suffix="편" />
          <Typography.Text className={styles.statHelper}>
            총 {stats.postStatusDistribution
              .reduce((acc, d) => acc + d.count, 0)
              .toLocaleString('ko-KR')}
            편 관리 중
          </Typography.Text>
        </Card>
        <Card className={styles.statCard} bordered>
          <Statistic title="예약된 글" value={scheduledCount} suffix="편" />
          <Typography.Text className={styles.statHelper}>
            검토 중 {reviewCount}편
          </Typography.Text>
        </Card>
      </section>

      <section className={styles.chartsGrid}>
        <Card
          className={styles.panel}
          bordered
          title={
            <div className={styles.panelTitle}>
              <span>방문자 추이</span>
              <Typography.Text className={styles.panelMeta}>
                최근 {stats.dailyVisits.length}일
              </Typography.Text>
            </div>
          }
        >
          <VisitorTrendChart data={stats.dailyVisits} />
        </Card>

        <Card
          className={styles.panel}
          bordered
          title={
            <div className={styles.panelTitle}>
              <span>게시 상태 분포</span>
              <Typography.Text code>{stats.postStatusDistribution.reduce(
                (acc, d) => acc + d.count,
                0,
              )} 편</Typography.Text>
            </div>
          }
        >
          <PostStatusChart data={stats.postStatusDistribution} />
        </Card>
      </section>

      <section className={styles.panelsGrid}>
        <Card
          className={styles.panel}
          bordered
          title={
            <div className={styles.panelTitle}>
              <span>인기 글 TOP 5</span>
              <Link href="/studio/posts" className={styles.panelLink}>
                전체 보기
              </Link>
            </div>
          }
        >
          {stats.topPosts.length === 0 ? (
            <Empty description="조회 데이터가 없습니다." />
          ) : (
            <ol className={styles.rankList}>
              {stats.topPosts.slice(0, 5).map((post, i) => (
                <li key={post.id} className={styles.rankItem}>
                  <span className={styles.rank}>{i + 1}</span>
                  <Link
                    href={`/posts/${post.slug}`}
                    className={styles.rankTitle}
                  >
                    {post.title}
                  </Link>
                  <span className={styles.rankMeta}>
                    {post.viewCount.toLocaleString('ko-KR')} 조회
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card
          className={styles.panel}
          bordered
          title={
            <div className={styles.panelTitle}>
              <span>배포 대기 글</span>
              <Typography.Text code>{reviewPosts.length + scheduledPosts.length} 편</Typography.Text>
            </div>
          }
        >
          {reviewPosts.length === 0 && scheduledPosts.length === 0 ? (
            <Empty description="처리할 글이 없습니다." />
          ) : (
            <ul className={styles.pipelineList}>
              {reviewPosts.map((post) => (
                <li key={`review-${post.id}`} className={styles.pipelineItem}>
                  <Badge
                    status={STATUS_META.REVIEW.badge}
                    text={STATUS_META.REVIEW.label}
                  />
                  <Link
                    href={`/studio/posts?id=${post.id}`}
                    className={styles.pipelineTitle}
                  >
                    {post.title}
                  </Link>
                  <span className={styles.pipelineMeta}>
                    {formatDate(post.updatedAt)}
                  </span>
                </li>
              ))}
              {scheduledPosts.map((post) => (
                <li
                  key={`scheduled-${post.id}`}
                  className={styles.pipelineItem}
                >
                  <Badge
                    status={STATUS_META.SCHEDULED.badge}
                    text={STATUS_META.SCHEDULED.label}
                  />
                  <Link
                    href={`/studio/posts?id=${post.id}`}
                    className={styles.pipelineTitle}
                  >
                    {post.title}
                  </Link>
                  <span className={styles.pipelineMeta}>
                    {formatDate(post.scheduledAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          className={styles.panel}
          bordered
          title={
            <div className={styles.panelTitle}>
              <span>승인 대기 댓글</span>
              <Typography.Text code>{pendingTotal} 개</Typography.Text>
            </div>
          }
        >
          {pendingComments.length === 0 ? (
            <Empty description="승인 대기 중인 댓글이 없습니다." />
          ) : (
            <ul className={styles.commentList}>
              {pendingComments.map((comment) => (
                <li key={comment.id} className={styles.commentItem}>
                  <div className={styles.commentHead}>
                    <span className={styles.commentAuthor}>
                      {comment.authorName}
                    </span>
                    {comment.isFiltered && (
                      <Badge status="error" text="필터링" />
                    )}
                    <span className={styles.commentDate}>
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className={styles.commentBody}>{comment.content}</p>
                  {comment.post && (
                    <Link
                      href={`/posts/${comment.post.slug}`}
                      className={styles.commentPost}
                    >
                      {comment.post.title}
                    </Link>
                  )}
                </li>
              ))}
              {pendingTotal > pendingComments.length && (
                <li className={styles.commentMore}>
                  <Link href="/studio/comments" className={styles.panelLink}>
                    +{pendingTotal - pendingComments.length}건 더 보기
                  </Link>
                </li>
              )}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
