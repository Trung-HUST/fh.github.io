import { useState } from "react";
import { AsciiBox } from "@/components/ui/AsciiBox";
import { MatrixButton } from "@/components/ui/MatrixButton";
import { useCardShowcaseViewModel } from "@/viewmodels/useCardShowcaseViewModel";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { formatCurrency, getCurrencyConfig } from "@/models/amount";
import { getCachedPin } from "@/lib/googleSheetDb";
import { useMatrixDialog } from "@/contexts/MatrixDialogContext";

export default function CardShowcasePage() {
  const { t } = useTranslation();
  const [showBalance, setShowBalance] = useState(false);
  const { cards, cardCount, formatBalance, totalBalance } = useCardShowcaseViewModel(showBalance);
  const { alert, prompt } = useMatrixDialog();

  const handleToggleBalance = async () => {
    if (showBalance) {
      setShowBalance(false);
      return;
    }
    
    const currentPin = getCachedPin();
    if (!currentPin) {
      await alert("Mã PIN chưa được thiết lập. Vui lòng vào Cài đặt (Settings) để tạo mã PIN trước khi xem.");
      return;
    }

    const enteredPin = await prompt("Nhập mã PIN để xem thẻ:");
    if (enteredPin === currentPin) {
      setShowBalance(true);
    } else if (enteredPin !== null) {
      await alert("Mã PIN không chính xác!");
    }
  };

  return (
    <div className="space-y-4">
      <AsciiBox title={t("cards.totalBalance", "TOTAL BALANCE").toUpperCase()} className="mb-4">
        <div className="flex flex-col items-center justify-center py-4">
          <p className="font-mono text-3xl text-matrix-primary glow-text">
            {showBalance ? formatCurrency(totalBalance) : (getCurrencyConfig().currency === "USD" ? "$***" : "*** ₫")}
          </p>
          <p className="font-mono text-xs text-matrix-dim mt-2 uppercase">{t("cards.combinedNetWorth", "Combined Net Worth")}</p>
        </div>
      </AsciiBox>

      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-matrix-dim">
          {t("cards.cardsInVault", { count: cardCount })}
        </p>
        <MatrixButton size="small" onClick={handleToggleBalance}>
          {showBalance ? t("cards.hide") : t("cards.show")}
        </MatrixButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <AsciiBox key={card.number} title={card.name.toUpperCase()}>
            <div className="space-y-3">
              {/* Card header */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-matrix-dim">{card.bank}</span>
                <span className="font-mono text-[10px] uppercase text-matrix-muted">
                  {card.network}
                </span>
              </div>

              {/* Card number */}
              <p className="font-mono text-sm text-matrix-muted tracking-wider">
                {card.number}
              </p>

              {/* Balance */}
              <div>
                <p className="font-mono text-[10px] uppercase text-matrix-dim">{t("cards.balance")}</p>
                <p className="font-mono text-lg text-matrix-primary">
                  {formatBalance(card.balance)}
                </p>
              </div>

              {/* Utilization bar */}
              <div>
                <div className="flex items-center justify-between font-mono text-[10px] text-matrix-dim mb-1">
                  <span>{t("cards.utilization")}</span>
                  <span>{card.utilization}%</span>
                </div>
                <div className="h-1.5 w-full bg-matrix-primary/10 overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      card.utilization > 80 ? "bg-red-500" :
                      card.utilization > 50 ? "bg-yellow-500" :
                      "bg-matrix-primary"
                    )}
                    style={{ width: `${card.utilization}%` }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between font-mono text-[10px] text-matrix-dim">
                <span>{t("cards.exp")} {card.expiry}</span>
                <span>{t("cards.limit")} {formatCurrency(card.limit)}</span>
              </div>
            </div>
          </AsciiBox>
        ))}
      </div>
    </div>
  );
}
