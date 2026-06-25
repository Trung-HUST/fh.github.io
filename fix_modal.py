import re
f = open('src/components/ui/AssetDetailsModal.tsx', 'r', encoding='utf-8')
content = f.read()
f.close()

new_imports = '''import { formatCurrency } from '@/models/amount';
import type { Transaction } from '@/models/types';'''
content = content.replace('import { formatCurrency } from '@/models/amount';', new_imports)

props_block = '''interface AssetDetailsModalProps {
  assetClass: string;
  assetType?: string;
  contracts: Contract[];
  transactions?: Transaction[];
  onClose: () => void;
  onUpdate: () => void;
  walletOptions: string[];
}'''
content = re.sub(r'interface AssetDetailsModalProps \{[^\}]+\}', props_block, content)

content = content.replace('export function AssetDetailsModal({ assetClass, contracts, onClose, onUpdate, walletOptions }: AssetDetailsModalProps) {', 'export function AssetDetailsModal({ assetClass, assetType, contracts, transactions, onClose, onUpdate, walletOptions }: AssetDetailsModalProps) {')

account_tx_logic = '''  const accountTransactions = assetType === 'ACCOUNT' && transactions
    ? transactions.filter(t => t.account === assetClass || t.targetAccount === assetClass)
    : [];

  const [activeContracts,'''
content = content.replace('  const [activeContracts,', account_tx_logic)

render_logic = '''<div className="overflow-y-auto pr-2 custom-scrollbar flex-1" style={{ maxHeight: "calc(90vh - 120px)" }}>
            {assetType === 'ACCOUNT' ? (
              <div className="mb-6">
                <h4 className="font-mono text-matrix-dim mb-2 uppercase text-sm border-b border-matrix-ghost/30 pb-1">{t("dashboard.recentActivity", "L?ch s? giao d?ch")}</h4>
                <div className="space-y-3">
                  {accountTransactions.length === 0 ? (
                    <p className="text-matrix-dim text-sm text-center py-4 font-mono">
                      Không có giao d?ch nào.
                    </p>
                  ) : (
                    accountTransactions.map((t, idx) => (
                      <div key={idx} className="border border-matrix-primary/20 p-3 bg-matrix-primary/5 hover:bg-matrix-primary/10 transition-colors flex justify-between items-start gap-3">
                        <div>
                          <p className="font-mono text-matrix-primary font-bold">{t.desc || t.name}</p>
                          <p className="font-mono text-[10px] text-matrix-muted">{t.date} • {t.account} {t.targetAccount ? ->  : ''}</p>
                        </div>
                        <div className={ont-mono text-sm }>
                          {t.targetAccount === assetClass || (t.account !== assetClass && t.amount > 0) ? '+' : '-'}{formatCurrency(t.amount)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
            <>
            {/* ACTIVE ASSETS */}'''
content = content.replace('<div className="overflow-y-auto pr-2 custom-scrollbar flex-1" style={{ maxHeight: "calc(90vh - 120px)" }}>
            
            {/* ACTIVE ASSETS */}', render_logic)

content = content.replace('            {/* SOLD ASSETS */}', '            </>
            )
            }
            {/* SOLD ASSETS */}', 1)

f = open('src/components/ui/AssetDetailsModal.tsx', 'w', encoding='utf-8')
f.write(content)
f.close()
