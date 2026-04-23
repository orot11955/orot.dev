'use client';

import { useEffect, useRef } from 'react';
import styles from './ScrollPositionGauge.module.css';

export function ScrollPositionGauge() {
  const gaugeRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frameId = 0;

    const updateGauge = () => {
      frameId = 0;

      const gauge = gaugeRef.current;
      const fill = fillRef.current;

      if (!gauge || !fill) {
        return;
      }

      const scrollableHeight = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const progress =
        scrollableHeight > 0
          ? Math.min(1, Math.max(0, window.scrollY / scrollableHeight))
          : 0;

      gauge.dataset.visible = scrollableHeight > 1 ? 'true' : 'false';
      fill.style.transform = `scaleY(${progress})`;
    };

    const requestUpdate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(updateGauge);
    };

    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    window.visualViewport?.addEventListener('resize', requestUpdate);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      window.visualViewport?.removeEventListener('resize', requestUpdate);
    };
  }, []);

  return (
    <div
      ref={gaugeRef}
      className={styles.gauge}
      data-visible="false"
      aria-hidden="true"
    >
      <span ref={fillRef} className={styles.fill} />
    </div>
  );
}
