import sys

with open('src/pages/RecordListPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_submit = '''  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;
    
    if (editingRecord) {'''

new_submit = '''  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;
    
    if (formData.txType === "contract") {
      const { batchUpsertContracts } = await import("@/lib/sheet-db");
      const isInstallment = formData.contractType === "INSTALLMENT";
      const isSavings = formData.contractType === "SAVINGS";
      
      const success = await batchUpsertContracts([{
        name: formData.name,
        type: formData.contractType as any,
        amount: Number(formData.amount) || 0,
        interestRate: Number(formData.interestRate) || 0,
        durationMonths: Number(formData.durationMonths) || 0,
        quantity: Number(formData.quantity) || 0,
        depreciationRate: Number(formData.depreciationRate) || 0,
        startDate: formData.date,
        nextDueDate: (isSavings || isInstallment)
          ? new Date(new Date(formData.date).setMonth(new Date(formData.date).getMonth() + 1)).toISOString().slice(0, 10) 
          : "",
        wallet: formData.wallet,
        targetWallet: formData.toAccount,
        status: "ACTIVE"
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
        } else if (formData.contractType === "INSTALLMENT") {
          debitAccount = "Tài sản / Đầu tư";
          creditAccount = "Khoản phải trả";
        }

        await addTransaction(
          Mua/Gửi: ,
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
    
    if (editingRecord) {'''

content = content.replace(old_submit, new_submit)

with open('src/pages/RecordListPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated handleSubmit")
