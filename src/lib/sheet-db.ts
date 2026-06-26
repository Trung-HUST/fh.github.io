import type { Account, ActivityItem, Budget, Goal, Transaction, CustomCard } from "@/models/types";

export const CATEGORY_MAP: Record<string, string> = {
  "Food & Dining": "Ăn uống",
  "Shopping": "Mua sắm",
  "Transportation": "Đi lại",
  "Entertainment": "Giải trí",
  "Utilities": "Hóa đơn & Tiện ích",
  "Investment Loss": "Lỗ đầu tư",
  "Salary": "Lương",
  "Revenue": "Thu nhập khác",
  "INVESTMENT": "Đầu tư",
  "SAVINGS": "Gửi tiết kiệm",
  "Capital": "Vốn ban đầu",
  "Investment Income": "Lãi đầu tư",
  "Accounts Receivable": "Khoản phải thu",
  "AccountsReceivable": "Khoản phải thu",
  "Liabilities": "Khoản phải trả",
  "Bank Account": "Tài khoản ngân hàng",
  "BankAccount": "Tài khoản ngân hàng",
  "Cash": "Tiền mặt",
  "EWallet": "Ví điện tử",
  "Credit Card": "Thẻ tín dụng",
  "CreditCardDebt": "Thẻ tín dụng",
  "Trading Goods": "Hàng hóa",
  "Real Estate Maintenance": "Bảo dưỡng BĐS",
  "Real Estate Profit": "Lợi nhuận BĐS"
};

export function mapOldCategoryToNew(category?: string): string {
  if (!category) return "";
  const normalized = category.trim();
  return CATEGORY_MAP[normalized] || normalized;
}

const DEFAULT_BUDGETS: Budget[] = [
  { category: "Food & Dining", spent: 420, limit: 600 },
  { category: "Transportation", spent: 180, limit: 300 },
  { category: "Entertainment", spent: 95, limit: 150 },
  { category: "Shopping", spent: 310, limit: 400 },
  { category: "Utilities", spent: 245, limit: 250 },
];

const DEFAULT_GOALS: Goal[] = [
  { name: "Emergency Fund", target: 10000, saved: 0, icon: "shield" },
  { name: "Vacation Trip", target: 5000, saved: 0, icon: "plane" },
  { name: "Liabilities", target: 30000, saved: 0, icon: "car" },
  { name: "Home Down Payment", target: 60000, saved: 0, icon: "home" },
];

export interface BiometricData {
  date: string;
  sleepScore?: number;
  sleepDuration?: number;
  steps?: number;
  calories?: number;
}

export interface MatrixAvatarConfig {
  name?: string;
  isAnon?: boolean;
  isTheOne?: boolean;
  label?: string;
  operatorAlias?: string;
}

export interface SheetDashboardSnapshot {
  accounts: Account[];
  activity: ActivityItem[];
  budgets: Budget[];
  goals: Goal[];
  monthlyFlow: { month: string; inflow: number; outflow: number }[];
  trendData: number[];
  biometrics: BiometricData[];
  activitySummary?: { totalIn: number; totalOut: number; net: number };
}

export interface SheetUserSession {
  email: string;
  displayName: string;
  initials: string;
  password?: string;
}

export interface SheetTransactionRow {
  id?: string | number;
  name: string;
  amount: number;
  date: string;
  detail: string;
  lastModified?: string;
  deleted?: boolean;
}

export type ContractType = "INSTALLMENT" | "SAVINGS" | "REAL_ESTATE" | "GOLD" | "VEHICLE" | "STOCK" | "BOND" | "CRYPTO" | "OTHER_ASSET";

export interface Contract {
  id?: string;
  name: string;
  type: ContractType;
  amount: number;
  interestRate: number;
  durationMonths: number;
  startDate: string;
  nextDueDate: string;
  wallet: string;
  targetWallet: string;
  status: "ACTIVE" | "COMPLETED";
  deleted?: boolean;
  quantity?: number;
  currentValue?: number;
  depreciationRate?: number;
  linkedCategory?: string;
  goalName?: string;
}

export interface SheetLoginPayload {
  user: SheetUserSession;
  transactions: Transaction[];
  contracts?: Contract[];
  settings?: Record<string, string>;
  details?: string[];
  syncTime?: string;
}

