import { useState } from "react";
import { useNavigate } from "react-router";
import { AsciiBox } from "@/components/ui/AsciiBox";
import {
  Sparkline,
  TypewriterText,
  ConnectionStatus,
} from "@/components/ui/MatrixExtras";
import { TrendMonitor } from "@/components/ui/DataVizComponents";
import { MatrixClock, UpcomingTasks } from "@/components/ui/RunnerComponents";
import { IdentityCard } from "@/components/ui/VibeComponents";
import { WeatherWidget } from "@/components/ui/WeatherWidget";
import { MatrixCalendar } from "@/components/ui";
import { useDashboardViewModel, useGreetingMessage } from "@/viewmodels/useDashboardViewModel";
import { formatCurrency } from "@/models/amount";
import { getCachedAvatar, getCachedContracts, getCachedTransactions, getCachedAuthUser } from "@/lib/sheet-db";
import { MatrixButton } from "@/components/ui/MatrixButton";
import { cn, translateCategory } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { X, Plus, PiggyBank, Landmark, TrendingUp, Gem, Briefcase, Car, Shield } from "lucide-react";
import { AssetDetailsModal } from "@/components/ui/AssetDetailsModal";

const ICON_MAP: Record<string, string> = {
  shield: "[#]",
  plane: "[>]",
  car: "[=]",
  home: "[^]",
};

const ASSET_ICON_MAP: Record<string, React.ReactNode> = {
  SAVINGS: <PiggyBank className="w-5 h-5 text-matrix-primary" />,
  REAL_ESTATE: <Landmark className="w-5 h-5 text-matrix-primary" />,
  GOLD: <Gem className="w-5 h-5 text-matrix-primary" />,
  STOCK: <TrendingUp className="w-5 h-5 text-matrix-primary" />,
  BOND: <Shield className="w-5 h-5 text-matrix-primary" />,
  CRYPTO: <Briefcase className="w-5 h-5 text-matrix-primary" />,
  OTHER_ASSET: <Briefcase className="w-5 h-5 text-matrix-primary" />,
  VEHICLE: <Car className="w-5 h-5 text-matrix-primary" />,
  ACCOUNT: <Landmark className="w-5 h-5 text-matrix-primary" />,
};

