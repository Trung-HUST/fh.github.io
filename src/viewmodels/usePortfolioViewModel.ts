import { useState, useEffect, useMemo } from "react";
import { performanceData } from "@/data/mock";
import { getCachedContracts } from "@/lib/sheet-db";
import type { Contract } from "@/lib/sheet-db";

export interface PortfolioHolding {
  id: string;
  name: string;
  type: string;
  value: number;
  allocation: number;
  change: string;
  up: boolean;
  contract: Contract;
}

export function usePortfolioViewModel() {
  const [contracts, setContracts] = useState<Contract[]>([]);

  // Lắng nghe sự thay đổi của contracts từ storage
  useEffect(() => {
    const loadContracts = () => {
      setContracts(getCachedContracts());
    };
    
    loadContracts();
    window.addEventListener("matrix-sheet-sync", loadContracts);
    return () => window.removeEventListener("matrix-sheet-sync", loadContracts);
  }, []);

  const holdings = useMemo(() => {
    const validContracts = contracts.filter(c => c.status === "ACTIVE" && !c.deleted);
    const total = validContracts.reduce((sum, c) => sum + (c.currentValue || c.amount || 0), 0);
    
    if (total === 0) return [];
    
    return validContracts.map(c => {
      const val = c.currentValue || c.amount || 0;
      const alloc = (val / total) * 100;
      const profit = val - c.amount;
      const up = profit >= 0;
      
      return {
        id: c.id!,
        name: c.name,
        type: c.type,
        value: val,
        allocation: Math.round(alloc * 10) / 10,
        change: profit === 0 ? "0%" : `${up ? "+" : ""}${Math.round((profit / c.amount) * 100 * 10) / 10}%`,
        up,
        contract: c
      } as PortfolioHolding;
    }).sort((a, b) => b.value - a.value);
  }, [contracts]);

  const totalValue = useMemo(() => holdings.reduce((sum, h) => sum + h.value, 0), [holdings]);

  return { totalValue, holdings, performanceData };
}
