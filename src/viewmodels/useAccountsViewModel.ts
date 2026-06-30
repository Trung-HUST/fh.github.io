// ViewModel for the Accounts page.
// Composes model logic with data source — View consumes this hook only.

import { useMemo } from "react";
import { accounts, walletActivity } from "@/data/mock";
import { classifyDirection, formatSignedAmount, computeActivitySummary } from "@/models/accounts";
import { getCachedDashboardSnapshot } from "@/lib/googleSheetDb";
import { useSyncTrigger } from "@/hooks/useSyncTrigger";

export interface AccountItem {
  name: string;
  balance: number;
  change: string;
}

export interface ActivityRow {
  desc: string;
  amount: number;
  date: string;
  direction: "positive" | "negative";
  formattedAmount: string;
}

export function useAccountsViewModel() {
  const syncTick = useSyncTrigger();
  const snapshot = getCachedDashboardSnapshot();

  const accountList: AccountItem[] = useMemo(
    () => snapshot?.accounts?.map((a) => ({ name: a.name, balance: a.balance, change: a.change })) ?? accounts.map((a) => ({ name: a.name, balance: a.balance, change: a.change })),
    [snapshot, syncTick],
  );

  const activityList: ActivityRow[] = useMemo(
    () =>
      (snapshot?.activity ?? walletActivity).map((item) => ({
        ...item,
        direction: classifyDirection(item.amount),
        formattedAmount: formatSignedAmount(item.amount),
      })),
    [snapshot, syncTick],
  );

  const activitySummary = useMemo(
    () => snapshot?.activitySummary ?? computeActivitySummary(walletActivity),
    [snapshot, syncTick],
  );

  return { accountList, activityList, activitySummary };
}
