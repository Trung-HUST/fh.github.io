const SPREADSHEET_ID = "1JpUQbyljpE5XW06HV3oxubFHKNnpwsiLCtMtH7GfeWE";
const USERS_SHEET_NAME = "Users";
const SETTINGS_SHEET_NAME = "Settings";
const CONTRACTS_SHEET_NAME = "Contracts";

// Dynamic year for transactions
function getTransactionsSheetName() {
  return new Date().getFullYear().toString();
}

const TRANSACTION_DETAILS = [
  "SAVINGS",
  "INVESTMENT",
  "Food & Dining",
  "Shopping",
  "Transportation",
  "Entertainment",
  "Utilities",
  "EMERGENCY FUND",
  "VACATION TRIP",
  "LIABILITIES",
  "HOME DOWN PAYMENT",
  "Accounts Receivable",
  "Bank Account",
  "Cash",
  "Credit Card",
  "Revenue",
  "Salary",
  "Trading Goods",
  "Investment Income",
  "Investment Loss",
];

const DEMO_USER = {
  email: "demo@email.com",
  password: "demo",
  displayName: "Demo User",
  initials: "DU",
};

function doGet(e) {
  const action = String(e?.parameter?.action || "bootstrap");

  if (action === "bootstrap") {
    return jsonResponse(setupDatabase());
  }

  if (action === "details") {
    return jsonResponse({ ok: true, data: { details: TRANSACTION_DETAILS } });
  }

  return jsonResponse({ ok: false, error: `Unsupported action: ${action}` });
}

function doPost(e) {
  const payload = parseJsonBody(e);
  const action = String(payload.action || "login");

  if (action === "login") {
    return jsonResponse(loginAndSync(payload.email, payload.password, payload.lastSyncTime));
  }

  if (action === "register") {
    return jsonResponse(registerUser(payload));
  }

  if (action === "sync") {
    return jsonResponse(syncUpdates(payload.email, payload.password, payload.lastSyncTime));
  }

  if (action === "upsertTransaction") {
    return jsonResponse(upsertTransaction(payload));
  }

  if (action === "batchUpsertTransaction") {
    return jsonResponse(batchUpsertTransaction(payload));
  }

  if (action === "deleteTransaction") {
    return jsonResponse(deleteTransaction(payload));
  }

  if (action === "batchUpsertSettings") {
    return jsonResponse(batchUpsertSettings(payload));
  }

  if (action === "batchUpsertContracts") {
    return jsonResponse(batchUpsertContracts(payload));
  }

  return jsonResponse({ ok: false, error: `Unsupported action: ${action}` });
}

function setupDatabase() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const usersSheet = ensureSheet(spreadsheet, USERS_SHEET_NAME, [
    "Email",
    "Password Hash",
    "Salt",
    "Display Name",
    "Initials",
    "Active",
    "Created At",
  ]);
  const transactionsSheet = ensureSheet(spreadsheet, getTransactionsSheetName(), [
    "ID",
    "Name of Transaction",
    "Amount",
    "Date",
    "Detail",
    "Last Modified",
    "Deleted",
    "Email",
  ]);
  const settingsSheet = ensureSheet(spreadsheet, SETTINGS_SHEET_NAME, ["Key", "Value", "Email"]);
  const contractsSheet = ensureSheet(spreadsheet, CONTRACTS_SHEET_NAME, [
    "ID", "Name", "Type", "Amount", "InterestRate", "Duration", "StartDate", "NextDueDate", "Wallet", "TargetWallet", "Status", "Deleted", "Email", "Goal", "Quantity", "CurrentValue", "DepreciationRate", "LinkedCategory"
  ]);

  seedDemoUser(usersSheet);
  seedSettings(settingsSheet);

  return {
    ok: true,
    data: {
      spreadsheetId: SPREADSHEET_ID,
      sheets: [usersSheet.getName(), transactionsSheet.getName(), settingsSheet.getName()],
      details: TRANSACTION_DETAILS,
    },
  };
}

