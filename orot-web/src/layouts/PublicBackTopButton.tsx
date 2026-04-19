'use client';

import { useEffect, useState } from 'react';
import { FloatButton } from 'orot-ui';
import styles from './PublicBackTopButton.module.css';

const BACK_TOP_THRESHOLD = 480;

export function PublicBackTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frameId = 0;

    const updateVisibility = () => {
      frameId = 0;
      const nextVisible = window.scrollY > BACK_TOP_THRESHOLD;
      setVisible((current) => (current === nextVisible ? current : nextVisible));
    };

    const requestUpdate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(updateVisibility);
    };

    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener('scroll', requestUpdate);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return <FloatButton.BackTop className={styles.button} />;
}
