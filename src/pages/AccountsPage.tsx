import { AsciiBox } from "@/components/ui/AsciiBox";
import { DataRow, Sparkline } from "@/components/ui/MatrixExtras";
import { useAccountsViewModel } from "@/viewmodels/useAccountsViewModel";
import { formatCurrency } from "@/models/amount";
import { cn, translateCategory } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function AccountsPage() {
  const { t } = useTranslation();
  const { accountList, activityList, activitySummary } = useAccountsViewModel();

  return (
    <div className="space-y-4">
      {/* Total balance */}
      <AsciiBox title={t("accounts.totalBalance")}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-2xl text-matrix-primary glow-text">
              {formatCurrency(accountList.reduce((s, a) => {
                const nameLow = a.name.toLowerCase();
                const isLiability = nameLow.includes("liabilities") || nameLow.includes("khoản phải trả") || nameLow.includes("credit card") || nameLow.includes("thẻ tín dụng");
                return s + (isLiability ? -a.balance : a.balance);
              }, 0))}
            </p>
            <p className="font-mono text-xs text-matrix-dim mt-1">
              {t("accounts.acrossAccounts", { count: accountList.length })}
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

      {/* Individual accounts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {accountList.map((account) => (
          <AsciiBox key={account.name} title={t(`accounts.${account.name.replace(/ /g, "")}`, account.name).toUpperCase()}>
            <div className="space-y-3">
              <p className={cn(
                "font-mono text-xl",
                account.name.toLowerCase().includes("liabilities") || account.name.toLowerCase().includes("khoản phải trả") || account.name.toLowerCase().includes("credit card") || account.name.toLowerCase().includes("thẻ tín dụng")
                ? "text-red-400"
                : "text-matrix-primary"
              )}>
                {formatCurrency(account.balance)}
              </p>
              <DataRow
                label={t("accounts.change")}
                value={accountList[0].change}
              />
            </div>
          </AsciiBox>
        ))}
      </div>

      {/* Recent activity */}
      <AsciiBox title={t("accounts.recentActivity")}>
        <div className="space-y-1">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase text-matrix-dim border-b border-matrix-primary/10 pb-1 mb-1">
            <span>{t("accounts.description")}</span>
            <div className="flex gap-8">
              <span>{t("accounts.date")}</span>
              <span>{t("accounts.amount")}</span>
            </div>
          </div>
          {activityList.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between font-mono text-xs py-1 border-b border-matrix-primary/5 last:border-0"
            >
              <span className="text-matrix-muted">
                {translateCategory(item.desc, t)}
              </span>
              <div className="flex items-center gap-6">
                <span className="text-matrix-dim text-[11px]">{item.date}</span>
                <span
                  className={cn(
                    "w-20 text-right",
                    item.direction === "positive" ? "text-matrix-primary" : "text-red-400"
                  )}
                >
                  {item.formattedAmount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </AsciiBox>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AsciiBox title={t("accounts.inflow")}>
          <p className="font-mono text-lg text-matrix-primary text-center">
            {formatCurrency(activitySummary.totalIn)}
          </p>
        </AsciiBox>
        <AsciiBox title={t("accounts.outflow")}>
          <p className="font-mono text-lg text-red-400 text-center">
            {formatCurrency(activitySummary.totalOut)}
          </p>
        </AsciiBox>
        <AsciiBox title={t("accounts.net")}>
          <p className={cn(
            "font-mono text-lg text-center",
            activitySummary.net >= 0 ? "text-matrix-primary" : "text-red-400"
          )}>
            {formatCurrency(activitySummary.net)}
          </p>
        </AsciiBox>
      </div>
    </div>
  );
}
