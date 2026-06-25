import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { AsciiBox } from "@/components/ui/AsciiBox";
import { DataRow, Sparkline } from "@/components/ui/MatrixExtras";
import { formatCurrency } from "@/models/amount";
import { useDashboardViewModel } from "@/viewmodels/useDashboardViewModel";

export default function FundsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { goals } = useDashboardViewModel();

  const totalFunds = goals.reduce((sum, g) => sum + (g.saved || 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + (g.target || 0), 0);

  return (
    <div className="space-y-4">
      <AsciiBox title={t("dashboard.accounts.Funds", "CÁC QUỸ (FUNDS)")}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-2xl text-matrix-primary glow-text">
              {formatCurrency(totalFunds)}
            </p>
            <p className="font-mono text-xs text-matrix-dim mt-1">
              Target: {formatCurrency(totalTarget)}
            </p>
          </div>
          <Sparkline
            data={[40, 55, 45, 65, 50, 70, 60, 75]}
            width={120}
            height={36}
            color="var(--matrix-ink)"
          />
        </div>
      </AsciiBox>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {goals.map((goal) => (
          <div key={goal.name} onClick={() => navigate(`/funds/${encodeURIComponent(goal.name)}`)} className="cursor-pointer transition-transform hover:scale-[1.02] h-full">
            <AsciiBox title={goal.name.toUpperCase()} className="h-full">
              <div className="space-y-3">
                <p className="font-mono text-xl text-matrix-primary">
                  {formatCurrency(goal.saved)}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-matrix-dim">{t("dashboard.progress", "Progress")}</span>
                    <span className="text-matrix-primary">{Math.min(100, Math.round((goal.saved / goal.target) * 100))}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-matrix-primary/20 overflow-hidden">
                    <div
                      className="h-full bg-matrix-primary transition-all duration-500"
                      style={{ width: `${Math.min(100, (goal.saved / goal.target) * 100)}%` }}
                    />
                  </div>
                </div>
                <DataRow
                  label={t("dashboard.target", "Target")}
                  value={formatCurrency(goal.target)}
                />
              </div>
            </AsciiBox>
          </div>
        ))}
      </div>
    </div>
  );
}
