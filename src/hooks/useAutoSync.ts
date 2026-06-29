import { useEffect, useRef } from "react";
import { getCachedAuthUser, getCachedSettings, authenticateAndSync, persistSheetSession } from "@/lib/googleSheetDb";

/**
 * Hook to automatically sync data from Google Sheets at a specified interval.
 */
export function useAutoSync() {
  const isSyncing = useRef(false);

  useEffect(() => {
    // Determine the sync interval from settings
    const settings = getCachedSettings();
    
    // Default to 2 minutes if not set or invalid
    let intervalMinutes = 2; 
    if (settings && settings.sync_interval !== undefined) {
      const parsed = parseInt(settings.sync_interval, 10);
      if (!isNaN(parsed)) {
        intervalMinutes = parsed;
      }
    }

    // If interval is 0, auto-sync is disabled
    if (intervalMinutes <= 0) {
      console.log(`[AutoSync] Auto-sync is disabled (interval = ${intervalMinutes}).`);
      return;
    }

    console.log(`[AutoSync] Initialized with interval of ${intervalMinutes} minute(s).`);

    const intervalMs = intervalMinutes * 60 * 1000;

    const intervalId = setInterval(async () => {
      if (isSyncing.current) {
        console.log("[AutoSync] Sync is already in progress. Skipping this cycle.");
        return;
      }

      const user = getCachedAuthUser();
      
      // Do not sync if no user is logged in, or if it's the demo account
      if (!user || user.email === "demo@email.com" || user.email.includes("demo")) {
        console.log("[AutoSync] User is not logged in or is using a demo account. Skipping sync.");
        return;
      }

      if (!user.email || !user.password) {
        console.log("[AutoSync] User credentials not fully available. Skipping sync.");
        return;
      }

      console.log(`[AutoSync] Starting background sync for ${user.email}...`);
      isSyncing.current = true;

      try {
        const session = await authenticateAndSync(user.email, user.password);
        persistSheetSession(session);
        console.log(`[AutoSync] Sync successful. Updated ${session.transactions?.length || 0} records.`);
      } catch (error) {
        console.error("[AutoSync] Background sync failed:", error);
      } finally {
        isSyncing.current = false;
      }

    }, intervalMs);

    return () => {
      console.log("[AutoSync] Cleaning up sync interval.");
      clearInterval(intervalId);
    };
  }, []); // Empty dependency array means it runs on mount and clears on unmount
}
