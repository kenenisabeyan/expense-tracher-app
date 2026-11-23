/**
 * SMART EXPENSE TRACKER ENTERPRISE - COMMERCIAL SUITE
 * Cryptographic PIN (SHA-256), Split Transactions, Virtual Pagination, Bank CSV Import,
 * Travel Currency Converter, Custom Categories, OLED Black Theme & Undo Actions
 */

// --- CONFIGURATION & CATEGORY DEFINITIONS ---
const DEFAULT_CATEGORIES = {
  expense: [
    { id: "Food & Drinks", label: "Food & Dining", icon: "🍔" },
    { id: "Transportation", label: "Transportation", icon: "🚗" },
    { id: "Shopping", label: "Shopping", icon: "🛍️" },
    { id: "Housing & Bills", label: "Housing & Utilities", icon: "🏠" },
    { id: "Entertainment", label: "Entertainment", icon: "🎬" },
    { id: "Healthcare", label: "Health & Medical", icon: "💊" },
    { id: "Education", label: "Education & Learning", icon: "📚" },
    { id: "Personal Care", label: "Personal Care", icon: "💈" },
    { id: "Other Expense", label: "Other Expense", icon: "📦" }
  ],
  income: [
    { id: "Salary", label: "Salary / Wages", icon: "💼" },
    { id: "Freelance", label: "Freelance / Projects", icon: "💻" },
    { id: "Business", label: "Business Profits", icon: "🏢" },
    { id: "Investments", label: "Investments / Dividends", icon: "📈" },
    { id: "Gifts", label: "Gifts / Grants", icon: "🎁" },
    { id: "Other Income", label: "Other Income", icon: "💵" }
  ]
};

let customCategories = JSON.parse(localStorage.getItem("expense_custom_categories")) || DEFAULT_CATEGORIES;

const DEFAULT_ACCOUNTS = [
  { id: "checking", name: "Main Checking", type: "checking", balance: 3450.00, icon: "💳" },
  { id: "savings", name: "High-Yield Savings", type: "savings", balance: 12800.00, icon: "🏦" },
  { id: "credit", name: "Credit Card", type: "credit", balance: -450.00, icon: "💳" },
  { id: "cash", name: "Cash Wallet", type: "cash", balance: 120.00, icon: "💵" }
];

const DEFAULT_BUDGETS = {
  "Food & Drinks": 300,
  "Transportation": 120,
  "Shopping": 150,
  "Housing & Bills": 500,
  "Entertainment": 80
};

const DEFAULT_GOALS = [
  { id: 1, name: "Emergency Buffer", target: 5000, saved: 2400, date: "2026-12-31" },
  { id: 2, name: "Holiday Travel", target: 1200, saved: 650, date: "2026-12-15" }
];

const DEFAULT_SUBS = [
  { id: 1, name: "Netflix Subscription", amount: 15.99, frequency: "monthly", category: "Entertainment", nextDate: "2026-12-05" },
  { id: 2, name: "Gym Membership", amount: 45.00, frequency: "monthly", category: "Healthcare", nextDate: "2026-12-01" }
];

// --- WEB AUDIO API SYNTHESIZER ---
class SoundEffects {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }
  play(type) {
    if (localStorage.getItem("expense_audio") === "false") return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, t);
        osc.frequency.setValueAtTime(659.25, t + 0.08);
        osc.frequency.setValueAtTime(783.99, t + 0.16);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.start(t);
        osc.stop(t + 0.35);
      } else if (type === "click") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, t);
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.start(t);
        osc.stop(t + 0.04);
      } else if (type === "delete") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(380, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.15);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t);
        osc.stop(t + 0.18);
      } else if (type === "error") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(140, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
      }
    } catch (_) {}
  }
}
const sfx = new SoundEffects();

