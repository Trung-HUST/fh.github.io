import re

with open('src/pages/RecordListPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update categories
old_categories = 'const incomeCategories = ["Lương", "Thu nhập khác", "Đầu tư", "Gửi tiết kiệm", "Vốn ban đầu", "Lãi đầu tư"];'
new_categories = 'const incomeCategories = ["Lương", "Thu nhập khác", "Đầu tư", "Gửi tiết kiệm", "Vốn ban đầu", "Lãi đầu tư", "Vàng", "Bất động sản", "Xe cộ", "Khoản phải trả"];'
content = content.replace(old_categories, new_categories)

# 2. Update addTransaction
old_block = '''
      if (success) {
        // Create an expense transaction to deduct cash
        await addTransaction(
          \Mua/Gửi: \,
          Number(formData.amount) || 0,
          formData.date,
          "Tài sản / Đầu tư", // category
          formData.wallet      // from wallet
        );

        await alert(t("records.success", "Bản ghi đã được tạo thành công!"));
'''

new_block = '''
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
          \Mua/Gửi: \,
          Number(formData.amount) || 0,
          formData.date,
          debitAccount,
          creditAccount
        );

        await alert(t("records.success", "Bản ghi đã được tạo thành công!"));
'''

if old_block.strip() in content:
    content = content.replace(old_block.strip(), new_block.strip())
else:
    print("Could not find old block")

with open('src/pages/RecordListPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
