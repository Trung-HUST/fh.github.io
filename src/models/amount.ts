// Shared amount formatting and classification utilities.
// Used by both accounts and record-list models.

import { getCachedSettings } from "@/lib/googleSheetDb";

export type AmountDirection = "positive" | "negative";

export function classifyDirection(amount: number): AmountDirection {
  return amount > 0 ? "positive" : "negative";
}

export function getCurrencyConfig() {
  const settings = getCachedSettings();
  const currency = (settings?.currency || "VND").toUpperCase();
  const exchangeRate = Number(settings?.exchangeRate) || 26304.5;
  return { currency, exchangeRate };
}

export function convertToDisplay(amountVnd: number): number {
  const { currency, exchangeRate } = getCurrencyConfig();
  if (currency === "USD") {
    return amountVnd / exchangeRate;
  }
  return amountVnd;
}

export function convertToVnd(amountDisplay: number): number {
  const { currency, exchangeRate } = getCurrencyConfig();
  if (currency === "USD") {
    return amountDisplay * exchangeRate;
  }
  return amountDisplay;
}

export function formatCurrency(amount: number, signed = false): string {
  const { currency } = getCurrencyConfig();
  const displayAmount = convertToDisplay(amount);
  const prefix = signed && amount > 0 ? "+" : (signed && amount < 0 ? "-" : "");
  const absValue = Math.abs(displayAmount);

  if (currency === "USD") {
    return `${prefix}$${absValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${prefix}${absValue.toLocaleString("vi-VN")} ₫`;
}

export function formatSignedAmount(amount: number): string {
  return formatCurrency(amount, true);
}
