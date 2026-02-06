'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type PreviewContextType = {
  isOpen: boolean;
  initialPath: string;
  refreshKey: number;
  openPreview: (path?: string) => void;
  closePreview: () => void;
  refreshPreview: () => void;
};

const PreviewContext = createContext<PreviewContextType | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialPath, setInitialPath] = useState('/');
  const [refreshKey, setRefreshKey] = useState(0);

  const openPreview = useCallback((path: string = '/') => {
    setInitialPath(path);
    setRefreshKey((prev) => prev + 1);
    setIsOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setIsOpen(false);
  }, []);

  const refreshPreview = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    try {
      window.localStorage.setItem('admin-preview-refresh', String(Date.now()));
    } catch {
      // Ignore storage access errors.
    }
  }, []);

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
