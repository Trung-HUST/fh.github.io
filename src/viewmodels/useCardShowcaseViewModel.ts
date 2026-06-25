// ViewModel for the Card Showcase page.
// Composes model logic with data source — View consumes this hook only.

import { useMemo, useCallback } from "react";
import { computeUtilization, deriveColorScheme, formatBalance } from "@/models/card-showcase";
import { getCachedTransactions, getCachedCards } from "@/lib/googleSheetDb";
import { useTranslation } from "react-i18next";
import type { CardColorScheme } from "@/models/card-showcase";
import type { CreditCard } from "@/models/types";

export interface CardPresentation extends CreditCard {
  colorScheme: CardColorScheme;
  utilization: number;
}

export function useCardShowcaseViewModel(showBalance: boolean) {
  const { t } = useTranslation();
  const allTxs = (getCachedTransactions() || []).filter(t => !t.deleted);
  
  const cards: CardPresentation[] = useMemo(
    () => {
      const customCards = getCachedCards();
      
      const generatedCards: CreditCard[] = customCards.map(card => {
        // Find transactions related to this card (case-insensitive)
        const relatedTxs = allTxs.filter(t => {
          const cat = ((t as any).detail || t.category || "").toLowerCase().trim();
          const targetName = card.name.toLowerCase().trim();
          
          if (cat === targetName) return true;
          
          // Fallback matching for known translated terms
          if (targetName === "bank account" || targetName === "tài khoản ngân hàng") {
            return cat === "bank account" || cat === "tài khoản ngân hàng";
          }
          if (targetName === "credit card" || targetName === "thẻ tín dụng") {
            return cat === "credit card" || cat === "thẻ tín dụng";
          }
          
          return false;
        });
        
        // Start at 0, rely purely on transactions to match the Accounts page
        let calculatedBalance = 0;
        
        // Add/subtract all related transactions
        relatedTxs.forEach(t => {
          calculatedBalance += t.amount;
        });

        // For credit cards, balance is usually positive representation of debt or just balance
        if (card.type === "credit") {
          calculatedBalance = Math.abs(calculatedBalance);
        }

        return {
          name: card.name,
          bank: card.bank,
          network: card.network as any,
          number: card.number,
          expiry: card.expiry,
          balance: calculatedBalance,
          limit: card.limit || 0,
          color: card.type === "bank" ? "from-blue-600 to-blue-800" : "from-red-600 to-red-800"
        };
      });

      if (generatedCards.length === 0) {
        const ccTxs = allTxs.filter(t => {
          const cat = ((t as any).detail || t.category || "").toLowerCase().trim();
          return cat === "credit card" || cat === "thẻ tín dụng" || cat.includes("credit");
        });
        const bankTxs = allTxs.filter(t => {
          const cat = ((t as any).detail || t.category || "").toLowerCase();
          return cat === "bank account" || cat === "tài khoản ngân hàng";
        });

        const ccBalance = Math.abs(ccTxs.reduce((sum, t) => sum + t.amount, 0));
        const bankBalance = bankTxs.reduce((sum, t) => sum + t.amount, 0);

        generatedCards.push(
          {
            name: t("accounts.bankAccount", "Bank Account"),
            bank: "System Bank",
            network: "visa",
            number: "**** **** **** 1111",
            expiry: "12/30",
            balance: bankBalance,
            limit: 100000,
            color: "from-blue-600 to-blue-800"
          },
          {
            name: t("accounts.creditCard", "Credit Card"),
            bank: "System Credit",
            network: "mastercard",
            number: "**** **** **** 2222",
            expiry: "12/30",
            balance: ccBalance,
            limit: 50000,
            color: "from-red-600 to-red-800"
          }
        );
      }

      return generatedCards.map((card) => ({
        ...card,
        colorScheme: deriveColorScheme(card.network),
        utilization: computeUtilization(card.balance, card.limit),
      }));
    },
    [allTxs, t],
  );

  const totalBalance = useMemo(() => {
    // Sum of all card balances shown on this page
    // Ensure we subtract credit balances if we want net worth, or just sum them up if they are assets?
    // A credit card balance is debt. If it's positive debt, we should subtract it from bank balances.
    return cards.reduce((sum, card) => {
      // Assuming card.type === "credit" isn't available here, we can infer from utilization or name, 
      // but actually the old calculation was net worth. If they want the sum of cards, maybe we just sum it?
      // "Combined Net Worth" usually means Assets - Liabilities.
      // If a credit card has a 0 balance, it doesn't affect it.
      // Let's check card.colorScheme or just assume card.limit > 0 means credit.
      const isCredit = card.limit > 0 || card.name.toLowerCase().includes("credit");
      const multiplier = isCredit ? -1 : 1;
      return sum + (card.balance * multiplier);
    }, 0);
  }, [cards]);

  const formatBal = useCallback(
    (balance: number) => formatBalance(balance, showBalance),
    [showBalance],
  );

  return { cards, cardCount: cards.length, formatBalance: formatBal, totalBalance };
}