export interface SheetLoginResult {
  ok: boolean;
  data?: SheetLoginPayload;
  error?: string;
}

export function getCachedTransactions(): Transaction[] {
  try {
    const raw = window.localStorage.getItem(SHEET_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function getCachedContracts(): Contract[] {
  try {
    const raw = window.localStorage.getItem("matrix-contracts-cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function getCachedBiometrics(): BiometricData[] {
  try {
    const raw = window.localStorage.getItem("matrix-settings-cache");
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings["biometrics_data"]) {
        const parsed = JSON.parse(settings["biometrics_data"]);
        return Array.isArray(parsed) ? parsed : [];
      }
    }
  } catch(e) {}
  return [];
}

export async function syncBiometrics(newData: BiometricData[]) {
  const current = getCachedBiometrics();
  const merged = [...current];
  newData.forEach(newItem => {
    const idx = merged.findIndex(i => i.date === newItem.date);
    if (idx >= 0) merged[idx] = { ...merged[idx], ...newItem };
    else merged.push(newItem);
  });
  
  merged.sort((a,b) => b.date.localeCompare(a.date));
  if (merged.length > 100) merged.length = 100;

  try {
    let settings: Record<string, string> = {};
    const raw = window.localStorage.getItem("matrix-settings-cache");
    if (raw) settings = JSON.parse(raw);
    settings["biometrics_data"] = JSON.stringify(merged);
    return await syncUpdateSettings(settings);
  } catch(e) {
    return false;
  }
}

const AUTH_STORAGE_KEY = "matrix-auth-user";
const SHEET_STORAGE_KEY = "matrix-sheet-cache";
const DASHBOARD_STORAGE_KEY = "matrix-dashboard-snapshot";
const SETTINGS_STORAGE_KEY = "matrix-settings-cache";
const LAST_SYNC_KEY = "matrix-last-sync-time";
const DEFAULT_GOOGLE_SHEET_DB_URL =
  "https://gas-proxy.trunghere.workers.dev/";

function getSheetEndpoint() {
  if (import.meta.env.MODE === "test") {
    return "";
  }

  const endpoint = import.meta.env.VITE_GOOGLE_SHEET_DB_URL?.trim();
  return endpoint ? endpoint : DEFAULT_GOOGLE_SHEET_DB_URL;
}

function roundAmount(amount: number) {
  return Math.round(amount * 100) / 100;
}

function monthLabel(dateValue: string, fallbackIndex: number) {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][fallbackIndex % 12];
  }

  return parsed.toLocaleString("en-US", { month: "short" });
}

function sumByCategory(transactions: Transaction[], category: string) {
  const mappedCategory = mapOldCategoryToNew(category).toLowerCase().trim();
  const originalCategory = category.toLowerCase().trim();
  
  return roundAmount(
    transactions
      .filter((transaction) => {
        const rawTxCat = ((transaction as any).detail || transaction.category || "").trim();
        const txCat = rawTxCat.toLowerCase();
        const txMappedCategory = mapOldCategoryToNew(rawTxCat).toLowerCase().trim();
        
        if ((originalCategory === "accounts receivable" || originalCategory === "accountsreceivable" || originalCategory === "khoản phải thu") && 
            (txCat.startsWith("khoản phải thu") || txCat.startsWith("accounts receivable") || txCat.startsWith("accountsreceivable"))) {
          return true;
        }
        if ((originalCategory === "liabilities" || originalCategory === "khoản phải trả") && 
            (txCat.startsWith("khoản phải trả") || txCat.startsWith("liabilities"))) {
          return true;
        }

        return txCat === originalCategory || txCat === mappedCategory || txMappedCategory === originalCategory || txMappedCategory === mappedCategory;
      })
      .reduce((sum, transaction) => {
        const amt = Number(transaction.amount);
        return sum + (Number.isNaN(amt) ? 0 : amt);
      }, 0),
  );
}


function buildDashboardSnapshot(transactions: Transaction[]): SheetDashboardSnapshot {
  const validTransactions = transactions.filter(t => t != null && typeof t === "object" && !t.deleted);
    // removed unused net computation

  // Accounts calculation moved down

  const sortedTransactions = [...validTransactions].reverse().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const activity: ActivityItem[] = sortedTransactions.slice(0, 4).map((transaction) => ({
    desc: transaction.name,
    amount: transaction.amount,
    date: transaction.date,
  }));

  const baseBudgets: Budget[] = getCachedBudgets();
  const budgets: Budget[] = baseBudgets.map((budget) => {
    const mappedCat = mapOldCategoryToNew(budget.category).toLowerCase().trim();
    const originalCat = budget.category.toLowerCase().trim();
    return {
      ...budget,
      spent: validTransactions
        .filter((transaction) => {
          const txCat = ((transaction as any).detail || transaction.category || "").toLowerCase().trim();
          return txCat === originalCat || txCat === mappedCat;
        })
        .reduce((sum, transaction) => {
          const amt = Number(transaction.amount);
          return sum + (Number.isNaN(amt) ? 0 : amt);
        }, 0),
    };
  });

  const contracts: Contract[] = getCachedContracts();
  const baseGoals: Goal[] = getCachedGoals();
  const goals: Goal[] = baseGoals.map((goal) => {
    const contractSavings = Array.isArray(contracts) 
      ? contracts.filter(c => c?.goalName === goal.name && c?.status === "ACTIVE" && !c?.deleted)
          .reduce((sum, c) => sum + (c?.currentValue || c?.amount || 0), 0)
      : 0;

    return {
      ...goal,
      saved: sumByCategory(validTransactions, goal.name) + contractSavings,
    };
  });

  const accounts: Account[] = [
    {
      name: "BankAccount",
      balance: sumByCategory(validTransactions, "Bank Account"),
      currency: "VND",
      change: "+0.0%",
    },
    {
      name: "Cash",
      balance: sumByCategory(validTransactions, "Cash"),
      currency: "VND",
      change: "+0.0%",
    },
    {
      name: "AccountsReceivable",
      balance: sumByCategory(validTransactions, "Accounts Receivable"),
      currency: "VND",
      change: "+0.0%",
    },
    {
      name: "CreditCardDebt",
      balance: Math.abs(sumByCategory(validTransactions, "Credit Card") + sumByCategory(validTransactions, "Liabilities")),
      currency: "VND",
      change: "+0.0%",
    },
    {
      name: "Funds",
      balance: goals.reduce((acc, g) => acc + (g.saved || 0), 0),
      currency: "VND",
      change: "+0.0%",
    },
  ];

  const assetLiabilityNames = [
    "credit card",
    "thẻ tín dụng",
    "bank account",
    "tài khoản ngân hàng",
    "cash",
    "tiền mặt",
    "investment",
    "các quỹ",
    "accounts receivable",
    "khoản phải thu",
    "liabilities",
    "khoản phải trả",
    "capital",
    "vốn ban đầu",
    "vốn",
    ...baseGoals.map(g => g.name.toLowerCase()),
    ...(getCachedCards() || []).map(c => c.name.toLowerCase())
  ];

  const cashWallets = ["bank account", "tài khoản ngân hàng", "cash", "tiền mặt"];

  let totalIn = 0;
  let totalOut = 0;

  validTransactions.forEach((t) => {
    // Bỏ qua các giao dịch mua tài sản/gửi tiết kiệm hoặc hoàn gốc để không bị tính vào Chi phí / Thu nhập
    if (t.name.startsWith("Mua/Gửi: ") || t.name.startsWith("Hoàn gốc tiết kiệm: ")) return;
    
    const cat = ((t as any).detail || t.category || "").toLowerCase();
    if (cashWallets.includes(cat)) {
      if (t.amount > 0) {
        totalIn = roundAmount(totalIn + t.amount);
      } else if (t.amount < 0) {
        totalOut = roundAmount(totalOut + Math.abs(t.amount));
      }
    }
  });

  const monthlyGroups = new Map<string, { inflow: number; outflow: number }>();
  validTransactions.forEach((t, index) => {
    // Bỏ qua các giao dịch tài sản để không làm méo biểu đồ dòng tiền (Monthly Flow)
    if (t.name.startsWith("Mua/Gửi: ") || t.name.startsWith("Hoàn gốc tiết kiệm: ")) return;

    const cat = ((t as any).detail || t.category || "").toLowerCase();
    if (cashWallets.includes(cat)) {
      const label = monthLabel(t.date, index);
      const bucket = monthlyGroups.get(label) ?? { inflow: 0, outflow: 0 };
      if (t.amount > 0) {
        bucket.inflow = roundAmount(bucket.inflow + t.amount);
      } else if (t.amount < 0) {
        bucket.outflow = roundAmount(bucket.outflow + Math.abs(t.amount));
      }
      monthlyGroups.set(label, bucket);
    }
  });

  const monthlyFlow = Array.from(monthlyGroups.entries()).slice(-6).map(([month, value]) => ({
    month,
    inflow: value.inflow,
    outflow: value.outflow,
  }));

  const equityAccounts = ["capital", "vốn ban đầu", "vốn"];
  const netWorthNames = assetLiabilityNames.filter(a => !equityAccounts.includes(a));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const trendData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (29 - i));
    const targetTime = d.getTime();

    let dailyNetWorth = 0;
    validTransactions.forEach(t => {
      const cat = ((t as any).detail || t.category || "").toLowerCase();
      if (netWorthNames.includes(cat)) {
        const txDate = new Date(t.date);
        txDate.setHours(0, 0, 0, 0);
        if (txDate.getTime() <= targetTime) {
          dailyNetWorth += t.amount;
        }
      }
    });
    return roundAmount(dailyNetWorth);
  });

  let biometrics: BiometricData[] = [];
  try {
    const raw = window.localStorage.getItem("matrix-settings-cache");
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings["biometrics_data"]) {
        biometrics = JSON.parse(settings["biometrics_data"]);
      }
    }
  } catch(e) {}

  return {
    accounts,
    activity,
    monthlyFlow,
    budgets,
    trendData,
    goals,
    biometrics,
    activitySummary: { totalIn, totalOut, net: roundAmount(totalIn - totalOut) }
  };
}

