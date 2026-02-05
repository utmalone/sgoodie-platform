'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type PreviewContextType = {
  isOpen: boolean;
  initialPath: string;
  openPreview: (path?: string) => void;
  closePreview: () => void;
};

const PreviewContext = createContext<PreviewContextType | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialPath, setInitialPath] = useState('/');

  const openPreview = useCallback((path: string = '/') => {
    setInitialPath(path);
    setIsOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <PreviewContext.Provider value={{ isOpen, initialPath, openPreview, closePreview }}>
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