function verifyUser(email, password, skipPassword = false) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const plainPassword = String(password || "");

  if (!normalizedEmail) {
    return { ok: false, error: "Email is required." };
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const usersSheet = ensureSheet(spreadsheet, USERS_SHEET_NAME, [
    "Email",
    "Password Hash",
    "Salt",
    "Display Name",
    "Initials",
    "Active",
    "Created At",
  ]);

  seedDemoUser(usersSheet);

  const userRow = findUser(usersSheet, normalizedEmail);
  if (!userRow) {
    return { ok: false, error: "Invalid credentials." };
  }

  if (String(userRow.active).toLowerCase() === "false") {
    return { ok: false, error: "Account is disabled." };
  }

  if (!skipPassword) {
    const verified = verifyPassword(plainPassword, userRow.salt, userRow.passwordHash);
    if (!verified) {
      return { ok: false, error: "Invalid credentials." };
    }
  }

  return { ok: true, userRow, spreadsheet };
}

function loginAndSync(email, password, lastSyncTime) {
  const auth = verifyUser(email, password);
  if (!auth.ok) return auth;

  const { userRow, spreadsheet } = auth;
  const transactionsSheet = ensureSheet(spreadsheet, getTransactionsSheetName(), [
    "ID",
    "Name of Transaction",
    "Amount",
    "Date",
    "Detail",
    "Last Modified",
    "Deleted",
    "Email",
  ]);

  const settings = readSettings(spreadsheet, userRow.email);
  const transactions = readTransactions(transactionsSheet, userRow.email);
  
  const contractsSheet = ensureSheet(spreadsheet, CONTRACTS_SHEET_NAME, [
    "ID", "Name", "Type", "Amount", "InterestRate", "Duration", "StartDate", "NextDueDate", "Wallet", "TargetWallet", "Status", "Deleted", "Email", "Goal", "Quantity", "CurrentValue", "DepreciationRate", "LinkedCategory"
  ]);
  const contracts = readContracts(contractsSheet, userRow.email);

  return {
    ok: true,
    data: {
      user: {
        email: userRow.email,
        displayName: userRow.displayName,
        initials: userRow.initials,
      },
      settings,
      transactions,
      contracts,
      details: TRANSACTION_DETAILS,
      syncTime: new Date().toISOString()
    },
  };
}

