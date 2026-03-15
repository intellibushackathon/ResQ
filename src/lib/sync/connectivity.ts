// ---------------------------------------------------------------------------
// Centralized connectivity detection with event dispatch
// ---------------------------------------------------------------------------

type ConnectivityCallback = (online: boolean) => void;

const listeners = new Set<ConnectivityCallback>();

/**
 * Returns true if the browser reports being online.
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Register a callback for connectivity changes.
 * Returns an unsubscribe function.
 */
export function onConnectivityChange(callback: ConnectivityCallback): () => void {
  listeners.add(callback);

  const handleOnline = () => {
    for (const listener of listeners) {
      listener(true);
    }
  };

  const handleOffline = () => {
    for (const listener of listeners) {
      listener(false);
    }
  };

  // Only attach DOM listeners if this is the first subscriber
  if (listeners.size === 1) {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }

  return () => {
    listeners.delete(callback);
    if (listeners.size === 0) {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    }
  };
}

/**
 * Wait for connectivity to return, with an optional timeout.
 * Resolves true if online, false if timed out.
 */
export function waitForConnectivity(timeoutMs: number = 30000): Promise<boolean> {
  if (isOnline()) return Promise.resolve(true);

  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = onConnectivityChange((online) => {
      if (online) {
        if (timer) clearTimeout(timer);
        unsubscribe();
        resolve(true);
      }
    });

    timer = setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, timeoutMs);
  });
}