// --- CRYPTOGRAPHIC SHA-256 PIN HELPER ---
const PIN_SALT = "AGY_SEC_FIN_2026_";
async function hashPin(pinString) {
  const enc = new TextEncoder().encode(PIN_SALT + pinString);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// --- APPLICATION STATE ---
let activeView = "dashboard";
let currentType = "expense";
let editingId = null;
let currentCurrency = localStorage.getItem("expense_currency") || "$";
let currentThemeSetting = localStorage.getItem("expense_theme_mode") || "light";

let accounts = JSON.parse(localStorage.getItem("expense_accounts")) || DEFAULT_ACCOUNTS;
let budgets = JSON.parse(localStorage.getItem("expense_budgets")) || DEFAULT_BUDGETS;
let savingsGoals = JSON.parse(localStorage.getItem("expense_goals")) || DEFAULT_GOALS;
let subscriptions = JSON.parse(localStorage.getItem("expense_subs")) || DEFAULT_SUBS;

let activeChartTab = "category";
let activeDatePreset = "all";
let activeTagFilter = "all";
let selectedTransactionIds = new Set();
let pendingImportData = null;
let currentReceiptBase64 = null;
let parsedCsvRecords = [];

// Pagination State
let currentPage = 1;
let pageSize = 25;

// Undo Stack
let lastDeletedAction = null;

// Security PIN state
let hashedPin = localStorage.getItem("expense_hashed_pin") || null;
let enteredPin = "";
let isLocked = !!hashedPin;

// Chart Instances
let dashChartInstance = null;
let forecastChartInstance = null;
let analyticsCashFlowInstance = null;
let analyticsCategoryInstance = null;

// Transactions State
let rawTransactions = JSON.parse(localStorage.getItem("transactions")) || [];
let transactions = rawTransactions.map(t => ({
  id: t.id || Date.now() + Math.random(),
  text: t.text || "Untitled",
  amount: Math.abs(t.amount),
  type: t.type || (t.amount < 0 ? "expense" : "income"),
  category: t.category || (t.type === "income" ? "Salary" : "Food & Drinks"),
  account: t.account || "checking",
  targetAccount: t.targetAccount || null,
  tags: Array.isArray(t.tags) ? t.tags : (t.tags ? String(t.tags).split(",").map(s => s.trim().replace(/^#/, "")).filter(Boolean) : []),
  splits: Array.isArray(t.splits) ? t.splits : null,
  receipt: t.receipt || null,
  date: t.date || new Date().toISOString().split("T")[0]
}));

// --- DOM ELEMENTS ---
const toastContainer = document.getElementById("toastContainer");
const offlineBanner = document.getElementById("offlineBanner");
const currencySelect = document.getElementById("currencySelect");
const themeSelect = document.getElementById("themeSelect");
const headerLockBtn = document.getElementById("headerLockBtn");
const headerConvertBtn = document.getElementById("headerConvertBtn");
const navTabs = document.querySelectorAll(".nav-tab");
const viewContainers = document.querySelectorAll(".view-container");

// PIN Lock elements
const pinLockOverlay = document.getElementById("pinLockOverlay");
const pinDots = [document.getElementById("dot1"), document.getElementById("dot2"), document.getElementById("dot3"), document.getElementById("dot4")];
const pinKeypad = document.querySelector(".pin-keypad");
const pinClearBtn = document.getElementById("pinClearBtn");
const pinDeleteBtn = document.getElementById("pinDeleteBtn");
const pinErrorMsg = document.getElementById("pinErrorMsg");
const setPinBtn = document.getElementById("setPinBtn");
const removePinBtn = document.getElementById("removePinBtn");
const pinSettingStatusText = document.getElementById("pinSettingStatusText");

// Dashboard Elements
const dashBalance = document.getElementById("dashBalance");
const dashBalanceBadge = document.getElementById("dashBalanceBadge");
const dashSavingsRate = document.getElementById("dashSavingsRate");
const dashIncome = document.getElementById("dashIncome");
const dashIncomeCount = document.getElementById("dashIncomeCount");
const dashExpense = document.getElementById("dashExpense");
const dashExpenseCount = document.getElementById("dashExpenseCount");
const dashRunway = document.getElementById("dashRunway");
const dashRunwaySubtext = document.getElementById("dashRunwaySubtext");

const smartInput = document.getElementById("smartInput");
const smartAddBtn = document.getElementById("smartAddBtn");

const transactionForm = document.getElementById("transactionForm");
const textInput = document.getElementById("text");
const amountInput = document.getElementById("amount");
const accountSelect = document.getElementById("accountSelect");
const targetAccountGroup = document.getElementById("targetAccountGroup");
const targetAccountSelect = document.getElementById("targetAccountSelect");
const categoryGroup = document.getElementById("categoryGroup");
const categorySelect = document.getElementById("category");
const splitCheckbox = document.getElementById("splitCheckbox");
const splitSection = document.getElementById("splitSection");
const splitRowsContainer = document.getElementById("splitRowsContainer");
const addSplitRowBtn = document.getElementById("addSplitRowBtn");
const splitSumDisplay = document.getElementById("splitSumDisplay");
const splitRemainingDisplay = document.getElementById("splitRemainingDisplay");

const dateInput = document.getElementById("date");
const tagsInput = document.getElementById("tagsInput");
const receiptFileInput = document.getElementById("receiptFileInput");
const receiptPreviewContainer = document.getElementById("receiptPreviewContainer");
const receiptPreviewImg = document.getElementById("receiptPreviewImg");
const removeReceiptBtn = document.getElementById("removeReceiptBtn");
const submitBtnText = document.getElementById("submitBtnText");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formTitle = document.getElementById("formTitle");
const editModeNotice = document.getElementById("editModeNotice");
const typeExpenseBtn = document.getElementById("typeExpenseBtn");
const typeIncomeBtn = document.getElementById("typeIncomeBtn");
const typeTransferBtn = document.getElementById("typeTransferBtn");
const inputCurrencySymbol = document.getElementById("inputCurrencySymbol");

const dashBudgetProgressList = document.getElementById("dashBudgetProgressList");
const dashMonthLabel = document.getElementById("dashMonthLabel");
const dashRecentList = document.getElementById("dashRecentList");
const dashRecentCount = document.getElementById("dashRecentCount");
const categoryChartCanvas = document.getElementById("categoryChart");
const chartPlaceholder = document.getElementById("chartPlaceholder");
const chartTabCategory = document.getElementById("chartTabCategory");
const chartTabCashflow = document.getElementById("chartTabCashflow");

// Accounts View Elements
const netWorthDisplay = document.getElementById("netWorthDisplay");
const totalAssetsDisplay = document.getElementById("totalAssetsDisplay");
const totalLiabilitiesDisplay = document.getElementById("totalLiabilitiesDisplay");
const accountsGrid = document.getElementById("accountsGrid");
const openNewAccountModalBtn = document.getElementById("openNewAccountModalBtn");
const accountModal = document.getElementById("accountModal");
const closeAccountModalBtn = document.getElementById("closeAccountModalBtn");
const cancelAccountBtn = document.getElementById("cancelAccountBtn");
const accountForm = document.getElementById("accountForm");
const accNameInput = document.getElementById("accName");
const accTypeSelect = document.getElementById("accType");
const accBalanceInput = document.getElementById("accBalance");

// Ledger Elements
const ledgerTableBody = document.getElementById("ledgerTableBody");
const ledgerCountLabel = document.getElementById("ledgerCountLabel");
const selectAllCheckbox = document.getElementById("selectAllCheckbox");
const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
const selectedCountEl = document.getElementById("selectedCount");
const ledgerEmptyState = document.getElementById("ledgerEmptyState");
const searchInput = document.getElementById("searchInput");
const filterTypeSelect = document.getElementById("filterType");
const filterAccountSelect = document.getElementById("filterAccount");
const filterCategorySelect = document.getElementById("filterCategory");
const sortBySelect = document.getElementById("sortBy");
const tagChipsContainer = document.getElementById("tagChipsContainer");
const datePresetPills = document.querySelectorAll(".preset-pill");
const ledgerPrintBtn = document.getElementById("ledgerPrintBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const importCsvBtn = document.getElementById("importCsvBtn");

const pageSizeSelect = document.getElementById("pageSizeSelect");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageNumberDisplay = document.getElementById("pageNumberDisplay");

// Budgets & Goals Elements
const fullBudgetProgressList = document.getElementById("fullBudgetProgressList");
const savingsGoalsList = document.getElementById("savingsGoalsList");
const openBudgetModalBtn = document.getElementById("openBudgetModalBtn");
const openGoalModalBtn = document.getElementById("openGoalModalBtn");
const budgetModal = document.getElementById("budgetModal");
const closeBudgetModalBtn = document.getElementById("closeBudgetModalBtn");
const cancelBudgetBtn = document.getElementById("cancelBudgetBtn");
const budgetConfigForm = document.getElementById("budgetConfigForm");
const budgetInputsContainer = document.getElementById("budgetInputsContainer");

const goalModal = document.getElementById("goalModal");
const closeGoalModalBtn = document.getElementById("closeGoalModalBtn");
const cancelGoalBtn = document.getElementById("cancelGoalBtn");
const goalForm = document.getElementById("goalForm");
const goalNameInput = document.getElementById("goalName");
const goalTargetInput = document.getElementById("goalTarget");
const goalSavedInput = document.getElementById("goalSaved");
const goalDateInput = document.getElementById("goalDate");

// Subscriptions Elements
const activeSubsCount = document.getElementById("activeSubsCount");
const monthlySubsTotal = document.getElementById("monthlySubsTotal");
const nextUpcomingSub = document.getElementById("nextUpcomingSub");
const subscriptionsList = document.getElementById("subscriptionsList");
const openSubscriptionModalBtn = document.getElementById("openSubscriptionModalBtn");
const processDueSubsBtn = document.getElementById("processDueSubsBtn");
const subModal = document.getElementById("subModal");
const closeSubModalBtn = document.getElementById("closeSubModalBtn");
const cancelSubBtn = document.getElementById("cancelSubBtn");
const subForm = document.getElementById("subForm");
const subNameInput = document.getElementById("subName");
const subAmountInput = document.getElementById("subAmount");
const subFrequencyInput = document.getElementById("subFrequency");
const subCategoryInput = document.getElementById("subCategory");
const subNextDateInput = document.getElementById("subNextDate");

// Analytics & Forecast Elements
const forecastInitial = document.getElementById("forecastInitial");
const forecastMonthly = document.getElementById("forecastMonthly");
const forecastRate = document.getElementById("forecastRate");
const forecastYears = document.getElementById("forecastYears");
const forecastTotalValue = document.getElementById("forecastTotalValue");
const forecastTotalPrincipal = document.getElementById("forecastTotalPrincipal");
const forecastTotalInterest = document.getElementById("forecastTotalInterest");
const forecastChartCanvas = document.getElementById("forecastChart");

const analyticsCashFlowCanvas = document.getElementById("analyticsCashFlowChart");
const analyticsCategoryCanvas = document.getElementById("analyticsCategoryChart");
const reportsAvgBurn = document.getElementById("reportsAvgBurn");
const reportsRunway = document.getElementById("reportsRunway");
const reportsTopCategory = document.getElementById("reportsTopCategory");
const reportsSavingsRate = document.getElementById("reportsSavingsRate");
const reportsRecommendations = document.getElementById("reportsRecommendations");

// Settings Elements
const settingsCurrencySelect = document.getElementById("settingsCurrencySelect");
const audioToggle = document.getElementById("audioToggle");
const customCategoriesList = document.getElementById("customCategoriesList");
const addNewCustomCatBtn = document.getElementById("addNewCustomCatBtn");
const settingsExportJsonBtn = document.getElementById("settingsExportJsonBtn");
const settingsExportCsvBtn = document.getElementById("settingsExportCsvBtn");
const settingsJsonFileInput = document.getElementById("settingsJsonFileInput");
const settingsRestoreBtn = document.getElementById("settingsRestoreBtn");
const settingsWipeBtn = document.getElementById("settingsWipeBtn");

// Modals: Receipts, Currency Converter, Bank CSV
const receiptModal = document.getElementById("receiptModal");
const closeReceiptModalBtn = document.getElementById("closeReceiptModalBtn");
const receiptModalImg = document.getElementById("receiptModalImg");

const convertModal = document.getElementById("convertModal");
const closeConvertModalBtn = document.getElementById("closeConvertModalBtn");
const closeConvertActionBtn = document.getElementById("closeConvertActionBtn");
const convertForeignAmount = document.getElementById("convertForeignAmount");
const convertForeignCurrency = document.getElementById("convertForeignCurrency");
const convertExchangeRate = document.getElementById("convertExchangeRate");
const convertResultDisplay = document.getElementById("convertResultDisplay");
const applyConvertedToFormBtn = document.getElementById("applyConvertedToFormBtn");

const csvImportModal = document.getElementById("csvImportModal");
const closeCsvImportModalBtn = document.getElementById("closeCsvImportModalBtn");
const cancelCsvImportBtn = document.getElementById("cancelCsvImportBtn");
const bankCsvFileInput = document.getElementById("bankCsvFileInput");
const csvPreviewContainer = document.getElementById("csvPreviewContainer");
const csvParsedRowCount = document.getElementById("csvParsedRowCount");
const csvSampleRows = document.getElementById("csvSampleRows");
const executeCsvImportBtn = document.getElementById("executeCsvImportBtn");

// Navigation shortcuts
const headerQuickAddBtn = document.getElementById("headerQuickAddBtn");
const goToBudgetsTabBtn = document.getElementById("goToBudgetsTabBtn");
const goToLedgerBtn = document.getElementById("goToLedgerBtn");

// --- HELPER UTILITIES ---
function formatCurrency(amount) {
  const formatted = Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${currentCurrency} ${formatted}`;
}

function formatDateDisplay(dateString) {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getCategoryMeta(categoryName, type) {
  const pool = customCategories[type] || [...customCategories.expense, ...customCategories.income];
  const found = pool.find(c => c.id === categoryName || c.label === categoryName);
  if (found) return found;
  return { id: categoryName, label: categoryName, icon: type === "income" ? "💵" : "📦" };
}

function getAccountMeta(accId) {
  const acc = accounts.find(a => a.id === accId);
  return acc || { id: accId, name: accId, icon: "💳" };
}

function showToast(message, type = "info", duration = 3000, undoCallback = null) {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  let icon = "ℹ️";
  if (type === "success") icon = "✅";
  if (type === "warning") icon = "⚠️";

  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <span>${icon}</span>
      <span>${message}</span>
    </div>
  `;

  if (undoCallback) {
    const undoBtn = document.createElement("button");
    undoBtn.className = "toast-undo-btn";
    undoBtn.textContent = "Undo";
    undoBtn.onclick = () => {
      undoCallback();
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    };
    toast.appendChild(undoBtn);
  }

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px) scale(0.95)";
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}

// --- CRYPTOGRAPHIC PIN ENGINE ---
function updatePinUI() {
  pinDots.forEach((dot, idx) => {
    dot.classList.toggle("filled", idx < enteredPin.length);
  });
}

async function checkPin() {
  const inputHash = await hashPin(enteredPin);
  if (inputHash === hashedPin) {
    sfx.play("success");
    isLocked = false;
    pinLockOverlay.classList.add("hidden");
    enteredPin = "";
    updatePinUI();
    pinErrorMsg.classList.add("hidden");
    showToast("Decrypted and unlocked", "success");
  } else {
    sfx.play("error");
    pinErrorMsg.classList.remove("hidden");
    enteredPin = "";
    updatePinUI();
  }
}

function lockApp() {
  if (!hashedPin) return;
  sfx.play("click");
  isLocked = true;
  enteredPin = "";
  updatePinUI();
  pinErrorMsg.classList.add("hidden");
  pinLockOverlay.classList.remove("hidden");
}

function handleKeypadPress(digit) {
  sfx.play("click");
  if (enteredPin.length < 4) {
    enteredPin += digit;
    updatePinUI();
    if (enteredPin.length === 4) {
      setTimeout(checkPin, 80);
    }
  }
}

function setupPinListeners() {
  pinKeypad.querySelectorAll(".pin-key[data-digit]").forEach(btn => {
    btn.addEventListener("click", () => handleKeypadPress(btn.getAttribute("data-digit")));
  });

  pinClearBtn.addEventListener("click", () => {
    sfx.play("click");
    enteredPin = "";
    updatePinUI();
  });

  pinDeleteBtn.addEventListener("click", () => {
    sfx.play("click");
    enteredPin = enteredPin.slice(0, -1);
    updatePinUI();
  });

  window.addEventListener("keydown", (e) => {
    if (!isLocked) return;
    if (e.key >= "0" && e.key <= "9") handleKeypadPress(e.key);
    else if (e.key === "Backspace") { enteredPin = enteredPin.slice(0, -1); updatePinUI(); }
    else if (e.key === "Escape") { enteredPin = ""; updatePinUI(); }
  });

  headerLockBtn.addEventListener("click", lockApp);

  setPinBtn.addEventListener("click", async () => {
    const newPin = prompt("Enter a 4-digit passcode to cryptographically secure your workstation:", "1234");
    if (newPin && /^\d{4}$/.test(newPin)) {
      hashedPin = await hashPin(newPin);
      localStorage.setItem("expense_hashed_pin", hashedPin);
      updatePinSettingsView();
      sfx.play("success");
      showToast("Passcode hashed & encrypted!", "success");
    } else if (newPin !== null) {
      showToast("PIN must be exactly 4 digits", "warning");
    }
  });

  removePinBtn.addEventListener("click", async () => {
    const current = prompt("Enter current PIN to remove security:");
    if (current && await hashPin(current) === hashedPin) {
      hashedPin = null;
      localStorage.removeItem("expense_hashed_pin");
      updatePinSettingsView();
      sfx.play("delete");
      showToast("Passcode lock removed", "info");
    } else if (current !== null) {
      showToast("Incorrect passcode", "warning");
    }
  });
}

function updatePinSettingsView() {
  if (hashedPin) {
    headerLockBtn.classList.remove("hidden");
    setPinBtn.textContent = "Change PIN";
    removePinBtn.classList.remove("hidden");
    pinSettingStatusText.textContent = "Workstation is cryptographically protected with SHA-256 🔒";
  } else {
    headerLockBtn.classList.add("hidden");
    setPinBtn.textContent = "Set Passcode";
    removePinBtn.classList.add("hidden");
    pinSettingStatusText.textContent = "Passcode lock is currently disabled.";
  }
}

// --- VIEW NAVIGATION CONTROLLER ---
function switchView(viewName) {
  sfx.play("click");
  activeView = viewName;
  navTabs.forEach(tab => {
    tab.classList.toggle("active", tab.getAttribute("data-view") === viewName);
  });
  viewContainers.forEach(c => {
    c.classList.toggle("active", c.id === `view-${viewName}`);
  });

  if (viewName === "dashboard") renderDashboard();
  else if (viewName === "accounts") renderAccountsView();
  else if (viewName === "transactions") { currentPage = 1; renderLedger(); }
  else if (viewName === "budgets") renderBudgetsAndGoals();
  else if (viewName === "subscriptions") renderSubscriptions();
  else if (viewName === "analytics") renderAnalyticsView();
  else if (viewName === "settings") {
    settingsCurrencySelect.value = currentCurrency;
    updatePinSettingsView();
    renderCustomCategoriesList();
  }
}

// --- ACCOUNTS & NET WORTH ENGINE ---
function populateAccountDropdowns() {
  accountSelect.innerHTML = "";
  targetAccountSelect.innerHTML = "";
  filterAccountSelect.innerHTML = '<option value="all">All Accounts</option>';

  accounts.forEach(acc => {
    const opt = document.createElement("option");
    opt.value = acc.id;
    opt.textContent = `${acc.icon} ${acc.name} (${formatCurrency(acc.balance)})`;
    accountSelect.appendChild(opt);

    const optTarget = document.createElement("option");
    optTarget.value = acc.id;
    optTarget.textContent = `${acc.icon} ${acc.name}`;
    targetAccountSelect.appendChild(optTarget);

    const optFilter = document.createElement("option");
    optFilter.value = acc.id;
    optFilter.textContent = `${acc.icon} ${acc.name}`;
    filterAccountSelect.appendChild(optFilter);
  });

  if (accounts.length > 1) {
    targetAccountSelect.selectedIndex = 1;
  }
}

function renderAccountsView() {
  populateAccountDropdowns();
  accountsGrid.innerHTML = "";

  let totalAssets = 0;
  let totalLiabilities = 0;

  accounts.forEach(acc => {
    if (acc.balance >= 0) totalAssets += acc.balance;
    else totalLiabilities += Math.abs(acc.balance);

    const isLiability = acc.type === "credit";
    const card = document.createElement("div");
    card.className = "account-card";
    card.innerHTML = `
      <div>
        <div class="account-card-header">
          <div class="account-name-group">
            <div class="account-icon-box">${acc.icon}</div>
            <div>
              <div class="account-name">${acc.name}</div>
              <span class="account-type-tag ${isLiability ? "liability" : "asset"}">${acc.type}</span>
            </div>
          </div>
          <button class="btn-action delete-btn" title="Delete Account" onclick="deleteAccount('${acc.id}')">🗑️</button>
        </div>
        <div class="account-balance-display">
          <span class="account-balance-label">Current Balance</span>
          <div class="account-balance-val ${acc.balance >= 0 ? "text-income" : "text-expense"}">
            ${formatCurrency(acc.balance)}
          </div>
        </div>
      </div>
      <div class="form-actions" style="margin-top:12px;">
        <button class="btn-sm btn-outline" style="flex:1;" onclick="promptAdjustBalance('${acc.id}')">Adjust Balance</button>
      </div>
    `;
    accountsGrid.appendChild(card);
  });

  const netWorth = totalAssets - totalLiabilities;
  netWorthDisplay.textContent = formatCurrency(netWorth);
  netWorthDisplay.className = netWorth >= 0 ? "text-income" : "text-expense";
  totalAssetsDisplay.textContent = formatCurrency(totalAssets);
  totalLiabilitiesDisplay.textContent = formatCurrency(totalLiabilities);
}

function promptAdjustBalance(accId) {
  const acc = accounts.find(a => a.id === accId);
  if (!acc) return;
  const input = prompt(`Enter new balance for ${acc.name}:`, acc.balance);
  const newBal = parseFloat(input);
  if (!isNaN(newBal)) {
    acc.balance = newBal;
    saveAccounts();
    renderAccountsView();
    renderDashboard();
    sfx.play("success");
    showToast(`Updated balance for ${acc.name}`, "success");
  }
}

function handleAccountSubmit(e) {
  e.preventDefault();
  const name = accNameInput.value.trim();
  const type = accTypeSelect.value;
  const balance = parseFloat(accBalanceInput.value) || 0;
  if (!name) return;

  let icon = "💳";
  if (type === "savings") icon = "🏦";
  else if (type === "cash") icon = "💵";
  else if (type === "investment") icon = "📈";

  const id = name.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
  accounts.push({ id, name, type, balance, icon });
  saveAccounts();
  accountModal.classList.add("hidden");
  accountForm.reset();
  renderAccountsView();
  sfx.play("success");
  showToast("Account created successfully", "success");
}

function deleteAccount(accId) {
  if (accounts.length <= 1) {
    showToast("You must maintain at least one account", "warning");
    return;
  }
  if (confirm("Delete this account? Existing transactions will retain their historical record.")) {
    accounts = accounts.filter(a => a.id !== accId);
    saveAccounts();
    renderAccountsView();
    sfx.play("delete");
    showToast("Account removed", "info");
  }
}

function saveAccounts() {
  localStorage.setItem("expense_accounts", JSON.stringify(accounts));
}

// --- CATEGORIES & SPLIT TRANSACTIONS ENGINE ---
function populateCategorySelect(type) {
  categorySelect.innerHTML = "";
  const options = customCategories[type] || [];
  options.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = `${cat.icon} ${cat.label}`;
    categorySelect.appendChild(opt);
  });
}

function populateFilterCategories() {
  const currentSelection = filterCategorySelect.value;
  filterCategorySelect.innerHTML = '<option value="all">All Categories</option>';
  const allCategories = [
    ...customCategories.expense.map(c => ({ ...c, kind: "Expense" })),
    ...customCategories.income.map(c => ({ ...c, kind: "Income" }))
  ];
  allCategories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = `${cat.icon} ${cat.label} (${cat.kind})`;
    filterCategorySelect.appendChild(opt);
  });
  if (currentSelection) filterCategorySelect.value = currentSelection;

  subCategoryInput.innerHTML = "";
  customCategories.expense.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.icon} ${c.label}`;
    subCategoryInput.appendChild(opt);
  });
}

function addSplitRow(catId = null, amountVal = "") {
  const row = document.createElement("div");
  row.className = "split-row";

  let optionsMarkup = "";
  customCategories.expense.forEach(c => {
    const selected = catId === c.id ? "selected" : "";
    optionsMarkup += `<option value="${c.id}" ${selected}>${c.icon} ${c.label}</option>`;
  });

  row.innerHTML = `
    <select class="split-cat-select">${optionsMarkup}</select>
    <input type="number" class="split-amount-input" placeholder="0.00" step="0.01" min="0.01" value="${amountVal}">
    <button type="button" class="btn-remove-split">✕</button>
  `;

  row.querySelector(".btn-remove-split").onclick = () => {
    row.remove();
    updateSplitCalculations();
  };

  row.querySelector(".split-amount-input").oninput = updateSplitCalculations;
  splitRowsContainer.appendChild(row);
  updateSplitCalculations();
}

function updateSplitCalculations() {
  const masterAmount = parseFloat(amountInput.value) || 0;
  const rows = splitRowsContainer.querySelectorAll(".split-row");
  let sum = 0;
  rows.forEach(r => {
    const val = parseFloat(r.querySelector(".split-amount-input").value) || 0;
    sum += val;
  });

  const remaining = masterAmount - sum;
  splitSumDisplay.textContent = formatCurrency(sum);
  splitRemainingDisplay.textContent = formatCurrency(remaining);
  splitRemainingDisplay.className = Math.abs(remaining) < 0.01 ? "text-income" : "text-expense";
}

function handleSplitToggle() {
  if (splitCheckbox.checked) {
    splitSection.classList.remove("hidden");
    if (splitRowsContainer.children.length === 0) {
      addSplitRow(null, "");
      addSplitRow(null, "");
    }
    updateSplitCalculations();
  } else {
    splitSection.classList.add("hidden");
  }
}

// --- NATURAL LANGUAGE SMART ADD PARSER ---
function handleSmartAdd() {
  const text = smartInput.value.trim();
  if (!text) return;

  const amountMatch = text.match(/(?:\$|\b)(\d+(?:\.\d{1,2})?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

  if (!amount) {
    showToast("Could not detect amount. Try: 'Spent $45 on groceries'", "warning");
    return;
  }

  const isIncome = /\b(salary|earned|income|deposit|got|freelance|bonus|dividend)\b/i.test(text);
  const type = isIncome ? "income" : "expense";

  let category = type === "income" ? "Salary" : "Food & Drinks";
  if (/grocery|food|dining|dinner|lunch|breakfast|burger|pizza|coffee|cafe/i.test(text)) category = "Food & Drinks";
  else if (/gas|uber|taxi|transport|flight|train|bus|fuel/i.test(text)) category = "Transportation";
  else if (/shopping|clothes|shoes|amazon|store|mall/i.test(text)) category = "Shopping";
  else if (/rent|utility|utilities|bill|electric|water|internet|wifi/i.test(text)) category = "Housing & Bills";
  else if (/netflix|movie|cinema|spotify|game|concert/i.test(text)) category = "Entertainment";
  else if (/doctor|medicine|health|pharmacy|dentist/i.test(text)) category = "Healthcare";

  let desc = text.replace(/(?:\$|\b)\d+(?:\.\d{1,2})?/g, "").replace(/\b(spent|paid|for|on|earned|received|got)\b/gi, "").trim();
  if (!desc) desc = category;

  const newTx = {
    id: Date.now(),
    text: desc.charAt(0).toUpperCase() + desc.slice(1),
    amount: amount,
    type: type,
    category: category,
    account: accounts[0]?.id || "checking",
    tags: [],
    receipt: null,
    date: new Date().toISOString().split("T")[0]
  };

  transactions.unshift(newTx);
  applyAccountImpact(newTx);

  saveAccounts();
  saveTransactions();
  smartInput.value = "";
  renderApp();
  sfx.play("success");
  showToast(`Parsed & Added: "${desc}" (${formatCurrency(amount)})`, "success");
}

// --- RECEIPT COMPRESSION & ATTACHMENT ---
function handleReceiptUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      const maxDim = 800;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
        else { w = Math.round((w * maxDim) / h); h = maxDim; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      currentReceiptBase64 = canvas.toDataURL("image/jpeg", 0.7);

      receiptPreviewImg.src = currentReceiptBase64;
      receiptPreviewContainer.classList.remove("hidden");
      showToast("Receipt compressed & attached!", "info");
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function clearReceiptPreview() {
  currentReceiptBase64 = null;
  receiptFileInput.value = "";
  receiptPreviewContainer.classList.add("hidden");
  receiptPreviewImg.src = "";
}

function openReceiptViewer(base64) {
  sfx.play("click");
  receiptModalImg.src = base64;
  receiptModal.classList.remove("hidden");
}

// --- FORM CONTROLLER (ADD, EDIT, SPLIT & TRANSFERS) ---
function setFormType(type) {
  currentType = type;
  typeExpenseBtn.classList.toggle("active", type === "expense");
  typeIncomeBtn.classList.toggle("active", type === "income");
  typeTransferBtn.classList.toggle("active", type === "transfer");

  if (type === "transfer") {
    targetAccountGroup.classList.remove("hidden");
    categoryGroup.classList.add("hidden");
    splitCheckbox.checked = false;
    splitSection.classList.add("hidden");
  } else {
    targetAccountGroup.classList.add("hidden");
    categoryGroup.classList.remove("hidden");
    populateCategorySelect(type);
  }
}

function resetForm() {
  transactionForm.reset();
  dateInput.value = new Date().toISOString().split("T")[0];
  clearReceiptPreview();
  splitCheckbox.checked = false;
  splitSection.classList.add("hidden");
  splitRowsContainer.innerHTML = "";
  setFormType("expense");
  editingId = null;
  formTitle.textContent = "Add New Transaction";
  submitBtnText.textContent = "Add Transaction";
  editModeNotice.classList.add("hidden");
  cancelEditBtn.classList.add("hidden");
}

function startEditTransaction(id) {
  const target = transactions.find(t => t.id === id);
  if (!target) return;

  switchView("dashboard");
  editingId = id;
  formTitle.textContent = "Edit Transaction";
  submitBtnText.textContent = "Save Changes";
  editModeNotice.classList.remove("hidden");
  cancelEditBtn.classList.remove("hidden");

  textInput.value = target.text;
  amountInput.value = target.amount;
  accountSelect.value = target.account || accounts[0]?.id || "checking";
  dateInput.value = target.date;
  tagsInput.value = (target.tags || []).join(", ");

  setFormType(target.type);
  if (target.type === "transfer") {
    targetAccountSelect.value = target.targetAccount || accounts[1]?.id;
  } else {
    categorySelect.value = target.category;
  }

  // Handle splits
  if (Array.isArray(target.splits) && target.splits.length > 0) {
    splitCheckbox.checked = true;
    splitSection.classList.remove("hidden");
    splitRowsContainer.innerHTML = "";
    target.splits.forEach(s => addSplitRow(s.category, s.amount));
  } else {
    splitCheckbox.checked = false;
    splitSection.classList.add("hidden");
  }

  if (target.receipt) {
    currentReceiptBase64 = target.receipt;
    receiptPreviewImg.src = currentReceiptBase64;
    receiptPreviewContainer.classList.remove("hidden");
  } else {
    clearReceiptPreview();
  }

  transactionForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function handleFormSubmit(e) {
  e.preventDefault();
  const textVal = textInput.value.trim();
  const amountVal = parseFloat(amountInput.value);
  const accountVal = accountSelect.value;
  const targetAccountVal = currentType === "transfer" ? targetAccountSelect.value : null;
  const categoryVal = currentType === "transfer" ? "Transfer" : categorySelect.value;
  const dateVal = dateInput.value;
  const tagsVal = tagsInput.value.split(",").map(t => t.trim().replace(/^#/, "")).filter(Boolean);

  if (!textVal || isNaN(amountVal) || amountVal <= 0 || !dateVal) {
    showToast("Please enter valid details", "warning");
    return;
  }

  if (currentType === "transfer" && accountVal === targetAccountVal) {
    showToast("Source and destination accounts must be different", "warning");
    return;
  }

  let splitsData = null;
  if (splitCheckbox.checked && currentType !== "transfer") {
    const rows = splitRowsContainer.querySelectorAll(".split-row");
    splitsData = [];
    let splitSum = 0;
    rows.forEach(r => {
      const cat = r.querySelector(".split-cat-select").value;
      const amt = parseFloat(r.querySelector(".split-amount-input").value) || 0;
      if (amt > 0) {
        splitsData.push({ category: cat, amount: amt });
        splitSum += amt;
      }
    });

    if (Math.abs(splitSum - amountVal) > 0.01) {
      showToast(`Split sum (${formatCurrency(splitSum)}) must match total amount (${formatCurrency(amountVal)})`, "warning");
      return;
    }
  }

  if (editingId !== null) {
    const old = transactions.find(t => t.id === editingId);
    if (old) revertAccountImpact(old);

    transactions = transactions.map(t => (t.id === editingId ? {
      ...t,
      text: textVal,
      amount: amountVal,
      type: currentType,
      category: categoryVal,
      account: accountVal,
      targetAccount: targetAccountVal,
      tags: tagsVal,
      splits: splitsData,
      receipt: currentReceiptBase64,
      date: dateVal
    } : t));

    applyAccountImpact({ type: currentType, amount: amountVal, account: accountVal, targetAccount: targetAccountVal });
    showToast("Transaction updated", "success");
  } else {
    const newTx = {
      id: Date.now(),
      text: textVal,
      amount: amountVal,
      type: currentType,
      category: categoryVal,
      account: accountVal,
      targetAccount: targetAccountVal,
      tags: tagsVal,
      splits: splitsData,
      receipt: currentReceiptBase64,
      date: dateVal
    };
    transactions.unshift(newTx);
    applyAccountImpact(newTx);
    showToast("Transaction recorded", "success");
  }

  saveAccounts();
  saveTransactions();
  resetForm();
  renderApp();
  sfx.play("success");
}

function applyAccountImpact(tx) {
  const src = accounts.find(a => a.id === tx.account);
  if (tx.type === "income" && src) src.balance += tx.amount;
  else if (tx.type === "expense" && src) src.balance -= tx.amount;
  else if (tx.type === "transfer" && src) {
    src.balance -= tx.amount;
    const dest = accounts.find(a => a.id === tx.targetAccount);
    if (dest) dest.balance += tx.amount;
  }
}

function revertAccountImpact(tx) {
  const src = accounts.find(a => a.id === tx.account);
  if (tx.type === "income" && src) src.balance -= tx.amount;
  else if (tx.type === "expense" && src) src.balance += tx.amount;
  else if (tx.type === "transfer" && src) {
    src.balance += tx.amount;
    const dest = accounts.find(a => a.id === tx.targetAccount);
    if (dest) dest.balance -= tx.amount;
  }
}

function removeTransaction(id) {
  const target = transactions.find(t => t.id === id);
  if (!target) return;

  revertAccountImpact(target);
  transactions = transactions.filter(t => t.id !== id);
  selectedTransactionIds.delete(id);
  if (editingId === id) resetForm();

  saveAccounts();
  saveTransactions();
  renderApp();
  sfx.play("delete");

  // Provide 5-second Undo
  showToast("Transaction removed", "info", 5000, () => {
    transactions.unshift(target);
    applyAccountImpact(target);
    saveAccounts();
    saveTransactions();
    renderApp();
    sfx.play("success");
    showToast("Transaction restored!", "success");
  });
}

// --- DASHBOARD VIEW ---
function renderDashboard() {
  populateAccountDropdowns();

  const incomeTotal = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenseTotal = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  let totalAssets = 0;
  let totalLiabilities = 0;
  accounts.forEach(a => {
    if (a.balance >= 0) totalAssets += a.balance;
    else totalLiabilities += Math.abs(a.balance);
  });
  const netWorth = totalAssets - totalLiabilities;

  dashBalance.textContent = formatCurrency(netWorth);
  dashIncome.textContent = formatCurrency(incomeTotal);
  dashExpense.textContent = formatCurrency(expenseTotal);

  const incCount = transactions.filter(t => t.type === "income").length;
  const expCount = transactions.filter(t => t.type === "expense").length;
  dashIncomeCount.textContent = `${incCount} transactions`;
  dashExpenseCount.textContent = `${expCount} transactions`;

  dashBalanceBadge.textContent = netWorth >= 0 ? "Positive" : "Deficit";
  dashBalanceBadge.className = `badge ${netWorth >= 0 ? "balance-badge" : "balance-badge negative"}`;

  if (incomeTotal > 0) {
    const rate = Math.round(((incomeTotal - expenseTotal) / incomeTotal) * 100);
    dashSavingsRate.textContent = `${rate}%`;
  } else {
    dashSavingsRate.textContent = expenseTotal > 0 ? "-100%" : "0%";
  }

  const monthlyExpenseMap = {};
  transactions.filter(t => t.type === "expense" && t.date).forEach(t => {
    const ym = t.date.substring(0, 7);
    monthlyExpenseMap[ym] = (monthlyExpenseMap[ym] || 0) + t.amount;
  });
  const mKeys = Object.keys(monthlyExpenseMap);
  const avgMonthlyBurn = mKeys.length > 0 ? mKeys.reduce((a, b) => a + monthlyExpenseMap[b], 0) / mKeys.length : expenseTotal;

  if (netWorth <= 0) {
    dashRunway.textContent = "0 Mos";
    dashRunwaySubtext.textContent = "Balance in deficit";
  } else if (avgMonthlyBurn <= 0) {
    dashRunway.textContent = "∞ Mos";
    dashRunwaySubtext.textContent = "No expenses recorded";
  } else {
    const mos = (netWorth / avgMonthlyBurn).toFixed(1);
    dashRunway.textContent = `${mos} Mos`;
    dashRunwaySubtext.textContent = `Avg burn: ${formatCurrency(avgMonthlyBurn)}/mo`;
  }

  renderBudgetSnapshot();
  renderRecentTransactions();
  renderDashChart();
}

function renderBudgetSnapshot() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  dashMonthLabel.textContent = now.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const monthlyExpenses = {};
  transactions.filter(t => t.type === "expense" && t.date && t.date.startsWith(ym)).forEach(t => {
    if (Array.isArray(t.splits) && t.splits.length > 0) {
      t.splits.forEach(s => monthlyExpenses[s.category] = (monthlyExpenses[s.category] || 0) + s.amount);
    } else {
      monthlyExpenses[t.category] = (monthlyExpenses[t.category] || 0) + t.amount;
    }
  });

  dashBudgetProgressList.innerHTML = "";
  const budgeted = Object.keys(budgets).filter(k => budgets[k] > 0);

  if (budgeted.length === 0) {
    dashBudgetProgressList.innerHTML = `
      <div class="empty-budgets-hint">
        <p>No monthly budgets configured yet.</p>
        <button class="btn-sm btn-outline" style="margin-top:8px;" onclick="openBudgetConfigModal()">🎯 Configure Budgets</button>
      </div>
    `;
    return;
  }

  budgeted.slice(0, 4).forEach(catId => {
    const meta = getCategoryMeta(catId, "expense");
    const limit = budgets[catId];
    const spent = monthlyExpenses[catId] || 0;
    const pct = Math.round((spent / limit) * 100);

    let statusClass = "safe";
    let statusText = `${pct}%`;
    if (pct >= 100) { statusClass = "danger"; statusText = "Exceeded!"; }
    else if (pct >= 80) { statusClass = "warning"; statusText = `${pct}% Warning`; }

    const item = document.createElement("div");
    item.className = "budget-item";
    item.innerHTML = `
      <div class="budget-info-row">
        <div class="budget-cat-name">
          <span>${meta.icon}</span>
          <span>${meta.label}</span>
          <span class="budget-status-tag ${statusClass}">${statusText}</span>
        </div>
        <div class="budget-amounts">
          <strong>${formatCurrency(spent)}</strong> / ${formatCurrency(limit)}
        </div>
      </div>
      <div class="progress-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-fill ${statusClass}" style="width: ${Math.min(pct, 100)}%;"></div>
      </div>
    `;
    dashBudgetProgressList.appendChild(item);
  });
}

function renderRecentTransactions() {
  dashRecentList.innerHTML = "";
  const recent = transactions.slice(0, 5);
  dashRecentCount.textContent = `Showing ${recent.length} of ${transactions.length}`;

  if (recent.length === 0) {
    dashRecentList.innerHTML = `<li class="empty-state" style="padding:20px;">No transactions recorded yet.</li>`;
    return;
  }

  recent.forEach(t => {
    const isInc = t.type === "income";
    const isTrans = t.type === "transfer";
    const meta = getCategoryMeta(t.category, t.type);
    const acc = getAccountMeta(t.account);

    const li = document.createElement("li");
    li.className = `transaction-item ${isInc ? "income-item" : isTrans ? "transfer-item" : "expense-item"}`;
    li.innerHTML = `
      <div class="item-left">
        <div class="category-icon-box">${isTrans ? "🔄" : meta.icon}</div>
        <div class="item-info">
          <div class="item-title">${t.text}</div>
          <div class="item-meta">
            <span class="account-badge">${acc.name}</span>
            <span class="category-badge">${meta.label}</span>
            <span>•</span>
            <span>${formatDateDisplay(t.date)}</span>
          </div>
        </div>
      </div>
      <div class="item-right">
        <div class="item-amount ${isInc ? "income" : isTrans ? "transfer" : "expense"}">
          ${isInc ? "+" : isTrans ? "⇄" : "-"}${formatCurrency(t.amount)}
        </div>
        <div class="item-actions">
          <button class="btn-action" title="Edit" onclick="startEditTransaction(${t.id})">✏️</button>
          <button class="btn-action delete-btn" title="Delete" onclick="removeTransaction(${t.id})">🗑️</button>
        </div>
      </div>
    `;
    dashRecentList.appendChild(li);
  });
}

function renderDashChart() {
  if (typeof Chart === "undefined") return;
  if (dashChartInstance) { dashChartInstance.destroy(); dashChartInstance = null; }

  if (transactions.length === 0) {
    categoryChartCanvas.style.display = "none";
    chartPlaceholder.style.display = "block";
    return;
  }
  categoryChartCanvas.style.display = "block";
  chartPlaceholder.style.display = "none";

  const ctx = categoryChartCanvas.getContext("2d");

  if (activeChartTab === "category") {
    const expTx = transactions.filter(t => t.type === "expense");
    const catMap = {};
    expTx.forEach(t => {
      if (Array.isArray(t.splits) && t.splits.length > 0) {
        t.splits.forEach(s => {
          const meta = getCategoryMeta(s.category, "expense");
          const name = `${meta.icon} ${meta.label}`;
          catMap[name] = (catMap[name] || 0) + s.amount;
        });
      } else {
        const meta = getCategoryMeta(t.category, "expense");
        const name = `${meta.icon} ${meta.label}`;
        catMap[name] = (catMap[name] || 0) + t.amount;
      }
    });

    const labels = Object.keys(catMap);
    const data = Object.values(catMap);
    const palette = ["#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#64748b"];

    dashChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: palette.slice(0, labels.length),
          borderWidth: 2,
          borderColor: document.documentElement.getAttribute("data-theme") === "dark" ? "#151d2f" : "#ffffff"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 12, padding: 8, color: "#94a3b8" } },
          tooltip: { callbacks: { label: c => ` ${c.label}: ${formatCurrency(c.raw)}` } }
        },
        cutout: "65%"
      }
    });
  } else {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString(undefined, { month: "short" });
      months.push({ key, label });
    }

    const incData = months.map(m => transactions.filter(t => t.type === "income" && t.date && t.date.startsWith(m.key)).reduce((s, t) => s + t.amount, 0));
    const expData = months.map(m => transactions.filter(t => t.type === "expense" && t.date && t.date.startsWith(m.key)).reduce((s, t) => s + t.amount, 0));

    dashChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: months.map(m => m.label),
        datasets: [
          { label: "Income", data: incData, backgroundColor: "#10b981", borderRadius: 4 },
          { label: "Expense", data: expData, backgroundColor: "#ef4444", borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: { boxWidth: 12, color: "#94a3b8" } },
          tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${formatCurrency(c.raw)}` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#94a3b8" } },
          y: { grid: { color: "#27354f" }, ticks: { color: "#94a3b8", callback: v => `${currentCurrency}${v}` } }
        }
      }
    });
  }
}

