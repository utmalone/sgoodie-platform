export const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';
export const DRAFT_KEY_PREFIX = 'sgoodie.admin.draft';
export const PREVIEW_BROADCAST_CHANNEL = 'sgoodie.preview';

type PreviewMessage =
  | { type: 'preview-refresh'; ts: number }
  | { type: 'draft-change'; key: string; ts: number };

const keyVersions = new Map<string, number>();
let anyVersion = 0;
let visibilityVersion = 0;

const subscribers = new Set<() => void>();

let attached = false;
let channel: BroadcastChannel | null = null;

function isRelevantKey(key: string | null): key is string {
  if (!key) return false;
  return key === PREVIEW_REFRESH_KEY || key.startsWith(DRAFT_KEY_PREFIX);
}

function bumpKey(key: string) {
  keyVersions.set(key, (keyVersions.get(key) ?? 0) + 1);
  anyVersion += 1;
}

function bumpAny() {
  anyVersion += 1;
}

function notify() {
  subscribers.forEach((cb) => cb());
}

function handleStorage(event: StorageEvent) {
  if (!isRelevantKey(event.key)) return;
  bumpKey(event.key);
  notify();
}

function handleVisibilityChange() {
  if (typeof document === 'undefined') return;
  if (document.visibilityState !== 'visible') return;
  visibilityVersion += 1;
  notify();
}

function handleBroadcast(event: MessageEvent) {
  const data = event.data as unknown;
  if (!data || typeof data !== 'object') return;
  const msg = data as Partial<PreviewMessage> & Record<string, unknown>;

  if (msg.type === 'preview-refresh') {
    bumpKey(PREVIEW_REFRESH_KEY);
    notify();
    return;
  }

  if (msg.type === 'draft-change' && typeof msg.key === 'string') {
    if (isRelevantKey(msg.key)) {
      bumpKey(msg.key);
    } else {
      bumpAny();
    }
    notify();
  }
}

function attachListeners() {
  if (attached) return;
  if (typeof window === 'undefined') return;

  attached = true;
  window.addEventListener('storage', handleStorage);

  // If the tab was backgrounded and missed an event, sync on visibility.
  document.addEventListener('visibilitychange', handleVisibilityChange);

  try {
    channel = new BroadcastChannel(PREVIEW_BROADCAST_CHANNEL);
    channel.addEventListener('message', handleBroadcast);
  } catch {
    channel = null;
  }
}

function detachListenersIfIdle() {
  if (!attached) return;
  if (typeof window === 'undefined') return;
  if (subscribers.size > 0) return;

  attached = false;
  window.removeEventListener('storage', handleStorage);
  document.removeEventListener('visibilitychange', handleVisibilityChange);

  if (channel) {
    try {
      channel.removeEventListener('message', handleBroadcast);
      channel.close();
    } catch {
      // Ignore close errors.
    }
    channel = null;
  }
}

export function subscribePreviewSignal(onStoreChange: () => void) {
  attachListeners();
  subscribers.add(onStoreChange);
  return () => {
    subscribers.delete(onStoreChange);
    detachListenersIfIdle();
  };
}

export function getPreviewSignalSnapshot(keys?: readonly string[]) {
  if (!keys || keys.length === 0) {
    return `${visibilityVersion}|${anyVersion}`;
  }

  const parts = keys.map((key) => String(keyVersions.get(key) ?? 0));
  return `${visibilityVersion}|${parts.join(',')}`;
}

export function emitPreviewRefresh() {
  if (typeof window === 'undefined') return;
  const ts = Date.now();

  try {
    window.localStorage.setItem(PREVIEW_REFRESH_KEY, String(ts));
  } catch {
    // Ignore storage errors.
  }

  try {
    const bc = new BroadcastChannel(PREVIEW_BROADCAST_CHANNEL);
    bc.postMessage({ type: 'preview-refresh', ts } satisfies PreviewMessage);
    bc.close();
  } catch {
    // BroadcastChannel not supported.
  }

  // Same-document listeners (storage event does not fire in the same document).
  bumpKey(PREVIEW_REFRESH_KEY);
  notify();
}

