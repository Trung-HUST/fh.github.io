import { useState } from "react";
import { AsciiBox } from "@/components/ui/AsciiBox";
import { TrendMonitor } from "@/components/ui/DataVizComponents";
import { usePortfolioViewModel } from "@/viewmodels/usePortfolioViewModel";
import { formatCurrency } from "@/models/amount";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { MatrixButton } from "@/components/ui/MatrixButton";
import { batchUpsertContracts } from "@/lib/sheet-db";

export default function PortfolioPage() {
  const { t } = useTranslation();
  const { totalValue, holdings, performanceData } = usePortfolioViewModel();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleUpdatePrice = async (holding: any) => {
    if (!editValue || isNaN(Number(editValue))) return;
    const contract = { ...holding.contract, currentValue: Number(editValue) };
    const success = await batchUpsertContracts([contract]);
    if (success) {
      setEditingId(null);
      setEditValue("");
      window.dispatchEvent(new Event("matrix-sheet-sync"));
    }
  };

  return (
    <div className="space-y-4">
      {/* Total */}
      <AsciiBox title={t("portfolio.portfolioValue", "TỔNG GIÁ TRỊ TÀI SẢN")}>
        <p className="font-mono text-2xl text-matrix-primary glow-text text-center">
          {formatCurrency(totalValue)}
        </p>
      </AsciiBox>

      {/* Performance chart */}
      <AsciiBox title={t("portfolio.performance12m", "HIỆU SUẤT 12 THÁNG")}>
        <TrendMonitor
          data={performanceData.map((d) => d.value)}
          label={performanceData.map((d) => d.month).join(", ")}
          color="var(--matrix-ink)"
        />
      </AsciiBox>

      {/* Holdings */}
      <AsciiBox title={t("portfolio.holdings", "DANH MỤC ĐẦU TƯ / TÀI SẢN")}>
        <div className="space-y-2">
          {holdings.map((h) => {
            const isAdjustable = h.type === "GOLD" || h.type === "REAL_ESTATE";
            const isSavings = h.type === "SAVINGS";
            
            let expectedInterest = 0;
            if (isSavings && h.contract) {
              const interest = h.contract.interestRate || 0;
              const months = h.contract.durationMonths || 1;
              const amount = h.contract.amount || 0;
              expectedInterest = (amount * interest * months) / 100 / 12;
            }

            return (
              <div key={h.id} className="border border-matrix-primary/20 p-2 text-xs font-mono">
                <div className="flex justify-between mb-1">
                  <span className="text-matrix-primary">{h.name} <span className="text-matrix-dim">({h.type})</span></span>
                  <span>{formatCurrency(h.value)}</span>
                </div>
                
                <div className="flex justify-between text-[10px] text-matrix-dim mb-2 border-b border-matrix-primary/10 pb-1">
                  <span>Vốn gốc: {formatCurrency(h.contract?.amount || 0)}</span>
                  <span className={h.up ? "text-matrix-primary" : "text-red-400"}>
                    Lợi nhuận: {h.change}
                  </span>
                </div>

                {isSavings && expectedInterest > 0 && (
                  <div className="flex justify-between text-[10px] text-matrix-dim mb-2">
                    <span>Lãi dự kiến nhận khi đáo hạn:</span>
                    <span className="text-matrix-primary">+{formatCurrency(expectedInterest)}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-matrix-primary/10 overflow-hidden">
                    <div className="h-full bg-matrix-primary" style={{ width: `${h.allocation}%` }} />
                  </div>
                  <span className="text-[10px] text-matrix-dim min-w-[30px] text-right">{h.allocation}%</span>
                </div>

                {isAdjustable && (
                  <div className="mt-2 pt-2 border-t border-matrix-primary/10 flex justify-end">
                    {editingId === h.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="bg-black border border-matrix-primary/50 text-matrix-primary px-2 py-1 text-xs w-28 focus:outline-none"
                          placeholder="Giá mới..."
                          autoFocus
                        />
                        <button onClick={() => handleUpdatePrice(h)} className="text-matrix-primary hover:text-white transition-colors text-[10px]">LƯU</button>
                        <button onClick={() => setEditingId(null)} className="text-matrix-dim hover:text-matrix-primary transition-colors text-[10px]">HỦY</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingId(h.id); setEditValue(h.value.toString()); }} className="text-[10px] text-matrix-dim hover:text-matrix-primary transition-colors">
                        [CẬP NHẬT GIÁ]
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {holdings.length === 0 && (
            <div className="text-center text-matrix-dim py-4 text-xs">
              Chưa có tài sản hoặc khoản đầu tư nào.
            </div>
          )}
        </div>
      </AsciiBox>
    </div>
  );
}
