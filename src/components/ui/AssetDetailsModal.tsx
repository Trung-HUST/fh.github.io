import React, { useState } from "react";
import { X, Plus, Trash2, LogOut, AlertTriangle } from "lucide-react";
import { AsciiBox } from "./AsciiBox";
import { formatCurrency } from "@/models/amount";
import { useTranslation } from "react-i18next";
import type { Contract } from "@/lib/sheet-db";
import type { Transaction } from "@/models/types";
import { batchUpsertContracts, syncCreateTransactions } from "@/lib/googleSheetDb";
import { Toast } from "./Toast";

interface AssetDetailsModalProps {
  assetClass: string;
  assetType?: string;
  contracts: Contract[];
  transactions?: Transaction[];
  onClose: () => void;
  onUpdate: () => void;
  walletOptions: string[];
}

export function AssetDetailsModal({ assetClass, assetType, contracts, transactions, onClose, onUpdate, walletOptions }: AssetDetailsModalProps) {
  const { t } = useTranslation();
  
  const getCategoryMatches = (aClass: string): string[] => {
    switch(aClass) {
      case 'AccountsReceivable': return ['accounts receivable', 'khoản phải thu', 'khoan phai thu'];
      case 'BankAccount': return ['bank account', 'tài khoản ngân hàng', 'tai khoan ngan hang'];
      case 'Cash': return ['cash', 'tiền mặt', 'tien mat'];
      case 'EWallet': return ['e-wallet', 'ví điện tử', 'vi dien tu'];
      case 'CreditCardDebt': return ['credit card', 'thẻ tín dụng', 'the tin dung'];
      case 'Liabilities': return ['liabilities', 'khoản phải trả', 'khoan phai tra'];
      default:
        return [aClass.toLowerCase()];
    }
  };

  const matches = getCategoryMatches(assetClass);
  
  const accountTransactions = assetType === 'ACCOUNT' && transactions
    ? transactions.filter(t => {
        const cat = ((t as any).category || (t as any).detail || "").toLowerCase().trim();
        
        if (assetClass === 'AccountsReceivable' && (cat.startsWith('khoản phải thu') || cat.startsWith('accounts receivable') || cat.startsWith('khoan phai thu'))) {
          return true;
        }
        if (assetClass === 'Liabilities' && (cat.startsWith('khoản phải trả') || cat.startsWith('liabilities') || cat.startsWith('khoan phai tra'))) {
          return true;
        }
        
        return matches.includes(cat);
      })
    : [];

  const [activeContracts, setActiveContracts] = useState<Contract[]>(contracts.filter(c => c?.type === assetClass && c?.status === "ACTIVE" && !c?.deleted));
  const [soldContracts, setSoldContracts] = useState<Contract[]>(contracts.filter(c => c?.type === assetClass && c?.status === "COMPLETED" && !c?.deleted));
  
  const [sellingContract, setSellingContract] = useState<Contract | null>(null);
  const [sellAmount, setSellAmount] = useState<string>("");
  const [sellWallet, setSellWallet] = useState<string>(walletOptions[0] || "");
  const [sellType, setSellType] = useState<"SELL" | "LOSS">("SELL");

  const [goldRate, setGoldRate] = useState<string>("");
  const [sellGoldQuantity, setSellGoldQuantity] = useState<string>("");
  const [sellGoldValue, setSellGoldValue] = useState<string>("");
  const [isFetchingGold, setIsFetchingGold] = useState(false);

  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const refreshState = (newContracts: Contract[]) => {
    setActiveContracts(newContracts.filter(c => c?.type === assetClass && c?.status === "ACTIVE" && !c?.deleted));
    setSoldContracts(newContracts.filter(c => c?.type === assetClass && c?.status === "COMPLETED" && !c?.deleted));
    onUpdate();
  };

  const handleDelete = async (contract: Contract) => {
    if (!window.confirm(t("dashboard.confirmDeleteAsset", "Are you sure you want to delete this asset?"))) return;
    setLoading(true);
    const updated = { ...contract, deleted: true };
    await batchUpsertContracts([updated]);
    
    const newContracts = contracts.map(c => c.id === contract.id ? updated : c);
    refreshState(newContracts);
    setLoading(false);
  };

  const handleSell = async () => {
    if (!sellingContract) return;
    setLoading(true);
    
    // Create transaction
    const amount = Number(sellAmount) || 0;
    const date = new Date().toISOString().slice(0, 10);
    const isSavings = assetClass === 'SAVINGS';
    const actionName = isSavings ? "Tất toán" : "Bán";
    const outAccount = isSavings ? "Tiết kiệm" : "Tài sản / Đầu tư";

    if (sellType === "SELL" && amount > 0) {
      await syncCreateTransactions([
        { name: `${actionName}: ${sellingContract.name}`, amount: Math.abs(amount), date, detail: sellWallet },
        { name: `${actionName}: ${sellingContract.name}`, amount: -Math.abs(amount), date, detail: outAccount }
      ]);
    } else if (sellType === "LOSS") {
      const lossAmount = amount || (sellingContract.currentValue || sellingContract.amount);
      await syncCreateTransactions([
        { name: `Thất thoát: ${sellingContract.name}`, amount: Math.abs(lossAmount), date, detail: "Lỗ đầu tư" },
        { name: `Thất thoát: ${sellingContract.name}`, amount: -Math.abs(lossAmount), date, detail: outAccount }
      ]);
    }

    const updated = { ...sellingContract, status: "COMPLETED" as const };
    await batchUpsertContracts([updated]);
    
    const newContracts = contracts.map(c => c.id === sellingContract.id ? updated : c);
    refreshState(newContracts);
    
    setSellingContract(null);
    setLoading(false);
    setToastMessage({ tone: "success", text: isSavings ? "Tất toán thành công!" : "Tất toán tài sản thành công!" });
  };

  const handleFetchGoldPrice = async () => {
    setIsFetchingGold(true);
    try {
      const res = await fetch(`https://www.vang.today/api/prices`);
      const data = await res.json();
      let goldSell = 0;
      if (data && data.success && data.prices && data.prices.SJ9999) {
        const sellPricePerLuong = data.prices.SJ9999.sell;
        if (sellPricePerLuong > 0) {
          goldSell = sellPricePerLuong / 10;
        }
      }
      if (goldSell > 0) {
        setGoldRate(goldSell.toString());
      } else {
        setToastMessage({ tone: "error", text: "Không trích xuất được giá vàng 9999. Hãy nhập tay." });
      }
    } catch (e) {
      setToastMessage({ tone: "error", text: "Lỗi khi lấy giá vàng. Vui lòng thử lại hoặc nhập tay." });
    }
    setIsFetchingGold(false);
  };

  const handleUpdateGoldRate = async () => {
    const rate = Number(goldRate);
    if (!rate || rate <= 0) return;
    setLoading(true);
    const updatedContracts = activeContracts.map(c => {
      if (c.type === 'GOLD') {
        return {
          ...c,
          currentValue: (c.quantity || 0) * rate
        };
      }
      return c;
    });
    await batchUpsertContracts(updatedContracts);
    refreshState(contracts.map(c => {
      const match = updatedContracts.find(uc => uc.id === c.id);
      return match || c;
    }));
    setLoading(false);
    setToastMessage({ tone: "success", text: "Đã cập nhật giá ước tính cho Vàng!" });
  };

  const handleSellGoldLIFO = async () => {
    const qty = parseFloat(sellGoldQuantity);
    const v = parseFloat(sellGoldValue);
    if (isNaN(qty) || isNaN(v) || qty <= 0 || v <= 0) {
      setToastMessage({ tone: "error", text: "Vui lòng nhập số lượng và số tiền thu về hợp lệ." });
      return;
    }
    
    setLoading(true);
    const goldContracts = [...activeContracts].filter(c => c.type === 'GOLD')
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    let remainingToSell = qty;
    let totalCost = 0;
    const contractsToUpdate: Contract[] = [];

    for (const contract of goldContracts) {
      if (remainingToSell <= 0) break;
      const available = contract.quantity || 0;
      if (available <= 0) continue;
      
      const deduct = Math.min(available, remainingToSell);
      const costRatio = deduct / available;
      const cost = contract.amount * costRatio;
      
      totalCost += cost;
      remainingToSell -= deduct;
      
      const newQuantity = contract.quantity! - deduct;
      const newAmount = contract.amount - cost;
      const newCurrentValue = contract.currentValue ? contract.currentValue * (newQuantity / contract.quantity!) : undefined;
      
      const updated: Contract = {
        ...contract,
        quantity: newQuantity,
        amount: newAmount,
        currentValue: newCurrentValue
      };
      if (newQuantity <= 0.0001 || newAmount <= 0.01) {
        updated.status = 'COMPLETED';
      }
      contractsToUpdate.push(updated);
    }

    if (remainingToSell > 0.0001) {
      setLoading(false);
      setToastMessage({ tone: "error", text: "Không đủ số lượng vàng trong danh mục để bán!" });
      return;
    }

    const profit = v - totalCost;
    const date = new Date().toISOString().slice(0, 10);
    const txs: Partial<Transaction>[] = [];

    if (profit >= 0) {
      txs.push({ name: 'Bán Vàng (Hoàn vốn)', amount: totalCost, date, detail: sellWallet });
      txs.push({ name: 'Bán Vàng (Hoàn vốn)', amount: -totalCost, date, detail: 'Tài sản / Đầu tư' });
      if (profit > 0) {
        txs.push({ name: 'Lãi Bán Vàng', amount: profit, date, detail: sellWallet });
        txs.push({ name: 'Lãi Bán Vàng', amount: -profit, date, detail: 'Lãi đầu tư' });
      }
    } else {
      const loss = Math.abs(profit);
      txs.push({ name: 'Bán Vàng (Thu về)', amount: valueToReceive, date, detail: sellWallet });
      txs.push({ name: 'Bán Vàng (Thu về)', amount: -valueToReceive, date, detail: 'Tài sản / Đầu tư' });
      txs.push({ name: 'Lỗ Bán Vàng', amount: loss, date, detail: 'Lỗ đầu tư' });
      txs.push({ name: 'Lỗ Bán Vàng', amount: -loss, date, detail: 'Tài sản / Đầu tư' });
    }

    await syncCreateTransactions(txs);
    await batchUpsertContracts(contractsToUpdate);
    
    const newContracts = contracts.map(c => {
      const match = contractsToUpdate.find(uc => uc.id === c.id);
      return match || c;
    });
    refreshState(newContracts);
    
    setSellGoldQuantity("");
    setSellGoldValue("");
    setLoading(false);
    setToastMessage({ tone: "success", text: "Bán vàng LIFO thành công!" });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <AsciiBox title={`${t("dashboard.assets", "Tài sản")}: ${t(`dashboard.assetTypes.${assetClass.replace(/\s+/g, '').toUpperCase()}`, assetClass).toUpperCase()}`}>
          <div className="flex justify-between items-center border-b border-matrix-primary/30 pb-2 mb-2">
            <h3 className="font-mono text-matrix-primary glow-text text-lg">{t(`dashboard.assetTypes.${assetClass.replace(/\s+/g, '').toUpperCase()}`, assetClass).toUpperCase()}</h3>
            <button onClick={onClose} className="text-matrix-dim hover:text-matrix-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="overflow-y-auto pr-2 custom-scrollbar flex-1" style={{ maxHeight: "calc(90vh - 120px)" }}>
            {assetType === 'ACCOUNT' ? (
              <div className="mb-6">
                <h4 className="font-mono text-matrix-dim mb-2 uppercase text-sm border-b border-matrix-ghost/30 pb-1">{t("dashboard.recentActivity", "Lịch sử giao dịch")}</h4>
                <div className="space-y-3">
                  {accountTransactions.length === 0 ? (
                    <p className="text-matrix-dim text-sm text-center py-4 font-mono">
                      Không có giao dịch nào.
                    </p>
                  ) : (
                    accountTransactions.map((t, idx) => (
                      <div key={idx} className="border border-matrix-primary/20 p-3 bg-matrix-primary/5 hover:bg-matrix-primary/10 transition-colors flex justify-between items-start gap-3">
                        <div>
                          <p className="font-mono text-matrix-primary font-bold">{t.name || (t as any).desc}</p>
                          <p className="font-mono text-[10px] text-matrix-muted">{t.date} • {t.category || (t as any).detail}</p>
                        </div>
                        <div className={`font-mono text-sm ${t.amount > 0 ? 'text-matrix-primary' : 'text-red-400'}`}>
                          {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
            <>
            {assetClass === 'GOLD' && (
              <div className="mb-6 border border-matrix-primary/30 p-4 bg-matrix-primary/5">
                <h4 className="font-mono text-matrix-primary mb-3 uppercase text-sm border-b border-matrix-primary/30 pb-1">{t("records.goldManagement", "Quản lý & Giao dịch Vàng (LIFO)")}</h4>
                
                <div className="mb-4">
                  <p className="text-xs text-matrix-dim font-mono mb-2">{t("records.updateEstimatedRate", "1. Cập nhật tỷ giá ước tính")}</p>
                  <div className="flex gap-2 items-center flex-wrap">
                    <input 
                      type="number" 
                      placeholder={t("records.goldRatePerMace", "Tỷ giá (VND/chỉ)")}
                      value={goldRate}
                      onChange={e => setGoldRate(e.target.value)}
                      className="bg-black/50 border border-matrix-primary/50 p-2 text-sm font-mono focus:outline-none focus:border-matrix-primary text-matrix-primary w-40"
                    />
                    <button 
                      onClick={handleFetchGoldPrice} disabled={isFetchingGold}
                      className="px-3 py-2 bg-matrix-primary/10 text-matrix-primary border border-matrix-primary text-xs font-mono hover:bg-matrix-primary/30 whitespace-nowrap"
                    >
                      {isFetchingGold ? t("records.fetchingAPI", "Đang lấy...") : t("records.fetchAPIPrice", "Lấy giá API")}
                    </button>
                    <button 
                      onClick={handleUpdateGoldRate} disabled={loading || !goldRate}
                      className="px-3 py-2 bg-matrix-primary/20 text-matrix-primary border border-matrix-primary text-xs font-mono hover:bg-matrix-primary/40 whitespace-nowrap"
                    >
                      {t("records.saveRateEstimate", "Lưu tỷ giá & Ước tính")}
                    </button>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-matrix-dim font-mono mb-2">{t("records.sellGoldLifo", "2. Bán vàng (Vào sau ra trước)")}</p>
                  <div className="flex gap-2 flex-wrap items-end">
                    <div>
                      <label className="block text-[10px] text-matrix-muted uppercase mb-1">{t("records.quantityGold", "Số lượng (chỉ)")}</label>
                      <input 
                        type="number" 
                        value={sellGoldQuantity}
                        onChange={e => setSellGoldQuantity(e.target.value)}
                        className="bg-black/50 border border-matrix-primary/50 p-2 text-sm font-mono focus:outline-none focus:border-matrix-primary text-matrix-primary w-24"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-matrix-muted uppercase mb-1">{t("records.totalRevenue", "Tổng tiền thu về (VND)")}</label>
                      <input 
                        type="number" 
                        value={sellGoldValue}
                        onChange={e => setSellGoldValue(e.target.value)}
                        className="bg-black/50 border border-matrix-primary/50 p-2 text-sm font-mono focus:outline-none focus:border-matrix-primary text-matrix-primary w-36"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-matrix-muted uppercase mb-1">{t("records.receiveAccount", "Tài khoản nhận")}</label>
                      <select 
                        value={sellWallet}
                        onChange={e => setSellWallet(e.target.value)}
                        className="bg-black/50 border border-matrix-primary/50 p-2 text-sm font-mono focus:outline-none focus:border-matrix-primary text-matrix-primary w-32"
                      >
                        {walletOptions.map(w => <option key={w} value={w} className="bg-black text-matrix-primary">{t(`dashboard.accounts.${w}`, w)}</option>)}
                      </select>
                    </div>
                    <button 
                      onClick={handleSellGoldLIFO} disabled={loading || !sellGoldQuantity || !sellGoldValue}
                      className="px-4 py-2 bg-matrix-primary/20 text-matrix-primary font-bold border border-matrix-primary text-sm font-mono hover:bg-matrix-primary/40"
                    >
                      {t("records.confirmSell", "Xác nhận Bán")}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* ACTIVE ASSETS */}
            <div className="mb-6">
              <h4 className="font-mono text-matrix-dim mb-2 uppercase text-sm border-b border-matrix-ghost/30 pb-1">{t("dashboard.activeAssets", "Tài sản đang giữ")}</h4>
              <div className="space-y-3">
                {activeContracts.length === 0 ? (
                  <p className="text-matrix-dim text-sm text-center py-4 font-mono">
                    {t("dashboard.noActiveAssets", "Không có tài sản nào đang giữ.")}
                  </p>
                ) : (
                  activeContracts.map(contract => (
                    <div key={contract.id || contract.name} className="border border-matrix-primary/20 p-3 bg-matrix-primary/5 hover:bg-matrix-primary/10 transition-colors flex flex-col sm:flex-row justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-mono text-matrix-primary font-bold">{contract.name}</span>
                          <span className="font-mono text-xs text-matrix-dim">{formatCurrency(contract.currentValue || contract.amount)}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-3 mt-3 font-mono text-[10px]">
                          <div>
                            <p className="text-matrix-muted uppercase">
                              {assetClass === 'SAVINGS' ? t("contracts.depositAmount", "Số tiền gửi") : t("contracts.buyValue", "Giá mua")}
                            </p>
                            <p className="text-matrix-primary">{formatCurrency(contract.amount)}</p>
                          </div>
                          
                          {contract.startDate && (
                            <div>
                              <p className="text-matrix-muted uppercase">{assetClass === 'SAVINGS' ? t("contracts.startDate", "Ngày gửi") : t("contracts.startDate", "Thời gian mua")}</p>
                              <p className="text-matrix-primary">{new Date(contract.startDate).toLocaleDateString('vi-VN')}</p>
                            </div>
                          )}

                          {contract.quantity !== undefined ? (
                            <div>
                              <p className="text-matrix-muted uppercase">{t("records.quantityGold", "Số lượng (chỉ)")}</p>
                              <p className="text-matrix-primary">{contract.quantity} {assetClass === 'GOLD' ? 'chỉ' : ''}</p>
                            </div>
                          ) : null}

                          {assetClass === 'SAVINGS' && contract.durationMonths ? (
                            <div>
                              <p className="text-matrix-muted uppercase">{t("contracts.duration", "Thời gian")}</p>
                              <p className="text-matrix-primary">{contract.durationMonths} {t("contracts.months", "tháng")}</p>
                            </div>
                          ) : null}

                          {contract.interestRate ? (
                            <div>
                              <p className="text-matrix-muted uppercase">{t("contracts.interest", "Lãi suất")}</p>
                              <p className="text-matrix-primary">{contract.interestRate}%</p>
                            </div>
                          ) : null}

                          {assetClass === 'SAVINGS' && contract.interestRate && contract.durationMonths ? (
                            <div>
                              <p className="text-matrix-muted uppercase">{t("contracts.expectedInterest", "Lãi dự kiến")}</p>
                              <p className="text-matrix-primary">
                                +{formatCurrency(contract.amount * (contract.interestRate / 100) * (contract.durationMonths / 12))}
                              </p>
                            </div>
                          ) : null}

                          {assetClass === 'SAVINGS' && contract.nextDueDate && (
                            <div>
                              <p className="text-matrix-muted uppercase">{t("contracts.maturityDate", "Ngày đáo hạn")}</p>
                              <p className="text-matrix-primary">{new Date(contract.nextDueDate).toLocaleDateString('vi-VN')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex sm:flex-col gap-2 justify-end sm:justify-start items-center">
                        <button 
                          onClick={() => { setSellingContract(contract); setSellType("SELL"); setSellAmount(String(contract.currentValue || contract.amount)); }}
                          className="px-2 py-1 bg-matrix-primary/10 text-matrix-primary border border-matrix-primary/50 text-xs font-mono hover:bg-matrix-primary/30 flex items-center gap-1"
                        >
                          <LogOut className="w-3 h-3" /> {t("dashboard.sellAsset", "Bán")}
                        </button>
                        <button 
                          onClick={() => { setSellingContract(contract); setSellType("LOSS"); setSellAmount(String(contract.currentValue || contract.amount)); }}
                          className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/50 text-xs font-mono hover:bg-red-500/30 flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" /> {t("dashboard.lossAsset", "Thất thoát")}
                        </button>
                        <button 
                          onClick={() => handleDelete(contract)}
                          className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/50 text-xs font-mono hover:bg-red-500/30 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* SOLD ASSETS */}
            </>
            )}
            {/* SOLD ASSETS */}
            {soldContracts.length > 0 && (
              <div>
                <h4 className="font-mono text-matrix-dim mb-2 uppercase text-sm border-b border-matrix-ghost/30 pb-1">{t("dashboard.soldAssets", "Tài sản đã bán")}</h4>
                <div className="space-y-3">
                  {soldContracts.map(contract => (
                    <div key={contract.id || contract.name} className="border border-matrix-ghost/20 p-3 bg-matrix-ghost/5 opacity-70">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-matrix-dim font-bold">{contract.name}</span>
                        <span className="font-mono text-xs text-matrix-dim line-through">{formatCurrency(contract.currentValue || contract.amount)}</span>
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-matrix-muted uppercase">
                        {t("dashboard.completed", "Đã thanh lý")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AsciiBox>

        {/* Sell / Loss Prompt Modal */}
        {sellingContract && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
              <AsciiBox title={sellType === "SELL" ? t("dashboard.sellPrompt", "Xác nhận bán") : t("dashboard.lossPrompt", "Xác nhận thất thoát")}>
                <div className="space-y-4 font-mono text-sm">
                  <p className="text-matrix-primary">{sellingContract.name}</p>
                  
                  <div>
                    <label className="block text-matrix-dim mb-1 text-xs">{sellType === "SELL" ? t("dashboard.sellAmount", "Số tiền thu về") : t("dashboard.lossAmount", "Giá trị thất thoát")}</label>
                    <input 
                      type="number" 
                      value={sellAmount} 
                      onChange={e => setSellAmount(e.target.value)}
                      className="w-full bg-black border border-matrix-primary/50 text-matrix-primary px-3 py-2 outline-none focus:border-matrix-primary"
                    />
                  </div>

                  {sellType === "SELL" && (
                    <div>
                      <label className="block text-matrix-dim mb-1 text-xs">{t("dashboard.destinationWallet", "Ví nhận tiền")}</label>
                      <select 
                        value={sellWallet} 
                        onChange={e => setSellWallet(e.target.value)}
                        className="w-full bg-black border border-matrix-primary/50 text-matrix-primary px-3 py-2 outline-none focus:border-matrix-primary"
                      >
                        {walletOptions.map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end pt-2">
                    <button 
                      onClick={() => setSellingContract(null)}
                      className="px-4 py-2 border border-matrix-ghost text-matrix-dim hover:bg-matrix-ghost/10"
                    >
                      {t("common.cancel", "Hủy")}
                    </button>
                    <button 
                      onClick={handleSell}
                      disabled={loading}
                      className={loading ? "px-4 py-2 bg-matrix-primary/50 text-black font-bold" : "px-4 py-2 bg-matrix-primary text-black font-bold hover:bg-matrix-primary/80"}
                    >
                      {t("common.confirm", "Xác nhận")}
                    </button>
                  </div>
                </div>
              </AsciiBox>
            </div>
          </div>
        )}
      </div>
      {toastMessage && (
        <Toast
          tone={toastMessage.tone}
          message={toastMessage.text}
          onClose={() => setToastMessage(null)}
          durationMs={3000}
        />
      )}
    </div>
  );
}
