import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AsciiBox } from "@/components/ui/AsciiBox";
import { DataRow, Sparkline } from "@/components/ui/MatrixExtras";
import { formatCurrency } from "@/models/amount";
import { useDashboardViewModel } from "@/viewmodels/useDashboardViewModel";
import { useRecordListViewModel } from "@/viewmodels/useRecordListViewModel";
import { getCachedContracts } from "@/lib/sheet-db";
import { ArrowLeft } from "lucide-react";

export default function FundDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const decodedId = decodeURIComponent(id || "");
  
  const { goals } = useDashboardViewModel();
  const { records } = useRecordListViewModel();
  const contracts = getCachedContracts();

  const goal = goals.find((g) => g.name === decodedId);

  if (!goal) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate("/funds")} className="flex items-center gap-2 text-matrix-primary hover:underline font-mono text-xs">
          <ArrowLeft size={14} /> Back to Funds
        </button>
        <AsciiBox title="Not Found">
          <p className="text-red-400 font-mono">Fund not found.</p>
        </AsciiBox>
      </div>
    );
  }

  // Filter transactions for this fund
  const fundTransactions = records.filter(r => {
    const rawCat = ((r as any).detail || r.category || "").trim();
    const cat = rawCat.toLowerCase();
    const target = decodedId.toLowerCase();
    
    if (target === "liabilities" || target === "khoản phải trả") {
      if (cat.startsWith("liabilities") || cat.startsWith("khoản phải trả")) return true;
    }
    if (target === "accounts receivable" || target === "accountsreceivable" || target === "khoản phải thu") {
      if (cat.startsWith("accounts receivable") || cat.startsWith("accountsreceivable") || cat.startsWith("khoản phải thu")) return true;
    }
    
    return cat === target || cat.startsWith(`${target}-`);
  });
  const fundContracts = Array.isArray(contracts) ? contracts.filter(c => c?.goalName === decodedId && !c?.deleted) : [];

  return (
    <div className="space-y-4">
      <button onClick={() => navigate("/funds")} className="flex items-center gap-2 text-matrix-primary hover:underline font-mono text-xs">
        <ArrowLeft size={14} /> Back to Funds
      </button>

      <AsciiBox title={`QUỸ: ${goal.name.toUpperCase()}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-3xl text-matrix-primary glow-text">
                {formatCurrency(goal.saved)}
              </p>
              <p className="font-mono text-sm text-matrix-dim mt-1">
                Target: {formatCurrency(goal.target)}
              </p>
            </div>
            <Sparkline
              data={[20, 35, 30, 45, 40, 60, 50, 65]}
              width={150}
              height={48}
              color="var(--matrix-ink)"
            />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-matrix-dim">{t("dashboard.progress", "Progress")}</span>
              <span className="text-matrix-primary">{Math.min(100, Math.round((goal.saved / goal.target) * 100))}%</span>
            </div>
            <div className="h-2 w-full bg-matrix-primary/20 overflow-hidden">
              <div
                className="h-full bg-matrix-primary transition-all duration-500"
                style={{ width: `${Math.min(100, (goal.saved / goal.target) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </AsciiBox>

      {fundContracts.length > 0 && (
        <AsciiBox title="TÀI SẢN / HỢP ĐỒNG LIÊN QUAN (CONTRACTS)">
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase text-matrix-dim border-b border-matrix-primary/10 pb-1 mb-1">
              <span>Tên</span>
              <div className="flex gap-8">
                <span>Trạng thái</span>
                <span>Giá trị</span>
              </div>
            </div>
            {fundContracts.map(c => (
              <div key={c.id} className="flex items-center justify-between font-mono text-xs border-b border-matrix-ghost/10 pb-2">
                <span className="text-matrix-primary truncate pr-2 max-w-[50%]">{c.name}</span>
                <div className="flex gap-4 items-center shrink-0">
                  <span className="text-matrix-dim w-16 text-right">{c.status}</span>
                  <span className="text-matrix-primary w-24 text-right">{formatCurrency(c.currentValue || c.amount || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </AsciiBox>
      )}

      <AsciiBox title="LỊCH SỬ GIAO DỊCH (TRANSACTION HISTORY)">
        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase text-matrix-dim border-b border-matrix-primary/10 pb-1 mb-1">
            <span>Mô tả</span>
            <div className="flex gap-8">
              <span>Ngày</span>
              <span>Số tiền</span>
            </div>
          </div>
          {fundTransactions.length === 0 ? (
            <p className="font-mono text-xs text-matrix-dim py-4 text-center">Chưa có giao dịch nào.</p>
          ) : (
            fundTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between font-mono text-xs border-b border-matrix-ghost/10 pb-2">
                <span className="text-matrix-primary truncate pr-2 max-w-[50%]">{tx.name}</span>
                <div className="flex gap-4 items-center shrink-0">
                  <span className="text-matrix-dim w-16 text-right">{tx.date.substring(5, 10)}</span>
                  <span className={tx.amount >= 0 ? "text-matrix-primary w-24 text-right" : "text-red-400 w-24 text-right"}>
                    {formatCurrency(tx.amount, true)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </AsciiBox>
    </div>
  );
}