async function fetchRemoteSession(email: string, password: string, lastSyncTime?: string): Promise<SheetLoginPayload> {
  const normalizedEmail = email.trim().toLowerCase();
  
  if (normalizedEmail.includes("demo")) {
    // Demo accounts don't sync with real backend, they just use local data
    const { transactions, budgets, goals, creditCards, biometrics } = await import("@/data/mock");
    return {
      user: { email: normalizedEmail, displayName: "Demo User", initials: "DU", password },
      transactions: transactions as Transaction[],
      settings: {
        theme: "dark",
        language: "vi",
        currency: "VND",
        custom_goals: JSON.stringify(goals),
        custom_budgets: JSON.stringify(budgets),
        biometrics_data: JSON.stringify(biometrics),
        custom_cards: JSON.stringify(creditCards)
      },
      details: [],
      syncTime: new Date().toISOString()
    };
  }

  const endpoint = getSheetEndpoint();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: lastSyncTime ? "sync" : "login", email, password, lastSyncTime }),
  });

  const loginResult = await response.json();

  if (!loginResult.ok || !loginResult.data) {
    throw new Error(loginResult.error || "Sync failed.");
  }

  return {
    user: loginResult.data.user || { email, displayName: "", initials: "" },
    transactions: Array.isArray(loginResult.data.transactions) ? loginResult.data.transactions : [],
    contracts: Array.isArray(loginResult.data.contracts) ? loginResult.data.contracts : [],
    settings: loginResult.data.settings,
    details: loginResult.data.details,
    syncTime: loginResult.data.syncTime
  };
}

