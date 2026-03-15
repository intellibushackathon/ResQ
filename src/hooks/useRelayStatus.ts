import { useEffect, useState, useCallback } from "react";
import {
  isBluetoothSupported,
  getBluetoothState,
  onBluetoothStateChange,
  type BluetoothRelayState,
} from "../lib/relay/bluetooth-service";
import { getRelayStats } from "../lib/relay/relay-manager";

export type RelayStatusInfo = {
  bluetoothSupported: boolean;
  bluetoothState: BluetoothRelayState;
  isRelaying: boolean;
  queuedEnvelopes: number;
  gatewayInboxCount: number;
  refresh: () => Promise<void>;
};

/**
 * React hook that surfaces Bluetooth relay status to components.
 */
export function useRelayStatus(): RelayStatusInfo {
  const [bluetoothSupported] = useState(() => isBluetoothSupported());
  const [bluetoothState, setBluetoothState] = useState<BluetoothRelayState>(() =>
    getBluetoothState(),
  );
  const [queuedEnvelopes, setQueuedEnvelopes] = useState(0);
  const [gatewayInboxCount, setGatewayInboxCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const stats = await getRelayStats();
      setQueuedEnvelopes(stats.queuedCount);
      setGatewayInboxCount(stats.gatewayInboxCount);
    } catch {
      // IndexedDB may not be ready
    }
  }, []);

  useEffect(() => {
    void refresh();

    const unsubscribe = onBluetoothStateChange((state) => {
      setBluetoothState(state);
      void refresh();
    });

    const interval = setInterval(() => void refresh(), 15000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refresh]);

  return {
    bluetoothSupported,
    bluetoothState,
    isRelaying: bluetoothState === "scanning" || bluetoothState === "transferring",
    queuedEnvelopes,
    gatewayInboxCount,
    refresh,
  };
}