function registerUser(payload) {
  const normalizedEmail = String(payload.email || "").trim().toLowerCase();
  const plainPassword = String(payload.password || "");
  const displayName = String(payload.displayName || "New User").trim();

  if (!normalizedEmail || !plainPassword) {
    return { ok: false, error: "Email and password are required." };
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const usersSheet = ensureSheet(spreadsheet, USERS_SHEET_NAME, [
    "Email",
    "Password Hash",
    "Salt",
    "Display Name",
    "Initials",
    "Active",
    "Created At",
  ]);

  const existingUser = findUser(usersSheet, normalizedEmail);
  if (existingUser) {
    return { ok: false, error: "Email is already registered." };
  }

  const salt = Utilities.getUuid().replace(/-/g, "");
  const passwordHash = hashPassword(plainPassword, salt);
  const initials = displayName.substring(0, 2).toUpperCase();
  
  usersSheet.appendRow([
    normalizedEmail,
    passwordHash,
    salt,
    displayName,
    initials,
    false,
    new Date().toISOString(),
  ]);

  return { ok: true, pendingApproval: true };
}

function syncUpdates(email, password, lastSyncTime) {
  const auth = verifyUser(email, password, true); // skip password
  if (!auth.ok) return auth;

  const { spreadsheet, userRow } = auth;
  const transactionsSheet = spreadsheet.getSheetByName(getTransactionsSheetName());
  
  // ĐỌC THÊM SETTINGS Ở ĐÂY
  const settings = readSettings(spreadsheet, userRow.email);
  const contractsSheet = ensureSheet(spreadsheet, CONTRACTS_SHEET_NAME, [
    "ID", "Name", "Type", "Amount", "InterestRate", "Duration", "StartDate", "NextDueDate", "Wallet", "TargetWallet", "Status", "Deleted", "Email", "Goal", "Quantity", "CurrentValue", "DepreciationRate", "LinkedCategory"
  ]);
  const contracts = readContracts(contractsSheet, userRow.email);
  
  if (!transactionsSheet) {
    return { ok: true, data: { transactions: [], settings, contracts, syncTime: new Date().toISOString() } };
  }

  const allTransactions = readTransactions(transactionsSheet, userRow.email);
  const newTransactions = lastSyncTime 
    ? allTransactions.filter(t => t.lastModified && t.lastModified > lastSyncTime)
    : allTransactions;

  return {
    ok: true,
    data: {
      transactions: newTransactions,
      settings,
      contracts,
      syncTime: new Date().toISOString()
    }
  };
}

function upsertTransaction(payload) {
  const auth = verifyUser(payload.email, payload.password, true);
  if (!auth.ok) return auth;

  return batchUpsertTransaction({ ...payload, transactions: [payload.transaction] });
}

function deleteTransaction(payload) {
  const auth = verifyUser(payload.email, payload.password, true);
  if (!auth.ok) return auth;

  const spreadsheet = auth.spreadsheet;
  const transactionsSheet = ensureSheet(spreadsheet, getTransactionsSheetName(), [
    "ID",
    "Name of Transaction",
    "Amount",
    "Date",
    "Detail",
    "Last Modified",
    "Deleted",
  ]);

  const id = String(payload.id || "").trim();
  if (!id) return { ok: false, error: "Transaction ID required" };

  const rowIndex = findTransactionRowIndex(transactionsSheet, id, payload.email);
  if (rowIndex > -1) {
    const lastModified = new Date().toISOString();
    transactionsSheet.getRange(rowIndex, 6, 1, 2).setValues([[lastModified, "TRUE"]]);
    return { ok: true, data: { id, deleted: true, lastModified, syncTime: new Date().toISOString() } };
  }

  return { ok: false, error: "Transaction not found or you don't have permission" };
}

function batchUpsertTransaction(payload) {
  const auth = verifyUser(payload.email, payload.password, true);
  if (!auth.ok) return auth;

  const spreadsheet = auth.spreadsheet;
  const transactionsSheet = ensureSheet(spreadsheet, getTransactionsSheetName(), [
    "ID",
    "Name of Transaction",
    "Amount",
    "Date",
    "Detail",
    "Last Modified",
    "Deleted",
    "Email",
  ]);

  const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];
  if (transactions.length === 0) {
    return { ok: false, error: "No transactions provided." };
  }

  const rows = [];
  const added = [];

  for (const tx of transactions) {
    const id = String(tx.id || Utilities.getUuid());
    const name = String(tx.name || "").trim();
    const amount = Number(tx.amount || 0);
    const date = String(tx.date || new Date().toISOString().slice(0, 10));
    const detail = normalizeDetail(tx.detail);
    const lastModified = new Date().toISOString();
    const deleted = tx.deleted === true ? "TRUE" : "FALSE";

    if (name) {
      if (tx.id) {
        const rowIndex = findTransactionRowIndex(transactionsSheet, tx.id, payload.email);
        if (rowIndex > -1) {
           transactionsSheet.getRange(rowIndex, 1, 1, 8).setValues([[id, name, amount, date, detail, lastModified, deleted, payload.email]]);
           added.push({ id, name, amount, date, detail, lastModified, deleted: tx.deleted === true });
           continue;
        }
      }
      
      rows.push([id, name, amount, date, detail, lastModified, deleted, payload.email]);
      added.push({ id, name, amount, date, detail, lastModified, deleted: tx.deleted === true });
    }
  }

  if (rows.length > 0) {
    transactionsSheet.getRange(transactionsSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }

  return {
    ok: true,
    data: { transactions: added, syncTime: new Date().toISOString() },
  };
}

function batchUpsertSettings(payload) {
  const auth = verifyUser(payload.email, payload.password);
  if (!auth.ok) return auth;

  const spreadsheet = auth.spreadsheet;
  const settingsSheet = ensureSheet(spreadsheet, SETTINGS_SHEET_NAME, ["Key", "Value", "Email"]);

  const settings = payload.settings || {};
  const rows = settingsSheet.getDataRange().getValues();
  
  const keyMap = {};
  for (let i = 1; i < rows.length; i++) {
    const key = String(rows[i][0] || "").trim();
    const rowEmail = String(rows[i][2] || "").trim();
    if (key && rowEmail === payload.email) {
      keyMap[key] = i + 1;
    }
  }

  for (const [key, value] of Object.entries(settings)) {
    const trimmedKey = String(key).trim();
    if (!trimmedKey) continue;
    
    if (keyMap[trimmedKey]) {
      settingsSheet.getRange(keyMap[trimmedKey], 2).setValue(String(value));
    } else {
      settingsSheet.appendRow([trimmedKey, String(value), payload.email]);
      keyMap[trimmedKey] = settingsSheet.getLastRow();
    }
  }

  return {
    ok: true,
    data: { settings: readSettings(spreadsheet, payload.email) },
  };
}

function ensureSheet(spreadsheet, sheetName, headerRow) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function seedDemoUser(sheet) {
  const existing = findUser(sheet, DEMO_USER.email);
  if (existing) {
    return;
  }

  const salt = Utilities.getUuid().replace(/-/g, "");
  const passwordHash = hashPassword(DEMO_USER.password, salt);
  sheet.appendRow([
    DEMO_USER.email,
    passwordHash,
    salt,
    DEMO_USER.displayName,
    DEMO_USER.initials,
    true,
    new Date().toISOString(),
  ]);
}

function seedSettings(sheet) {
  const existing = sheet.getDataRange().getValues();
  if (existing.length > 1) {
    return;
  }

  sheet.appendRow(["theme", "Dark"]);
  sheet.appendRow(["language", "English"]);
  sheet.appendRow(["currency", "USD"]);
}

function findUser(sheet, email) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) {
    return null;
  }

  for (let index = 1; index < rows.length; index += 1) {
    const [rowEmail, passwordHash, salt, displayName, initials, active] = rows[index];
    if (String(rowEmail).trim().toLowerCase() !== email) {
      continue;
    }

    return {
      email: String(rowEmail).trim(),
      passwordHash: String(passwordHash || ""),
      salt: String(salt || ""),
      displayName: String(displayName || rowEmail).trim(),
      initials: String(initials || "").trim(),
      active,
    };
  }

  return null;
}

