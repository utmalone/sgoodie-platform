'use client';

import { useEffect, useState } from 'react';

/** True only after the component mounts (client). Avoids SSR/client mismatch when reading localStorage. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
