import { useState, useEffect } from "react";

export function useSyncTrigger() {
  const [syncTick, setSyncTick] = useState(0);

  useEffect(() => {
    const handleSync = () => setSyncTick((t) => t + 1);
    window.addEventListener("matrix-sheet-sync", handleSync);
    return () => window.removeEventListener("matrix-sheet-sync", handleSync);
  }, []);

  return syncTick;
}
