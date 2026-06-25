import { AsciiBox } from "@/components/ui/AsciiBox";
import { useProgressTrackingViewModel } from "@/viewmodels/useProgressTrackingViewModel";
import { TrendMonitor } from "@/components/ui/DataVizComponents";
import { formatCurrency } from "@/models/amount";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function ProgressTrackingPage() {
  const { t } = useTranslation();
  const { summary, categories, comparisonData } = useProgressTrackingViewModel();

  return (
    <div className="space-y-4">
      {/* Total Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AsciiBox title={t("progress.totalSpent")}>
          <p className="font-mono text-lg text-matrix-primary text-center">
            {formatCurrency(summary.totalSpent)}
          </p>
        </AsciiBox>
        <AsciiBox title={t("progress.totalLimit")}>
          <p className="font-mono text-lg text-matrix-dim text-center">
            {formatCurrency(summary.totalLimit)}
          </p>
        </AsciiBox>
        <AsciiBox title={t("progress.remaining")}>
          <p className={cn(
            "font-mono text-lg text-center glow-text",
            summary.remaining >= 0 ? "text-matrix-primary" : "text-red-400"
          )}>
            {formatCurrency(summary.remaining)}
          </p>
        </AsciiBox>
      </div>

      {/* Category progress */}
      <AsciiBox title={t("progress.budgetCategories")}>
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.category}>
              <div className="flex items-center justify-between font-mono text-xs mb-1">
                <span className="text-matrix-muted">{t(`categories.${cat.category.replace(/ & | /g, "")}`, t(`accounts.${cat.category.replace(/ & | /g, "")}`, cat.category))}</span>
                <span className={cn(cat.isOver ? "text-red-400" : "text-matrix-primary")}>
                  {formatCurrency(cat.spent)} / {formatCurrency(cat.limit)}
                </span>
              </div>
              <div className="h-2 w-full bg-matrix-primary/10 overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(cat.progress, 100)}%`,
                    backgroundColor: cat.color,
                  }}
                />
              </div>
              <p className="font-mono text-[10px] text-matrix-dim mt-0.5 text-right">
                {cat.progress.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </AsciiBox>

      {/* Monthly comparison chart */}
      <AsciiBox title={t("progress.budgetVsActual")}>
        <TrendMonitor
          data={comparisonData.map((d) => d.actual)}
          label={comparisonData.map((d) => d.month).join(", ")}
          color="var(--matrix-ink)"
        />
      </AsciiBox>
    </div>
  );
}
