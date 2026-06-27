// ViewModel for the enriched Dashboard page.
// Composes multiple data domains into a single hook for the view layer.

import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  accounts,
  walletActivity,
  budgets,
  analyticsTrend,
  monthlyFlow,
  goals,
} from "@/data/mock";
import {
  classifyDirection,
  formatSignedAmount,
  computeActivitySummary,
} from "@/models/accounts";
import { enrichGoal } from "@/models/target-cards";
import {
  generatePixelHeatmap,
  HEATMAP_ROWS,
  HEATMAP_COLS,
  HEATMAP_MAX,
} from "@/models/pixel-heatmap";
import type { HeatmapCell } from "@/models/pixel-heatmap";
import {
  getCachedDashboardSnapshot,
  getCachedTransactions,
  getCachedGoals,
  getCachedContracts,
  getCachedTimeline
} from "@/lib/googleSheetDb";
import { lifeAiTimeline } from "@/data/mock";
import { fetchGoldPrice, fetchBitcoinPrice, fetchVNIndex, fetchDowJonesPrice } from "@/lib/marketApi";
import type { UpcomingTask } from "@/models/types";
import type { GoalViewModel } from "@/models/target-cards";
import type { AccountItem, ActivityRow } from "@/viewmodels/useAccountsViewModel";

export interface BudgetRow {
  category: string;
  spent: number;
  limit: number;
  percent: number;
  overBudget: boolean;
}

export interface FlowPoint {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}
export interface SignalRow {
  label: string;
  value: string;
  changeText?: string;
  trend: number[];
  status: "nominal" | "warning" | "critical";
}

