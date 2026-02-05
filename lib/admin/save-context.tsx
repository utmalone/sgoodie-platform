'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

type PendingChange = {
  id: string;
  type: 'page' | 'photo' | 'layout' | 'project' | 'journal';
  save: () => Promise<boolean>;
};

type SaveContextType = {
  isDirty: boolean;
  status: SaveStatus;
  errorMessage: string | null;
  registerChange: (change: PendingChange) => void;
  unregisterChange: (id: string) => void;
  saveAll: () => Promise<void>;
  clearStatus: () => void;
};

const SaveContext = createContext<SaveContextType | null>(null);

export function SaveProvider({ children }: { children: ReactNode }) {
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDirty = pendingChanges.size > 0;

  const registerChange = useCallback((change: PendingChange) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(change.id, change);
      return next;
    });
  }, []);

  const unregisterChange = useCallback((id: string) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const saveAll = useCallback(async () => {
    if (pendingChanges.size === 0) return;

    setStatus('saving');
    setErrorMessage(null);

    const changes = Array.from(pendingChanges.values());
    const results = await Promise.all(
      changes.map(async (change) => {
        try {
          return await change.save();
        } catch (err) {
          console.error(`Failed to save ${change.type}:`, err);
          return false;
        }
      })
    );

    const allSucceeded = results.every(Boolean);

    if (allSucceeded) {
      setPendingChanges(new Map());
      setStatus('success');
      // Auto-clear success after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    } else {
      const failedCount = results.filter((r) => !r).length;
      setErrorMessage(`${failedCount} item(s) failed to save.`);
      setStatus('error');
    }
  }, [pendingChanges]);

  const clearStatus = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  return (
    <SaveContext.Provider
      value={{
        isDirty,
        status,
        errorMessage,
        registerChange,
        unregisterChange,
        saveAll,
        clearStatus
      }}
    >
      {children}
    </SaveContext.Provider>
  );
}

export function useSave() {
  const context = useContext(SaveContext);
  if (!context) {
    throw new Error('useSave must be used within a SaveProvider');
  }
  return context;
}
