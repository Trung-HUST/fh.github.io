// ViewModel for the Progress Tracking page.
// Composes model logic with data source — View consumes this hook only.

import { useMemo } from "react";
import { computeProgressSummary, computeProgressPercent } from "@/models/progress-tracking";
import { CHART_COLORS } from "@/lib/palette";
import { getCachedDashboardSnapshot } from "@/lib/googleSheetDb";
import { budgets as mockBudgets, monthlyBudgetData } from "@/data/mock";
import { useSyncTrigger } from "@/hooks/useSyncTrigger";

export interface CategoryProgress {
  category: string;
  spent: number;
  limit: number;
  progress: number;
  color: string;
  isOver: boolean;
}

export function useProgressTrackingViewModel() {
  const syncTick = useSyncTrigger();
  const snapshot = getCachedDashboardSnapshot();
  const activeBudgets = useMemo(() => snapshot?.budgets && snapshot.budgets.length > 0 ? snapshot.budgets : mockBudgets, [snapshot, syncTick]);
  
  const summary = useMemo(() => computeProgressSummary(activeBudgets), [activeBudgets]);

  const categories: CategoryProgress[] = useMemo(
    () =>
      activeBudgets.map((b, i) => ({
        category: b.category,
        spent: b.spent,
        limit: b.limit,
        progress: computeProgressPercent(b.spent, b.limit),
        color: CHART_COLORS[i % CHART_COLORS.length],
        isOver: b.spent > b.limit,
      })),
    [activeBudgets],
  );

  const comparisonData = useMemo(() => {
    if (snapshot?.monthlyFlow && snapshot.monthlyFlow.length > 0) {
      return snapshot.monthlyFlow.map(f => ({
        month: f.month,
        actual: f.outflow
      }));
    }
    return monthlyBudgetData;
  }, [snapshot, syncTick]);

  return { summary, categories, comparisonData };
}