// --- TRANSACTIONS LEDGER (VIRTUAL PAGINATION) ---
function renderTagChips() {
  const allTags = new Set();
  transactions.forEach(t => (t.tags || []).forEach(tag => allTags.add(tag)));

  tagChipsContainer.innerHTML = "";
  const allChip = document.createElement("button");
  allChip.className = `tag-chip ${activeTagFilter === "all" ? "active" : ""}`;
  allChip.textContent = "# All";
  allChip.onclick = () => { activeTagFilter = "all"; currentPage = 1; renderLedger(); };
  tagChipsContainer.appendChild(allChip);

  allTags.forEach(tag => {
    const chip = document.createElement("button");
    chip.className = `tag-chip ${activeTagFilter === tag ? "active" : ""}`;
    chip.textContent = `#${tag}`;
    chip.onclick = () => { activeTagFilter = tag; currentPage = 1; renderLedger(); };
    tagChipsContainer.appendChild(chip);
  });
}

function getFilteredAndSortedTransactions() {
  const query = searchInput.value.toLowerCase().trim();
  const filterType = filterTypeSelect.value;
  const filterAcc = filterAccountSelect.value;
  const filterCat = filterCategorySelect.value;
  const sortBy = sortBySelect.value;

  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastYM = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const currentYear = `${now.getFullYear()}-`;

  let filtered = transactions.filter(t => {
    const matchesSearch = !query || t.text.toLowerCase().includes(query) || t.category.toLowerCase().includes(query) || (t.tags || []).some(tg => tg.toLowerCase().includes(query));
    const matchesType = filterType === "all" || t.type === filterType;
    const matchesAcc = filterAcc === "all" || t.account === filterAcc;
    const matchesCat = filterCat === "all" || t.category === filterCat;
    const matchesTag = activeTagFilter === "all" || (t.tags || []).includes(activeTagFilter);

    let matchesPreset = true;
    if (activeDatePreset === "this-month") matchesPreset = t.date && t.date.startsWith(currentYM);
    else if (activeDatePreset === "last-month") matchesPreset = t.date && t.date.startsWith(lastYM);
    else if (activeDatePreset === "this-year") matchesPreset = t.date && t.date.startsWith(currentYear);

    return matchesSearch && matchesType && matchesAcc && matchesCat && matchesTag && matchesPreset;
  });

  filtered.sort((a, b) => {
    if (sortBy === "date-desc") return new Date(b.date) - new Date(a.date) || b.id - a.id;
    if (sortBy === "date-asc") return new Date(a.date) - new Date(b.date) || a.id - b.id;
    if (sortBy === "amount-desc") return b.amount - a.amount;
    if (sortBy === "amount-asc") return a.amount - b.amount;
    return 0;
  });

  return filtered;
}

