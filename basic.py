import sys

with open('src/pages/RecordListPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update txTypes to include 'contract'
old_tx = '''  const txTypes = [
    { id: "expense", label: t("records.txTypes.expense", "Chi tiêu (Expense)") },
    { id: "income", label: t("records.txTypes.income", "Thu nhập (Income)") },
    { id: "transfer", label: t("records.txTypes.transfer", "Chuyển tiền (Transfer)") },
  ];'''

new_tx = '''  const txTypes = [
    { id: "expense", label: t("records.txTypes.expense", "Chi tiêu (Expense)") },
    { id: "income", label: t("records.txTypes.income", "Thu nhập (Income)") },
    { id: "transfer", label: t("records.txTypes.transfer", "Chuyển tiền (Transfer)") },
    { id: "contract", label: "Tài sản / Hợp đồng" },
  ];'''
content = content.replace(old_tx, new_tx)

# 2. Update incomeCategories
old_cat = 'const incomeCategories = ["Lương", "Thu nhập khác", "Đầu tư", "Gửi tiết kiệm", "Vốn ban đầu", "Lãi đầu tư"];'
new_cat = 'const incomeCategories = ["Lương", "Thu nhập khác", "Đầu tư", "Gửi tiết kiệm", "Vốn ban đầu", "Lãi đầu tư", "Vàng", "Bất động sản", "Xe cộ", "Khoản phải trả"];'
content = content.replace(old_cat, new_cat)

with open('src/pages/RecordListPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated basic stuff")
