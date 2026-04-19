'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  CheckCircle,
  Input,
  MarkdownEditor,
  Save,
  Send,
  Spin,
  Tag,
  Typography,
} from 'orot-ui';
import { editorPostsService } from '@/services';
import type { Post, PostStatus, UpdatePostPayload } from '@/types';
import { getErrorMessage, resolveAssetUrl, splitTags } from '@/utils/content';
import { STATUS_META } from '@/components/studio/dashboard/PostStatusChart';
import { useEditorRefresh } from '@/layouts/EditorLayout';
import styles from './EditorWorkspace.module.css';

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface EditorWorkspaceProps {
  postId: number;
}

const AUTOSAVE_DELAY_MS = 1200;

function getSaveLabel(state: SaveState, savedAt: Date | null): string {
  if (state === 'saving') return '저장 중…';
  if (state === 'dirty') return '변경됨';
  if (state === 'error') return '저장 실패';
  if (state === 'saved' && savedAt) {
    const diff = Math.max(1, Math.round((Date.now() - savedAt.getTime()) / 1000));
    if (diff < 60) return `${diff}초 전 저장됨`;
    const minutes = Math.round(diff / 60);
    return `${minutes}분 전 저장됨`;
  }
  return '저장됨';
}

export function EditorWorkspace({ postId }: EditorWorkspaceProps) {
  const refreshSidebar = useEditorRefresh();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [slug, setSlug] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [coverImage, setCoverImage] = useState('');

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [coverAction, setCoverAction] = useState<'idle' | 'uploading' | 'removing'>('idle');

  const pendingRef = useRef<UpdatePostPayload | null>(null);
  const savingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const applyPost = useCallback((next: Post) => {
    setPost(next);
    setTitle(next.title ?? '');
    setContent(next.content ?? '');
    setExcerpt(next.excerpt ?? '');
    setSlug(next.slug ?? '');
    setTagsText(next.tags ?? '');
    setCoverImage(next.coverImage ?? '');
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    setLoading(true);
    setError(null);
    setSaveState('idle');
    setSavedAt(null);

    editorPostsService
      .getById(postId)
      .then((result) => {
        if (cancelled) return;
        applyPost(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [postId, applyPost]);

  const flush = useCallback(async () => {
    const payload = pendingRef.current;
    if (!payload || savingRef.current) return;
    pendingRef.current = null;
    savingRef.current = true;
    setSaveState('saving');
    try {
      const updated = await editorPostsService.update(postId, payload);
      setPost((prev) => ({ ...(prev ?? updated), ...updated }));
      setSaveState('saved');
      setSavedAt(new Date());
      setSaveError(null);
      refreshSidebar();
    } catch (err) {
      setSaveState('error');
      setSaveError(getErrorMessage(err));
      // Restore pending so the user can retry via next edit
      pendingRef.current = { ...(payload ?? {}), ...(pendingRef.current ?? {}) };
    } finally {
      savingRef.current = false;
      if (pendingRef.current) {
        // Queue another flush if changes came in while saving
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
      }
    }
  }, [postId, refreshSidebar]);

  const queueSave = useCallback(
    (patch: UpdatePostPayload) => {
      pendingRef.current = { ...(pendingRef.current ?? {}), ...patch };
      setSaveState('dirty');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
    },
    [flush],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Controlled field handlers — queue a save when user actually changes a value
  const onTitleChange = (value: string) => {
    setTitle(value);
    if (hydratedRef.current) queueSave({ title: value });
  };
  const onContentChange = (value: string) => {
    setContent(value);
    if (hydratedRef.current) queueSave({ content: value });
  };
  const onExcerptChange = (value: string) => {
    setExcerpt(value);
    if (hydratedRef.current) queueSave({ excerpt: value });
  };
  const onSlugChange = (value: string) => {
    setSlug(value);
    if (hydratedRef.current) queueSave({ slug: value });
  };
  const onTagsChange = (value: string) => {
    setTagsText(value);
    if (hydratedRef.current) queueSave({ tags: value });
  };

  const handleSaveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await flush();
  }, [flush]);

  const handleCoverUpload = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      setCoverAction('uploading');
      setSaveState('saving');
      setSaveError(null);

      try {
        const updated = await editorPostsService.uploadCoverImage(postId, file);
        setPost((prev) => ({ ...(prev ?? updated), ...updated }));
        setCoverImage(updated.coverImage ?? '');
        setSavedAt(new Date());
        setSaveState(pendingRef.current ? 'dirty' : 'saved');
        refreshSidebar();
      } catch (err) {
        setSaveState('error');
        setSaveError(getErrorMessage(err));
      } finally {
        setCoverAction('idle');
      }
    },
    [postId, refreshSidebar],
  );

  const handleCoverRemove = useCallback(async () => {
    if (!coverImage) {
      return;
    }

    setCoverAction('removing');
    setSaveState('saving');
    setSaveError(null);

    try {
      const updated = await editorPostsService.removeCoverImage(postId);
      setPost((prev) => ({ ...(prev ?? updated), ...updated }));
      setCoverImage(updated.coverImage ?? '');
      setSavedAt(new Date());
      setSaveState(pendingRef.current ? 'dirty' : 'saved');
      refreshSidebar();
    } catch (err) {
      setSaveState('error');
      setSaveError(getErrorMessage(err));
    } finally {
      setCoverAction('idle');
    }
  }, [coverImage, postId, refreshSidebar]);

  const handleTransition = useCallback(
    async (target: PostStatus) => {
      if (!post || transitioning) return;
      // Flush first so unsaved changes don't get lost on status jumps
      if (pendingRef.current) {
        if (timerRef.current) clearTimeout(timerRef.current);
        await flush();
      }
      setTransitioning(true);
      try {
        const updated = await editorPostsService.transition(post.id, {
          status: target,
        });
        applyPost(updated);
        refreshSidebar();
      } catch (err) {
        setSaveError(getErrorMessage(err));
      } finally {
        setTransitioning(false);
      }
    },
    [post, transitioning, flush, applyPost, refreshSidebar],
  );

  const tagList = useMemo(() => splitTags(tagsText), [tagsText]);

  if (loading) {
    return (
      <div className={styles.editorArea}>
        <Spin size="md" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={styles.editorArea}>
        <Alert
          type="error"
          message="글을 불러오지 못했습니다."
          description={error ?? '알 수 없는 오류'}
        />
      </div>
    );
  }

  const statusMeta = STATUS_META[post.status];
  const saveLabel = getSaveLabel(saveState, savedAt);
  const coverPreview = resolveAssetUrl(coverImage);
  const coverBusy = coverAction !== 'idle';

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <div className={styles.controlBar}>
          <div className={styles.controlLeft}>
            <Badge status={statusMeta.badge} text={statusMeta.label} />
            <span
              className={styles.saveStatus}
              data-state={saveState}
              role="status"
              aria-live="polite"
            >
              {saveLabel}
            </span>
          </div>
          <div className={styles.controlRight}>
            <Button
              size="sm"
              variant="text"
              icon={<Save size={14} />}
              onClick={handleSaveNow}
              disabled={saveState === 'saving'}
            >
              저장
            </Button>
            {renderTransitionButtons(post.status, handleTransition, transitioning)}
          </div>
        </div>

        {saveError && (
          <div style={{ padding: '0 var(--orot-space-6)' }}>
            <Alert
              type="error"
              message="작업을 처리하지 못했습니다."
              description={saveError}
              closable
              onClose={() => setSaveError(null)}
            />
          </div>
        )}

        <div className={styles.editorArea}>
          <input
            type="text"
            className={styles.titleInput}
            value={title}
            placeholder="제목을 입력하세요"
            maxLength={255}
            onChange={(event) => onTitleChange(event.target.value)}
          />
          <div className={styles.bodyWrap}>
            <MarkdownEditor
              value={content}
              onChange={onContentChange}
              placeholder="여기에 내용을 작성하세요"
              showToolbar
              showWordCount
              minHeight={400}
            />
          </div>
        </div>
      </div>

      <aside className={styles.metaPanel}>
        <div className={styles.metaSection}>
          <Typography.Text className={styles.metaTitle}>요약</Typography.Text>
          <textarea
            className={styles.textarea}
            value={excerpt}
            maxLength={500}
            placeholder="공개 목록에 노출될 한두 문장"
            onChange={(event) => onExcerptChange(event.target.value)}
          />
        </div>

        <div className={styles.metaSection}>
          <Typography.Text className={styles.metaTitle}>슬러그</Typography.Text>
          <Input
            value={slug}
            placeholder="url에 사용될 슬러그"
            onChange={(event) => onSlugChange(event.target.value)}
          />
          <span className={styles.metaHelper}>
            저장 시 서버에서 정규화됩니다. 비워두면 제목으로 자동 생성.
          </span>
        </div>

        <div className={styles.metaSection}>
          <Typography.Text className={styles.metaTitle}>태그</Typography.Text>
          <Input
            value={tagsText}
            placeholder="쉼표로 구분 (예: nestjs, react)"
            onChange={(event) => onTagsChange(event.target.value)}
          />
          {tagList.length > 0 && (
            <div className={styles.actionRow}>
              {tagList.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          )}
        </div>

        <div className={styles.metaSection}>
          <Typography.Text className={styles.metaTitle}>대표 이미지</Typography.Text>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className={styles.hiddenInput}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              void handleCoverUpload(file);
              event.currentTarget.value = '';
            }}
          />
          <div className={styles.coverCard}>
            <div className={styles.coverPreview}>
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverPreview}
                  alt="대표 이미지 미리보기"
                  className={styles.coverImage}
                />
              ) : (
                <div className={styles.coverPlaceholder}>대표 이미지 없음</div>
              )}
            </div>
            <div className={styles.coverActions}>
              <div className={styles.actionRow}>
                <Button
                  size="sm"
                  variant="outlined"
                  loading={coverAction === 'uploading'}
                  disabled={coverBusy}
                  onClick={() => coverInputRef.current?.click()}
                >
                  {coverImage ? '이미지 교체' : '이미지 업로드'}
                </Button>
                <Button
                  size="sm"
                  variant="text"
                  disabled={coverBusy || !coverImage}
                  onClick={() => {
                    void handleCoverRemove();
                  }}
                >
                  {coverAction === 'removing' ? '삭제 중…' : '이미지 제거'}
                </Button>
              </div>
              <span className={styles.metaHelper}>
                JPG, PNG, WEBP, GIF 파일을 바로 업로드할 수 있습니다.
              </span>
            </div>
          </div>
          <span className={styles.metaHelper}>
            공개 상세 상단 커버에 사용됩니다.
          </span>
        </div>
      </aside>
    </div>
  );
}

