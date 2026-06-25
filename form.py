import sys

with open('src/pages/RecordListPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_jsx = '''                {editingRecord ? (
                  <div className="col-span-2">
                    <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.categoryWalletLabel", "Hạng mục / Ví (Category/Wallet)")}</label>
                    <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none" />
                  </div>
                ) : formData.txType === "transfer" ? ('''

new_jsx = '''                {editingRecord ? (
                  <div className="col-span-2">
                    <label className="block text-matrix-dim mb-1 text-xs uppercase">{t("records.categoryWalletLabel", "Hạng mục / Ví (Category/Wallet)")}</label>
                    <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none" />
                  </div>
                ) : formData.txType === "contract" ? (
                  <>
                    <div className="col-span-2">
                      <label className="block text-matrix-dim mb-1 text-xs uppercase">Loại hợp đồng / Tài sản</label>
                      <select value={formData.contractType} onChange={e => setFormData({...formData, contractType: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none">
                        <option value="SAVINGS">Sổ tiết kiệm</option>
                        <option value="INSTALLMENT">Trả góp</option>
                        <option value="REAL_ESTATE">Bất động sản</option>
                        <option value="GOLD">Vàng</option>
                        <option value="VEHICLE">Xe cộ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-matrix-dim mb-1 text-xs uppercase">Ví tiền</label>
                      <select value={formData.wallet} onChange={e => setFormData({...formData, wallet: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none">
                        {walletOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    
                    {(formData.contractType === "SAVINGS" || formData.contractType === "INSTALLMENT") && (
                      <>
                        <div>
                          <label className="block text-matrix-dim mb-1 text-xs uppercase">Lãi suất (%/năm)</label>
                          <input type="number" step="0.01" value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-matrix-dim mb-1 text-xs uppercase">Kỳ hạn (tháng)</label>
                          <input type="number" value={formData.durationMonths} onChange={e => setFormData({...formData, durationMonths: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none" />
                        </div>
                      </>
                    )}

                    {formData.contractType === "SAVINGS" && (
                      <div>
                        <label className="block text-matrix-dim mb-1 text-xs uppercase">Tài khoản nhận lãi/gốc</label>
                        <select value={formData.toAccount} onChange={e => setFormData({...formData, toAccount: e.target.value})} className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus:border-matrix-primary focus:outline-none">
                          {walletOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    )}

                    {formData.contractType === "GOLD" && (
                      <div>
                        <label className="block text-matrix-dim mb-1 text-xs uppercase">Số lượng</label>
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
                ) : formData.txType === "transfer" ? ('''

content = content.replace(old_jsx, new_jsx)

with open('src/pages/RecordListPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated form")