function renderLedger() {
  populateAccountDropdowns();
  renderTagChips();
  const filtered = getFilteredAndSortedTransactions();

  ledgerTableBody.innerHTML = "";
  ledgerCountLabel.textContent = `Showing ${filtered.length} of ${transactions.length} records`;

  if (filtered.length === 0) {
    ledgerEmptyState.classList.remove("hidden");
    bulkDeleteBtn.classList.add("hidden");
    pageNumberDisplay.textContent = "Page 0 of 0";
    return;
  }

  ledgerEmptyState.classList.add("hidden");

  // Virtual Pagination calculations
  const totalItems = filtered.length;
  const effectivePageSize = pageSize === "all" ? totalItems : parseInt(pageSize, 10);
  const totalPages = Math.ceil(totalItems / effectivePageSize) || 1;

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  pageNumberDisplay.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages;

  const startIndex = (currentPage - 1) * effectivePageSize;
  const pageSlice = filtered.slice(startIndex, startIndex + effectivePageSize);

  pageSlice.forEach(t => {
    const isInc = t.type === "income";
    const isTrans = t.type === "transfer";
    const meta = getCategoryMeta(t.category, t.type);
    const acc = getAccountMeta(t.account);
    const isChecked = selectedTransactionIds.has(t.id);

    const tagsMarkup = (t.tags || []).map(tg => `<span class="tag-badge">#${tg}</span>`).join(" ");
    const receiptMarkup = t.receipt ? `<button class="receipt-btn-link" title="View attached receipt" onclick="openReceiptViewer('${t.receipt}')">📄</button>` : `<span style="color:var(--text-subtle);">—</span>`;

    let categoryPill = `<span class="category-badge">${isTrans ? "🔄 Transfer" : `${meta.icon} ${meta.label}`}</span>`;
    if (Array.isArray(t.splits) && t.splits.length > 0) {
      categoryPill += `<span class="split-badge" title="${t.splits.map(s => s.category + ': ' + formatCurrency(s.amount)).join(', ')}" style="font-size:0.7rem; font-weight:700; color:var(--primary); margin-left:4px;">(Split)</span>`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="ledger-row-checkbox" data-id="${t.id}" ${isChecked ? "checked" : ""}></td>
      <td>${formatDateDisplay(t.date)}</td>
      <td>
        <strong>${t.text}</strong>
        ${tagsMarkup ? `<div style="margin-top:2px;">${tagsMarkup}</div>` : ""}
      </td>
      <td><span class="account-badge">${acc.name}</span></td>
      <td>${categoryPill}</td>
      <td><span class="badge ${isInc ? "balance-badge" : isTrans ? "balance-badge" : "balance-badge negative"}">${isInc ? "Income" : isTrans ? "Transfer" : "Expense"}</span></td>
      <td class="text-center">${receiptMarkup}</td>
      <td class="text-right"><strong class="${isInc ? "text-income" : isTrans ? "text-transfer" : "text-expense"}">${isInc ? "+" : isTrans ? "⇄" : "-"}${formatCurrency(t.amount)}</strong></td>
      <td class="text-center">
        <button class="btn-action" title="Edit" onclick="startEditTransaction(${t.id})">✏️</button>
        <button class="btn-action delete-btn" title="Delete" onclick="removeTransaction(${t.id})">🗑️</button>
      </td>
    `;
    ledgerTableBody.appendChild(tr);
  });

  updateBulkActions();

  ledgerTableBody.querySelectorAll(".ledger-row-checkbox").forEach(cb => {
    cb.addEventListener("change", (e) => {
      const id = parseFloat(e.target.getAttribute("data-id"));
      if (e.target.checked) selectedTransactionIds.add(id);
      else selectedTransactionIds.delete(id);
      updateBulkActions();
    });
  });
}

function updateBulkActions() {
  const count = selectedTransactionIds.size;
  selectedCountEl.textContent = count;
  bulkDeleteBtn.classList.toggle("hidden", count === 0);
}

function handleSelectAll(e) {
  const filtered = getFilteredAndSortedTransactions();
  if (e.target.checked) filtered.forEach(t => selectedTransactionIds.add(t.id));
  else filtered.forEach(t => selectedTransactionIds.delete(t.id));
  renderLedger();
}

function handleBulkDelete() {
  if (selectedTransactionIds.size === 0) return;
  if (confirm(`Delete ${selectedTransactionIds.size} selected transaction(s)?`)) {
    const toDelete = transactions.filter(t => selectedTransactionIds.has(t.id));
    toDelete.forEach(t => revertAccountImpact(t));

    transactions = transactions.filter(t => !selectedTransactionIds.has(t.id));
    selectedTransactionIds.clear();

    saveAccounts();
    saveTransactions();
    renderApp();
    sfx.play("delete");
    showToast("Bulk deletion completed", "info");
  }
}

// --- TRAVEL CURRENCY CONVERTER ---
function updateConvertCalculation() {
  const fAmt = parseFloat(convertForeignAmount.value) || 0;
  const rate = parseFloat(convertExchangeRate.value) || 1;
  const result = fAmt * rate;
  convertResultDisplay.textContent = formatCurrency(result);
}

function applyConvertedToTransaction() {
  const fAmt = parseFloat(convertForeignAmount.value) || 0;
  const rate = parseFloat(convertExchangeRate.value) || 1;
  const fCurr = convertForeignCurrency.value;
  const result = fAmt * rate;

  if (result > 0) {
    switchView("dashboard");
    amountInput.value = result.toFixed(2);
    tagsInput.value = tagsInput.value ? `${tagsInput.value}, travel-${fCurr}` : `travel-${fCurr}`;
    convertModal.classList.add("hidden");
    sfx.play("click");
    showToast(`Pasted ${formatCurrency(result)} (${fAmt} ${fCurr}) into transaction form!`, "success");
  }
}

// --- BANK CSV STATEMENT IMPORT ENGINE ---
function handleBankCsvFile(e) {
  const file = e.target.files[0];
  if (!file) {
    executeCsvImportBtn.disabled = true;
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const csvText = event.target.result;
      const lines = csvText.split(/\r\n|\n/).filter(line => line.trim());
      if (lines.length < 2) throw new Error("CSV has no data rows");

      const header = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
      const dateIdx = header.findIndex(h => /date|posted|time/i.test(h));
      const descIdx = header.findIndex(h => /desc|description|merchant|name|payee|memo/i.test(h));
      const amountIdx = header.findIndex(h => /amount|total|debit|credit/i.test(h));

      if (dateIdx === -1 || amountIdx === -1) {
        throw new Error("Could not automatically locate 'Date' and 'Amount' columns");
      }

      parsedCsvRecords = [];
      const samples = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map(p => p.trim().replace(/^["']|["']$/g, ""));
        const rawDate = parts[dateIdx];
        const rawDesc = descIdx !== -1 ? parts[descIdx] : "Bank Transaction";
        const rawAmount = parseFloat(parts[amountIdx]?.replace(/[$\s]/g, ""));

        if (!rawDate || isNaN(rawAmount)) continue;

        let parsedDate = new Date(rawDate);
        let isoDate = !isNaN(parsedDate) ? parsedDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

        const isIncome = rawAmount > 0;
        const absAmt = Math.abs(rawAmount);

        const record = {
          id: Date.now() + i + Math.random(),
          text: rawDesc || "Bank Transaction",
          amount: absAmt,
          type: isIncome ? "income" : "expense",
          category: isIncome ? "Salary" : "Food & Drinks",
          account: accounts[0]?.id || "checking",
          tags: ["bank-import"],
          receipt: null,
          date: isoDate
        };

        parsedCsvRecords.push(record);
        if (samples.length < 4) samples.push(`${isoDate} | ${rawDesc} | ${formatCurrency(absAmt)}`);
      }

      csvParsedRowCount.textContent = parsedCsvRecords.length;
      csvSampleRows.innerHTML = samples.join("<br>");
      csvPreviewContainer.classList.remove("hidden");
      executeCsvImportBtn.disabled = parsedCsvRecords.length === 0;
      sfx.play("click");
    } catch (err) {
      showToast("CSV Parse Error: " + err.message, "warning");
      executeCsvImportBtn.disabled = true;
    }
  };
  reader.readAsText(file);
}

function executeBankCsvImport() {
  if (parsedCsvRecords.length === 0) return;

  // Deduplicate against existing transactions by matching date, text, amount
  let addedCount = 0;
  parsedCsvRecords.forEach(rec => {
    const isDup = transactions.some(t => t.date === rec.date && t.text === rec.text && Math.abs(t.amount - rec.amount) < 0.01);
    if (!isDup) {
      transactions.unshift(rec);
      applyAccountImpact(rec);
      addedCount++;
    }
  });

  saveAccounts();
  saveTransactions();
  csvImportModal.classList.add("hidden");
  bankCsvFileInput.value = "";
  executeCsvImportBtn.disabled = true;
  parsedCsvRecords = [];
  renderApp();
  sfx.play("success");
  showToast(`Imported ${addedCount} new transactions!`, "success");
}

// --- BUDGETS & SAVINGS GOALS VIEW ---
function renderBudgetsAndGoals() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlyExpenses = {};
  transactions.filter(t => t.type === "expense" && t.date && t.date.startsWith(ym)).forEach(t => {
    if (Array.isArray(t.splits) && t.splits.length > 0) {
      t.splits.forEach(s => monthlyExpenses[s.category] = (monthlyExpenses[s.category] || 0) + s.amount);
    } else {
      monthlyExpenses[t.category] = (monthlyExpenses[t.category] || 0) + t.amount;
    }
  });

  fullBudgetProgressList.innerHTML = "";
  const budgeted = Object.keys(budgets).filter(k => budgets[k] > 0);

  if (budgeted.length === 0) {
    fullBudgetProgressList.innerHTML = `
      <div class="empty-budgets-hint">
        <p>No category budgets allocated yet.</p>
        <button class="btn btn-primary" style="margin-top:12px; width:auto;" onclick="openBudgetConfigModal()">🎯 Set Up Budgets</button>
      </div>
    `;
  } else {
    budgeted.forEach(catId => {
      const meta = getCategoryMeta(catId, "expense");
      const limit = budgets[catId];
      const spent = monthlyExpenses[catId] || 0;
      const pct = Math.round((spent / limit) * 100);

      let statusClass = "safe";
      let statusText = `${pct}%`;
      if (pct >= 100) { statusClass = "danger"; statusText = "Exceeded!"; }
      else if (pct >= 80) { statusClass = "warning"; statusText = `${pct}% Warning`; }

      const item = document.createElement("div");
      item.className = "budget-item";
      item.innerHTML = `
        <div class="budget-info-row">
          <div class="budget-cat-name">
            <span>${meta.icon}</span>
            <span>${meta.label}</span>
            <span class="budget-status-tag ${statusClass}">${statusText}</span>
          </div>
          <div class="budget-amounts">
            <strong>${formatCurrency(spent)}</strong> / ${formatCurrency(limit)}
          </div>
        </div>
        <div class="progress-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill ${statusClass}" style="width: ${Math.min(pct, 100)}%;"></div>
        </div>
      `;
      fullBudgetProgressList.appendChild(item);
    });
  }

  savingsGoalsList.innerHTML = "";
  if (savingsGoals.length === 0) {
    savingsGoalsList.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">No savings goals created yet.</div>`;
  } else {
    savingsGoals.forEach(g => {
      const pct = Math.min(Math.round((g.saved / g.target) * 100), 100);
      const card = document.createElement("div");
      card.className = "goal-card";
      card.innerHTML = `
        <div class="goal-header">
          <span class="goal-title">🎯 ${g.name}</span>
          <button class="btn-action delete-btn" title="Delete Goal" onclick="deleteGoal(${g.id})">🗑️</button>
        </div>
        <div class="goal-numbers">
          <span>Saved: <strong>${formatCurrency(g.saved)}</strong></span>
          <span>Target: ${formatCurrency(g.target)} (${pct}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill safe" style="width: ${pct}%;"></div>
        </div>
        <div class="goal-actions">
          <button class="btn-sm btn-outline" style="flex:1;" onclick="promptDepositGoal(${g.id})">💰 Deposit</button>
        </div>
      `;
      savingsGoalsList.appendChild(card);
    });
  }
}

function openBudgetConfigModal() {
  budgetInputsContainer.innerHTML = "";
  customCategories.expense.forEach(cat => {
    const currentVal = budgets[cat.id] || "";
    const group = document.createElement("div");
    group.className = "budget-input-group";
    group.innerHTML = `
      <label for="budget_${cat.id}">${cat.icon} ${cat.label}</label>
      <div class="input-with-symbol">
        <span class="currency-symbol">${currentCurrency}</span>
        <input type="number" id="budget_${cat.id}" data-cat="${cat.id}" value="${currentVal}" placeholder="0.00" min="0" step="1">
      </div>
    `;
    budgetInputsContainer.appendChild(group);
  });
  budgetModal.classList.remove("hidden");
}

function closeBudgetConfigModal() {
  budgetModal.classList.add("hidden");
}

function saveBudgets(e) {
  e.preventDefault();
  const inputs = budgetInputsContainer.querySelectorAll("input[data-cat]");
  const newBudgets = {};
  inputs.forEach(input => {
    const cat = input.getAttribute("data-cat");
    const val = parseFloat(input.value);
    if (!isNaN(val) && val > 0) newBudgets[cat] = val;
  });
  budgets = newBudgets;
  localStorage.setItem("expense_budgets", JSON.stringify(budgets));
  closeBudgetConfigModal();
  renderApp();
  sfx.play("success");
  showToast("Budgets saved successfully", "success");
}

function handleGoalSubmit(e) {
  e.preventDefault();
  const name = goalNameInput.value.trim();
  const target = parseFloat(goalTargetInput.value);
  const saved = parseFloat(goalSavedInput.value) || 0;
  const date = goalDateInput.value;

  if (!name || isNaN(target) || target <= 0) return;

  savingsGoals.push({ id: Date.now(), name, target, saved, date });
  localStorage.setItem("expense_goals", JSON.stringify(savingsGoals));
  goalModal.classList.add("hidden");
  goalForm.reset();
  renderBudgetsAndGoals();
  sfx.play("success");
  showToast("Savings Goal created!", "success");
}

function deleteGoal(id) {
  if (confirm("Delete this savings goal?")) {
    savingsGoals = savingsGoals.filter(g => g.id !== id);
    localStorage.setItem("expense_goals", JSON.stringify(savingsGoals));
    renderBudgetsAndGoals();
    sfx.play("delete");
    showToast("Goal removed", "info");
  }
}

function promptDepositGoal(id) {
  const goal = savingsGoals.find(g => g.id === id);
  if (!goal) return;
  const input = prompt(`Deposit money towards "${goal.name}". Enter amount:`, "100");
  const amount = parseFloat(input);
  if (!isNaN(amount) && amount > 0) {
    goal.saved += amount;
    localStorage.setItem("expense_goals", JSON.stringify(savingsGoals));
    renderBudgetsAndGoals();
    sfx.play("success");
    showToast(`Deposited ${formatCurrency(amount)} to ${goal.name}!`, "success");
  }
}

// --- SUBSCRIPTIONS & RECURRING BILLS CONTROLLER ---
function renderSubscriptions() {
  activeSubsCount.textContent = subscriptions.length;
  const monthlyBurn = subscriptions.reduce((sum, s) => {
    if (s.frequency === "yearly") return sum + (s.amount / 12);
    if (s.frequency === "weekly") return sum + (s.amount * 4.33);
    return sum + s.amount;
  }, 0);
  monthlySubsTotal.textContent = formatCurrency(monthlyBurn);

  const sortedByDate = [...subscriptions].sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));
  nextUpcomingSub.textContent = sortedByDate.length > 0 ? `${sortedByDate[0].name} (${formatDateDisplay(sortedByDate[0].nextDate)})` : "None";

  subscriptionsList.innerHTML = "";
  if (subscriptions.length === 0) {
    subscriptionsList.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">No active subscriptions or recurring bills tracked.</div>`;
    return;
  }

  subscriptions.forEach(s => {
    const meta = getCategoryMeta(s.category, "expense");
    const card = document.createElement("div");
    card.className = "subscription-card";
    card.innerHTML = `
      <div class="sub-card-top">
        <div>
          <span class="sub-name">${meta.icon} ${s.name}</span>
          <span class="cycle-pill" style="margin-left:8px;">${s.frequency}</span>
        </div>
        <span class="sub-price">${formatCurrency(s.amount)}</span>
      </div>
      <div class="sub-meta">
        <span>Next Due: <strong>${formatDateDisplay(s.nextDate)}</strong></span>
        <button class="btn-action delete-btn" title="Delete" onclick="deleteSubscription(${s.id})">🗑️</button>
      </div>
    `;
    subscriptionsList.appendChild(card);
  });
}