/** Map a heatmap value (0-10) to a matrix green color. */
function heatmapColor(value: number, max: number): string {
  if (value >= max) return "rgba(0,255,65,1)";
  if (value === 0) return "rgba(0,255,65,0.06)";
  const t = value / max;
  const opacity = 0.08 + t * 0.35; // 0.08 – 0.43 for background range
  return `rgba(0,255,65,${opacity})`;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [selectedAssetClass, setSelectedAssetClass] = useState<string | null>(null);
  const [selectedContractType, setSelectedContractType] = useState<"SAVINGS" | "INSTALLMENT" | null>(null);
  
  const {
    accountList,
    activityList,
    activitySummary,
    goals,
    budgetRows,
    trendData,
    flowData,
    heatmapData,
    pixelHeatmapRows,
    pixelHeatmapCols,
    pixelHeatmapMax,
    signalRows,
    streakDays,
    upcomingTasks,
    assetBreakdown,
    totalAssets,
  } = useDashboardViewModel();
  const greeting = useGreetingMessage();
  const avatarConfig = getCachedAvatar();
  const contracts = getCachedContracts();
  const authUser = getCachedAuthUser();

  const navigate = useNavigate();

  const handleAccountClick = (name: string) => {
    if (name === "Funds" || name === "FUNDS") {
      navigate("/funds");
    } else if (goals.some((g) => g.name === name)) {
      navigate(`/funds/${encodeURIComponent(name)}`);
    }
  };

  const activeContracts = contracts.filter(c => c.status === "ACTIVE" && c.type === selectedContractType);

  return (
    <div className="space-y-3 relative">
      {/* Row 1: Status + Clock + Identity + Signal — 4-col on xl */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <AsciiBox title={t("dashboard.systemStatus", "SYSTEM STATUS")}>
          <div className="flex h-full min-h-[120px] items-center justify-start py-4 px-2">
            <TypewriterText
              text={greeting}
              className="font-mono text-base lg:text-lg text-matrix-primary whitespace-pre-wrap break-words leading-relaxed"
              speedMs={30}
            />
          </div>
        </AsciiBox>

        <AsciiBox title={t("dashboard.chronometer", "CHRONOMETER")}>
          <div className="flex items-center justify-center py-2">
            <MatrixClock label={t("dashboard.systemTime", "SYSTEM TIME")} />
          </div>
        </AsciiBox>

        <IdentityCard
          name={avatarConfig.operatorAlias || authUser?.displayName?.toUpperCase() || "OPERATOR"}
          isPublic
          avatarConfig={avatarConfig}
          title={t("dashboard.identity", "IDENTITY")}
          subtitle={t("dashboard.clearanceLevel", "// clearance level: root")}
          rankLabel="S+"
          streakDays={streakDays}
          showStats
          animateTitle
          scanlines
          avatarSize={64}
        />

        <AsciiBox title={t("dashboard.signalMonitor", "SIGNAL MONITOR")}>
          <div className="flex flex-col gap-2">
            {signalRows.map((sig) => (
              <div key={sig.label} className="flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-[10px] text-matrix-dim uppercase">{t(`dashboard.signals.${sig.label}`, sig.label)}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-mono text-sm font-bold",
                        sig.status === "critical" ? "text-red-400" :
                        sig.status === "warning" ? "text-yellow-400" :
                        "text-matrix-primary",
                      )}
                    >
                      {sig.value}
                    </span>
                    {sig.changeText && (
                      <span className={cn(
                        "font-mono text-[10px]",
                        sig.status === "critical" ? "text-red-400" :
                        sig.status === "warning" ? "text-yellow-400" :
                        "text-matrix-primary"
                      )}>
                        {sig.changeText}
                      </span>
                    )}
                  </div>
                </div>
                <Sparkline
                  data={sig.trend}
                  width={64}
                  height={20}
                  color={
                    sig.status === "critical" ? "#f87171" :
                    sig.status === "warning" ? "#facc15" :
                    "#00FF41"
                  }
                />
              </div>
            ))}
          </div>
        </AsciiBox>
      </div>

      {/* Row 2: Weather, Calendar & Heatmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="h-full">
          <WeatherWidget />
        </div>
        
        <div className="h-full">
          <MatrixCalendar />
        </div>
        
        <div className="md:col-span-2 xl:col-span-2 h-full">
          <AsciiBox title={t("dashboard.dataVisualization", "DATA VISUALIZATION")} className="h-full">
        <div className="space-y-4 h-full flex flex-col justify-center">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-matrix-primary glow-text">
              {heatmapData.totalContributions} {t("dashboard.contributions", "contributions in the last year")}
            </span>
            <span className="text-matrix-muted hidden sm:inline">{t("dashboard.pixelRender", `// pixel render: ${new Date().getFullYear()}`)}</span>
          </div>
          
          <div className="flex overflow-x-auto pb-2 custom-scrollbar">
            <div className="flex flex-col gap-1 min-w-max">
              {/* Month Labels */}
              <div className="relative h-4 font-mono text-[10px] text-matrix-dim ml-8">
                {heatmapData.months.map((m, i) => (
                  <span key={i} className="absolute top-0" style={{ left: `${m.colIndex * 12}px` }}>
                    {t(`dashboard.months.${m.label.toLowerCase()}`, m.label)}
                  </span>
                ))}
              </div>

              {/* Grid + Day Labels */}
              <div className="flex gap-2">
                {/* Day Labels */}
                <div className="flex flex-col justify-between font-mono text-[10px] text-matrix-dim w-6 pt-1 pb-1 text-right">
                  <span className="leading-[10px] invisible">Sun</span>
                  <span className="leading-[10px]">{t("dashboard.days.mon", "Mon")}</span>
                  <span className="leading-[10px] invisible">Tue</span>
                  <span className="leading-[10px]">{t("dashboard.days.wed", "Wed")}</span>
                  <span className="leading-[10px] invisible">Thu</span>
                  <span className="leading-[10px]">{t("dashboard.days.fri", "Fri")}</span>
                  <span className="leading-[10px] invisible">Sat</span>
                </div>

                {/* Grid */}
                <div
                  className="inline-grid"
                  style={{
                    gridTemplateColumns: `repeat(${pixelHeatmapCols}, 10px)`,
                    gridTemplateRows: `repeat(${pixelHeatmapRows}, 10px)`,
                    gridAutoFlow: "column",
                    gap: "2px",
                  }}
                  data-testid="pixel-heatmap"
                >
                  {heatmapData.cells.map((cell) => (
                    <span
                      key={`${cell.row}-${cell.col}`}
                      className={cn(
                        "rounded-[1px]",
                        cell.isFuture ? "bg-transparent" : "border border-matrix-ghost/20"
                      )}
                      style={{
                        width: 10,
                        height: 10,
                        background: cell.isFuture ? "transparent" : heatmapColor(cell.value, pixelHeatmapMax),
                        boxShadow:
                          cell.value >= pixelHeatmapMax
                            ? "0 0 4px rgba(0,255,65,0.6)"
                            : "none",
                      }}
                      title={cell.dateStr ? `${cell.dateStr}: ${cell.value} interactions` : undefined}
                    />
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex justify-end items-center gap-2 mt-1 mr-2 font-mono text-[10px] text-matrix-muted">
                <span>{t("dashboard.less", "Less")}</span>
                <div className="flex gap-[2px]">
                  {[0, 1, 2, 3, 4].map((v) => (
                    <span
                      key={v}
                      className="border border-matrix-ghost/20 rounded-[1px]"
                      style={{
                        width: 10,
                        height: 10,
                        background: heatmapColor(v, pixelHeatmapMax),
                      }}
                    />
                  ))}
                </div>
                <span>{t("dashboard.more", "More")}</span>
              </div>
            </div>
          </div>
        </div>
      </AsciiBox>
      </div>
      </div>

      {/* Row: UPCOMING TASKS */}
      <UpcomingTasks items={upcomingTasks} count={8} />

      {/* Asset Classes Row */}
      <div className="mb-4">
        <AsciiBox title={t("dashboard.totalAssets", "TỔNG TÀI SẢN (TOTAL ASSETS)")}>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-4">
            <div>
              <p className="font-mono text-xs text-matrix-dim uppercase">{t("dashboard.netWorth", "Net Worth")}</p>
              <p className="font-mono text-3xl text-matrix-primary glow-text">{formatCurrency(totalAssets)}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate('/records')} className="px-3 py-1.5 border border-matrix-primary/30 hover:bg-matrix-primary/10 text-matrix-primary font-mono text-xs flex items-center gap-1 transition-colors">
                <Plus className="w-4 h-4" />
                {t("dashboard.addAsset", "Thêm Tài Sản")}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.isArray(assetBreakdown) && assetBreakdown.map((asset) => (
              <div 
                key={asset.id} 
                onClick={() => setSelectedAssetClass(asset.id)}
                className="border border-matrix-primary/20 bg-matrix-primary/5 hover:bg-matrix-primary/20 p-3 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  {ASSET_ICON_MAP[asset.id] || <Landmark className="w-5 h-5 text-matrix-primary" />}
                  <span className="font-mono text-xs text-matrix-dim border border-matrix-dim/30 px-1">{asset.count}</span>
                </div>
                <div className="font-mono text-xs text-matrix-dim uppercase truncate" title={t(`dashboard.assetTypes.${asset.id.replace(/\s+/g, '').toUpperCase()}`, asset.name)}>{t(`dashboard.assetTypes.${asset.id.replace(/\s+/g, '').toUpperCase()}`, asset.name)}</div>
                <div className={cn("font-mono text-sm mt-1", asset.value < 0 ? "text-red-500" : "text-matrix-primary")}>{formatCurrency(asset.value)}</div>
              </div>
            ))}
          </div>
        </AsciiBox>
      </div>

      {/* Row 3: Target goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {goals.map((goal) => (
          <div key={goal.name} onClick={() => handleAccountClick(goal.name)} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <AsciiBox title={t(`dashboard.goals.${goal.name}`, goal.name).toUpperCase()}>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg text-matrix-primary">
                    {ICON_MAP[goal.icon] ?? "[?]"}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[10px] uppercase px-2 py-0.5 flex items-center gap-1",
                      goal.onTrack
                        ? "bg-matrix-primary/10 text-matrix-primary"
                        : "bg-yellow-500/10 text-yellow-500",
                    )}
                  >
                    <ConnectionStatus
                      status={goal.onTrack ? "STABLE" : "UNSTABLE"}
                    />
                    {goal.onTrack ? t("dashboard.onTrack", "on track") : t("dashboard.behind", "behind")}
                  </span>
                </div>
                <div>
                  <div className="flex items-center justify-between font-mono text-xs mb-1">
                    <span className="text-matrix-muted">
                      {formatCurrency(goal.saved)} / {formatCurrency(goal.target)}
                    </span>
                    <span className="text-matrix-primary">{goal.percent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-matrix-primary/10 overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all",
                        goal.onTrack ? "bg-matrix-primary" : "bg-yellow-500",
                      )}
                      style={{ width: `${goal.percent}%` }}
                    />
                  </div>
                </div>
                <div className="font-mono text-[10px] text-matrix-dim">
                  {t("dashboard.needMonth", { amount: formatCurrency(goal.monthlyTarget) })}
                </div>
              </div>
            </AsciiBox>
          </div>
        ))}
      </div>

      {/* Row 4: Accounts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accountList.map((account) => (
          <div key={account.name} onClick={() => handleAccountClick(account.name)} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <AsciiBox title={t(`dashboard.accounts.${account.name}`, account.name).toUpperCase()}>
              <div className="space-y-2">
                <p className={cn(
                  "font-mono text-xl glow-text",
                  account.name.toLowerCase().includes("liabilities") || account.name.toLowerCase().includes("khoản phải trả") || account.name.toLowerCase().includes("credit card") || account.name.toLowerCase().includes("thẻ tín dụng")
                  ? "text-red-400"
                  : "text-matrix-primary"
                )}>
                  {formatCurrency(account.balance)}
                </p>
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "font-mono text-xs",
                      account.change.startsWith("+") ? "text-matrix-primary" : "text-red-500",
                    )}
                  >
                    {account.change}
                  </span>
                  <Sparkline
                    data={[30, 45, 35, 55, 40, 60, 50]}
                    width={80}
                    height={24}
                    color="var(--matrix-ink)"
                  />
                </div>
              </div>
            </AsciiBox>
          </div>
        ))}
      </div>

      {/* Row 5: Budget + Trend side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AsciiBox title={t("dashboard.budgetTracker", "BUDGET TRACKER")}>
          <div className="space-y-3">
          {budgetRows.map((budget) => (
            <div key={budget.category} className="space-y-1">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-matrix-muted uppercase">{t(`dashboard.categories.${budget.category}`, budget.category)}</span>
                <span
                  className={cn(
                    budget.overBudget ? "text-red-400" : "text-matrix-primary",
                  )}
                >
                  {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
                </span>
              </div>
              <div className="h-1.5 w-full bg-matrix-primary/10 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    budget.overBudget ? "bg-red-400" : "bg-matrix-primary",
                  )}
                  style={{ width: `${Math.min(budget.percent, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        </AsciiBox>

        <TrendMonitor
          data={trendData}
          label={t("dashboard.30DayTrend", "30-DAY TREND")}
          color="#00FF41"
        />
      </div>

      {/* Row 6: Cash flow */}
      <AsciiBox title={t("dashboard.cashFlow", "CASH FLOW")}>
        <div className="space-y-2">
          {flowData.map((flow) => {
            const maxVal = Math.max(
              ...flowData.map((f) => Math.max(f.inflow, f.outflow)),
            );
            return (
              <div key={flow.month} className="space-y-0.5">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-matrix-dim uppercase w-8">{flow.month}</span>
                  <span
                    className={cn(
                      flow.net >= 0 ? "text-matrix-primary" : "text-red-400",
                    )}
                  >
                    {formatCurrency(flow.net, true)}
                  </span>
                </div>
                <div className="flex gap-1 h-1.5">
                  <div className="flex-1 bg-matrix-primary/10 overflow-hidden">
                    <div
                      className="h-full bg-matrix-primary/60"
                      style={{ width: `${(flow.inflow / maxVal) * 100}%` }}
                    />
                  </div>
                  <div className="flex-1 bg-red-400/10 overflow-hidden">
                    <div
                      className="h-full bg-red-400/60"
                      style={{ width: `${(flow.outflow / maxVal) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-4 font-mono text-[10px] text-matrix-dim pt-1 border-t border-matrix-ghost">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-matrix-primary/60" /> {t("dashboard.inflow", "inflow")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-400/60" /> {t("dashboard.outflow", "outflow")}
            </span>
          </div>
        </div>
      </AsciiBox>

      {/* Activity log + Flow summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AsciiBox title={t("dashboard.activityLog", "ACTIVITY LOG")}>
          <div className="space-y-1.5">
            {activityList.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between font-mono text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-matrix-dim">{item.date}</span>
                  <span className="text-matrix-muted truncate">
                    {translateCategory(item.desc, t)}
                  </span>
                </div>
                <span
                  className={cn(
                    "shrink-0 ml-2",
                    item.direction === "positive" ? "text-matrix-primary" : "text-red-400",
                  )}
                >
                  {item.formattedAmount}
                </span>
              </div>
            ))}
          </div>
        </AsciiBox>

        <AsciiBox title={t("dashboard.flowSummary", "FLOW SUMMARY")}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="font-mono text-[10px] uppercase text-matrix-dim">{t("dashboard.inflow", "inflow")}</p>
              <p className="font-mono text-lg text-matrix-primary">
                {formatCurrency(activitySummary.totalIn)}
              </p>
            </div>
            <div className="text-center">
              <p className="font-mono text-[10px] uppercase text-matrix-dim">{t("dashboard.outflow", "outflow")}</p>
              <p className="font-mono text-lg text-red-400">
                {formatCurrency(activitySummary.totalOut)}
              </p>
            </div>
            <div className="text-center">
              <p className="font-mono text-[10px] uppercase text-matrix-dim">{t("dashboard.net", "net")}</p>
              <p
                className={cn(
                  "font-mono text-lg",
                  activitySummary.net >= 0 ? "text-matrix-primary" : "text-red-400",
                )}
              >
                {formatCurrency(Math.abs(activitySummary.net))}
              </p>
            </div>
          </div>
        </AsciiBox>
      </div>
      {selectedContractType && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <AsciiBox title={selectedContractType === "SAVINGS" ? "SỔ TIẾT KIỆM (SAVINGS)" : "TRẢ GÓP (INSTALLMENTS)"}>
              <div className="flex justify-end border-b border-matrix-primary/30 pb-2 mb-2">
                <button onClick={() => setSelectedContractType(null)} className="text-matrix-dim hover:text-matrix-primary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {activeContracts.length === 0 ? (
                  <p className="text-matrix-dim text-sm text-center py-4 font-mono">
                    {t("dashboard.noActiveContracts", "Không có hợp đồng/sổ nào đang hoạt động.")}
                  </p>
                ) : (
                  activeContracts.map(contract => (
                    <div key={contract.id || contract.name} className="border border-matrix-primary/20 p-3 bg-matrix-primary/5 hover:bg-matrix-primary/10 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-mono text-matrix-primary font-bold">{contract.name}</span>
                        <span className="font-mono text-xs text-matrix-dim">{formatCurrency(contract.amount)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[10px]">
                        <div>
                          <p className="text-matrix-muted uppercase">{t("contracts.interestRate", "Lãi suất (Năm)")}</p>
                          <p className="text-matrix-primary">{contract.interestRate}%</p>
                        </div>
                        <div>
                          <p className="text-matrix-muted uppercase">{t("contracts.duration", "Thời hạn")}</p>
                          <p className="text-matrix-primary">{contract.durationMonths} {t("contracts.months", "tháng")}</p>
                        </div>
                        <div>
                          <p className="text-matrix-muted uppercase">{t("contracts.nextDueDate", "Hạn tiếp theo")}</p>
                          <p className="text-matrix-primary">{contract.nextDueDate}</p>
                        </div>
                        <div>
                          <p className="text-matrix-muted uppercase">{t("contracts.wallet", "Ví liên kết")}</p>
                          <p className="text-matrix-primary">{contract.wallet}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </AsciiBox>
          </div>
        </div>
      )}

      {selectedAssetClass && (
        <AssetDetailsModal 
          assetClass={selectedAssetClass} 
          assetType={assetBreakdown.find(a => a.id === selectedAssetClass)?.type}
          contracts={getCachedContracts()}
          transactions={getCachedTransactions() || []}
          walletOptions={accountList.filter(a => a?.type !== 'CREDIT').map(a => a?.name || '')}
          onUpdate={() => window.location.reload()}
          onClose={() => setSelectedAssetClass(null)} 
        />
      )}
    </div>
  );
}