export async function syncCreateTransactions(transactions: Partial<Transaction>[]) {
  const user = getCachedAuthUser();
  if (!user || user.email === "demo@system.root") return false;

  const endpoint = getSheetEndpoint();
  if (!endpoint || transactions.length === 0) return false;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: "batchUpsertTransaction", 
        email: user.email,
        password: user.password,
        transactions: transactions 
      }),
    });

    const result = await response.json();
    if (result.ok) {
      const currentUser = getCachedAuthUser();
      if (currentUser) {
        const currentTx = getCachedTransactions() || [];
        const mergedTx = [...currentTx];
        const addedTx = result.data.transactions.map((tx: any) => ({
          ...tx,
          id: tx.id || Date.now().toString()
        }));

        addedTx.forEach((tx: any) => {
          const index = mergedTx.findIndex(t => t.id === tx.id);
          if (index > -1) {
            mergedTx[index] = tx;
          } else {
            mergedTx.push(tx);
          }
        });
        
        const newPayload: SheetLoginPayload = {
          user: currentUser,
          transactions: mergedTx,
          syncTime: result.data.syncTime || window.localStorage.getItem(LAST_SYNC_KEY) || ""
        };
        persistSheetSession(newPayload);
      }
      return true;
    }
  } catch (error) {
    console.error("Failed to create transactions:", error);
  }
  return false;
}

