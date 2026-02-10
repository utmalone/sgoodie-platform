'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { emitPreviewRefresh } from '@/lib/preview/preview-signal';

type PreviewContextType = {
  isOpen: boolean;
  initialPath: string;
  refreshKey: number;
  openPreview: (path?: string) => void;
  closePreview: () => void;
  refreshPreview: () => void;
};

const PreviewContext = createContext<PreviewContextType | null>(null);

const PREVIEW_SESSION_KEY = 'sgoodie.admin.preview.session';

function loadStoredPreviewState(): { isOpen: boolean; initialPath: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PREVIEW_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { isOpen?: unknown; initialPath?: unknown };
    return {
      isOpen: Boolean(parsed.isOpen),
      initialPath: typeof parsed.initialPath === 'string' && parsed.initialPath ? parsed.initialPath : '/'
    };
  } catch {
    return null;
  }
}

function persistPreviewState(state: { isOpen: boolean; initialPath: string }) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PREVIEW_SESSION_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage access errors.
  }
}

export function PreviewProvider({ children }: { children: ReactNode }) {
  const stored = loadStoredPreviewState();
  const [isOpen, setIsOpen] = useState(stored?.isOpen ?? false);
  const [initialPath, setInitialPath] = useState(stored?.initialPath ?? '/');
  const [refreshKey, setRefreshKey] = useState(0);

  const openPreview = useCallback((path: string = '/') => {
    setInitialPath(path);
    setRefreshKey((prev) => prev + 1);
    setIsOpen(true);
    persistPreviewState({ isOpen: true, initialPath: path });
  }, []);

  const closePreview = useCallback(() => {
    setIsOpen(false);
    persistPreviewState({ isOpen: false, initialPath });
  }, [initialPath]);

  const refreshPreview = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    emitPreviewRefresh();
  }, []);

  useEffect(() => {
    // Keep session storage in sync if initialPath changes while open.
    if (!isOpen) return;
    persistPreviewState({ isOpen: true, initialPath });
  }, [initialPath, isOpen]);

  return (
    <PreviewContext.Provider
      value={{ isOpen, initialPath, refreshKey, openPreview, closePreview, refreshPreview }}
    >
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  const context = useContext(PreviewContext);
  if (!context) {
    throw new Error('usePreview must be used within a PreviewProvider');
  }
  return context;
}