function readTransactions(sheet, email) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) {
    return [];
  }

  let needsUpdate = false;
  const updates = [];
  const now = new Date().toISOString();

  const results = [];
  
  rows.slice(1).forEach((row, index) => {
    let rowEmail = String(row[7] || "").trim();
    if (!rowEmail) {
      rowEmail = email; // Migration: auto-assign to current user
      row[7] = rowEmail;
      needsUpdate = true;
      updates.push({ rowIndex: index + 2, colIndex: 8, val: rowEmail });
    }
    
    if (rowEmail !== email) {
      return; // Skip if not belong to user
    }
    
    let id = String(row[0] || "").trim();
    if (!id) {
      id = Utilities.getUuid();
      row[0] = id;
      needsUpdate = true;
      updates.push({ rowIndex: index + 2, colIndex: 1, val: id });
    }
    
    let lastModified = String(row[5] || "").trim();
    if (!lastModified) {
      lastModified = now;
      row[5] = lastModified;
      needsUpdate = true;
      updates.push({ rowIndex: index + 2, colIndex: 6, val: lastModified });
    }

    results.push({
      id: id,
      name: String(row[1] || "").trim(),
      amount: Number(row[2] || 0),
      date: String(row[3] || "").trim(),
      detail: normalizeDetail(row[4]),
      lastModified: lastModified,
      deleted: String(row[6] || "").toUpperCase() === "TRUE"
    });
  });

  if (needsUpdate && updates.length > 0) {
    // Write back missing IDs & Dates safely
    updates.forEach(u => {
      sheet.getRange(u.rowIndex, u.colIndex).setValue(u.val);
    });
  }

  return results;
}

function findTransactionRowIndex(sheet, id, email) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === id) {
      const rowEmail = String(rows[i][7] || "").trim();
      if (!rowEmail || rowEmail === email) {
        return i + 1;
      }
    }
  }
  return -1;
}

