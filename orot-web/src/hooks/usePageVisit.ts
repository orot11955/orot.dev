'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { webClientLogger } from '@/logging/client';
import { publicAnalyticsService } from '@/services/analytics.service';

const VISITOR_STORAGE_KEY = 'orot:visitor:last-visited-date';

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * 방문자 수는 하루 1회만 기록해 새로고침/재마운트로 인한 중복 집계를 줄입니다.
 * Public 레이아웃의 최상단에서 한 번만 마운트하세요.
 */
export function usePageVisit() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const todayKey = formatLocalDateKey(new Date());

    try {
      const lastVisitedDate = window.localStorage.getItem(VISITOR_STORAGE_KEY);

      if (lastVisitedDate === todayKey) {
        return;
      }

      // Strict Mode 재실행에도 같은 날 중복 요청을 보내지 않도록 먼저 기록합니다.
      window.localStorage.setItem(VISITOR_STORAGE_KEY, todayKey);
    } catch {
      // storage 접근이 막혀 있으면 서버 쿠키 없이도 기존 동작은 유지합니다.
    }

    publicAnalyticsService
      .recordVisit(pathname, document.referrer || undefined)
      .catch((error) => {
        try {
          if (window.localStorage.getItem(VISITOR_STORAGE_KEY) === todayKey) {
            window.localStorage.removeItem(VISITOR_STORAGE_KEY);
          }
        } catch {
          // noop
        }

        webClientLogger.warn(
          'analytics.visit.failed',
          { pathname },
          error,
        );
      });
  }, [pathname]);
}