function handleSubSubmit(e) {
  e.preventDefault();
  const name = subNameInput.value.trim();
  const amount = parseFloat(subAmountInput.value);
  const frequency = subFrequencyInput.value;
  const category = subCategoryInput.value;
  const nextDate = subNextDateInput.value;

  if (!name || isNaN(amount) || amount <= 0 || !nextDate) return;

  subscriptions.push({ id: Date.now(), name, amount, frequency, category, nextDate });
  localStorage.setItem("expense_subs", JSON.stringify(subscriptions));
  subModal.classList.add("hidden");
  subForm.reset();
  renderSubscriptions();
  sfx.play("success");
  showToast("Subscription registered", "success");
}

function deleteSubscription(id) {
  if (confirm("Delete this subscription?")) {
    subscriptions = subscriptions.filter(s => s.id !== id);
    localStorage.setItem("expense_subs", JSON.stringify(subscriptions));
    renderSubscriptions();
    sfx.play("delete");
    showToast("Subscription deleted", "info");
  }
}

function processDueSubscriptions() {
  const today = new Date().toISOString().split("T")[0];
  const due = subscriptions.filter(s => s.nextDate <= today);

  if (due.length === 0) {
    showToast("No subscriptions are currently due!", "info");
    return;
  }

  due.forEach(s => {
    transactions.unshift({
      id: Date.now() + Math.random(),
      text: `${s.name} (Recurring)`,
      amount: s.amount,
      type: "expense",
      category: s.category,
      account: accounts[0]?.id || "checking",
      tags: ["subscription"],
      splits: null,
      receipt: null,
      date: s.nextDate
    });

    const acc = accounts[0];
    if (acc) acc.balance -= s.amount;

    const d = new Date(s.nextDate);
    if (s.frequency === "yearly") d.setFullYear(d.getFullYear() + 1);
    else if (s.frequency === "weekly") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    s.nextDate = d.toISOString().split("T")[0];
  });

  saveAccounts();
  saveTransactions();
  localStorage.setItem("expense_subs", JSON.stringify(subscriptions));
  renderApp();
  renderSubscriptions();
  sfx.play("success");
  showToast(`Processed ${due.length} recurring bills!`, "success");
}