function useSystemSignals(): SignalRow[] {
  const [signals, setSignals] = useState<SignalRow[]>([
    { label: "BTC/USDT", value: "Loading...", trend: [], status: "nominal" },
    { label: "VN-INDEX", value: "Loading...", trend: [], status: "nominal" },
    { label: "DOW JONES", value: "Loading...", trend: [], status: "nominal" },
    { label: "9999 GOLD", value: "Loading...", trend: [], status: "nominal" }
  ]);

  useEffect(() => {
    let isMounted = true;
    
    const formatValue = (val: number, decimals: number = 2) => {
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val);
    };

    const formatChange = (change: number, percent: number) => {
      const sign = change >= 0 ? "+" : "";
      const arrow = change >= 0 ? "▲" : "▼";
      return `${sign}${formatValue(change)} (${sign}${percent.toFixed(2)}%) ${arrow}`;
    };

    const getStatus = (change: number) => {
      if (change < -2) return "critical"; // More than 2% drop
      if (change < 0) return "warning";
      return "nominal";
    };

    const fetchAll = async () => {
      try {
        const [vni, dji, btc, gold] = await Promise.allSettled([
          fetchVNIndex(),
          fetchDowJonesPrice(),
          fetchBitcoinPrice(),
          fetchGoldPrice()
        ]);

        if (!isMounted) return;

        setSignals(prev => {
          const next = [...prev];
          if (vni.status === "fulfilled") {
            next[0] = {
              label: "VNINDEX",
              value: formatValue(vni.value.value),
              changeText: formatChange(vni.value.change, vni.value.percentChange),
              trend: vni.value.trend,
              status: getStatus(vni.value.percentChange)
            };
          }
          if (dji.status === "fulfilled") {
            next[1] = {
              label: "DOW JONES",
              value: formatValue(dji.value.value),
              changeText: formatChange(dji.value.change, dji.value.percentChange),
              trend: dji.value.trend,
              status: getStatus(dji.value.percentChange)
            };
          }
          if (btc.status === "fulfilled") {
            next[2] = {
              label: "BTCUSDT",
              value: formatValue(btc.value.value),
              changeText: formatChange(btc.value.change, btc.value.percentChange),
              trend: btc.value.trend,
              status: getStatus(btc.value.percentChange)
            };
          }
          if (gold.status === "fulfilled") {
            next[3] = {
              label: "9999 GOLD",
              value: formatValue(gold.value.value, 0),
              changeText: formatChange(gold.value.change, gold.value.percentChange),
              trend: gold.value.trend,
              status: getStatus(gold.value.percentChange)
            };
          }
          return next;
        });
      } catch (e) {
        console.error("Signal Monitor polling error", e);
      }
    };

    fetchAll();
    // Fetch every 10 minutes (600,000 ms)
    const intervalId = setInterval(fetchAll, 600000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return signals;
}

export function useDashboardViewModel() {
  const snapshot = getCachedDashboardSnapshot();
  const allTransactions = getCachedTransactions() || [];

  const streakDays = useMemo(() => {
    if (!allTransactions.length) return 0;
    
    // Get unique dates sorted descending
    const uniqueDates = Array.from(new Set(allTransactions.map(t => t.date))).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    if (uniqueDates.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    // Start from today, check if there's a transaction. If not, maybe start from yesterday
    // Let's just find the max continuous sequence backwards from the latest transaction date
    const latestTxDate = new Date(uniqueDates[0]);
    currentDate = new Date(latestTxDate);
    
    for (let i = 0; i < uniqueDates.length; i++) {
      const txDate = new Date(uniqueDates[i]);
      // Normalize dates to midnight for comparison
      txDate.setHours(0, 0, 0, 0);
      const expectedDate = new Date(currentDate);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);
      
      if (txDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break; // Streak broken
      }
    }
    return streak;
  }, [allTransactions]);

  const accountList: AccountItem[] = useMemo(
    () =>
      snapshot?.accounts
        ?.filter((a) => a.name !== "Investment")
        ?.map((a) => ({ name: a.name, balance: a.balance, change: a.change })) ??
      accounts
        .filter((a) => a.name !== "Investment")
        .map((a) => ({ name: a.name, balance: a.balance, change: a.change })),
    [snapshot],
  );

  const activityList: ActivityRow[] = useMemo(
    () =>
      (snapshot?.activity ?? walletActivity).map((item) => {
        let formattedDate = item.date;
        if (formattedDate) {
          const d = new Date(formattedDate);
          if (!isNaN(d.getTime())) {
            formattedDate = d.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });
          }
        }
        return {
          ...item,
          date: formattedDate,
          direction: classifyDirection(item.amount),
          formattedAmount: formatSignedAmount(item.amount),
        };
      }),
    [snapshot],
  );

  const activitySummary = useMemo(
    () => snapshot?.activitySummary ?? computeActivitySummary(walletActivity),
    [snapshot],
  );

  const enrichedGoals: GoalViewModel[] = useMemo(
    () => (snapshot?.goals ?? goals).map((g) => enrichGoal(g)),
    [snapshot],
  );

  const budgetRows: BudgetRow[] = useMemo(
    () =>
      (snapshot?.budgets ?? budgets).map((b) => ({
        category: b.category,
        spent: b.spent,
        limit: b.limit,
        percent: Math.round((b.spent / b.limit) * 100),
        overBudget: b.spent > b.limit,
      })),
    [snapshot],
  );

  const trendData: number[] = useMemo(() => {
    if (!allTransactions || allTransactions.length === 0) {
      return analyticsTrend.map((d) => Math.round(d.value));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const equityAccounts = ["capital", "vốn ban đầu", "vốn"];
    const assetLiabilityNames = [
      "credit card", "thẻ tín dụng", "creditcarddebt", "bank account", "tài khoản ngân hàng", "bankaccount", "mainaccount",
      "cash", "tiền mặt", "accounts receivable", "khoản phải thu", "accountsreceivable",
      "liabilities", "khoản phải trả"
    ];
    const netWorthNames = assetLiabilityNames.filter(a => !equityAccounts.includes(a));

    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (29 - i));
      const targetTime = d.getTime();

      let dailyNetWorth = 0;
      allTransactions.forEach(t => {
        if (t.deleted) return;
        const cat = ((t as any).detail || t.category || "").toLowerCase();
        if (netWorthNames.includes(cat) || 
            cat.startsWith("khoản phải thu") || cat.startsWith("accounts receivable") || cat.startsWith("accountsreceivable") ||
            cat.startsWith("khoản phải trả") || cat.startsWith("liabilities")) {
          const txDate = new Date(t.date);
          txDate.setHours(0, 0, 0, 0);
          if (txDate.getTime() <= targetTime) {
            dailyNetWorth += t.amount;
          }
        }
      });
      return Math.round(dailyNetWorth);
    });
  }, [allTransactions]);

  const flowData: FlowPoint[] = useMemo(
    () =>
      (snapshot?.monthlyFlow ?? monthlyFlow).map((f) => ({
        month: f.month,
        inflow: f.inflow,
        outflow: f.outflow,
        net: f.inflow - f.outflow,
      })),
    [snapshot],
  );

  const heatmapData = useMemo(() => {
    return generatePixelHeatmap(allTransactions);
  }, [allTransactions]);

  const signalRows: SignalRow[] = useSystemSignals();

  const upcomingTasks = useMemo(() => {
    const timeline = getCachedTimeline();
    const tData = (timeline && timeline.length > 0) ? timeline : lifeAiTimeline;
    const now = new Date();
    
    const mapped: UpcomingTask[] = tData.map((evt: any) => {
      const [hours, minutes] = evt.time.split(":").map(Number);
      const nextRun = new Date(now);
      nextRun.setHours(hours, minutes, 0, 0);
      
      if (nextRun.getTime() < now.getTime()) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      
      const countdown = Math.max(0, nextRun.getTime() - now.getTime());
      
      return {
        task: {
          id: evt.title || "Task",
          name: evt.title || "Task",
          description: evt.subtitle || "",
          executor: "timeline",
          timeout: 0,
          retries: 0,
          isActive: true
        },
        schedule: {
          id: evt.id || Date.now().toString(),
          cron: "0 0 * * *", 
          description: "Daily",
          isActive: true,
          nextRun
        },
        nextRun,
        countdown
      } as UpcomingTask;
    });
    
    mapped.sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime());
    return mapped;
  }, []);

    const contracts = getCachedContracts();
    
    // Calculate asset breakdown
    const safeContracts = Array.isArray(contracts) ? contracts : [];
    const safeAccountList = Array.isArray(accountList) ? accountList : [];

    const totalFundsBalance = enrichedGoals.reduce((acc, goal) => acc + (goal.saved || 0), 0);

    const assetBreakdown = [
      ...safeAccountList.filter(a => a?.name && a.name !== "Funds" && a.name !== "FUNDS").map(a => ({ 
        id: a.name === "CreditCardDebt" ? "Liabilities" : a.name, 
        name: a.name === "CreditCardDebt" ? "Liabilities" : a.name, 
        count: 1, 
        value: (a.name === 'Liabilities' || a.name === 'CreditCardDebt' ? -(a.balance || 0) : (a.balance || 0)), 
        type: 'ACCOUNT' 
      })),
      { id: 'SAVINGS', name: 'Savings', count: safeContracts.filter(c => c?.type === 'SAVINGS' && c?.status === 'ACTIVE' && !c?.deleted).length, value: safeContracts.filter(c => c?.type === 'SAVINGS' && c?.status === 'ACTIVE' && !c?.deleted).reduce((acc, c) => acc + (c?.currentValue || c?.amount || 0), 0), type: 'CONTRACT_GROUP' },
      { id: 'REAL_ESTATE', name: 'RealEstate', count: safeContracts.filter(c => c?.type === 'REAL_ESTATE' && c?.status === 'ACTIVE' && !c?.deleted).length, value: safeContracts.filter(c => c?.type === 'REAL_ESTATE' && c?.status === 'ACTIVE' && !c?.deleted).reduce((acc, c) => acc + (c?.currentValue || c?.amount || 0), 0), type: 'CONTRACT_GROUP' },
      { id: 'GOLD', name: 'Gold', count: safeContracts.filter(c => c?.type === 'GOLD' && c?.status === 'ACTIVE' && !c?.deleted).length, value: safeContracts.filter(c => c?.type === 'GOLD' && c?.status === 'ACTIVE' && !c?.deleted).reduce((acc, c) => acc + (c?.currentValue || c?.amount || 0), 0), type: 'CONTRACT_GROUP' },
      { id: 'VEHICLE', name: 'Vehicle', count: safeContracts.filter(c => c?.type === 'VEHICLE' && c?.status === 'ACTIVE' && !c?.deleted).length, value: safeContracts.filter(c => c?.type === 'VEHICLE' && c?.status === 'ACTIVE' && !c?.deleted).reduce((acc, c) => acc + (c?.currentValue || c?.amount || 0), 0), type: 'CONTRACT_GROUP' },
      { id: 'STOCK', name: 'Stock', count: safeContracts.filter(c => c?.type === 'STOCK' && c?.status === 'ACTIVE' && !c?.deleted).length, value: safeContracts.filter(c => c?.type === 'STOCK' && c?.status === 'ACTIVE' && !c?.deleted).reduce((acc, c) => acc + (c?.currentValue || c?.amount || 0), 0), type: 'CONTRACT_GROUP' },
      { id: 'BOND', name: 'Bond', count: safeContracts.filter(c => c?.type === 'BOND' && c?.status === 'ACTIVE' && !c?.deleted).length, value: safeContracts.filter(c => c?.type === 'BOND' && c?.status === 'ACTIVE' && !c?.deleted).reduce((acc, c) => acc + (c?.currentValue || c?.amount || 0), 0), type: 'CONTRACT_GROUP' },
      { id: 'CRYPTO', name: 'Crypto', count: safeContracts.filter(c => c?.type === 'CRYPTO' && c?.status === 'ACTIVE' && !c?.deleted).length, value: safeContracts.filter(c => c?.type === 'CRYPTO' && c?.status === 'ACTIVE' && !c?.deleted).reduce((acc, c) => acc + (c?.currentValue || c?.amount || 0), 0), type: 'CONTRACT_GROUP' },
      { id: 'OTHER_ASSET', name: 'OtherAsset', count: safeContracts.filter(c => c?.type === 'OTHER_ASSET' && c?.status === 'ACTIVE' && !c?.deleted).length, value: safeContracts.filter(c => c?.type === 'OTHER_ASSET' && c?.status === 'ACTIVE' && !c?.deleted).reduce((acc, c) => acc + (c?.currentValue || c?.amount || 0), 0), type: 'CONTRACT_GROUP' },
    ].filter(a => a.value !== 0 || (a.type === 'CONTRACT_GROUP' && a.count > 0) || a.id === 'Funds');

    const totalAssets = assetBreakdown
      .filter(item => item.id !== 'Funds' && item.id !== 'FUNDS')
      .reduce((acc, item) => acc + (item.value || 0), 0);

  return {
    accountList,
    activityList,
    activitySummary,
    goals: enrichedGoals,
    budgetRows,
    trendData,
    flowData,
    heatmapData,
    pixelHeatmapRows: HEATMAP_ROWS,
    pixelHeatmapCols: HEATMAP_COLS,
    pixelHeatmapMax: HEATMAP_MAX,
    signalRows,
    streakDays,
    upcomingTasks,
    assetBreakdown,
    totalAssets,
  };
}

export function useGreetingMessage() {
  const { t } = useTranslation();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      const minutes = new Date().getMinutes();
      const time = hour + minutes / 60;

      if (time >= 6 && time < 7) {
        setGreeting(t("dashboard.greetings.morning"));
      } else if (time >= 11.75 && time < 12.5) { // 11:45 - 12:30
        setGreeting(t("dashboard.greetings.lunch"));
      } else if (time >= 17 && time < 18) {
        setGreeting(t("dashboard.greetings.dinner"));
      } else if (time >= 19.5 && time < 21) {
        setGreeting(t("dashboard.greetings.workout"));
      } else if (time >= 23 || time < 6) {
        setGreeting(t("dashboard.greetings.lateNight"));
      } else {
        setGreeting(t("dashboard.greetings.default"));
      }
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, [t]);

  return greeting;
}

