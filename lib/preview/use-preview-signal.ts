'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { getPreviewSignalSnapshot, subscribePreviewSignal } from './preview-signal';

function normalizeKeys(keys: readonly string[]) {
  const unique = Array.from(new Set(keys.filter((key) => typeof key === 'string' && key.length > 0)));
  unique.sort();
  return unique;
}

export function usePreviewKeySignal(keys: readonly string[], enabled = true) {
  const normalizedKeys = useMemo(() => normalizeKeys(keys), [keys]);

  return useSyncExternalStore(
    enabled ? subscribePreviewSignal : () => () => {},
    () => (enabled ? getPreviewSignalSnapshot(normalizedKeys) : ''),
    () => ''
  );
}

export function usePreviewAnySignal(enabled = true) {
  return useSyncExternalStore(
    enabled ? subscribePreviewSignal : () => () => {},
    () => (enabled ? getPreviewSignalSnapshot() : ''),
    () => ''
  );
}
