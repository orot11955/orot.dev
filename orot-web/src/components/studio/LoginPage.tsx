'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Button,
  Input,
  Lock,
  LogIn,
  Typography,
  User,
} from 'orot-ui';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/utils/content';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const redirectTo = searchParams.get('from') ?? '/studio/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [authLoading, isAuthenticated, redirectTo, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('아이디와 비밀번호를 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      router.replace(redirectTo);
    } catch (err) {
      setError(getErrorMessage(err) || '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={14} />
          <span>사이트로 돌아가기</span>
        </Link>

        <div className={styles.header}>
          <Typography.Text className={styles.eyebrow}>orot.studio</Typography.Text>
          <Typography.Title level={2} className={styles.title}>
            로그인
          </Typography.Title>
          <Typography.Paragraph className={styles.subtitle}>
            스튜디오와 에디터에 접근하려면 인증이 필요합니다.
          </Typography.Paragraph>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>아이디</span>
            <Input
              prefix={<User size={14} />}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              disabled={submitting}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>비밀번호</span>
            <Input
              prefix={<Lock size={14} />}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={submitting}
            />
          </label>

          {error && (
            <div className={styles.error} role="alert">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <Button
            htmlType="submit"
            variant="solid"
            size="lg"
            block
            loading={submitting}
            icon={<LogIn size={14} />}
          >
            로그인
          </Button>
        </form>
      </div>
    </div>
  );
}
