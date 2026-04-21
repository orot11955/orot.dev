'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, MessageCircle, User } from 'orot-ui';
import { useAuth } from '@/contexts/AuthContext';
import {
  publicCommentsService,
  studioCommentsService,
} from '@/services/comments.service';
import type { Comment } from '@/types';
import { formatDate, getErrorMessage } from '@/utils/content';
import styles from './CommentsSection.module.css';

interface CommentsSectionProps {
  postId: number;
}

interface FormState {
  authorName: string;
  authorEmail: string;
  content: string;
}

const EMPTY_FORM: FormState = {
  authorName: '',
  authorEmail: '',
  content: '',
};

function flattenComments(input: Comment[]): Comment[] {
  const flat: Comment[] = [];
  const seen = new Set<number>();

  const visit = (comment: Comment) => {
    if (seen.has(comment.id)) return;
    seen.add(comment.id);
    flat.push({ ...comment, replies: undefined });
    (comment.replies ?? []).forEach(visit);
  };

  input.forEach(visit);

  return flat;
}

function buildTree(flat: Comment[]): Comment[] {
  const map = new Map<number, Comment>();
  const roots: Comment[] = [];
  flat.forEach((c) => map.set(c.id, { ...c, replies: [] }));
  flat.forEach((c) => {
    const node = map.get(c.id);
    if (!node) return;
    if (c.parentId) {
      const parent = map.get(c.parentId);
      if (parent) {
        parent.replies = [...(parent.replies ?? []), node];
      }
      return;
    }
    roots.push(node);
  });
  return roots;
}

export function CommentsSection({ postId }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canDelete = user?.role === 'ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await publicCommentsService.getByPost(postId);
      setComments(data);
    } catch {
      // read-only UI fallback
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !form.authorName.trim() ||
      !form.authorEmail.trim() ||
      !form.content.trim()
    ) {
      setError('모든 항목을 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await publicCommentsService.create(postId, {
        authorName: form.authorName.trim(),
        authorEmail: form.authorEmail.trim(),
        content: form.content.trim(),
        parentId: replyTo?.id,
      });
      setForm(EMPTY_FORM);
      setReplyTo(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = useCallback(
    async (comment: Comment) => {
      if (!canDelete) {
        return;
      }

      if (
        typeof window !== 'undefined' &&
        !window.confirm('이 댓글을 삭제할까요?')
      ) {
        return;
      }

      setDeletingId(comment.id);
      setError(null);

      try {
        await studioCommentsService.remove(comment.id);
        if (replyTo?.id === comment.id || replyTo?.parentId === comment.id) {
          setReplyTo(null);
        }
        await load();
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setDeletingId(null);
      }
    },
    [canDelete, load, replyTo],
  );

  const flatComments = flattenComments(comments);
  const tree = buildTree(flatComments);
  const total = flatComments.length;

  return (
    <section className={styles.section} aria-label="댓글">
      <header className={styles.header}>
        <MessageCircle size={18} />
        <h2 className={styles.title}>댓글</h2>
        <span className={styles.count}>{total}</span>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        {replyTo && (
          <div className={styles.replyBanner}>
            <span>
              <strong>@{replyTo.authorName}</strong> 님에게 답글 작성 중
            </span>
            <button
              type="button"
              className={styles.replyCancel}
              onClick={() => setReplyTo(null)}
            >
              취소
            </button>
          </div>
        )}
        <div className={styles.formRow}>
          <input
            type="text"
            className={styles.input}
            placeholder="이름"
            value={form.authorName}
            onChange={(e) => setForm({ ...form, authorName: e.target.value })}
            maxLength={40}
          />
          <input
            type="email"
            className={styles.input}
            placeholder="이메일 (공개되지 않음)"
            value={form.authorEmail}
            onChange={(e) => setForm({ ...form, authorEmail: e.target.value })}
            maxLength={80}
          />
        </div>
        <textarea
          className={styles.textarea}
          rows={4}
          placeholder="댓글을 남겨주세요"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          maxLength={1000}
        />
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.formActions}>
          <Button type="submit" size="sm" loading={submitting}>
            댓글 등록
          </Button>
        </div>
      </form>

      {loading ? (
        <div className={styles.loading}>댓글을 불러오는 중...</div>
      ) : tree.length > 0 ? (
        <ul className={styles.list}>
          {tree.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              onReply={(target) => setReplyTo(target)}
              onDelete={handleDelete}
              canDelete={canDelete}
              deletingId={deletingId}
            />
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>첫 댓글을 남겨주세요.</div>
      )}
    </section>
  );
}

interface CommentItemProps {
  comment: Comment;
  depth?: number;
  onReply: (c: Comment) => void;
  onDelete: (c: Comment) => void;
  canDelete: boolean;
  deletingId: number | null;
}

function CommentItem({
  comment,
  depth = 0,
  onReply,
  onDelete,
  canDelete,
  deletingId,
}: CommentItemProps) {
  const replies = comment.replies ?? [];
  const deleting = deletingId === comment.id;

  return (
    <li className={styles.item} style={{ marginLeft: depth * 24 }}>
      <div className={styles.avatar} aria-hidden="true">
        <User size={14} />
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.author}>{comment.authorName}</span>
          <span className={styles.date}>{formatDate(comment.createdAt)}</span>
          {canDelete && (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={() => onDelete(comment)}
              disabled={deleting}
              aria-label={`${comment.authorName} 댓글 삭제`}
            >
              {deleting ? '…' : 'x'}
            </button>
          )}
        </div>
        <p className={styles.content}>{comment.content}</p>
        <button
          type="button"
          className={styles.replyBtn}
          onClick={() => onReply(comment)}
        >
          답글
        </button>
        {replies.length > 0 && (
          <ul className={styles.replies}>
            {replies.map((r) => (
              <CommentItem
                key={r.id}
                comment={r}
                depth={depth + 1}
                onReply={onReply}
                onDelete={onDelete}
                canDelete={canDelete}
                deletingId={deletingId}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
