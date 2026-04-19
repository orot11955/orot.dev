'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  Badge,
  Button,
  Empty,
  FilePlus,
  Input,
  LogOut,
  Pagination,
  Spin,
} from 'orot-ui';
import { useAuth } from '@/contexts/AuthContext';
import { editorPostsService } from '@/services';
import type { PostListItem } from '@/types';
import { formatDate, getErrorMessage } from '@/utils/content';
import { STATUS_META } from '@/components/studio/dashboard/PostStatusChart';
import { EDITOR_FILTERS, type EditorFilter } from './editor-nav';
import styles from './EditorSidebar.module.css';

interface EditorSidebarProps {
  activeId: number | null;
  refreshToken: number;
  onNavigate?: () => void;
}

const PAGE_SIZE = 20;

export function EditorSidebar({
  activeId,
  refreshToken,
  onNavigate,
}: EditorSidebarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<EditorFilter>('all');
  const [search, setSearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await editorPostsService.getAll({
        page,
        limit: PAGE_SIZE,
        ...(filter !== 'all' ? { status: filter } : {}),
        ...(search ? { search } : {}),
      });

      if (page > 1 && result.data.length === 0 && result.totalPages > 0) {
        setPage(result.totalPages);
        return;
      }

      setPosts(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter, page, search]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const submitSearch = useCallback(() => {
    setSearch(pendingSearch.trim());
    setPage(1);
  }, [pendingSearch]);

  const handleCreate = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const created = await editorPostsService.create({
        title: '새 초안',
        content: '',
      });
      router.push(`/editor/posts/${created.id}`);
      onNavigate?.();
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }, [creating, router, onNavigate, load]);

  const handleSelect = useCallback(
    (post: PostListItem) => {
      router.push(`/editor/posts/${post.id}`);
      onNavigate?.();
    },
    [router, onNavigate],
  );

  const items = useMemo(() => posts, [posts]);

  return (
    <div className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandText}>orot.editor</span>
        <Button
          variant="outlined"
          size="sm"
          icon={<FilePlus size={14} />}
          loading={creating}
          onClick={handleCreate}
          className={styles.newButton}
        >
          새 초안
        </Button>
      </div>

      <div className={styles.search}>
        <Input
          value={pendingSearch}
          placeholder="제목·내용 검색"
          onChange={(event) => setPendingSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submitSearch();
          }}
          onBlur={submitSearch}
        />
      </div>

      <div className={styles.filters}>
        {EDITOR_FILTERS.map((item) => (
          <button
            type="button"
            key={item.value}
            data-active={filter === item.value}
            className={styles.filterButton}
            onClick={() => {
              setFilter(item.value);
              setPage(1);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {loading && items.length === 0 ? (
          <div className={styles.listEmpty}>
            <Spin size="sm" />
          </div>
        ) : error ? (
          <div className={styles.listEmpty}>{error}</div>
        ) : items.length === 0 ? (
          <Empty description="글이 없습니다." />
        ) : (
          items.map((post) => {
            const meta = STATUS_META[post.status];
            return (
              <div
                key={post.id}
                role="button"
                tabIndex={0}
                data-active={post.id === activeId}
                className={styles.listItem}
                onClick={() => handleSelect(post)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelect(post);
                  }
                }}
              >
                <div className={styles.itemHeader}>
                  <span className={styles.itemTitle}>
                    {post.title || '(제목 없음)'}
                  </span>
                  <Badge status={meta.badge} text={meta.label} />
                </div>
                {post.excerpt && (
                  <div className={styles.itemExcerpt}>{post.excerpt}</div>
                )}
                <div className={styles.itemMeta}>
                  <span>{formatDate(post.updatedAt)}</span>
                  <span>
                    {post.series ? `시리즈 · ${post.series.title}` : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={styles.paginationBar}>
        <Pagination
          current={page}
          pageSize={PAGE_SIZE}
          total={total}
          hideOnSinglePage
          align="center"
          onChange={(nextPage) => setPage(nextPage)}
        />
      </div>

      <div className={styles.footer}>
        {user && (
          <div className={styles.user}>
            <Avatar size="sm">{user.username.slice(0, 1).toUpperCase()}</Avatar>
            <span className={styles.userName}>{user.username}</span>
          </div>
        )}
        <Button
          variant="text"
          size="sm"
          icon={<LogOut size={14} />}
          onClick={() => logout()}
          aria-label="로그아웃"
        />
      </div>
    </div>
  );
}
