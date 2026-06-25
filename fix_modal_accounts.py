# -*- coding: utf-8 -*-
import re

with open('src/components/ui/AssetDetailsModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

mapping_logic = '''  const getCategoryMatches = (aClass: string): string[] => {
    switch(aClass) {
      case 'AccountsReceivable': return ['accounts receivable', 'kho?n ph?i thu', 'khoan phai thu'];
      case 'BankAccount': return ['bank account', 'tài kho?n ngân hàng', 'tai khoan ngan hang'];
      case 'Cash': return ['cash', 'ti?n m?t', 'tien mat'];
      case 'EWallet': return ['e-wallet', 'ví di?n t?', 'vi dien tu'];
      case 'CreditCardDebt': return ['credit card', 'th? tín d?ng', 'the tin dung'];
      case 'Liabilities': return ['liabilities', 'kho?n ph?i tr?', 'khoan phai tra'];
      default:
        return [aClass.toLowerCase()];
    }
  };

  const matches = getCategoryMatches(assetClass);
  
  const accountTransactions = assetType === 'ACCOUNT' && transactions
    ? transactions.filter(t => {
        const cat = ((t as any).category || (t as any).detail || "").toLowerCase();
        return matches.includes(cat);
      })
    : [];'''

content = re.sub(r'  const accountTransactions = assetType === \'ACCOUNT\' && transactions\s*\?\s*transactions\.filter\(t => t\.account === assetClass \|\| t\.targetAccount === assetClass\)\s*:\s*\[\];', mapping_logic, content)

tx_render_logic = '''                    accountTransactions.map((t, idx) => (
                      <div key={idx} className="border border-matrix-primary/20 p-3 bg-matrix-primary/5 hover:bg-matrix-primary/10 transition-colors flex justify-between items-start gap-3">
                        <div>
                          <p className="font-mono text-matrix-primary font-bold">{t.name || (t as any).desc}</p>
                          <p className="font-mono text-[10px] text-matrix-muted">{t.date} • {t.category || (t as any).detail}</p>
                        </div>
                        <div className={ont-mono text-sm }>
                          {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                        </div>
                      </div>
                    ))'''

content = re.sub(r'                    accountTransactions\.map\(\(t, idx\) => \([\s\S]*?                    \)\)', tx_render_logic, content)

with open('src/components/ui/AssetDetailsModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