function readSettings(spreadsheet, email) {
  const sheet = ensureSheet(spreadsheet, SETTINGS_SHEET_NAME, ["Key", "Value", "Email"]);
  const rows = sheet.getDataRange().getValues();
  const settings = {};

  let needsUpdate = false;
  const updates = [];

  rows.slice(1).forEach((row, index) => {
    const key = String(row[0] || "").trim();
    const value = String(row[1] || "").trim();
    let rowEmail = String(row[2] || "").trim();
    
    if (key) {
      if (!rowEmail) {
        rowEmail = email; // Migration: auto-assign
        row[2] = rowEmail;
        needsUpdate = true;
        updates.push({ rowIndex: index + 2, colIndex: 3, val: rowEmail });
      }
      
      if (rowEmail === email) {
        settings[key] = value;
      }
    }
  });

  if (needsUpdate && updates.length > 0) {
    updates.forEach(u => {
      sheet.getRange(u.rowIndex, u.colIndex).setValue(u.val);
    });
  }

  return settings;
}

function readContracts(sheet, email) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  let needsUpdate = false;
  const updates = [];
  const results = [];

  rows.slice(1).forEach((row, index) => {
    let rowEmail = String(row[12] || "").trim();
    if (!rowEmail) {
      rowEmail = email;
      row[12] = rowEmail;
      needsUpdate = true;
      updates.push({ rowIndex: index + 2, colIndex: 13, val: rowEmail });
    }
    
    if (rowEmail !== email) return;
    
    let id = String(row[0] || "").trim();
    if (!id) {
      id = Utilities.getUuid();
      row[0] = id;
      needsUpdate = true;
      updates.push({ rowIndex: index + 2, colIndex: 1, val: id });
    }

    results.push({
      id: id,
      name: String(row[1] || "").trim(),
      type: String(row[2] || "INSTALLMENT").trim(),
      amount: Number(row[3] || 0),
      interestRate: Number(row[4] || 0),
      durationMonths: Number(row[5] || 0),
      startDate: String(row[6] || "").trim(),
      nextDueDate: String(row[7] || "").trim(),
      wallet: String(row[8] || "").trim(),
      targetWallet: String(row[9] || "").trim(),
      status: String(row[10] || "ACTIVE").trim(),
      deleted: String(row[11] || "").toUpperCase() === "TRUE",
      goalName: String(row[13] || "").trim(),
      quantity: Number(row[14] || 0),
      currentValue: Number(row[15] || 0),
      depreciationRate: Number(row[16] || 0),
      linkedCategory: String(row[17] || "").trim()
    });
  });

  if (needsUpdate && updates.length > 0) {
    updates.forEach(u => {
      sheet.getRange(u.rowIndex, u.colIndex).setValue(u.val);
    });
  }
  return results;
}

function normalizeDetail(detail) {
  const value = String(detail || "").trim();
  if (!value) {
    return "SAVINGS";
  }

  const canonical = TRANSACTION_DETAILS.find((item) => item.toLowerCase() === value.toLowerCase());
  return canonical || value;
}

function hashPassword(password, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    `${salt}:${password}`,
    Utilities.Charset.UTF_8,
  );
  return Utilities.base64EncodeWebSafe(bytes);
}

function verifyPassword(password, salt, expectedHash) {
  return hashPassword(password, salt) === expectedHash;
}

