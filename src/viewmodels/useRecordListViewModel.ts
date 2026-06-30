// ViewModel for the Record List page.
// Composes model logic with data source — View consumes this hook only.

import { useMemo } from "react";
import { transactions } from "@/data/mock";
import { getCachedTransactions } from "@/lib/googleSheetDb";
import { classifyDirection, formatSignedAmount, classifyStatus } from "@/models/record-list";
import { syncCreateTransactions } from "@/lib/googleSheetDb";
import { useState, useCallback } from "react";
import { useSyncTrigger } from "@/hooks/useSyncTrigger";
import type { AmountDirection, StatusVariant } from "@/models/record-list";
import { convertToVnd } from "@/models/amount";

export interface RecordRow {
  id: string | number;
  name: string;
  category: string;
  date: string;
  amount: number;
  direction: AmountDirection;
  formattedAmount: string;
  status: string;
  statusVariant: StatusVariant;
}

export function useRecordListViewModel() {
  const syncTick = useSyncTrigger();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateCounter, setUpdateCounter] = useState(0);
  const sheetTransactions = useMemo(() => getCachedTransactions(), [updateCounter, syncTick]);

  const addTransaction = useCallback(async (
    name: string,
    amount: number,
    date: string,
    debitAccount: string,
    creditAccount: string
  ) => {
    setIsSubmitting(true);
    try {
      // Convert input amount from display currency to VND before saving
      const amountVnd = convertToVnd(amount);
      const txs = [
        { name, amount: Math.abs(amountVnd), date, detail: debitAccount },
        { name, amount: -Math.abs(amountVnd), date, detail: creditAccount }
      ];
      const success = await syncCreateTransactions(txs);
      if (success) {
        setUpdateCounter(c => c + 1);
      }
      return success;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const records: RecordRow[] = useMemo(() => {
    const rawList = sheetTransactions ?? transactions;
    const sorted = [...rawList]
      .filter((t) => !t.deleted)
      .reverse()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return sorted.map((tx) => {
      let formattedDate = tx.date;
      if (formattedDate) {
        const d = new Date(formattedDate);
        if (!isNaN(d.getTime())) {
          // Format as dd/MM/yyyy
          formattedDate = d.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        }
      }

      return {
        id: tx.id,
        name: tx.name,
        category: (tx as any).detail || tx.category || "Unknown",
        date: formattedDate,
        amount: tx.amount,
        direction: classifyDirection(tx.amount),
        formattedAmount: formatSignedAmount(tx.amount),
        status: tx.status,
        statusVariant: classifyStatus(tx.status),
      };
    });
  }, [sheetTransactions]);

  const deleteTransaction = useCallback(async (id: string | number) => {
    setIsSubmitting(true);
    try {
      const { syncDeleteTransaction } = await import("@/lib/sheet-db");
      const result = await syncDeleteTransaction(id);
      if (result.success) {
        setUpdateCounter(c => c + 1);
      }
      return result;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const updateTransaction = useCallback(async (
    id: string | number,
    name: string,
    amount: number,
    date: string,
    category: string
  ) => {
    setIsSubmitting(true);
    try {
      const amountVnd = convertToVnd(amount);
      const txs = [
        { id, name, amount: amountVnd, date, detail: category, deleted: false }
      ];
      const success = await syncCreateTransactions(txs);
      if (success) {
        setUpdateCounter(c => c + 1);
      }
      return success;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { records, totalCount: records.length, addTransaction, updateTransaction, deleteTransaction, isSubmitting };
}