export async function batchUpsertContracts(contracts: Partial<Contract>[]) {
  const user = getCachedAuthUser();
  if (!user) return false;
  
  if (user.email === "demo@system.root") {
    // Mock save for Demo user
    const current = getCachedContracts();
    const merged = [...current];
    contracts.forEach((c: any) => {
      const idx = merged.findIndex(i => i.id === c.id);
      if (idx > -1) merged[idx] = c;
      else {
        c.id = c.id || "demo-" + Date.now() + Math.random().toString(36).substring(2, 6);
        merged.push(c as Contract);
      }
    });
    window.localStorage.setItem("matrix-contracts-cache", JSON.stringify(merged));
    
    // Rebuild dashboard snapshot with new contracts
    const currentTransactions = getCachedTransactions() || [];
    window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(buildDashboardSnapshot(currentTransactions)));
    window.dispatchEvent(new Event("matrix-sheet-sync"));
    
    return true;
  }

  const endpoint = getSheetEndpoint();
  if (!endpoint || contracts.length === 0) return false;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: "batchUpsertContracts", 
        email: user.email,
        password: user.password,
        contracts
      }),
    });

      const result = await response.json();
      if (result.ok) {
        const current = getCachedContracts();
        const merged = [...current];
        contracts.forEach((c: any) => {
          const idx = merged.findIndex(i => i.id === c.id);
          if (idx > -1) merged[idx] = c;
          else merged.push(c as Contract);
        });
        window.localStorage.setItem("matrix-contracts-cache", JSON.stringify(merged));
        
        // Rebuild dashboard snapshot with new contracts
        const currentTransactions = getCachedTransactions() || [];
        window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(buildDashboardSnapshot(currentTransactions)));
        window.dispatchEvent(new Event("matrix-sheet-sync"));
        
        return true;
      } else {
        console.error("batchUpsertContracts failed:", result.error || result);
      }
  } catch (e) {
    console.error("Network or parse error in batchUpsertContracts:", e);
  }
  return false;
}

export async function loginWithGoogleSheet(email: string, password?: string, isLogin = false) {
  if (email === "demo@system.root") {
    // DEMO ACCOUNT: Pure local, no backend calls to protect real data
    const { transactions, budgets, goals, creditCards } = await import("@/data/mock");
    const payload: SheetLoginPayload = {
      user: { email, displayName: "Operator", initials: "OP" },
      transactions: transactions as Transaction[],
      settings: {
        theme: "dark",
        language: "vi",
        currency: "VND",
        custom_goals: JSON.stringify(goals),
        custom_budgets: JSON.stringify(budgets),
        custom_cards: JSON.stringify(creditCards)
      },
    };
    persistSheetSession(payload);
    return { ok: true };
  }
}

export async function syncDeleteTransaction(id: string | number) {
  const endpoint = getSheetEndpoint();
  if (!endpoint) return { success: false, error: "No endpoint configured" };

  const authUser = getCachedAuthUser();
  if (!authUser || !authUser.password || authUser.email.toLowerCase().includes("demo")) return { success: false, error: "Demo user cannot delete" };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "deleteTransaction",
        email: authUser.email,
        password: authUser.password,
        id: id
      })
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error("Invalid JSON response:", text);
      return { success: false, error: "Invalid response from server" };
    }

    console.log("Delete transaction response:", result);

    if (result.ok) {
      const currentTx = getCachedTransactions() || [];
      const index = currentTx.findIndex((t: any) => String(t.id) === String(id));
      if (index > -1) {
        currentTx.splice(index, 1);
        const newPayload: SheetLoginPayload = {
          user: authUser,
          transactions: currentTx,
          syncTime: result.data?.syncTime || window.localStorage.getItem(LAST_SYNC_KEY) || ""
        };
        persistSheetSession(newPayload);
      } else {
        console.warn("Deleted from server but not found in local cache:", id);
      }
      return { success: true };
    } else {
      console.error("Server returned error:", result.error);
      return { success: false, error: result.error || "Unknown server error" };
    }
  } catch (error: any) {
    console.error("Failed to delete transaction:", error);
    return { success: false, error: error.message || "Network error" };
  }
}