function renderTransitionButtons(
  status: PostStatus,
  transition: (target: PostStatus) => void,
  busy: boolean,
) {
  switch (status) {
    case 'DRAFT':
      return (
        <Button
          size="sm"
          variant="solid"
          icon={<CheckCircle size={14} />}
          disabled={busy}
          onClick={() => transition('COMPLETED')}
        >
          작성 완료
        </Button>
      );
    case 'COMPLETED':
      return (
        <>
          <Button
            size="sm"
            variant="text"
            disabled={busy}
            onClick={() => transition('DRAFT')}
          >
            초안으로
          </Button>
          <Button
            size="sm"
            variant="solid"
            icon={<Send size={14} />}
            disabled={busy}
            onClick={() => transition('REVIEW')}
          >
            스튜디오로 전달
          </Button>
        </>
      );
    case 'REVIEW':
      return (
        <Button
          size="sm"
          variant="outlined"
          disabled={busy}
          onClick={() => transition('DRAFT')}
        >
          에디터로 회수
        </Button>
      );
    case 'UPDATED':
      return (
        <Button
          size="sm"
          variant="solid"
          icon={<Send size={14} />}
          disabled={busy}
          onClick={() => transition('REVIEW')}
        >
          스튜디오로 전달
        </Button>
      );
    default:
      return null;
  }
}