function parseJsonBody(e) {
  try {
    return JSON.parse(String(e?.postData?.contents || "{}"));
  } catch (_error) {
    return {};
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
function onEdit(e) {
  // Kiểm tra xem có sự kiện chỉnh sửa không
  if (!e || !e.range) return;
  
  var sheet = e.range.getSheet();
  
  // Chỉ áp dụng cho trang tính 'dashboard-info'
  if (sheet.getName() !== "dashboard-info") return;
  
  var row = e.range.getRow();
  var col = e.range.getColumn();
  var value = e.value;
  
  // Chỉ tiếp tục nếu giá trị nhập vào là một số
  if (value === undefined || value === "" || isNaN(value)) return;
  var numValue = parseFloat(value);
  
  var targetE15 = sheet.getRange("E15");
  var currentE15 = parseFloat(targetE15.getValue()) || 0;
  
  // 1. Xử lý ngoại lệ riêng cho ô F6
  if (row === 6 && col === 6) {
    var targetE17 = sheet.getRange("E17");
    var currentE17 = parseFloat(targetE17.getValue()) || 0;
    
    targetE17.setValue(currentE17 + numValue);
    targetE15.setValue(currentE15 + numValue); // Cộng thêm vào E15
    e.range.clearContent();
    return; // Dừng lại
  }
  
  // 2. Xử lý cho khu vực từ G5 đến H12 (Cột G là 7, Cột H là 8)
  if (row >= 5 && row <= 12 && (col === 7 || col === 8)) {
    var targetE19 = sheet.getRange("E19");
    var currentE19 = parseFloat(targetE19.getValue()) || 0;
    
    targetE19.setValue(currentE19 + numValue); // Cộng vào E19
    targetE15.setValue(currentE15 - numValue); // Trừ đi ở E15
    e.range.clearContent();
    return; // Dừng lại
  }
  
  // 3. Logic chung cho các ô còn lại từ hàng 5 đến 12 (Cột E, F, I, J)
  if (row >= 5 && row <= 12) {
    var isAsset = (col === 5 || col === 6); // Cột E và F (Trừ F6 đã xử lý ở trên)
    var isLiabEq = (col === 9 || col === 10); // Cột I và J (Vì G và H đã xử lý ở trên)
    
    if (isAsset) {
      // Cộng vào E15 và xóa nội dung ô vừa nhập
      targetE15.setValue(currentE15 + numValue);
      e.range.clearContent();
    } else if (isLiabEq) {
      // Trừ đi từ E15 và xóa nội dung ô vừa nhập
      targetE15.setValue(currentE15 - numValue);
      e.range.clearContent();
    }
  }
}function batchUpsertContracts(payload) {
  const auth = verifyUser(payload.email, payload.password, true);
  if (!auth.ok) return auth;

  const spreadsheet = auth.spreadsheet;
  const contractsSheet = ensureSheet(spreadsheet, CONTRACTS_SHEET_NAME, [
    "ID", "Name", "Type", "Amount", "InterestRate", "Duration", "StartDate", "NextDueDate", 
    "Wallet", "TargetWallet", "Status", "Deleted", "Email", "Goal", "Quantity", "CurrentValue", "DepreciationRate", 
    "LinkedCategory"
  ]);

  if (!Array.isArray(payload.contracts) || payload.contracts.length === 0) {
    return { ok: false, error: "No contracts provided" };
  }

  const existingRows = contractsSheet.getDataRange().getValues();
  const rowIndexById = {};
  
  for (let i = 1; i < existingRows.length; i++) {
    const id = String(existingRows[i][0]).trim();
    const rowEmail = String(existingRows[i][12] || "").trim();
    if (id && (!rowEmail || rowEmail === payload.email)) {
      rowIndexById[id] = i + 1;
    }
  }

  const updates = [];
  const newRows = [];

  for (const c of payload.contracts) {
    if (!c.name || typeof c.amount !== "number") continue;
    const id = c.id || Utilities.getUuid();
    
    const rowData = [
      id,
      c.name,
      c.type || "INSTALLMENT",
      c.amount || 0,
      c.interestRate || 0,
      c.durationMonths || 0,
      c.startDate || new Date().toISOString().slice(0, 10),
      c.nextDueDate || "",
      c.wallet || "",
      c.targetWallet || "",
      c.status || "ACTIVE",
      c.deleted ? "TRUE" : "FALSE",
      payload.email,
      c.goalName || "",
      c.quantity || 0,
      c.currentValue || 0,
      c.depreciationRate || 0,
      c.linkedCategory || ""
    ];

    if (rowIndexById[id]) {
      updates.push({ range: contractsSheet.getRange(rowIndexById[id], 1, 1, 18), values: [rowData] });
    } else {
      newRows.push(rowData);
    }
  }

  if (updates.length > 0) {
    updates.forEach(u => u.range.setValues(u.values));
  }
  if (newRows.length > 0) {
    contractsSheet.getRange(contractsSheet.getLastRow() + 1, 1, newRows.length, 18).setValues(newRows);
  }

  return { ok: true, success: true, processedCount: payload.contracts.length };
}