export async function syncUpdateSettings(settings: Record<string, string>) {
  const user = getCachedAuthUser();
  if (!user || user.email === "demo@system.root") {
    // If demo, just update local settings
    if (user && user.email === "demo@system.root") {
      const current = getCachedSettings() || {};
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...current, ...settings }));
      return true;
    }
    return false;
  }

  const endpoint = getSheetEndpoint();
  if (!endpoint) return false;

  const authUser = getCachedAuthUser();
  if (!authUser || !authUser.password || authUser.email.toLowerCase().includes("demo")) return false;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: "batchUpsertSettings", 
        email: authUser.email,
        password: authUser.password,
        settings 
      }),
    });

    const result = await response.json();
    if (result.ok && result.data?.settings) {
      const currentUser = getCachedAuthUser();
      const currentTx = getCachedTransactions() || [];
      if (currentUser) {
        const newPayload: SheetLoginPayload = {
          user: currentUser,
          transactions: currentTx,
          settings: result.data.settings
        };
        persistSheetSession(newPayload);
      }
      return true;
    }
  } catch (error) {
    console.error("Failed to update settings:", error);
  }
  return false;
}


export async function authenticateAndSync(email: string, password: string): Promise<SheetLoginPayload> {
  const normalizedEmail = email.trim().toLowerCase();
  
  if (import.meta.env.MODE !== "test") {
    try {
      const lastSyncTime = window.localStorage.getItem(LAST_SYNC_KEY) || undefined;
      const result = await fetchRemoteSession(normalizedEmail, password, lastSyncTime);
      
      // Merge with cache if we did a delta sync
      if (lastSyncTime && result.transactions) {
        const cached = getCachedTransactions() || [];
        const merged = [...cached];
        result.transactions.forEach(tx => {
          const idx = merged.findIndex(c => c.id === tx.id);
          if (idx >= 0) {
            merged[idx] = tx;
          } else {
            merged.push(tx);
          }
        });
        result.transactions = merged;
      }

      return {
        user: { ...(result.user || { email, displayName: "", initials: "" }), password },
        transactions: (Array.isArray(result.transactions) ? result.transactions : []).filter(t => t != null && typeof t === "object"),
        contracts: result.contracts,
        settings: result.settings,
        details: result.details,
        syncTime: result.syncTime
      };
    } catch (error) {
      // Surface the actual connection/Apps Script error to the user!
      throw error;
    }
  }

  throw new Error("Invalid credentials.");
}

export async function registerRemoteUser(email: string, password: string, displayName: string): Promise<SheetLoginPayload> {
  const normalizedEmail = email.trim().toLowerCase();
  
  if (import.meta.env.MODE !== "test") {
    const endpoint = getSheetEndpoint();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "register", email: normalizedEmail, password, displayName }),
    });

    const loginResult = await response.json();

    if (loginResult.pendingApproval) {
      throw new Error("registration_pending_approval");
    }

    if (!loginResult.ok || !loginResult.data) {
      throw new Error(loginResult.error || "Registration failed.");
    }

    return {
      user: { ...(loginResult.data.user || { email, displayName, initials: displayName.substring(0, 2).toUpperCase() }), password },
      transactions: Array.isArray(loginResult.data.transactions) ? loginResult.data.transactions : [],
      contracts: Array.isArray(loginResult.data.contracts) ? loginResult.data.contracts : [],
      settings: loginResult.data.settings,
      details: loginResult.data.details,
      syncTime: loginResult.data.syncTime
    };
  }

  throw new Error("Cannot register in test mode.");
}

export function persistSheetSession(payload: SheetLoginPayload) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload.user));
  if (payload.transactions) {
    const mappedTransactions = payload.transactions.map(t => {
      const rawCat = (t as any).category || t.detail || "";
      const mappedCat = mapOldCategoryToNew(rawCat);
      return {
        ...t,
        category: mappedCat,
        detail: mappedCat
      };
    });
    window.localStorage.setItem(SHEET_STORAGE_KEY, JSON.stringify(mappedTransactions));
  }
  
  // MUST save settings FIRST so that buildDashboardSnapshot can read the custom budgets & goals
  if (payload.settings) {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload.settings));
  }
  if (payload.contracts) {
    window.localStorage.setItem("matrix-contracts-cache", JSON.stringify(payload.contracts));
  }
  if (payload.syncTime) {
    window.localStorage.setItem(LAST_SYNC_KEY, payload.syncTime);
  }
  window.dispatchEvent(new Event("matrix-sheet-sync"));

  // Build and save snapshot using the newly persisted settings
  const currentTransactions = getCachedTransactions();
  window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(buildDashboardSnapshot(currentTransactions || [])));
}

