import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AsciiBox } from "@/components/ui/AsciiBox";
import { MatrixButton } from "@/components/ui/MatrixButton";
import { BackendStatus } from "@/components/ui/VibeComponents";
import { MatrixAvatar } from "@/components/ui/MatrixExtras";
import { getCachedSettings, syncUpdateSettings, getCachedGoals, getCachedCards, getCachedPin, getCachedBudgets, getCachedAuthUser } from "@/lib/googleSheetDb";
import { getCachedAvatar } from "@/lib/sheet-db";
import type { MatrixAvatarConfig } from "@/lib/sheet-db";
import type { Goal, CustomCard, Budget } from "@/models/types";
import { useMatrixDialog } from "@/contexts/MatrixDialogContext";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [currency, setCurrency] = useState("VND");
  const [exchangeRate, setExchangeRate] = useState("26304.5");
  const [language, setLanguage] = useState(i18n.language?.substring(0, 2) || "en");
  const [isSaving, setIsSaving] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [cards, setCards] = useState<CustomCard[]>([]);
  const [cardPin, setCardPin] = useState("");
  const [avatarConfig, setAvatarConfig] = useState<MatrixAvatarConfig>({ name: "neo", label: "Normal" });
  const { alert } = useMatrixDialog();

  const authUser = getCachedAuthUser();
  const defaultAlias = authUser?.displayName?.toUpperCase() || "OPERATOR";

  useEffect(() => {
    const settings = getCachedSettings();
    if (settings) {
      if (settings.currency) setCurrency(settings.currency);
      if (settings.exchangeRate) setExchangeRate(settings.exchangeRate);
      if (settings.language) setLanguage(settings.language);
    }
    setGoals(getCachedGoals());
    setBudgets(getCachedBudgets());
    setCards(getCachedCards());
    setCardPin(getCachedPin() || "");
    setAvatarConfig(getCachedAvatar());
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await syncUpdateSettings({ 
      currency, 
      exchangeRate,
      language,
      custom_goals: JSON.stringify(goals),
      custom_budgets: JSON.stringify(budgets),
      custom_cards: JSON.stringify(cards),
      card_pin: cardPin,
      matrix_avatar: JSON.stringify(avatarConfig)
    });
    setIsSaving(false);
    if (success) {
      await i18n.changeLanguage(language);
      await alert(t("common.success", "CẬP NHẬT THÀNH CÔNG!\n\nDữ liệu của bạn đã được đồng bộ lên máy chủ an toàn. Trang web sẽ được tải lại để áp dụng cài đặt mới."));
      // Reload to apply new currency formats across the app
      window.location.reload();
    } else {
      await alert(t("common.error", "Lỗi: Không thể lưu cài đặt."));
    }
  };

  return (
    <div className="space-y-4">
      <AsciiBox title={t("pages.settings.general")}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm text-matrix-primary">{t("pages.settings.theme")}</p>
              <p className="font-mono text-xs text-matrix-dim">{t("pages.settings.themeDesc")}</p>
            </div>
            <span className="font-mono text-xs text-matrix-muted px-2 py-1 bg-matrix-primary/10">
              {t("pages.settings.dark")}
            </span>
          </div>
          <div className="border-t border-matrix-primary/10" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm text-matrix-primary">{t("pages.settings.language")}</p>
              <p className="font-mono text-xs text-matrix-dim">{t("pages.settings.languageDesc")}</p>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-matrix-bg border border-matrix-primary/20 text-matrix-primary font-mono text-xs px-2 py-1 outline-none focus:border-matrix-primary"
            >
              <option value="en">English (EN)</option>
              <option value="vi">Tiếng Việt (VI)</option>
              <option value="zh">中文 (ZH)</option>
            </select>
          </div>
          <div className="border-t border-matrix-primary/10" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm text-matrix-primary">{t("pages.settings.currency")}</p>
              <p className="font-mono text-xs text-matrix-dim">{t("pages.settings.currencyDesc")}</p>
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-matrix-bg border border-matrix-primary/20 text-matrix-primary font-mono text-xs px-2 py-1 outline-none focus:border-matrix-primary"
            >
              <option value="VND">VND (₫)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          
          {currency === "USD" && (
            <>
              <div className="border-t border-matrix-primary/10" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-matrix-primary">Tỷ giá (Exchange Rate)</p>
                  <p className="font-mono text-xs text-matrix-dim">1 USD = ... VND</p>
                </div>
                <input
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="w-32 bg-matrix-bg border border-matrix-primary/20 text-matrix-primary font-mono text-xs px-2 py-1 text-right outline-none focus:border-matrix-primary"
                />
              </div>
            </>
          )}

          <div className="pt-4 flex justify-end">
            <MatrixButton onClick={handleSave} disabled={isSaving}>
              {isSaving ? "SAVING..." : "SAVE SETTINGS"}
            </MatrixButton>
          </div>
        </div>
      </AsciiBox>

      <AsciiBox title="IDENTITY & AVATARS" subtitle="[PROCEDURAL]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm text-matrix-primary">OPERATOR ALIAS</p>
              <p className="font-mono text-xs text-matrix-dim">Tên hiển thị trên Dashboard</p>
            </div>
            <input
              type="text"
              value={avatarConfig.operatorAlias !== undefined ? avatarConfig.operatorAlias : defaultAlias}
              placeholder={defaultAlias}
              onChange={(e) => setAvatarConfig({ ...avatarConfig, operatorAlias: e.target.value.toUpperCase() })}
              className="w-48 bg-matrix-bg border border-matrix-primary/20 text-matrix-primary font-mono text-xs px-2 py-1 text-right outline-none focus:border-matrix-primary uppercase"
              maxLength={20}
            />
          </div>
          
          <div className="border-t border-matrix-primary/10 pt-2" />
          
          <div className="flex flex-wrap gap-4 items-end py-2">
            {[
              { name: "neo", label: "Normal", size: 48 },
              { name: "morpheus", label: "morpheus", size: 48 },
              { name: "trinity", label: "trinity", size: 48 },
              { name: undefined, label: "Anonymous", size: 48, isAnon: true },
              { name: "the_one", label: "The One", size: 48, isTheOne: true },
            ].map((a) => {
              const isSelected = avatarConfig.label === a.label;
              return (
                <div 
                  key={a.label} 
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${isSelected ? "opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(0,255,65,0.6)]" : "opacity-50 hover:opacity-80"}`}
                  onClick={() => setAvatarConfig({ ...avatarConfig, name: a.name, isAnon: a.isAnon, isTheOne: a.isTheOne, label: a.label })}
                >
                  <MatrixAvatar
                    name={a.name}
                    size={a.size}
                    isAnon={a.isAnon}
                    isTheOne={a.isTheOne}
                  />
                  <span className={`text-xs font-mono ${isSelected ? "text-matrix-primary font-bold" : "text-matrix-dim"}`}>{a.label}</span>
                </div>
              );
            })}
          </div>
          
          <div className="pt-4 flex justify-end border-t border-matrix-primary/10 mt-2">
            <MatrixButton onClick={handleSave} disabled={isSaving}>
              {isSaving ? "SAVING..." : "SAVE SETTINGS"}
            </MatrixButton>
          </div>
        </div>
      </AsciiBox>

      <AsciiBox title="FUNDS & GOALS">
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-2 font-mono text-[10px] uppercase text-matrix-dim border-b border-matrix-primary/15 pb-1.5 mb-2">
            <span className="col-span-4">Goal Name</span>
            <span className="col-span-3 text-right">Target</span>
            <span className="col-span-3 text-right">Need/Month</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>
          
          {goals.map((goal, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 font-mono text-xs items-center py-1">
              <input
                className="col-span-4 bg-matrix-bg border border-matrix-primary/20 text-matrix-primary px-2 py-1 outline-none focus:border-matrix-primary"
                value={goal.name}
                onChange={(e) => {
                  const newGoals = [...goals];
                  newGoals[idx].name = e.target.value;
                  setGoals(newGoals);
                }}
              />
              <input
                type="number"
                className="col-span-3 text-right bg-matrix-bg border border-matrix-primary/20 text-matrix-primary px-2 py-1 outline-none focus:border-matrix-primary"
                value={goal.target}
                onChange={(e) => {
                  const newGoals = [...goals];
                  newGoals[idx].target = Number(e.target.value);
                  setGoals(newGoals);
                }}
              />
              <input
                type="number"
                className="col-span-3 text-right bg-matrix-bg border border-matrix-primary/20 text-matrix-primary px-2 py-1 outline-none focus:border-matrix-primary"
                value={goal.need ?? ""}
                placeholder="Auto"
                onChange={(e) => {
                  const newGoals = [...goals];
                  newGoals[idx].need = e.target.value ? Number(e.target.value) : undefined;
                  setGoals(newGoals);
                }}
              />
              <div className="col-span-2 flex justify-end">
                <MatrixButton
                  size="small"
                  onClick={() => {
                    const newGoals = goals.filter((_, i) => i !== idx);
                    setGoals(newGoals);
                  }}
                >
                  DEL
                </MatrixButton>
              </div>
            </div>
          ))}
          
          <div className="pt-2">
            <MatrixButton
              size="small"
              onClick={() => {
                setGoals([...goals, { name: "New Goal", target: 1000, saved: 0, icon: "target" }]);
              }}
            >
              + ADD GOAL
            </MatrixButton>
          </div>

          <div className="pt-4 flex justify-end border-t border-matrix-primary/10">
            <MatrixButton onClick={handleSave} disabled={isSaving}>
              {isSaving ? "SAVING..." : "SAVE SETTINGS"}
            </MatrixButton>
          </div>
        </div>
      </AsciiBox>

      <AsciiBox title="BUDGET TRACKER (NGÂN SÁCH)">
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-2 font-mono text-[10px] uppercase text-matrix-dim border-b border-matrix-primary/15 pb-1.5 mb-2">
            <span className="col-span-6">Category</span>
            <span className="col-span-4 text-right">Monthly Limit</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>
          
          {budgets.map((budget, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 font-mono text-xs items-center py-1">
              <input
                className="col-span-6 bg-matrix-bg border border-matrix-primary/20 text-matrix-primary px-2 py-1 outline-none focus:border-matrix-primary"
                value={budget.category}
                onChange={(e) => {
                  const newBudgets = [...budgets];
                  newBudgets[idx].category = e.target.value;
                  setBudgets(newBudgets);
                }}
              />
              <input
                type="number"
                className="col-span-4 text-right bg-matrix-bg border border-matrix-primary/20 text-matrix-primary px-2 py-1 outline-none focus:border-matrix-primary"
                value={budget.limit}
                onChange={(e) => {
                  const newBudgets = [...budgets];
                  newBudgets[idx].limit = Number(e.target.value);
                  setBudgets(newBudgets);
                }}
              />
              <div className="col-span-2 flex justify-end">
                <MatrixButton
                  size="small"
                  onClick={() => {
                    const newBudgets = budgets.filter((_, i) => i !== idx);
                    setBudgets(newBudgets);
                  }}
                >
                  DEL
                </MatrixButton>
              </div>
            </div>
          ))}
          
          <div className="pt-2">
            <MatrixButton
              size="small"
              onClick={() => {
                setBudgets([...budgets, { category: "New Budget", spent: 0, limit: 1000 }]);
              }}
            >
              + ADD BUDGET
            </MatrixButton>
          </div>

          <div className="pt-4 flex justify-end border-t border-matrix-primary/10">
            <MatrixButton onClick={handleSave} disabled={isSaving}>
              {isSaving ? "SAVING..." : "SAVE SETTINGS"}
            </MatrixButton>
          </div>
        </div>
      </AsciiBox>

      <AsciiBox title="CARDS & WALLETS">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm text-matrix-primary">Card Protection PIN</p>
              <p className="font-mono text-xs text-matrix-dim">Require PIN to view cards on Cards page</p>
            </div>
            <input
              type="password"
              placeholder="Leave blank to disable"
              value={cardPin}
              onChange={(e) => setCardPin(e.target.value)}
              className="bg-matrix-bg border border-matrix-primary/20 text-matrix-primary font-mono text-xs px-2 py-1 outline-none focus:border-matrix-primary w-48 text-right"
            />
          </div>
          
          <div className="border-t border-matrix-primary/10" />
          
          {cards.map((card, idx) => (
            <div key={card.id} className="border border-matrix-primary/20 p-3 space-y-3 relative">
              <div className="absolute top-2 right-2">
                <MatrixButton size="small" onClick={() => setCards(cards.filter(c => c.id !== card.id))}>DEL</MatrixButton>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-matrix-dim">Card Name</label>
                  <input className="w-full bg-matrix-bg border border-matrix-primary/20 px-2 py-1 outline-none focus:border-matrix-primary text-xs"
                    value={card.name} onChange={(e) => { const nc = [...cards]; nc[idx].name = e.target.value; setCards(nc); }} />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-matrix-dim">Type</label>
                  <select className="w-full bg-matrix-bg border border-matrix-primary/20 px-2 py-1 outline-none focus:border-matrix-primary text-xs"
                    value={card.type} onChange={(e) => { const nc = [...cards]; nc[idx].type = e.target.value as any; setCards(nc); }}>
                    <option value="bank">Bank Account</option>
                    <option value="credit">Credit Card</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-matrix-dim">Bank Name</label>
                  <input className="w-full bg-matrix-bg border border-matrix-primary/20 px-2 py-1 outline-none focus:border-matrix-primary text-xs"
                    value={card.bank} onChange={(e) => { const nc = [...cards]; nc[idx].bank = e.target.value; setCards(nc); }} />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-matrix-dim">Card Number</label>
                  <input className="w-full bg-matrix-bg border border-matrix-primary/20 px-2 py-1 outline-none focus:border-matrix-primary text-xs"
                    value={card.number} onChange={(e) => { const nc = [...cards]; nc[idx].number = e.target.value; setCards(nc); }} />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-matrix-dim">Expiry</label>
                  <input className="w-full bg-matrix-bg border border-matrix-primary/20 px-2 py-1 outline-none focus:border-matrix-primary text-xs"
                    value={card.expiry} onChange={(e) => { const nc = [...cards]; nc[idx].expiry = e.target.value; setCards(nc); }} />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-matrix-dim">Network (visa, mastercard...)</label>
                  <input className="w-full bg-matrix-bg border border-matrix-primary/20 px-2 py-1 outline-none focus:border-matrix-primary text-xs"
                    value={card.network} onChange={(e) => { const nc = [...cards]; nc[idx].network = e.target.value; setCards(nc); }} />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-matrix-dim">Initial Balance (Số dư)</label>
                  <input type="number" className="w-full bg-matrix-bg border border-matrix-primary/20 px-2 py-1 outline-none focus:border-matrix-primary text-xs"
                    value={card.initialBalance} onChange={(e) => { const nc = [...cards]; nc[idx].initialBalance = Number(e.target.value); nc[idx].setupTime = Date.now(); setCards(nc); }} />
                </div>
                {card.type === "credit" && (
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] text-matrix-dim">Credit Limit</label>
                    <input type="number" className="w-full bg-matrix-bg border border-matrix-primary/20 px-2 py-1 outline-none focus:border-matrix-primary text-xs"
                      value={card.limit || 0} onChange={(e) => { const nc = [...cards]; nc[idx].limit = Number(e.target.value); setCards(nc); }} />
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="pt-2">
            <MatrixButton
              size="small"
              onClick={() => {
                setCards([...cards, { 
                  id: Date.now().toString(), type: "bank", name: "Bank Account", 
                  bank: "System Bank", number: "**** **** **** 1111", 
                  expiry: "12/30", network: "visa", initialBalance: 0, setupTime: Date.now() 
                }]);
              }}
            >
              + ADD CARD
            </MatrixButton>
          </div>

          <div className="pt-4 flex justify-end border-t border-matrix-primary/10">
            <MatrixButton onClick={handleSave} disabled={isSaving}>
              {isSaving ? "SAVING..." : "SAVE SETTINGS"}
            </MatrixButton>
          </div>
        </div>
      </AsciiBox>

      <AsciiBox title={t("pages.settings.notifications")}>
        <div className="space-y-3">
          {([
            "pages.settings.emailNotifications",
            "pages.settings.pushNotifications",
            "pages.settings.weeklyDigest",
          ] as const).map((labelKey) => (
            <div key={labelKey} className="flex items-center justify-between">
              <span className="font-mono text-sm text-matrix-muted">{t(labelKey)}</span>
              <div className="flex items-center gap-1.5">
                <BackendStatus status="active" />
                <span className="font-mono text-xs text-matrix-primary">[{t("common.on")}]</span>
              </div>
            </div>
          ))}
        </div>
      </AsciiBox>

      <AsciiBox title={t("pages.settings.dangerZone")}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm text-red-400">{t("pages.settings.deleteAccount")}</p>
              <p className="font-mono text-xs text-matrix-dim">{t("pages.settings.deleteAccountDesc")}</p>
            </div>
            <MatrixButton size="small">
              [{t("common.delete")}]
            </MatrixButton>
          </div>

          <div className="border-t border-matrix-primary/10" />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm text-red-400">Tải lại Dữ liệu Mẫu (Mock Data)</p>
              <p className="font-mono text-xs text-matrix-dim">
                Xóa bộ nhớ đệm giao dịch cục bộ và nạp lại dữ liệu thực tế mẫu. Cài đặt của bạn (PIN, Cards...) sẽ được giữ nguyên.
              </p>
            </div>
            <MatrixButton 
              size="small"
              onClick={async () => {
                if (await confirm("Bạn có chắc chắn muốn xóa dữ liệu giao dịch hiện tại và tải lại dữ liệu mẫu (mock data)?")) {
                  window.localStorage.removeItem("matrix-sheet-cache");
                  window.localStorage.removeItem("matrix-dashboard-snapshot");
                  window.location.href = "/";
                }
              }}
            >
              [RESET DATA]
            </MatrixButton>
          </div>

          <div className="border-t border-matrix-primary/10" />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm text-red-400">Đồng bộ Mock Data lên Google Sheet</p>
              <p className="font-mono text-xs text-matrix-dim">
                Đẩy trực tiếp các giao dịch mẫu thực tế lên Google Sheet của bạn. CHỈ bấm nút này sau khi bạn đã xóa trắng dữ liệu cũ trên Sheet.
              </p>
            </div>
            <MatrixButton 
              size="small"
              onClick={async () => {
                if (await confirm("Bạn có chắc chắn đã xóa trắng Sheet và muốn đẩy mock data lên Google Sheet?")) {
                  const { syncCreateTransactions } = await import("@/lib/sheet-db");
                  const { transactions } = await import("@/data/mock");
                  
                  // Format transactions for backend
                  const payload = transactions.map(t => ({
                    id: String(t.id),
                    name: t.name,
                    amount: t.amount,
                    date: t.date,
                    detail: t.category
                  }));
                  
                  const success = await syncCreateTransactions(payload);
                  if (success) {
                    alert("Đã đồng bộ thành công lên Google Sheet! Hãy tải lại trang.");
                    window.location.reload();
                  } else {
                    alert("Đồng bộ thất bại. Vui lòng kiểm tra lại Google Sheet hoặc Backend Apps Script.");
                  }
                }
              }}
            >
              [SYNC TO CLOUD]
            </MatrixButton>
          </div>
        </div>
      </AsciiBox>
    </div>
  );
}
