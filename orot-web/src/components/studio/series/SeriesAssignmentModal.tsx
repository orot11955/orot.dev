'use client';

import { Alert, Button, Input, Modal, Spin } from 'orot-ui';
import type { PostListItem, Series, SeriesPostSummary } from '@/types';
import { formatDate } from '@/utils/content';
import styles from './SeriesManagement.module.css';

interface SeriesAssignmentModalProps {
  assignTarget: Series | null;
  assignLoading: boolean;
  assignError: string | null;
  showInitialLoading: boolean;
  availablePosts: PostListItem[];
  assignOrder: SeriesPostSummary[];
  assignSearch: string;
  onAssignSearchChange: (value: string) => void;
  onAddPost: (post: PostListItem) => void;
  onMovePost: (id: number, direction: -1 | 1) => void;
  onRemovePost: (id: number) => void;
  onDismissError: () => void;
  onSave: () => void | Promise<void>;
  onClose: () => void;
}

export function SeriesAssignmentModal({
  assignTarget,
  assignLoading,
  assignError,
  showInitialLoading,
  availablePosts,
  assignOrder,
  assignSearch,
  onAssignSearchChange,
  onAddPost,
  onMovePost,
  onRemovePost,
  onDismissError,
  onSave,
  onClose,
}: SeriesAssignmentModalProps) {
  return (
    <Modal
      open={assignTarget !== null}
      title={assignTarget ? `글 관리 · ${assignTarget.title}` : '글 관리'}
      okText="저장"
      cancelText="취소"
      confirmLoading={assignLoading}
      onOk={() => {
        void onSave();
      }}
      onCancel={onClose}
      destroyOnHidden
      width={880}
    >
      {assignError && (
        <Alert
          type="error"
          message={assignError}
          closable
          onClose={onDismissError}
          style={{ marginBottom: 'var(--orot-space-3)' }}
        />
      )}
      {showInitialLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--orot-space-10)' }}>
          <Spin size="lg" />
        </div>
      ) : (
        <div className={styles.assignLayout}>
          <div className={styles.assignColumn}>
            <div className={styles.assignHeader}>
              <span>발행된 글</span>
              <span className={styles.assignCount}>{availablePosts.length}편</span>
            </div>
            <Input
              value={assignSearch}
              placeholder="제목·슬러그 검색"
              onChange={(event) => onAssignSearchChange(event.target.value)}
            />
            {availablePosts.length === 0 ? (
              <div className={styles.emptyList}>추가할 수 있는 발행된 글이 없습니다.</div>
            ) : (
              <ul className={styles.assignList}>
                {availablePosts.map((post) => (
                  <li key={post.id} className={styles.assignItem}>
                    <div className={styles.assignItemBody}>
                      <span className={styles.assignItemTitle}>{post.title}</span>
                      <span className={styles.assignItemMeta}>
                        {post.slug} · {formatDate(post.publishedAt)}
                      </span>
                    </div>
                    <div className={styles.assignItemActions}>
                      <Button
                        size="sm"
                        variant="text"
                        onClick={() => onAddPost(post)}
                      >
                        추가
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.assignColumn}>
            <div className={styles.assignHeader}>
              <span>시리즈에 포함 (위에서 아래 순서)</span>
              <span className={styles.assignCount}>{assignOrder.length}편</span>
            </div>
            {assignOrder.length === 0 ? (
              <div className={styles.emptyList}>왼쪽에서 글을 추가하세요.</div>
            ) : (
              <ul className={styles.assignList}>
                {assignOrder.map((post, index) => (
                  <li key={post.id} className={styles.assignItem}>
                    <span className={styles.orderBadge}>{index + 1}</span>
                    <div className={styles.assignItemBody}>
                      <span className={styles.assignItemTitle}>{post.title}</span>
                      <span className={styles.assignItemMeta}>{post.slug}</span>
                    </div>
                    <div className={styles.assignItemActions}>
                      <Button
                        size="sm"
                        variant="text"
                        disabled={index === 0}
                        onClick={() => onMovePost(post.id, -1)}
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="text"
                        disabled={index === assignOrder.length - 1}
                        onClick={() => onMovePost(post.id, 1)}
                      >
                        ↓
                      </Button>
                      <Button
                        size="sm"
                        variant="text"
                        onClick={() => onRemovePost(post.id)}
                      >
                        제거
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