export function clearSheetSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(SHEET_STORAGE_KEY);
  window.localStorage.removeItem(DASHBOARD_STORAGE_KEY);
  window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
  window.localStorage.removeItem(LAST_SYNC_KEY);
}

export function getCachedAuthUser(): SheetUserSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SheetUserSession) : null;
  } catch (_error) {
    return null;
  }
}

export function getCachedDashboardSnapshot(): SheetDashboardSnapshot | null {
  try {
    const raw = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SheetDashboardSnapshot) : null;
  } catch (_error) {
    return null;
  }
}

export function getCachedSettings(): Record<string, string> | null {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function safeParseJSON(str: string | undefined): any {
  if (!str) return null;
  try {
    let cleaned = str
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "");
      
    // Fix trailing commas in arrays and objects
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
    
    let parsed = JSON.parse(cleaned);
    
    // Handle double-stringified JSON
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    
    return parsed;
  } catch (e) {
    console.error("Failed to parse JSON safely:", e);
    return null;
  }
}

export function getCachedGoals(): Goal[] {
  const settings = getCachedSettings();
  
  // Try custom_goals first
  if (settings?.custom_goals) {
    const parsed = safeParseJSON(settings.custom_goals);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  }
  
  // Fallback to legacy goals_json
  if (settings?.goals_json) {
    const parsed = safeParseJSON(settings.goals_json);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  }
  
  // Backward compatibility
  if (settings) {
    let hasOldSettings = false;
    const fallbackGoals = DEFAULT_GOALS.map(goal => {
      const target = settings[`goal-${goal.name}`];
      if (target) hasOldSettings = true;
      return { ...goal, target: target ? Number(target) : goal.target };
    });
    if (hasOldSettings) return fallbackGoals;
  }

  return DEFAULT_GOALS;
}

export function getCachedBudgets(): Budget[] {
  const settings = getCachedSettings();
  
  // Try custom_budgets first
  if (settings?.custom_budgets) {
    const parsed = safeParseJSON(settings.custom_budgets);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  }
  
  // Fallback to legacy budgets_json
  if (settings?.budgets_json) {
    const parsed = safeParseJSON(settings.budgets_json);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  }

  // Backward compatibility
  if (settings) {
    let hasOldSettings = false;
    const fallbackBudgets = DEFAULT_BUDGETS.map(budget => {
      const limit = settings[`budget-${budget.category}`];
      if (limit) hasOldSettings = true;
      return { ...budget, limit: limit ? Number(limit) : budget.limit };
    });
    if (hasOldSettings) return fallbackBudgets;
  }

  return DEFAULT_BUDGETS;
}

export function getCachedCards(): CustomCard[] {
  const settings = getCachedSettings();
  
  if (settings?.custom_cards) {
    const parsed = safeParseJSON(settings.custom_cards);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  }
  return [];
}

export function getCachedPin(): string | null {
  const settings = getCachedSettings();
  if (settings && settings.card_pin) {
    return settings.card_pin;
  }
  return null;
}

export function getCachedTimeline(): any[] | null {
  const settings = getCachedSettings();
  if (settings && settings.life_ai_timeline) {
    const parsed = safeParseJSON(settings.life_ai_timeline);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  }
  return null;
}

export async function syncTimeline(timeline: any[]) {
  try {
    const settings = getCachedSettings() || {};
    settings.life_ai_timeline = JSON.stringify(timeline);
    return await syncUpdateSettings(settings);
  } catch (error) {
    console.error("Failed to sync timeline:", error);
    return false;
  }
}

export type HeatmapRecords = Record<string, Record<number, number>>;

export function getCachedHeatmapData(): HeatmapRecords {
  const settings = getCachedSettings();
  if (settings && settings.life_ai_heatmap) {
    const parsed = safeParseJSON(settings.life_ai_heatmap);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  }
  return {};
}

