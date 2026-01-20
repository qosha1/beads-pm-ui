"use client";

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export type ViewType = 'board' | 'list' | 'timeline';

interface ViewStateConfig {
  defaultView?: ViewType;
  persistKey?: string;
}

export function useViewState(config: ViewStateConfig = {}) {
  const { defaultView = 'timeline', persistKey = 'gantt-active-view' } = config;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get initial view from URL, then localStorage, then default
  const getInitialView = (): ViewType => {
    const urlView = searchParams.get('view');
    if (urlView && ['board', 'list', 'timeline'].includes(urlView)) {
      return urlView as ViewType;
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(persistKey);
      if (stored && ['board', 'list', 'timeline'].includes(stored)) {
        return stored as ViewType;
      }
    }

    return defaultView;
  };

  const [activeView, setActiveViewState] = useState<ViewType>(getInitialView);

  // Sync URL changes to state (for browser back/forward)
  useEffect(() => {
    const urlView = searchParams.get('view');
    if (urlView && ['board', 'list', 'timeline'].includes(urlView)) {
      setActiveViewState(urlView as ViewType);
    }
  }, [searchParams]);

  // Set view with URL and localStorage sync
  const setActiveView = useCallback((view: ViewType) => {
    setActiveViewState(view);

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(persistKey, view);
      } catch (e) {
        // localStorage may be unavailable (private browsing, quota exceeded, etc.)
        console.warn('Failed to persist view state:', e);
      }
    }
  }, [router, pathname, searchParams, persistKey]);

  return {
    activeView,
    setActiveView,
    isBoard: activeView === 'board',
    isList: activeView === 'list',
    isTimeline: activeView === 'timeline',
  };
}