// --- WEALTH FORECAST & COMPOUND INTEREST SIMULATOR ---
function updateForecastSimulator() {
  if (typeof Chart === "undefined") return;

  const principal = parseFloat(forecastInitial.value) || 0;
  const monthlyContrib = parseFloat(forecastMonthly.value) || 0;
  const annualRate = (parseFloat(forecastRate.value) || 7) / 100;
  const years = parseInt(forecastYears.value, 10) || 10;

  const labels = [];
  const principalData = [];
  const totalValueData = [];

  let currentVal = principal;
  let totalInvested = principal;
  const monthlyRate = annualRate / 12;

  labels.push("Year 0");
  principalData.push(principal);
  totalValueData.push(principal);

  for (let yr = 1; yr <= years; yr++) {
    for (let m = 0; m < 12; m++) {
      currentVal = (currentVal + monthlyContrib) * (1 + monthlyRate);
      totalInvested += monthlyContrib;
    }
    labels.push(`Year ${yr}`);
    principalData.push(Math.round(totalInvested));
    totalValueData.push(Math.round(currentVal));
  }

  const finalValue = Math.round(currentVal);
  const finalPrincipal = Math.round(totalInvested);
  const finalInterest = Math.max(finalValue - finalPrincipal, 0);

  forecastTotalValue.textContent = formatCurrency(finalValue);
  forecastTotalPrincipal.textContent = formatCurrency(finalPrincipal);
  forecastTotalInterest.textContent = formatCurrency(finalInterest);

  if (forecastChartInstance) forecastChartInstance.destroy();

  const ctx = forecastChartCanvas.getContext("2d");
  forecastChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Total Projected Value",
          data: totalValueData,
          borderColor: "#4f46e5",
          backgroundColor: "rgba(79, 70, 229, 0.15)",
          fill: true,
          tension: 0.3
        },
        {
          label: "Principal Invested",
          data: principalData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.15)",
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#94a3b8" } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${formatCurrency(c.raw)}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#94a3b8" } },
        y: {
          grid: { color: "#27354f" },
          ticks: { color: "#94a3b8", callback: v => `${currentCurrency}${v}` }
        }
      }
    }
  });
}