export async function syncHeatmapData(heatmapData: HeatmapRecords) {
  try {
    const settings = getCachedSettings() || {};
    settings.life_ai_heatmap = JSON.stringify(heatmapData);
    return await syncUpdateSettings(settings);
  } catch (error) {
    console.error("Failed to sync heatmap data:", error);
    return false;
  }
}

export function getCachedActivities(): Record<string, number> {
  const settings = getCachedSettings();
  if (settings && settings.life_ai_activities) {
    const parsed = safeParseJSON(settings.life_ai_activities);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  }
  return {};
}

export async function syncActivities(activities: Record<string, number>) {
  try {
    const settings = getCachedSettings() || {};
    settings.life_ai_activities = JSON.stringify(activities);
    return await syncUpdateSettings(settings);
  } catch (error) {
    console.error("Failed to sync activities:", error);
    return false;
  }
}

export function getCachedUsage24h(): number[] {
  const settings = getCachedSettings();
  if (settings && settings.life_ai_usage_24h) {
    const parsed = safeParseJSON(settings.life_ai_usage_24h);
    if (Array.isArray(parsed) && parsed.length === 24) {
      return parsed;
    }
  }
  return Array(24).fill(0);
}

export async function syncUsage24h(usage: number[]) {
  try {
    const settings = getCachedSettings() || {};
    settings.life_ai_usage_24h = JSON.stringify(usage);
    return await syncUpdateSettings(settings);
  } catch (error) {
    console.error("Failed to sync usage 24h:", error);
    return false;
  }
}

export function getCachedAvatar(): MatrixAvatarConfig {
  const settings = getCachedSettings();
  if (settings && settings.matrix_avatar) {
    try {
      const parsed = JSON.parse(settings.matrix_avatar);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch (e) {}
  }
  return { name: "OPERATOR", label: "Default", operatorAlias: "OPERATOR" };
}

export async function evaluateContracts(): Promise<boolean> {
  const contracts = getCachedContracts();
  const today = new Date().toISOString().slice(0, 10);
  let processed = false;

  for (const contract of contracts) {
    if (contract.status === "ACTIVE" && contract.nextDueDate && contract.nextDueDate <= today) {
      let txs = [];
      let success = false;
      
      if (contract.type === "INSTALLMENT") {
        const monthlyPayment = Math.abs(contract.amount / (contract.durationMonths || 1));
        txs = [
          { name: `Trả góp: ${contract.name}`, amount: monthlyPayment, date: today, detail: "Khoản phải trả" },
          { name: `Trả góp: ${contract.name}`, amount: -monthlyPayment, date: today, detail: contract.wallet || contract.targetWallet }
        ];
        success = await syncCreateTransactions(txs);
        if (success) {
          processed = true;
          const d = new Date(contract.nextDueDate);
          d.setMonth(d.getMonth() + 1);
          contract.nextDueDate = d.toISOString().slice(0, 10);
          contract.amount = Math.max(0, contract.amount - monthlyPayment);
          contract.durationMonths = Math.max(0, contract.durationMonths - 1);
          if (contract.durationMonths === 0 || contract.amount === 0) {
            contract.status = "COMPLETED";
          }
        }
      } else if (contract.type === "SAVINGS") {
        // Lãi nhận một lần khi đáo hạn
        const totalInterest = Math.abs((contract.amount * contract.interestRate * (contract.durationMonths || 1)) / 100 / 12);
        txs = [
          { name: `Lãi tiết kiệm: ${contract.name}`, amount: totalInterest, date: today, detail: contract.targetWallet || contract.wallet },
          { name: `Lãi tiết kiệm: ${contract.name}`, amount: -totalInterest, date: today, detail: "Lãi đầu tư" },
          // Hoàn gốc (Return principal to wallet)
          { name: `Hoàn gốc tiết kiệm: ${contract.name}`, amount: contract.amount, date: today, detail: contract.targetWallet || contract.wallet },
          { name: `Hoàn gốc tiết kiệm: ${contract.name}`, amount: -contract.amount, date: today, detail: "Gửi tiết kiệm" }
        ];
        success = await syncCreateTransactions(txs);
        if (success) {
          processed = true;
          contract.status = "COMPLETED";
        }
      }
    }
  }

  if (processed) {
    await batchUpsertContracts(contracts);
    return true;
  }

  return false;
}
