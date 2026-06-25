// ViewModel for the Stats Overview page.
// Composes model logic with data source — View consumes this hook only.

import { useMemo } from "react";
import { getCachedTransactions } from "@/lib/googleSheetDb";
import { classifyChange, changeToColorClass } from "@/models/stats-overview";

export interface StatCard {
  label: string;
  value: string;
  change: string;
  changeColorClass: string;
}

export function useStatsOverviewViewModel() {
  const allTransactions = getCachedTransactions() || [];

  const { stats, weeklyData, categoryData, trendData } = useMemo(() => {
    if (!allTransactions.length) {
      return {
        stats: [],
        weeklyData: [],
        categoryData: [],
        trendData: []
      };
    }

    const validTxs = allTransactions.filter(t => !t.deleted);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const msInDay = 24 * 60 * 60 * 1000;

    // 1. Calculate Stats
    let totalSpend = 0;
    let txCount = 0;
    const catMap = new Map<string, number>();

    validTxs.forEach(t => {
      // Exclude transfers/internal
      const cat = ((t as any).detail || t.category || "").toLowerCase();
      if (cat && !["capital", "vốn ban đầu", "vốn"].includes(cat)) {
        if (t.amount < 0) { // Expense
          totalSpend += Math.abs(t.amount);
          txCount++;
          catMap.set(cat, (catMap.get(cat) || 0) + Math.abs(t.amount));
        }
      }
    });

    // Top Category
    let topCat = "N/A";
    let topCatSpend = 0;
    for (const [cat, spend] of catMap.entries()) {
      if (spend > topCatSpend) {
        topCatSpend = spend;
        topCat = cat;
      }
    }

    // A rough average over 30 days
    const avgDailySpend = Math.round(totalSpend / 30);
    const avgTxPerDay = (txCount / 30).toFixed(1);

    const calculatedStats: StatCard[] = [
      {
        label: "Avg. Daily Spend",
        value: `${(avgDailySpend / 1000).toLocaleString()} N`,
        change: "0%",
        changeColorClass: changeToColorClass(classifyChange("0%")),
      },
      {
        label: "Transactions/Day",
        value: avgTxPerDay,
        change: "0%",
        changeColorClass: changeToColorClass(classifyChange("0%")),
      },
      {
        label: "Top Category",
        value: topCat.toUpperCase(),
        change: "",
        changeColorClass: "text-matrix-muted",
      },
    ];

    // 2. Calculate Weekly Data (Last 7 days spend)
    const calculatedWeekly = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * msInDay);
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
      
      let daySpend = 0;
      validTxs.forEach(t => {
        const txDate = new Date(t.date);
        txDate.setHours(0, 0, 0, 0);
        if (txDate.getTime() === d.getTime() && t.amount < 0) {
          daySpend += Math.abs(t.amount);
        }
      });
      return { day: dayName, value: daySpend };
    });

    // 3. Category Data (Top 3)
    const sortedCats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
    const top3Cats = sortedCats.slice(0, 3).map(([name, value]) => ({ name: name.toUpperCase(), value }));

    // 4. Trend Data (Last 30 days total spend)
    const calculatedTrend = Array.from({ length: 30 }, (_, i) => {
      const targetTime = now.getTime() - (29 - i) * msInDay;
      let dailyTotal = 0;
      validTxs.forEach(t => {
        const txDate = new Date(t.date);
        txDate.setHours(0, 0, 0, 0);
        if (txDate.getTime() === targetTime && t.amount < 0) {
          dailyTotal += Math.abs(t.amount);
        }
      });
      return { day: i + 1, value: dailyTotal };
    });

    return {
      stats: calculatedStats,
      weeklyData: calculatedWeekly,
      categoryData: top3Cats,
      trendData: calculatedTrend,
    };
  }, [allTransactions]);

  return {
    stats,
    weeklyData,
    categoryData,
    trendData,
  };
}
