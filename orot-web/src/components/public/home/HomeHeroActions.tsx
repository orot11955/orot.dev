'use client';

import { Button } from 'orot-ui';
import { useRouter } from 'next/navigation';
import styles from './HomePage.module.css';

export function HomeHeroActions() {
  const router = useRouter();

  return (
    <div className={styles.heroActions}>
      <Button size="md" onClick={() => router.push('/posts')}>
        글 보기
      </Button>
      <Button
        size="md"
        style={{ background: '#fa4306', border: '1px solid #fa4306' }}
        onClick={() => router.push('/photos')}
      >
        갤러리
      </Button>
    </div>
  );
}
