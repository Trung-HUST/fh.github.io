import { AsciiBox } from "@/components/ui/AsciiBox";
import { TrendMonitor } from "@/components/ui/DataVizComponents";
import { useFlowComparisonViewModel } from "@/viewmodels/useFlowComparisonViewModel";
import { formatCurrency } from "@/models/amount";
import { useTranslation } from "react-i18next";

export default function FlowComparisonPage() {
  const { t } = useTranslation();
  const { summary, flowData, netFlowData } = useFlowComparisonViewModel();

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AsciiBox title={t("flow.totalInflow")}>
          <p className="font-mono text-lg text-matrix-primary text-center">
            {formatCurrency(summary.totalInflow)}
          </p>
        </AsciiBox>
        <AsciiBox title={t("flow.totalOutflow")}>
          <p className="font-mono text-lg text-red-400 text-center">
            {formatCurrency(summary.totalOutflow)}
          </p>
        </AsciiBox>
        <AsciiBox title={t("flow.netFlow")}>
          <p className="font-mono text-lg text-matrix-primary text-center glow-text">
            {formatCurrency(summary.netFlow)}
          </p>
        </AsciiBox>
      </div>

      {/* Flow chart */}
      <AsciiBox title={t("flow.monthlyCashFlow")}>
        <TrendMonitor
          data={flowData.map((d) => d.inflow)}
          label={t("flow.inflow")}
          color="var(--matrix-ink)"
        />
      </AsciiBox>

      {/* Net flow table */}
      <AsciiBox title={t("flow.netFlowBreakdown")}>
        <div className="space-y-0">
          <div className="grid grid-cols-4 gap-2 font-mono text-[10px] uppercase text-matrix-dim border-b border-matrix-primary/15 pb-1.5 mb-1">
            <span>{t("flow.month")}</span>
            <span className="text-right">{t("flow.inflow")}</span>
            <span className="text-right">{t("flow.outflow")}</span>
            <span className="text-right">{t("flow.net")}</span>
          </div>
          {netFlowData.map((d) => (
            <div
              key={d.month}
              className="grid grid-cols-4 gap-2 font-mono text-xs py-1.5 border-b border-matrix-primary/5 last:border-0"
            >
              <span className="text-matrix-muted">{d.month}</span>
              <span className="text-right text-matrix-primary">
                {formatCurrency(d.inflow)}
              </span>
              <span className="text-right text-red-400">
                {formatCurrency(d.outflow)}
              </span>
              <span className="text-right text-matrix-primary">
                {formatCurrency(d.net)}
              </span>
            </div>
          ))}
        </div>
      </AsciiBox>
    </div>
  );
}
