import { AsciiBox } from "@/components/ui/AsciiBox";
import { ConnectionStatus } from "@/components/ui/MatrixExtras";
import { MatrixButton } from "@/components/ui/MatrixButton";
import { useRecordListViewModel } from "@/viewmodels/useRecordListViewModel";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useMatrixDialog } from "@/contexts/MatrixDialogContext";
import { getCachedGoals } from "@/lib/googleSheetDb";
import type { Goal } from "@/models/types";
import { useLocation, useNavigate } from "react-router";

export default function RecordListPage() {
  const { t } = useTranslation();
  const { alert, confirm } = useMatrixDialog();
  const { records, totalCount, addTransaction, updateTransaction, deleteTransaction, isSubmitting } = useRecordListViewModel();
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    txType: "expense",
    wallet: "Bank Account",
    category: "Food & Dining",
    goal: "Emergency Fund",
    fromAccount: "Cash",
    toAccount: "Bank Account",
    contractType: "SAVINGS",
    interestRate: "",
    durationMonths: "",
    quantity: "",
    depreciationRate: ""
  });
  const [goals, setGoals] = useState<Goal[]>([]);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const cachedGoals = getCachedGoals();
    setGoals(cachedGoals);
    if (cachedGoals.length > 0) {
      setFormData(prev => ({ ...prev, goal: cachedGoals[0].name }));
    }
    
    // Auto-open add modal if requested
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("add") === "true") {
      setEditingRecord(null);
      setShowModal(true);
      // Clean up URL without triggering a full page reload
      navigate("/records", { replace: true });
    }
  }, [location.search, navigate]);

  const txTypes = [
    { id: "expense", label: t("records.txTypes.expense", "Chi tiêu (Expense)") },
    { id: "income", label: t("records.txTypes.income", "Thu nhập (Income)") },
    { id: "transfer", label: t("records.txTypes.transfer", "Chuyển tiền (Transfer)") },
    { id: "contract", label: "Tài sản / Hợp đồng" },
  ];

  const walletOptions = ["Cash", "BankAccount", "CreditCardDebt", "TradingGoods"];
  const expenseCategories = ["FoodDining", "Shopping", "Transportation", "Entertainment", "Utilities", "InvestmentLoss", "RealEstateMaintenance"];
  const incomeCategories = ["Salary", "OtherIncome", "Investment", "SavingsDeposit", "InitialCapital", "InvestmentIncome", "Gold", "RealEstate", "RealEstateProfit", "Vehicle", "Liabilities"];

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormData({
      ...formData,
      name: record.name,
      amount: Math.abs(record.amount).toString(),
      date: record.date.slice(0, 10),
      txType: "expense",
      wallet: record.category,
      category: record.category,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string | number) => {
    if (await confirm(t("Are you sure you want to delete this transaction?"))) {
      const result = await deleteTransaction(id);
      if (!result.success) {
        await alert(`Xóa thất bại: ${result.error || "Lỗi không xác định"}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || isSaving) return;
    
    setIsSaving(true);
    try {
      if (formData.txType === "contract") {
      const { batchUpsertContracts } = await import("@/lib/sheet-db");
      const isInstallment = formData.contractType === "INSTALLMENT";
      const isSavings = formData.contractType === "SAVINGS";
      
      const success = await batchUpsertContracts([{
        id: "ctr-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9),
        name: formData.name,
        type: formData.contractType as any,
        amount: Number(formData.amount) || 0,
        interestRate: Number(formData.interestRate) || 0,
        durationMonths: Number(formData.durationMonths) || 0,
        quantity: Number(formData.quantity) || 0,
        depreciationRate: Number(formData.depreciationRate) || 0,
        startDate: formData.date,
        nextDueDate: (isSavings || isInstallment)
          ? new Date(new Date(formData.date).setMonth(new Date(formData.date).getMonth() + (isSavings ? (Number(formData.durationMonths) || 1) : 1))).toISOString().slice(0, 10) 
          : "",
        wallet: formData.wallet,
        targetWallet: formData.toAccount,
        status: "ACTIVE",
        goalName: formData.goal || undefined
      }]);
      
      if (success) {
        let debitAccount = "Tài sản / Đầu tư";
        let creditAccount = formData.wallet;
        
        if (formData.contractType === "SAVINGS") {
          debitAccount = "Gửi tiết kiệm";
        } else if (formData.contractType === "GOLD") {
          debitAccount = "Vàng";
        } else if (formData.contractType === "REAL_ESTATE") {
          debitAccount = "Bất động sản";
        } else if (formData.contractType === "VEHICLE") {
          debitAccount = "Xe cộ";
        } else if (formData.contractType === "STOCK") {
          debitAccount = "Cổ phiếu";
        } else if (formData.contractType === "BOND") {
          debitAccount = "Trái phiếu";
        } else if (formData.contractType === "CRYPTO") {
          debitAccount = "Tài sản điện tử";
        } else if (formData.contractType === "OTHER_ASSET") {
          debitAccount = "Đầu tư khác";
        } else if (formData.contractType === "INSTALLMENT") {
          debitAccount = "Tài sản / Đầu tư";
          creditAccount = "Khoản phải trả";
        }

        await addTransaction(
          `Mua/Gửi: ${formData.name}`,
          Number(formData.amount) || 0,
          formData.date,
          debitAccount,
          creditAccount
        );

        await alert(t("records.success", "Bản ghi đã được tạo thành công!"));
        setShowModal(false);
        setFormData({ ...formData, name: "", amount: "" });
        window.location.reload();
      } else {
        await alert(t("records.error", "Có lỗi xảy ra khi tạo bản ghi."));
      }
      return;
    }
    
    if (editingRecord) {
      // Single row update
      const success = await updateTransaction(
        editingRecord.id,
        formData.name,
        formData.txType === "expense" ? -Number(formData.amount) : Number(formData.amount),
        formData.date,
        formData.category
      );
      if (success) {
        setShowModal(false);
        setEditingRecord(null);
        setFormData({ ...formData, name: "", amount: "" });
      }
      return;
    }

    let debitAccount = "";
    let creditAccount = "";

    switch (formData.txType) {
      case "expense":
        debitAccount = formData.category; // Category gets positive value
        creditAccount = formData.wallet; // Wallet loses value
        break;
      case "income":
        debitAccount = formData.wallet; // Wallet gets positive value
        creditAccount = formData.category; // Category loses value
        break;
      case "transfer":
        debitAccount = formData.toAccount; // Destination wallet gets positive value
        creditAccount = formData.fromAccount; // Source wallet loses value
        break;
      default:
        debitAccount = formData.category;
        creditAccount = formData.wallet;
    }

    const success = await addTransaction(
      formData.name,
      Number(formData.amount),
      formData.date,
      debitAccount,
      creditAccount
    );
    if (success) {
      await alert(t("records.success", "Bản ghi đã được tạo thành công!"));
      setShowModal(false);
      setFormData({ ...formData, name: "", amount: "" });
    } else {
      await alert(t("records.error", "Có lỗi xảy ra khi tạo bản ghi."));
    }
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="space-y-4 relative">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-matrix-dim">
          {t("records.recordsFound", { count: totalCount })}
        </p>
        <MatrixButton size="small" onClick={() => {
          setEditingRecord(null);
          setFormData({
            ...formData,
            name: "",
            amount: "",
            date: new Date().toISOString().slice(0, 10),
            txType: "expense",
            wallet: "Bank Account",
            category: "Food & Dining",
            goal: goals.length > 0 ? goals[0].name : "",
            fromAccount: "Cash",
            toAccount: "Bank Account",
            contractType: "SAVINGS",
            interestRate: "",
            durationMonths: "",
            quantity: "",
            depreciationRate: ""
          });
          setShowModal(true);
        }}>
          {t("records.createNew", "TẠO BẢN GHI MỚI")}
        </MatrixButton>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0D0D0D] border border-matrix-primary/50 p-6 shadow-[0_0_20px_rgba(0,255,65,0.2)]">
            <h2 className="font-mono text-matrix-primary mb-4 text-lg border-b border-matrix-primary/30 pb-2">
              {editingRecord ? t("records.editRecordTitle", "EDIT RECORD") : t("records.createRecordTitle", "CREATE RECORD")}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-sm">
              <div>
                <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.nameLabel", "Tên giao dịch (Name)")}</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.amountLabel", "Số tiền (Amount)")}</label>
                  <input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.dateLabel", "Ngày (Date)")}</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none" />
                </div>
              </div>
              
              {!editingRecord && (
                <div>
                  <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.txTypeLabel", "Loại giao dịch (Transaction Type)")}</label>
                  <select value={formData.txType} onChange={e => setFormData({...formData, txType: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none">
                    {txTypes.map(opt => <option key={opt.id} value={opt.id} className="bg-black text-matrix-primary">{opt.label}</option>)}
                  </select>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                {editingRecord ? (
                  <div className="col-span-2">
                    <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.categoryWalletLabel", "Hạng mục / Ví (Category/Wallet)")}</label>
                    <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none" />
                  </div>
                ) : formData.txType === "contract" ? (
                  <>
                    <div className="col-span-2">
                      <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.contractTypeLabel", "Loại hợp đồng / Tài sản")}</label>
                      <select value={formData.contractType} onChange={e => setFormData({...formData, contractType: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none">
                        <option value="SAVINGS" className="bg-black text-matrix-primary">{t("assetTypes.SAVINGS", "Sổ tiết kiệm")}</option>
                        <option value="INSTALLMENT" className="bg-black text-matrix-primary">{t("assetTypes.INSTALLMENT", "Trả góp")}</option>
                        <option value="REAL_ESTATE" className="bg-black text-matrix-primary">{t("assetTypes.REAL_ESTATE", "Bất động sản")}</option>
                        <option value="GOLD" className="bg-black text-matrix-primary">{t("assetTypes.GOLD", "Vàng")}</option>
                        <option value="VEHICLE" className="bg-black text-matrix-primary">{t("assetTypes.VEHICLE", "Xe cộ")}</option>
                        <option value="STOCK" className="bg-black text-matrix-primary">{t("assetTypes.STOCK", "Cổ phiếu")}</option>
                        <option value="BOND" className="bg-black text-matrix-primary">{t("assetTypes.BOND", "Trái phiếu")}</option>
                        <option value="CRYPTO" className="bg-black text-matrix-primary">{t("assetTypes.CRYPTO", "Tài sản điện tử")}</option>
                        <option value="OTHER_ASSET" className="bg-black text-matrix-primary">{t("assetTypes.OTHER_ASSET", "Đầu tư khác")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.walletLabel", "Ví tiền")}</label>
                      <select value={formData.wallet} onChange={e => setFormData({...formData, wallet: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none">
                        {walletOptions.map(opt => <option key={opt} value={opt} className="bg-black text-matrix-primary">{t(`dashboard.categories.${opt}`, opt)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.goalLabel", "Quỹ liên kết (Goal)")}</label>
                      <select value={formData.goal} onChange={e => setFormData({...formData, goal: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none">
                        <option value="" className="bg-black text-matrix-primary">{t("records.noGoal", "Không liên kết (None)")}</option>
                        {goals.map(g => <option key={g.name} value={g.name} className="bg-black text-matrix-primary">{g.name}</option>)}
                      </select>
                    </div>
                    
                    {(formData.contractType === "SAVINGS" || formData.contractType === "INSTALLMENT") && (
                      <>
                        <div>
                          <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.interestRateLabel", "Lãi suất (%/năm)")}</label>
                          <input type="number" step="0.01" value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.durationMonthsLabel", "Kỳ hạn (tháng)")}</label>
                          <input type="number" value={formData.durationMonths} onChange={e => setFormData({...formData, durationMonths: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none" />
                        </div>
                      </>
                    )}

                    {formData.contractType === "SAVINGS" && (
                      <div>
                        <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.toInterestAccountLabel", "Tài khoản nhận lãi/gốc")}</label>
                        <select value={formData.toAccount} onChange={e => setFormData({...formData, toAccount: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none">
                          {walletOptions.map(opt => <option key={opt} value={opt} className="bg-black text-matrix-primary">{t(`dashboard.categories.${opt}`, opt)}</option>)}
                        </select>
                      </div>
                    )}

                    {formData.contractType === "GOLD" && (
                      <div>
                        <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.quantityGold", "Số lượng (chỉ)")}</label>
                        <input type="number" step="0.01" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none" />
                      </div>
                    )}

                    {formData.contractType === "VEHICLE" && (
                      <div>
                        <label className="block text-matrix-dim mb-1 text-xs uppercase">Khấu hao (%/năm)</label>
                        <input type="number" step="0.01" value={formData.depreciationRate} onChange={e => setFormData({...formData, depreciationRate: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none" />
                      </div>
                    )}
                  </>
                ) : formData.txType === "transfer" ? (
                  <>
                    <div>
                      <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.fromLabel", "Từ (From)")}</label>
                      <select value={formData.fromAccount} onChange={e => setFormData({...formData, fromAccount: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none">
                        {walletOptions.map(opt => <option key={opt} value={opt} className="bg-black text-matrix-primary">{t(`dashboard.categories.${opt}`, opt)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.toLabel", "Đến (To)")}</label>
                      <select value={formData.toAccount} onChange={e => setFormData({...formData, toAccount: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none">
                        {walletOptions.map(opt => <option key={opt} value={opt} className="bg-black text-matrix-primary">{t(`dashboard.categories.${opt}`, opt)}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.walletLabel", "Ví tiền (Wallet)")}</label>
                      <select value={formData.wallet} onChange={e => setFormData({...formData, wallet: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none">
                        {walletOptions.map(opt => <option key={opt} value={opt} className="bg-black text-matrix-primary">{t(`dashboard.categories.${opt}`, opt)}</option>)}
                      </select>
                    </div>
                    {(formData.txType === "expense" || formData.txType === "income") && (
                      <div>
                        <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.categoryLabel", "Hạng mục (Category)")}</label>
                        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none">
                          {(formData.txType === "expense" ? expenseCategories : incomeCategories).map(opt => <option key={opt} value={opt} className="bg-black text-matrix-primary">{t(`dashboard.categories.${opt}`, opt)}</option>)}
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-matrix-primary/30 mt-6">
                <MatrixButton size="small" variant="ghost" type="button" onClick={() => setShowModal(false)}>
                  {t("common.cancel", "HỦY BỎ")}
                </MatrixButton>
                <MatrixButton size="small" type="submit" disabled={isSubmitting || isSaving}>
                  {(isSubmitting || isSaving) ? t("common.saving", "ĐANG LƯU...") : editingRecord ? t("common.update", "CẬP NHẬT") : t("common.create", "TẠO MỚI")}
                </MatrixButton>
              </div>
            </form>
          </div>
        </div>
      )}

      <AsciiBox title={t("records.transactionLog")}>
        <div className="overflow-x-auto">
          <div className="min-w-[1000px] space-y-0 pb-1">
            <div className="grid grid-cols-12 gap-2 font-mono text-[10px] uppercase text-matrix-dim border-b border-matrix-primary/15 pb-1.5 mb-1 items-center relative z-0">
            <span className="col-span-2 md:col-span-3 sticky left-0 self-stretch flex items-center pr-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.5)]" style={{ backgroundColor: '#050505', zIndex: 50 }}>{t("records.name")}</span>
            <span className="col-span-2">{t("records.category")}</span>
            <span className="col-span-2">{t("records.date")}</span>
            <span className="col-span-3 md:col-span-2 text-left">{t("records.amount")}</span>
            <span className="col-span-2 text-left">{t("records.status")}</span>
            <span className="col-span-1 text-right"></span>
          </div>

          {records.map((record) => (
            <div
              key={record.id}
              className="grid grid-cols-12 gap-2 font-mono text-xs py-1.5 border-b border-matrix-primary/5 last:border-0 hover:bg-matrix-primary/5 transition-colors group items-center relative z-0"
            >
              <span className="col-span-2 md:col-span-3 text-matrix-muted whitespace-normal break-words leading-tight pr-2 sticky left-0 self-stretch flex items-center transition-colors shadow-[2px_0_4px_-2px_rgba(0,0,0,0.5)]" style={{ backgroundColor: '#050505', zIndex: 50 }}>
                {record.name}
              </span>
              <span className="col-span-2 text-matrix-dim truncate pr-2">
                {t(`dashboard.categories.${record.category.replace(/ & | /g, "")}`, t(`dashboard.accounts.${record.category.replace(/ & | /g, "")}`, record.category))}
              </span>
              <span className="col-span-2 text-matrix-dim text-[11px] pr-2">
                {record.date}
              </span>
              <span
                className={cn(
                  "col-span-3 md:col-span-2 text-left pr-2",
                  record.direction === "positive" ? "text-matrix-primary" : "text-red-400"
                )}
              >
                {record.formattedAmount}
              </span>
              <span className="col-span-2 flex items-center justify-start">
                <ConnectionStatus
                  status={
                    record.direction !== "positive" 
                      ? "LOST" 
                      : record.statusVariant === "success" ? "STABLE" : "UNSTABLE"
                  }
                />
              </span>
              <span className="col-span-1 flex items-center justify-end">
                <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex gap-2 shrink-0">
                  <button onClick={() => handleEdit(record)} className="text-matrix-dim hover:text-matrix-primary transition-colors text-[10px]">EDIT</button>
                  <button onClick={() => handleDelete(record.id)} className="text-matrix-dim hover:text-red-400 transition-colors text-[10px]">DEL</button>
                </div>
              </span>
            </div>
          ))}
          </div>
        </div>
      </AsciiBox>
    </div>
  );
}
