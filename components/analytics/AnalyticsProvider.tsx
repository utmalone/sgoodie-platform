'use client';

import { useEffect, useRef, useEffectEvent } from 'react';
import { usePathname } from 'next/navigation';

const VISITOR_KEY = 'sgoodie.analytics.visitor';
const SESSION_KEY = 'sgoodie.analytics.session';
const SESSION_TS_KEY = 'sgoodie.analytics.sessionTs';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function getVisitorId() {
  let id = window.localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id =
      typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function getSessionId() {
  const now = Date.now();
  const last = Number(window.localStorage.getItem(SESSION_TS_KEY) || '0');
  let sessionId = window.localStorage.getItem(SESSION_KEY);

  if (!sessionId || now - last > SESSION_TIMEOUT_MS) {
    sessionId =
      typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(SESSION_KEY, sessionId);
  }

  window.localStorage.setItem(SESSION_TS_KEY, String(now));
  return sessionId;
}

function shouldTrack(pathname: string) {
  return !pathname.startsWith('/admin') && !pathname.startsWith('/api');
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const startRef = useRef<number>(0);
  const pathRef = useRef<string>('');
  const referrerRef = useRef<string>('');

  const sendEvent = useEffectEvent((path: string, durationMs: number, referrer?: string) => {
    const payload = {
      type: 'page_view' as const,
      path,
      referrer,
      timestamp: new Date().toISOString(),
      durationMs,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      userAgent: navigator.userAgent
    };

    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/events', blob);
    } else {
      fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true
      }).catch(() => {});
    }
  });

  useEffect(() => {
    const now = Date.now();
    if (pathRef.current && pathRef.current !== pathname && shouldTrack(pathRef.current)) {
      const duration = now - startRef.current;
      sendEvent(pathRef.current, duration, referrerRef.current);
    }

    if (!pathname || !shouldTrack(pathname)) {
      pathRef.current = pathname || '';
      startRef.current = now;
      referrerRef.current = '';
      return;
    }

    referrerRef.current = pathRef.current || document.referrer;
    pathRef.current = pathname;
    startRef.current = now;
  }, [pathname]);

  useEffect(() => {
    const handleUnload = () => {
      if (!pathRef.current || !shouldTrack(pathRef.current)) return;
      const duration = Date.now() - startRef.current;
      sendEvent(pathRef.current, duration, referrerRef.current);
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return <>{children}</>;
}
