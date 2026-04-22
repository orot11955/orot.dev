'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Toc } from 'orot-ui';
import styles from './PostDetailPage.module.css';

interface TocItemData {
  id: string;
  level: number;
  text: string;
}

interface PostDetailTocPanelProps {
  articleRef: RefObject<HTMLElement | null>;
  tocItems: TocItemData[];
}

export function PostDetailTocPanel({
  articleRef,
  tocItems,
}: PostDetailTocPanelProps) {
  const [activeTocId, setActiveTocId] = useState<string>();
  const tocSlotRef = useRef<HTMLElement>(null);
  const tocPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tocItems.length === 0) {
      setActiveTocId(undefined);
      return;
    }

    let frameId = 0;
    let observer: IntersectionObserver | null = null;

    const setupObserver = () => {
      const headingElements = tocItems
        .map(({ id }) => document.getElementById(id))
        .filter((element): element is HTMLElement => Boolean(element));

      if (headingElements.length === 0) {
        frameId = window.requestAnimationFrame(setupObserver);
        return;
      }

      setActiveTocId((current) => current ?? headingElements[0].id);

      observer = new IntersectionObserver(
        (entries) => {
          const visibleEntries = entries.filter((entry) => entry.isIntersecting);
          if (visibleEntries.length === 0) {
            return;
          }

          const topmostEntry = visibleEntries.reduce((currentTop, entry) =>
            entry.boundingClientRect.top < currentTop.boundingClientRect.top
              ? entry
              : currentTop,
          );

          setActiveTocId(topmostEntry.target.id);
        },
        { rootMargin: '-10% 0px -80% 0px', threshold: 0 },
      );

      headingElements.forEach((element) => {
        observer?.observe(element);
      });
    };

    setupObserver();

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      observer?.disconnect();
    };
  }, [tocItems]);

  useEffect(() => {
    const panel = tocPanelRef.current;
    if (!panel || !activeTocId) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const activeLink = panel.querySelector<HTMLElement>(
        '.orot-toc__link--active',
      );
      if (!activeLink) {
        return;
      }

      const panelRect = panel.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      const linkTop = panel.scrollTop + (linkRect.top - panelRect.top);
      const targetTop = Math.max(
        0,
        linkTop - panel.clientHeight / 2 + activeLink.offsetHeight / 2,
      );
      const maxScrollTop = Math.max(0, panel.scrollHeight - panel.clientHeight);
      const nextScrollTop = Math.min(targetTop, maxScrollTop);

      if (Math.abs(panel.scrollTop - nextScrollTop) < 2) {
        return;
      }

      panel.scrollTo({ top: nextScrollTop, behavior: 'auto' });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeTocId]);

  useEffect(() => {
    const article = articleRef.current;
    const slot = tocSlotRef.current;
    const panel = tocPanelRef.current;

    if (!article || !slot || !panel || tocItems.length === 0) {
      return;
    }

    const clearStickyStyles = () => {
      slot.style.height = '';
      panel.style.position = '';
      panel.style.top = '';
      panel.style.left = '';
      panel.style.width = '';
      panel.style.zIndex = '';
    };

    const applyPanelMode = (
      mode: 'static' | 'fixed' | 'absolute',
      topOffset: number,
      slotWidth: number,
      slotLeft: number,
      articleHeight: number,
      panelHeight: number,
    ) => {
      if (mode === 'static') {
        panel.style.position = 'relative';
        panel.style.top = '0';
        panel.style.left = '0';
        panel.style.width = '100%';
        panel.style.zIndex = '';
        return;
      }

      if (mode === 'fixed') {
        panel.style.position = 'fixed';
        panel.style.top = `${topOffset}px`;
        panel.style.left = `${slotLeft}px`;
        panel.style.width = `${slotWidth}px`;
        panel.style.zIndex = '10';
        return;
      }

      panel.style.position = 'absolute';
      panel.style.top = `${Math.max(0, articleHeight - panelHeight)}px`;
      panel.style.left = '0';
      panel.style.width = '100%';
      panel.style.zIndex = '';
    };

    let frameId = 0;

    const updateStickyPosition = () => {
      frameId = 0;

      if (window.innerWidth <= 960) {
        clearStickyStyles();
        return;
      }

      const rootStyles = getComputedStyle(document.documentElement);
      const space6 =
        parseFloat(rootStyles.getPropertyValue('--orot-space-6')) || 24;
      const topOffset = 64 + space6;
      const slotRect = slot.getBoundingClientRect();
      const articleRect = article.getBoundingClientRect();
      const panelHeight = panel.offsetHeight;
      const articleHeight = article.offsetHeight;
      const slotTop = window.scrollY + slotRect.top;
      const articleBottom = window.scrollY + articleRect.bottom;
      const fixedStart = slotTop - topOffset;
      const fixedEnd = articleBottom - panelHeight - topOffset;

      slot.style.height = `${Math.max(articleHeight, panelHeight)}px`;

      if (window.scrollY <= fixedStart) {
        applyPanelMode(
          'static',
          topOffset,
          slotRect.width,
          slotRect.left,
          articleHeight,
          panelHeight,
        );
        return;
      }

      if (window.scrollY < fixedEnd) {
        applyPanelMode(
          'fixed',
          topOffset,
          slotRect.width,
          slotRect.left,
          articleHeight,
          panelHeight,
        );
        return;
      }

      applyPanelMode(
        'absolute',
        topOffset,
        slotRect.width,
        slotRect.left,
        articleHeight,
        panelHeight,
      );
    };

    const requestUpdate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(updateStickyPosition);
    };

    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    const resizeObserver = new ResizeObserver(() => {
      requestUpdate();
    });

    resizeObserver.observe(article);
    resizeObserver.observe(panel);
    resizeObserver.observe(slot);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      resizeObserver.disconnect();
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      clearStickyStyles();
    };
  }, [articleRef, tocItems.length]);

  return (
    <aside className={styles.tocSlot} aria-label="글 목차 패널" ref={tocSlotRef}>
      <div className={styles.tocPanel} ref={tocPanelRef}>
        <Toc
          items={tocItems}
          activeId={activeTocId}
          title="목차"
          smooth
          indent
          onClick={setActiveTocId}
          className={styles.toc}
        />
      </div>
    </aside>
  );
}
