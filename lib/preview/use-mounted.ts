'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * True only after the component mounts (client). Returns `false` during SSR and
 * the very first client render so localStorage reads can be deferred without a
 * hydration mismatch. Implemented with `useSyncExternalStore` to avoid the
 * `react-hooks/set-state-in-effect` lint rule that bans the
 * `useState + useEffect(setState(true))` idiom.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
}
