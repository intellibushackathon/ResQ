import { useEffect, useState, useCallback } from "react";
import {
  getLocalOnlyIncidents,
  getPendingCloudIncidents,
  getSyncFailedIncidents,
  getPendingRelayIncidents,
} from "../lib/storage/incident-store";
import { isOnline, onConnectivityChange } from "../lib/sync/connectivity";

export type SyncStatusInfo = {
  isOnline: boolean;
  pendingSync: number;
  pendingRelay: number;
  failedSync: number;
  totalPending: number;
  lastRefreshAt: string | null;
  isSyncing: boolean;
  refresh: () => Promise<void>;
};

/**
 * React hook that surfaces sync engine state to components.
 * Refreshes counts on mount, connectivity change, and manual trigger.
 */
export function useSyncStatus(): SyncStatusInfo {
  const [online, setOnline] = useState(() => isOnline());
  const [pendingSync, setPendingSync] = useState(0);
  const [pendingRelay, setPendingRelay] = useState(0);
  const [failedSync, setFailedSync] = useState(0);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [localOnly, pendingCloud, syncFailed, pendingRelayList] = await Promise.all([
        getLocalOnlyIncidents(),
        getPendingCloudIncidents(),
        getSyncFailedIncidents(),
        getPendingRelayIncidents(),
      ]);

      setPendingSync(localOnly.length + pendingCloud.length);
      setPendingRelay(pendingRelayList.length);
      setFailedSync(syncFailed.length);
      setLastRefreshAt(new Date().toISOString());
    } catch {
      // IndexedDB may not be ready yet
    }
  }, []);

  useEffect(() => {
    void refresh();

    const unsubscribe = onConnectivityChange((nextOnline) => {
      setOnline(nextOnline);
      void refresh();
    });

    // Periodic refresh every 30 seconds
    const interval = setInterval(() => void refresh(), 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refresh]);

  return {
    isOnline: online,
    pendingSync,
    pendingRelay,
    failedSync,
    totalPending: pendingSync + pendingRelay + failedSync,
    lastRefreshAt,
    isSyncing,
    refresh,
  };
}