// --- ANALYTICS VIEW ---
function renderAnalyticsView() {
  updateForecastSimulator();
  if (typeof Chart === "undefined") return;

  const incomeTotal = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenseTotal = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netBalance = incomeTotal - expenseTotal;

  const monthlyExpenseMap = {};
  const categoryExpenses = {};
  transactions.filter(t => t.type === "expense").forEach(t => {
    if (t.date) {
      const ym = t.date.substring(0, 7);
      monthlyExpenseMap[ym] = (monthlyExpenseMap[ym] || 0) + t.amount;
    }
    if (Array.isArray(t.splits) && t.splits.length > 0) {
      t.splits.forEach(s => categoryExpenses[s.category] = (categoryExpenses[s.category] || 0) + s.amount);
    } else {
      categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
    }
  });

  const mKeys = Object.keys(monthlyExpenseMap);
  const avgMonthlyBurn = mKeys.length > 0 ? mKeys.reduce((a, b) => a + monthlyExpenseMap[b], 0) / mKeys.length : expenseTotal;
  const runwayMonths = (netBalance > 0 && avgMonthlyBurn > 0) ? (netBalance / avgMonthlyBurn).toFixed(1) : "0";

  let topCatName = "None";
  let topCatAmount = 0;
  for (const [cat, amt] of Object.entries(categoryExpenses)) {
    if (amt > topCatAmount) { topCatAmount = amt; topCatName = cat; }
  }

  const savingsRate = incomeTotal > 0 ? Math.round(((incomeTotal - expenseTotal) / incomeTotal) * 100) : 0;

  reportsAvgBurn.textContent = formatCurrency(avgMonthlyBurn);
  reportsRunway.textContent = `${runwayMonths} Mos`;
  reportsTopCategory.textContent = topCatName !== "None" ? `${topCatName} (${formatCurrency(topCatAmount)})` : "None";
  reportsSavingsRate.textContent = `${savingsRate}%`;

  reportsRecommendations.innerHTML = "";
  const tips = [];
  if (parseFloat(runwayMonths) < 3 && netBalance > 0) {
    tips.push({ icon: "🚨", text: "<strong>Emergency Runway Alert:</strong> You have less than 3 months of runway. Focus on trimming discretionary expenses." });
  } else if (parseFloat(runwayMonths) >= 6) {
    tips.push({ icon: "🌟", text: "<strong>Healthy Capital Buffer:</strong> You have 6+ months of reserves! Excess capital can be channeled into long-term investments." });
  }

  if (topCatAmount > 0 && expenseTotal > 0 && Math.round((topCatAmount / expenseTotal) * 100) >= 40) {
    tips.push({ icon: "⚠️", text: `<strong>Category Risk:</strong> <strong>${topCatName}</strong> represents ${Math.round((topCatAmount / expenseTotal) * 100)}% of your expenses.` });
  }

  if (savingsRate >= 20) {
    tips.push({ icon: "🎯", text: "<strong>50/30/20 Compliant:</strong> Meeting or exceeding the 20% net savings goal." });
  } else {
    tips.push({ icon: "💡", text: "<strong>Savings Target:</strong> Savings rate is below 20%. Consider auditing recurring subscriptions." });
  }

  tips.forEach(t => {
    const card = document.createElement("div");
    card.className = "tip-card";
    card.innerHTML = `<span class="tip-icon">${t.icon}</span> <div>${t.text}</div>`;
    reportsRecommendations.appendChild(card);
  });

  if (analyticsCashFlowInstance) analyticsCashFlowInstance.destroy();
  if (analyticsCategoryInstance) analyticsCategoryInstance.destroy();

  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(undefined, { month: "short" });
    months.push({ key, label });
  }
  const incData = months.map(m => transactions.filter(t => t.type === "income" && t.date && t.date.startsWith(m.key)).reduce((s, t) => s + t.amount, 0));
  const expData = months.map(m => transactions.filter(t => t.type === "expense" && t.date && t.date.startsWith(m.key)).reduce((s, t) => s + t.amount, 0));

  analyticsCashFlowInstance = new Chart(analyticsCashFlowCanvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: months.map(m => m.label),
      datasets: [
        { label: "Income", data: incData, backgroundColor: "#10b981", borderRadius: 4 },
        { label: "Expense", data: expData, backgroundColor: "#ef4444", borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#94a3b8" } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${formatCurrency(c.raw)}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#94a3b8" } },
        y: { grid: { color: "#27354f" }, ticks: { color: "#94a3b8", callback: v => `${currentCurrency}${v}` } }
      }
    }
  });

  const expTx = transactions.filter(t => t.type === "expense");
  const catMap = {};
  expTx.forEach(t => {
    if (Array.isArray(t.splits) && t.splits.length > 0) {
      t.splits.forEach(s => {
        const meta = getCategoryMeta(s.category, "expense");
        const name = `${meta.icon} ${meta.label}`;
        catMap[name] = (catMap[name] || 0) + s.amount;
      });
    } else {
      const meta = getCategoryMeta(t.category, "expense");
      const name = `${meta.icon} ${meta.label}`;
      catMap[name] = (catMap[name] || 0) + t.amount;
    }
  });

  const catLabels = Object.keys(catMap);
  const catData = Object.values(catMap);
  const palette = ["#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#64748b"];

  analyticsCategoryInstance = new Chart(analyticsCategoryCanvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: catLabels,
      datasets: [{
        data: catData,
        backgroundColor: palette.slice(0, catLabels.length),
        borderWidth: 2,
        borderColor: "#151d2f"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, padding: 8, color: "#94a3b8" } },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${formatCurrency(c.raw)}` } }
      },
      cutout: "60%"
    }
  });
}

// --- CUSTOM CATEGORIES MANAGER (SETTINGS) ---
function renderCustomCategoriesList() {
  customCategoriesList.innerHTML = "";
  customCategories.expense.forEach((cat, idx) => {
    const card = document.createElement("div");
    card.className = "custom-cat-card";
    const isDefault = DEFAULT_CATEGORIES.expense.some(d => d.id === cat.id);
    card.innerHTML = `
      <span>${cat.icon} ${cat.label}</span>
      ${!isDefault ? `<button class="btn-delete-cat" onclick="deleteCustomCategory('expense', ${idx})">🗑️</button>` : `<span style="font-size:0.75rem; color:var(--text-subtle);">Core</span>`}
    `;
    customCategoriesList.appendChild(card);
  });
}

function deleteCustomCategory(type, idx) {
  customCategories[type].splice(idx, 1);
  localStorage.setItem("expense_custom_categories", JSON.stringify(customCategories));
  populateFilterCategories();
  renderCustomCategoriesList();
  sfx.play("delete");
  showToast("Category removed", "info");
}

function handleAddCustomCategory() {
  const name = prompt("Enter new category name (e.g. Pet Care, Gaming):");
  if (!name) return;
  const icon = prompt("Enter an emoji icon for this category:", "🏷️") || "🏷️";
  const id = name.trim();
  customCategories.expense.push({ id, label: name.trim(), icon });
  localStorage.setItem("expense_custom_categories", JSON.stringify(customCategories));
  populateFilterCategories();
  renderCustomCategoriesList();
  sfx.play("success");
  showToast(`Added category: ${icon} ${name}`, "success");
}

// --- DATA EXPORT & IMPORT ---
function exportToCSV() {
  if (transactions.length === 0) {
    showToast("No records found to export", "info");
    return;
  }
  const headers = ["ID", "Date", "Description", "Type", "Account", "Category", "Amount", "Tags", "Currency"];
  const rows = transactions.map(t => [
    t.id,
    `"${t.date}"`,
    `"${t.text.replace(/"/g, '""')}"`,
    t.type,
    `"${t.account || ''}"`,
    `"${t.category}"`,
    t.amount.toFixed(2),
    `"${(t.tags || []).join(';')}"`,
    `"${currentCurrency}"`
  ]);
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const encoded = encodeURI(csvContent);
  const a = document.createElement("a");
  a.setAttribute("href", encoded);
  a.setAttribute("download", `financial_suite_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("CSV export ready", "success");
}

function exportToJSON() {
  const snapshot = {
    app: "Smart Expense Tracker Enterprise",
    version: "5.0",
    exportedAt: new Date().toISOString(),
    currency: currentCurrency,
    theme: currentThemeSetting,
    accounts,
    budgets,
    savingsGoals,
    subscriptions,
    customCategories,
    transactions
  };
  const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
  const a = document.createElement("a");
  a.setAttribute("href", jsonStr);
  a.setAttribute("download", `enterprise_finance_backup_${new Date().toISOString().split("T")[0]}.json`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("Full JSON backup exported", "success");
}

function handleJsonFileSelect(e) {
  const file = e.target.files[0];
  if (!file) {
    settingsRestoreBtn.disabled = true;
    return;
  }
  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const data = JSON.parse(event.target.result);
      if (!data || !Array.isArray(data.transactions)) {
        showToast("Invalid backup: missing transactions array", "warning");
        settingsRestoreBtn.disabled = true;
        return;
      }
      pendingImportData = data;
      settingsRestoreBtn.disabled = false;
      showToast(`Loaded backup with ${data.transactions.length} records`, "info");
    } catch (err) {
      showToast("Error parsing JSON: " + err.message, "warning");
      settingsRestoreBtn.disabled = true;
    }
  };
  reader.readAsText(file);
}

function executeRestore() {
  if (!pendingImportData) return;
  const mode = document.querySelector('input[name="settingsImportMode"]:checked').value;
  const incoming = pendingImportData.transactions.map(t => ({
    id: t.id || Date.now() + Math.random(),
    text: t.text || "Untitled",
    amount: Math.abs(t.amount),
    type: t.type || (t.amount < 0 ? "expense" : "income"),
    category: t.category || "Other Expense",
    account: t.account || "checking",
    targetAccount: t.targetAccount || null,
    tags: Array.isArray(t.tags) ? t.tags : [],
    splits: Array.isArray(t.splits) ? t.splits : null,
    receipt: t.receipt || null,
    date: t.date || new Date().toISOString().split("T")[0]
  }));

  if (mode === "replace") {
    transactions = incoming;
  } else {
    const existing = new Set(transactions.map(t => t.id));
    const newItems = incoming.filter(t => !existing.has(t.id));
    transactions = [...newItems, ...transactions];
  }

  if (Array.isArray(pendingImportData.accounts)) { accounts = pendingImportData.accounts; saveAccounts(); }
  if (pendingImportData.budgets) { budgets = { ...budgets, ...pendingImportData.budgets }; localStorage.setItem("expense_budgets", JSON.stringify(budgets)); }
  if (Array.isArray(pendingImportData.savingsGoals)) { savingsGoals = pendingImportData.savingsGoals; localStorage.setItem("expense_goals", JSON.stringify(savingsGoals)); }
  if (Array.isArray(pendingImportData.subscriptions)) { subscriptions = pendingImportData.subscriptions; localStorage.setItem("expense_subs", JSON.stringify(subscriptions)); }
  if (pendingImportData.customCategories) { customCategories = pendingImportData.customCategories; localStorage.setItem("expense_custom_categories", JSON.stringify(customCategories)); }

  if (pendingImportData.currency) {
    currentCurrency = pendingImportData.currency;
    localStorage.setItem("expense_currency", currentCurrency);
    currencySelect.value = currentCurrency;
    settingsCurrencySelect.value = currentCurrency;
  }

  saveTransactions();
  settingsJsonFileInput.value = "";
  settingsRestoreBtn.disabled = true;
  pendingImportData = null;
  renderApp();
  sfx.play("success");
  showToast(`Restored in '${mode}' mode!`, "success");
}

function wipeDatabase() {
  if (confirm("DANGER: This will permanently wipe all accounts, transactions, budgets, subscriptions, and goals! Proceed?")) {
    transactions = [];
    accounts = DEFAULT_ACCOUNTS;
    budgets = {};
    savingsGoals = [];
    subscriptions = [];
    hashedPin = null;
    customCategories = DEFAULT_CATEGORIES;
    localStorage.clear();
    saveTransactions();
    saveAccounts();
    renderApp();
    updatePinSettingsView();
    sfx.play("delete");
    showToast("Database reset to defaults", "warning");
  }
}

// --- THEME ENGINE (LIGHT, DARK, OLED, SYSTEM AUTO) ---
function applyThemeMode(mode) {
  currentThemeSetting = mode;
  localStorage.setItem("expense_theme_mode", mode);
  themeSelect.value = mode;

  let effectiveTheme = mode;
  if (mode === "system") {
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    effectiveTheme = prefersDark ? "dark" : "light";
  }

  document.documentElement.setAttribute("data-theme", effectiveTheme);
  if (dashChartInstance) { dashChartInstance.destroy(); dashChartInstance = null; renderDashChart(); }
}

function handleCurrencyChange(val) {
  currentCurrency = val;
  localStorage.setItem("expense_currency", currentCurrency);
  currencySelect.value = currentCurrency;
  settingsCurrencySelect.value = currentCurrency;
  inputCurrencySymbol.textContent = currentCurrency;
  renderApp();
  sfx.play("click");
  showToast(`Currency set to ${currentCurrency}`, "info");
}

function saveTransactions() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

// --- GLOBAL RENDER ---
function renderApp() {
  if (activeView === "dashboard") renderDashboard();
  else if (activeView === "accounts") renderAccountsView();
  else if (activeView === "transactions") renderLedger();
  else if (activeView === "budgets") renderBudgetsAndGoals();
  else if (activeView === "subscriptions") renderSubscriptions();
  else if (activeView === "analytics") renderAnalyticsView();
}

// --- SERVICE WORKER & SHORTCUTS ---
function setupServiceWorkerAndNetwork() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  function updateNet() {
    offlineBanner.classList.toggle("hidden", navigator.onLine);
  }
  window.addEventListener("online", updateNet);
  window.addEventListener("offline", updateNet);
  updateNet();
}

function setupShortcuts() {
  window.addEventListener("keydown", (e) => {
    if (isLocked) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
      e.preventDefault();
      switchView("dashboard");
      textInput.focus();
      textInput.select();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      openBudgetConfigModal();
    }
    if (e.key === "Escape") {
      closeBudgetConfigModal();
      goalModal.classList.add("hidden");
      subModal.classList.add("hidden");
      accountModal.classList.add("hidden");
      receiptModal.classList.add("hidden");
      convertModal.classList.add("hidden");
      csvImportModal.classList.add("hidden");
      if (editingId !== null) resetForm();
    }
  });
}

// --- INITIALIZATION ---
function init() {
  dateInput.value = new Date().toISOString().split("T")[0];
  currencySelect.value = currentCurrency;
  settingsCurrencySelect.value = currentCurrency;
  inputCurrencySymbol.textContent = currentCurrency;

  applyThemeMode(currentThemeSetting);
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (currentThemeSetting === "system") applyThemeMode("system");
    });
  }

  setFormType("expense");
  populateFilterCategories();
  populateAccountDropdowns();

  // Navigation Tabs
  navTabs.forEach(tab => {
    tab.addEventListener("click", () => switchView(tab.getAttribute("data-view")));
  });

  // Header quick buttons
  headerQuickAddBtn.addEventListener("click", () => {
    switchView("dashboard");
    textInput.focus();
  });
  goToBudgetsTabBtn.addEventListener("click", () => switchView("budgets"));
  goToLedgerBtn.addEventListener("click", () => switchView("transactions"));

  themeSelect.addEventListener("change", (e) => applyThemeMode(e.target.value));
  headerConvertBtn.addEventListener("click", () => {
    convertModal.classList.remove("hidden");
    updateConvertCalculation();
  });

  // Smart natural language add
  smartAddBtn.addEventListener("click", handleSmartAdd);
  smartInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSmartAdd(); });

  // Dashboard Controls
  transactionForm.addEventListener("submit", handleFormSubmit);
  cancelEditBtn.addEventListener("click", resetForm);
  typeExpenseBtn.addEventListener("click", () => setFormType("expense"));
  typeIncomeBtn.addEventListener("click", () => setFormType("income"));
  typeTransferBtn.addEventListener("click", () => setFormType("transfer"));
  currencySelect.addEventListener("change", (e) => handleCurrencyChange(e.target.value));

  // Split Category Controls
  splitCheckbox.addEventListener("change", handleSplitToggle);
  addSplitRowBtn.addEventListener("click", () => addSplitRow(null, ""));
  amountInput.addEventListener("input", updateSplitCalculations);

  receiptFileInput.addEventListener("change", handleReceiptUpload);
  removeReceiptBtn.addEventListener("click", clearReceiptPreview);

  chartTabCategory.addEventListener("click", () => {
    chartTabCategory.classList.add("active");
    chartTabCashflow.classList.remove("active");
    activeChartTab = "category";
    renderDashChart();
  });
  chartTabCashflow.addEventListener("click", () => {
    chartTabCashflow.classList.add("active");
    chartTabCategory.classList.remove("active");
    activeChartTab = "cashflow";
    renderDashChart();
  });

  // Accounts Controls
  openNewAccountModalBtn.addEventListener("click", () => accountModal.classList.remove("hidden"));
  closeAccountModalBtn.addEventListener("click", () => accountModal.classList.add("hidden"));
  cancelAccountBtn.addEventListener("click", () => accountModal.classList.add("hidden"));
  accountForm.addEventListener("submit", handleAccountSubmit);

  // Ledger Controls & Pagination
  searchInput.addEventListener("input", () => { currentPage = 1; renderLedger(); });
  filterTypeSelect.addEventListener("change", () => { currentPage = 1; renderLedger(); });
  filterAccountSelect.addEventListener("change", () => { currentPage = 1; renderLedger(); });
  filterCategorySelect.addEventListener("change", () => { currentPage = 1; renderLedger(); });
  sortBySelect.addEventListener("change", () => { currentPage = 1; renderLedger(); });
  selectAllCheckbox.addEventListener("change", handleSelectAll);
  bulkDeleteBtn.addEventListener("click", handleBulkDelete);
  ledgerPrintBtn.addEventListener("click", () => window.print());
  exportCsvBtn.addEventListener("click", exportToCSV);

  pageSizeSelect.addEventListener("change", (e) => {
    pageSize = e.target.value;
    currentPage = 1;
    renderLedger();
  });
  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; renderLedger(); }
  });
  nextPageBtn.addEventListener("click", () => {
    currentPage++;
    renderLedger();
  });

  importCsvBtn.addEventListener("click", () => csvImportModal.classList.remove("hidden"));
  closeCsvImportModalBtn.addEventListener("click", () => csvImportModal.classList.add("hidden"));
  cancelCsvImportBtn.addEventListener("click", () => csvImportModal.classList.add("hidden"));
  bankCsvFileInput.addEventListener("change", handleBankCsvFile);
  executeCsvImportBtn.addEventListener("click", executeBankCsvImport);

  datePresetPills.forEach(pill => {
    pill.addEventListener("click", () => {
      datePresetPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeDatePreset = pill.getAttribute("data-range");
      currentPage = 1;
      renderLedger();
    });
  });

  // Currency Converter Modal Controls
  closeConvertModalBtn.addEventListener("click", () => convertModal.classList.add("hidden"));
  closeConvertActionBtn.addEventListener("click", () => convertModal.classList.add("hidden"));
  convertForeignAmount.addEventListener("input", updateConvertCalculation);
  convertExchangeRate.addEventListener("input", updateConvertCalculation);
  applyConvertedToFormBtn.addEventListener("click", applyConvertedToTransaction);

  // Budgets & Goals Controls
  openBudgetModalBtn.addEventListener("click", openBudgetConfigModal);
  closeBudgetModalBtn.addEventListener("click", closeBudgetConfigModal);
  cancelBudgetBtn.addEventListener("click", closeBudgetConfigModal);
  budgetConfigForm.addEventListener("submit", saveBudgets);

  openGoalModalBtn.addEventListener("click", () => goalModal.classList.remove("hidden"));
  closeGoalModalBtn.addEventListener("click", () => goalModal.classList.add("hidden"));
  cancelGoalBtn.addEventListener("click", () => goalModal.classList.add("hidden"));
  goalForm.addEventListener("submit", handleGoalSubmit);

  // Subscriptions Controls
  openSubscriptionModalBtn.addEventListener("click", () => {
    subNextDateInput.value = new Date().toISOString().split("T")[0];
    subModal.classList.remove("hidden");
  });
  closeSubModalBtn.addEventListener("click", () => subModal.classList.add("hidden"));
  cancelSubBtn.addEventListener("click", () => subModal.classList.add("hidden"));
  subForm.addEventListener("submit", handleSubSubmit);
  processDueSubsBtn.addEventListener("click", processDueSubscriptions);

  // Forecast simulator inputs
  [forecastInitial, forecastMonthly, forecastRate, forecastYears].forEach(el => {
    el.addEventListener("input", updateForecastSimulator);
  });

  // Settings Controls
  settingsCurrencySelect.addEventListener("change", (e) => handleCurrencyChange(e.target.value));
  addNewCustomCatBtn.addEventListener("click", handleAddCustomCategory);

  audioToggle.checked = localStorage.getItem("expense_audio") !== "false";
  audioToggle.addEventListener("change", (e) => {
    localStorage.setItem("expense_audio", e.target.checked);
    showToast(`Audio feedback ${e.target.checked ? "enabled" : "muted"}`, "info");
  });

  settingsExportJsonBtn.addEventListener("click", exportToJSON);
  settingsExportCsvBtn.addEventListener("click", exportToCSV);
  settingsJsonFileInput.addEventListener("change", handleJsonFileSelect);
  settingsRestoreBtn.addEventListener("click", executeRestore);
  settingsWipeBtn.addEventListener("click", wipeDatabase);

  // Receipt Modal
  closeReceiptModalBtn.addEventListener("click", () => receiptModal.classList.add("hidden"));

  // Backdrop dismissal
  window.addEventListener("click", (e) => {
    if (e.target === budgetModal) closeBudgetConfigModal();
    if (e.target === goalModal) goalModal.classList.add("hidden");
    if (e.target === subModal) subModal.classList.add("hidden");
    if (e.target === accountModal) accountModal.classList.add("hidden");
    if (e.target === receiptModal) receiptModal.classList.add("hidden");
    if (e.target === convertModal) convertModal.classList.add("hidden");
    if (e.target === csvImportModal) csvImportModal.classList.add("hidden");
  });

  setupPinListeners();
  setupServiceWorkerAndNetwork();
  setupShortcuts();

  if (hashedPin) lockApp();
  else pinLockOverlay.classList.add("hidden");

  renderApp();
}

// Window bindings
window.startEditTransaction = startEditTransaction;
window.removeTransaction = removeTransaction;
window.openBudgetConfigModal = openBudgetConfigModal;
window.deleteGoal = deleteGoal;
window.promptDepositGoal = promptDepositGoal;
window.deleteSubscription = deleteSubscription;
window.deleteAccount = deleteAccount;
window.promptAdjustBalance = promptAdjustBalance;
window.openReceiptViewer = openReceiptViewer;
window.deleteCustomCategory = deleteCustomCategory;

init();
