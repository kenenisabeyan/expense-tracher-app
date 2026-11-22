/**
 * SMART EXPENSE TRACKER PRO - FINANCIAL SUITE
 * Multi-View Architecture:
 * 1. Dashboard (Overview, KPIs, Quick Add, Budget Snapshot, Charts, Recent Activity)
 * 2. Transactions Ledger (Full Tabular View, Bulk Select/Delete, Search, Date Range, Print)
 * 3. Budgets & Savings Goals (Category Limits + Savings Milestones with Deposits)
 * 4. Subscriptions & Recurring Bills (Recurrence tracker + Auto-process due bills)
 * 5. In-Depth Analytics (Dual Canvas Visualizers + Financial Health / Runway heuristics)
 * 6. Settings & Data Sovereignty (Theme, Currency, JSON Backup/Restore, Danger Zone)
 */

// --- CATEGORY DEFINITIONS ---
const CATEGORIES = {
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

const DEFAULT_BUDGETS = {
  "Food & Drinks": 300,
  "Transportation": 120,
  "Shopping": 150,
  "Housing & Bills": 500,
  "Entertainment": 80
};

const DEFAULT_GOALS = [
  { id: 1, name: "Emergency Buffer", target: 3000, saved: 1200, date: "2026-12-31" },
  { id: 2, name: "Holiday Travel", target: 800, saved: 450, date: "2026-12-15" }
];

const DEFAULT_SUBS = [
  { id: 1, name: "Netflix Subscription", amount: 15.99, frequency: "monthly", category: "Entertainment", nextDate: "2026-12-05" },
  { id: 2, name: "Gym Membership", amount: 45.00, frequency: "monthly", category: "Healthcare", nextDate: "2026-12-01" }
];

// --- APPLICATION STATE ---
let activeView = "dashboard";
let currentType = "expense";
let editingId = null;
let currentCurrency = localStorage.getItem("expense_currency") || "$";
let currentTheme = localStorage.getItem("expense_theme") || "light";
let budgets = JSON.parse(localStorage.getItem("expense_budgets")) || DEFAULT_BUDGETS;
let savingsGoals = JSON.parse(localStorage.getItem("expense_goals")) || DEFAULT_GOALS;
let subscriptions = JSON.parse(localStorage.getItem("expense_subs")) || DEFAULT_SUBS;

let activeChartTab = "category";
let activeDatePreset = "all";
let selectedTransactionIds = new Set();
let pendingImportData = null;

// Chart Instances
let dashChartInstance = null;
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
  date: t.date || new Date().toISOString().split("T")[0]
}));

// --- DOM ELEMENTS ---
const toastContainer = document.getElementById("toastContainer");
const offlineBanner = document.getElementById("offlineBanner");
const currencySelect = document.getElementById("currencySelect");
const themeToggleBtn = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const navTabs = document.querySelectorAll(".nav-tab");
const viewContainers = document.querySelectorAll(".view-container");

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

const transactionForm = document.getElementById("transactionForm");
const textInput = document.getElementById("text");
const amountInput = document.getElementById("amount");
const categorySelect = document.getElementById("category");
const dateInput = document.getElementById("date");
const submitBtnText = document.getElementById("submitBtnText");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formTitle = document.getElementById("formTitle");
const editModeNotice = document.getElementById("editModeNotice");
const typeExpenseBtn = document.getElementById("typeExpenseBtn");
const typeIncomeBtn = document.getElementById("typeIncomeBtn");
const inputCurrencySymbol = document.getElementById("inputCurrencySymbol");

const dashBudgetProgressList = document.getElementById("dashBudgetProgressList");
const dashMonthLabel = document.getElementById("dashMonthLabel");
const dashRecentList = document.getElementById("dashRecentList");
const dashRecentCount = document.getElementById("dashRecentCount");
const categoryChartCanvas = document.getElementById("categoryChart");
const chartPlaceholder = document.getElementById("chartPlaceholder");
const chartTabCategory = document.getElementById("chartTabCategory");
const chartTabCashflow = document.getElementById("chartTabCashflow");

// Ledger Elements
const ledgerTableBody = document.getElementById("ledgerTableBody");
const ledgerCountLabel = document.getElementById("ledgerCountLabel");
const selectAllCheckbox = document.getElementById("selectAllCheckbox");
const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
const selectedCountEl = document.getElementById("selectedCount");
const ledgerEmptyState = document.getElementById("ledgerEmptyState");
const searchInput = document.getElementById("searchInput");
const filterTypeSelect = document.getElementById("filterType");
const filterCategorySelect = document.getElementById("filterCategory");
const sortBySelect = document.getElementById("sortBy");
const datePresetPills = document.querySelectorAll(".preset-pill");
const ledgerPrintBtn = document.getElementById("ledgerPrintBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");

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

// Analytics View Elements
const analyticsCashFlowCanvas = document.getElementById("analyticsCashFlowChart");
const analyticsCategoryCanvas = document.getElementById("analyticsCategoryChart");
const reportsAvgBurn = document.getElementById("reportsAvgBurn");
const reportsRunway = document.getElementById("reportsRunway");
const reportsTopCategory = document.getElementById("reportsTopCategory");
const reportsSavingsRate = document.getElementById("reportsSavingsRate");
const reportsRecommendations = document.getElementById("reportsRecommendations");

// Settings View Elements
const settingsCurrencySelect = document.getElementById("settingsCurrencySelect");
const settingsThemeToggle = document.getElementById("settingsThemeToggle");
const settingsExportJsonBtn = document.getElementById("settingsExportJsonBtn");
const settingsExportCsvBtn = document.getElementById("settingsExportCsvBtn");
const settingsJsonFileInput = document.getElementById("settingsJsonFileInput");
const settingsRestoreBtn = document.getElementById("settingsRestoreBtn");
const settingsWipeBtn = document.getElementById("settingsWipeBtn");

// Quick Nav Buttons
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
  const pool = CATEGORIES[type] || [...CATEGORIES.expense, ...CATEGORIES.income];
  const found = pool.find(c => c.id === categoryName || c.label === categoryName);
  if (found) return found;
  return { id: categoryName, label: categoryName, icon: type === "income" ? "💵" : "📦" };
}

function showToast(message, type = "info", duration = 3000) {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  let icon = "ℹ️";
  if (type === "success") icon = "✅";
  if (type === "warning") icon = "⚠️";
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px) scale(0.95)";
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}

// --- VIEW NAVIGATION CONTROLLER ---
function switchView(viewName) {
  activeView = viewName;
  navTabs.forEach(tab => {
    tab.classList.toggle("active", tab.getAttribute("data-view") === viewName);
  });
  viewContainers.forEach(c => {
    c.classList.toggle("active", c.id === `view-${viewName}`);
  });

  if (viewName === "dashboard") {
    renderDashboard();
  } else if (viewName === "transactions") {
    renderLedger();
  } else if (viewName === "budgets") {
    renderBudgetsAndGoals();
  } else if (viewName === "subscriptions") {
    renderSubscriptions();
  } else if (viewName === "analytics") {
    renderAnalyticsView();
  } else if (viewName === "settings") {
    settingsCurrencySelect.value = currentCurrency;
  }
}

// --- CATEGORY SELECTOR INITIALIZERS ---
function populateCategorySelect(type) {
  categorySelect.innerHTML = "";
  const options = CATEGORIES[type] || [];
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
    ...CATEGORIES.expense.map(c => ({ ...c, kind: "Expense" })),
    ...CATEGORIES.income.map(c => ({ ...c, kind: "Income" }))
  ];
  allCategories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = `${cat.icon} ${cat.label} (${cat.kind})`;
    filterCategorySelect.appendChild(opt);
  });
  if (currentSelection) filterCategorySelect.value = currentSelection;

  // Subscriptions category select
  subCategoryInput.innerHTML = "";
  CATEGORIES.expense.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.icon} ${c.label}`;
    subCategoryInput.appendChild(opt);
  });
}

// --- DASHBOARD VIEW & KPI CALCULATIONS ---
function setFormType(type) {
  currentType = type;
  if (type === "expense") {
    typeExpenseBtn.classList.add("active");
    typeIncomeBtn.classList.remove("active");
  } else {
    typeIncomeBtn.classList.add("active");
    typeExpenseBtn.classList.remove("active");
  }
  populateCategorySelect(type);
}

function resetForm() {
  transactionForm.reset();
  dateInput.value = new Date().toISOString().split("T")[0];
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
  dateInput.value = target.date;
  setFormType(target.type);
  categorySelect.value = target.category;
  transactionForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function handleFormSubmit(e) {
  e.preventDefault();
  const textVal = textInput.value.trim();
  const amountVal = parseFloat(amountInput.value);
  const categoryVal = categorySelect.value;
  const dateVal = dateInput.value;

  if (!textVal || isNaN(amountVal) || amountVal <= 0 || !dateVal) {
    showToast("Please enter a valid description, date, and amount > 0", "warning");
    return;
  }

  if (editingId !== null) {
    transactions = transactions.map(t => (t.id === editingId ? {
      ...t,
      text: textVal,
      amount: amountVal,
      type: currentType,
      category: categoryVal,
      date: dateVal
    } : t));
    showToast("Transaction updated successfully", "success");
  } else {
    transactions.unshift({
      id: Date.now(),
      text: textVal,
      amount: amountVal,
      type: currentType,
      category: categoryVal,
      date: dateVal
    });
    showToast("Transaction added successfully", "success");
  }

  saveTransactions();
  resetForm();
  renderApp();
}

function removeTransaction(id) {
  if (confirm("Are you sure you want to delete this transaction?")) {
    transactions = transactions.filter(t => t.id !== id);
    selectedTransactionIds.delete(id);
    if (editingId === id) resetForm();
    saveTransactions();
    renderApp();
    showToast("Transaction removed", "info");
  }
}

function renderDashboard() {
  const incomeTotal = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenseTotal = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netBalance = incomeTotal - expenseTotal;

  dashBalance.textContent = formatCurrency(netBalance);
  dashIncome.textContent = formatCurrency(incomeTotal);
  dashExpense.textContent = formatCurrency(expenseTotal);

  const incCount = transactions.filter(t => t.type === "income").length;
  const expCount = transactions.filter(t => t.type === "expense").length;
  dashIncomeCount.textContent = `${incCount} transaction${incCount === 1 ? "" : "s"}`;
  dashExpenseCount.textContent = `${expCount} transaction${expCount === 1 ? "" : "s"}`;

  if (netBalance >= 0) {
    dashBalanceBadge.textContent = "Positive";
    dashBalanceBadge.classList.remove("negative");
  } else {
    dashBalanceBadge.textContent = "Deficit";
    dashBalanceBadge.classList.add("negative");
  }

  if (incomeTotal > 0) {
    const rate = Math.round(((incomeTotal - expenseTotal) / incomeTotal) * 100);
    dashSavingsRate.textContent = `${rate}%`;
  } else {
    dashSavingsRate.textContent = expenseTotal > 0 ? "-100%" : "0%";
  }

  // Runway calculation
  const monthlyExpenseMap = {};
  transactions.filter(t => t.type === "expense" && t.date).forEach(t => {
    const ym = t.date.substring(0, 7);
    monthlyExpenseMap[ym] = (monthlyExpenseMap[ym] || 0) + t.amount;
  });
  const mKeys = Object.keys(monthlyExpenseMap);
  const avgMonthlyBurn = mKeys.length > 0 ? mKeys.reduce((a, b) => a + monthlyExpenseMap[b], 0) / mKeys.length : expenseTotal;

  if (netBalance <= 0) {
    dashRunway.textContent = "0 Mos";
    dashRunwaySubtext.textContent = "Net balance in deficit";
  } else if (avgMonthlyBurn <= 0) {
    dashRunway.textContent = "∞ Mos";
    dashRunwaySubtext.textContent = "No expenses recorded";
  } else {
    const mos = (netBalance / avgMonthlyBurn).toFixed(1);
    dashRunway.textContent = `${mos} Mos`;
    dashRunwaySubtext.textContent = `Avg burn: ${formatCurrency(avgMonthlyBurn)}/mo`;
  }

  // Dashboard Month Budget Snapshot
  renderBudgetSnapshot();

  // Recent 5 Transactions
  renderRecentTransactions();

  // Dashboard Visualizer Chart
  renderDashChart();
}

function renderBudgetSnapshot() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  dashMonthLabel.textContent = now.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const monthlyExpenses = {};
  transactions.filter(t => t.type === "expense" && t.date && t.date.startsWith(ym)).forEach(t => {
    monthlyExpenses[t.category] = (monthlyExpenses[t.category] || 0) + t.amount;
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

  // Take top 4 for dashboard snapshot
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
    const meta = getCategoryMeta(t.category, t.type);
    const li = document.createElement("li");
    li.className = `transaction-item ${isInc ? "income-item" : "expense-item"}`;
    li.innerHTML = `
      <div class="item-left">
        <div class="category-icon-box">${meta.icon}</div>
        <div class="item-info">
          <div class="item-title">${t.text}</div>
          <div class="item-meta">
            <span class="category-badge">${meta.label}</span>
            <span>•</span>
            <span>${formatDateDisplay(t.date)}</span>
          </div>
        </div>
      </div>
      <div class="item-right">
        <div class="item-amount ${isInc ? "income" : "expense"}">
          ${isInc ? "+" : "-"}${formatCurrency(t.amount)}
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

// --- DASHBOARD DUAL CHART ---
function renderDashChart() {
  if (typeof Chart === "undefined") return;

  if (dashChartInstance) {
    dashChartInstance.destroy();
    dashChartInstance = null;
  }

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
    if (expTx.length === 0) {
      categoryChartCanvas.style.display = "none";
      chartPlaceholder.style.display = "block";
      return;
    }
    const catMap = {};
    expTx.forEach(t => {
      const meta = getCategoryMeta(t.category, "expense");
      const name = `${meta.icon} ${meta.label}`;
      catMap[name] = (catMap[name] || 0) + t.amount;
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
          borderColor: currentTheme === "dark" ? "#151d2f" : "#ffffff"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 12,
              padding: 8,
              color: currentTheme === "dark" ? "#94a3b8" : "#64748b",
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (c) => ` ${c.label}: ${formatCurrency(c.raw)}`
            }
          }
        },
        cutout: "65%"
      }
    });
  } else {
    // 6-Month Cash Flow Trend
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString(undefined, { month: "short" });
      months.push({ key, label });
    }

    const incomeData = months.map(m => transactions.filter(t => t.type === "income" && t.date && t.date.startsWith(m.key)).reduce((s, t) => s + t.amount, 0));
    const expenseData = months.map(m => transactions.filter(t => t.type === "expense" && t.date && t.date.startsWith(m.key)).reduce((s, t) => s + t.amount, 0));

    dashChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: months.map(m => m.label),
        datasets: [
          { label: "Income", data: incomeData, backgroundColor: "#10b981", borderRadius: 4 },
          { label: "Expense", data: expenseData, backgroundColor: "#ef4444", borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              boxWidth: 12,
              color: currentTheme === "dark" ? "#94a3b8" : "#64748b",
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (c) => ` ${c.dataset.label}: ${formatCurrency(c.raw)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: currentTheme === "dark" ? "#94a3b8" : "#64748b" } },
          y: {
            grid: { color: currentTheme === "dark" ? "#27354f" : "#e2e8f0" },
            ticks: {
              color: currentTheme === "dark" ? "#94a3b8" : "#64748b",
              callback: (v) => `${currentCurrency}${v}`
            }
          }
        }
      }
    });
  }
}

// --- TRANSACTIONS LEDGER (FULL PAGE) ---
function getFilteredAndSortedTransactions() {
  const query = searchInput.value.toLowerCase().trim();
  const filterType = filterTypeSelect.value;
  const filterCat = filterCategorySelect.value;
  const sortBy = sortBySelect.value;

  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastYM = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const currentYear = `${now.getFullYear()}-`;

  let filtered = transactions.filter(t => {
    const matchesSearch = !query || t.text.toLowerCase().includes(query) || t.category.toLowerCase().includes(query);
    const matchesType = filterType === "all" || t.type === filterType;
    const matchesCategory = filterCat === "all" || t.category === filterCat;

    let matchesPreset = true;
    if (activeDatePreset === "this-month") matchesPreset = t.date && t.date.startsWith(currentYM);
    else if (activeDatePreset === "last-month") matchesPreset = t.date && t.date.startsWith(lastYM);
    else if (activeDatePreset === "this-year") matchesPreset = t.date && t.date.startsWith(currentYear);

    return matchesSearch && matchesType && matchesCategory && matchesPreset;
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
  const filtered = getFilteredAndSortedTransactions();
  ledgerTableBody.innerHTML = "";
  ledgerCountLabel.textContent = `Showing ${filtered.length} of ${transactions.length} records`;

  if (filtered.length === 0) {
    ledgerEmptyState.classList.remove("hidden");
    bulkDeleteBtn.classList.add("hidden");
    return;
  }

  ledgerEmptyState.classList.add("hidden");

  filtered.forEach(t => {
    const isInc = t.type === "income";
    const meta = getCategoryMeta(t.category, t.type);
    const isChecked = selectedTransactionIds.has(t.id);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="ledger-row-checkbox" data-id="${t.id}" ${isChecked ? "checked" : ""}></td>
      <td>${formatDateDisplay(t.date)}</td>
      <td><strong>${t.text}</strong></td>
      <td><span class="category-badge">${meta.icon} ${meta.label}</span></td>
      <td><span class="badge ${isInc ? "balance-badge" : "balance-badge negative"}">${isInc ? "Income" : "Expense"}</span></td>
      <td class="text-right"><strong class="${isInc ? "text-income" : "text-expense"}">${isInc ? "+" : "-"}${formatCurrency(t.amount)}</strong></td>
      <td class="text-center">
        <button class="btn-action" title="Edit" onclick="startEditTransaction(${t.id})">✏️</button>
        <button class="btn-action delete-btn" title="Delete" onclick="removeTransaction(${t.id})">🗑️</button>
      </td>
    `;
    ledgerTableBody.appendChild(tr);
  });

  updateBulkActions();

  // Attach row checkbox listeners
  const rowCheckboxes = ledgerTableBody.querySelectorAll(".ledger-row-checkbox");
  rowCheckboxes.forEach(cb => {
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
  if (count > 0) {
    bulkDeleteBtn.classList.remove("hidden");
  } else {
    bulkDeleteBtn.classList.add("hidden");
  }
}

function handleSelectAll(e) {
  const filtered = getFilteredAndSortedTransactions();
  if (e.target.checked) {
    filtered.forEach(t => selectedTransactionIds.add(t.id));
  } else {
    filtered.forEach(t => selectedTransactionIds.delete(t.id));
  }
  renderLedger();
}

function handleBulkDelete() {
  if (selectedTransactionIds.size === 0) return;
  if (confirm(`Delete ${selectedTransactionIds.size} selected transaction(s)?`)) {
    transactions = transactions.filter(t => !selectedTransactionIds.has(t.id));
    selectedTransactionIds.clear();
    saveTransactions();
    renderApp();
    showToast("Selected transactions deleted", "info");
  }
}

// --- BUDGETS & SAVINGS GOALS VIEW ---
function renderBudgetsAndGoals() {
  // Full monthly budgets
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlyExpenses = {};
  transactions.filter(t => t.type === "expense" && t.date && t.date.startsWith(ym)).forEach(t => {
    monthlyExpenses[t.category] = (monthlyExpenses[t.category] || 0) + t.amount;
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

  // Savings Goals Grid
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

// Budget Modal Handlers
function openBudgetConfigModal() {
  budgetInputsContainer.innerHTML = "";
  CATEGORIES.expense.forEach(cat => {
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
  showToast("Budgets saved successfully", "success");
}

// Goals Handlers
function handleGoalSubmit(e) {
  e.preventDefault();
  const name = goalNameInput.value.trim();
  const target = parseFloat(goalTargetInput.value);
  const saved = parseFloat(goalSavedInput.value) || 0;
  const date = goalDateInput.value;

  if (!name || isNaN(target) || target <= 0) {
    showToast("Please enter a valid goal name and target", "warning");
    return;
  }

  savingsGoals.push({ id: Date.now(), name, target, saved, date });
  localStorage.setItem("expense_goals", JSON.stringify(savingsGoals));
  goalModal.classList.add("hidden");
  goalForm.reset();
  renderBudgetsAndGoals();
  showToast("Savings Goal created!", "success");
}

function deleteGoal(id) {
  if (confirm("Delete this savings goal?")) {
    savingsGoals = savingsGoals.filter(g => g.id !== id);
    localStorage.setItem("expense_goals", JSON.stringify(savingsGoals));
    renderBudgetsAndGoals();
    showToast("Goal removed", "info");
  }
}

function promptDepositGoal(id) {
  const goal = savingsGoals.find(g => g.id === id);
  if (!goal) return;
  const input = prompt(`Deposit money towards "${goal.name}". Enter amount:`, "50");
  const amount = parseFloat(input);
  if (!isNaN(amount) && amount > 0) {
    goal.saved += amount;
    localStorage.setItem("expense_goals", JSON.stringify(savingsGoals));
    renderBudgetsAndGoals();
    showToast(`Added ${formatCurrency(amount)} to ${goal.name}!`, "success");
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
  if (sortedByDate.length > 0) {
    nextUpcomingSub.textContent = `${sortedByDate[0].name} (${formatDateDisplay(sortedByDate[0].nextDate)})`;
  } else {
    nextUpcomingSub.textContent = "None";
  }

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

  if (!name || isNaN(amount) || amount <= 0 || !nextDate) {
    showToast("Please provide valid subscription details", "warning");
    return;
  }

  subscriptions.push({ id: Date.now(), name, amount, frequency, category, nextDate });
  localStorage.setItem("expense_subs", JSON.stringify(subscriptions));
  subModal.classList.add("hidden");
  subForm.reset();
  renderSubscriptions();
  showToast("Subscription added successfully", "success");
}

function deleteSubscription(id) {
  if (confirm("Delete this subscription?")) {
    subscriptions = subscriptions.filter(s => s.id !== id);
    localStorage.setItem("expense_subs", JSON.stringify(subscriptions));
    renderSubscriptions();
    showToast("Subscription removed", "info");
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
    // Add transaction
    transactions.unshift({
      id: Date.now() + Math.random(),
      text: `${s.name} (Recurring)`,
      amount: s.amount,
      type: "expense",
      category: s.category,
      date: s.nextDate
    });

    // Advance next payment date
    const d = new Date(s.nextDate);
    if (s.frequency === "yearly") d.setFullYear(d.getFullYear() + 1);
    else if (s.frequency === "weekly") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    s.nextDate = d.toISOString().split("T")[0];
  });

  saveTransactions();
  localStorage.setItem("expense_subs", JSON.stringify(subscriptions));
  renderApp();
  renderSubscriptions();
  showToast(`Processed ${due.length} recurring bill(s) into your ledger!`, "success");
}

// --- ANALYTICS & REPORTS VIEW ---
function renderAnalyticsView() {
  if (typeof Chart === "undefined") return;

  // Overview stats in Analytics
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
    categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
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

  // Recommendations
  reportsRecommendations.innerHTML = "";
  const tips = [];
  if (parseFloat(runwayMonths) < 3 && netBalance > 0) {
    tips.push({ icon: "🚨", text: "<strong>Emergency Runway Alert:</strong> You have less than 3 months of runway. Focus on trimming discretionary categories." });
  } else if (parseFloat(runwayMonths) >= 6) {
    tips.push({ icon: "🌟", text: "<strong>Healthy Capital Buffer:</strong> You have 6+ months of reserves! Excess cash flow can be channeled to long-term assets." });
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

  // Render Charts
  if (analyticsCashFlowInstance) analyticsCashFlowInstance.destroy();
  if (analyticsCategoryInstance) analyticsCategoryInstance.destroy();

  // 1. Cash flow Bar Chart
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
        legend: { labels: { color: currentTheme === "dark" ? "#94a3b8" : "#64748b" } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${formatCurrency(c.raw)}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: currentTheme === "dark" ? "#94a3b8" : "#64748b" } },
        y: { grid: { color: currentTheme === "dark" ? "#27354f" : "#e2e8f0" }, ticks: { color: currentTheme === "dark" ? "#94a3b8" : "#64748b", callback: v => `${currentCurrency}${v}` } }
      }
    }
  });

  // 2. Category Doughnut Chart
  const expTx = transactions.filter(t => t.type === "expense");
  const catMap = {};
  expTx.forEach(t => {
    const meta = getCategoryMeta(t.category, "expense");
    const name = `${meta.icon} ${meta.label}`;
    catMap[name] = (catMap[name] || 0) + t.amount;
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
        borderColor: currentTheme === "dark" ? "#151d2f" : "#ffffff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, padding: 8, color: currentTheme === "dark" ? "#94a3b8" : "#64748b" } },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${formatCurrency(c.raw)}` } }
      },
      cutout: "60%"
    }
  });
}

// --- DATA EXPORT & IMPORT ---
function exportToCSV() {
  if (transactions.length === 0) {
    showToast("No records found to export", "info");
    return;
  }
  const headers = ["ID", "Date", "Description", "Type", "Category", "Amount", "Currency"];
  const rows = transactions.map(t => [
    t.id,
    `"${t.date}"`,
    `"${t.text.replace(/"/g, '""')}"`,
    t.type,
    `"${t.category}"`,
    t.amount.toFixed(2),
    `"${currentCurrency}"`
  ]);
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const encoded = encodeURI(csvContent);
  const a = document.createElement("a");
  a.setAttribute("href", encoded);
  a.setAttribute("download", `expenses_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("CSV exported successfully", "success");
}

function exportToJSON() {
  const snapshot = {
    app: "Smart Expense Tracker Pro",
    version: "3.0",
    exportedAt: new Date().toISOString(),
    currency: currentCurrency,
    theme: currentTheme,
    budgets,
    savingsGoals,
    subscriptions,
    transactions
  };
  const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
  const a = document.createElement("a");
  a.setAttribute("href", jsonStr);
  a.setAttribute("download", `expense_backup_${new Date().toISOString().split("T")[0]}.json`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("Full JSON database exported", "success");
}

function handleJsonFileSelect(e) {
  const file = e.target.files[0];
  if (!file) {
    settingsRestoreBtn.disabled = true;
    return;
  }
  const reader = new FileReader();
  reader.onload = function (event) {
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
    date: t.date || new Date().toISOString().split("T")[0]
  }));

  if (mode === "replace") {
    transactions = incoming;
  } else {
    const existing = new Set(transactions.map(t => t.id));
    const newItems = incoming.filter(t => !existing.has(t.id));
    transactions = [...newItems, ...transactions];
  }

  if (pendingImportData.budgets) {
    budgets = { ...budgets, ...pendingImportData.budgets };
    localStorage.setItem("expense_budgets", JSON.stringify(budgets));
  }
  if (Array.isArray(pendingImportData.savingsGoals)) {
    savingsGoals = pendingImportData.savingsGoals;
    localStorage.setItem("expense_goals", JSON.stringify(savingsGoals));
  }
  if (Array.isArray(pendingImportData.subscriptions)) {
    subscriptions = pendingImportData.subscriptions;
    localStorage.setItem("expense_subs", JSON.stringify(subscriptions));
  }
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
  showToast(`Restored in '${mode}' mode!`, "success");
}

function wipeDatabase() {
  if (confirm("DANGER: This will permanently wipe all transactions, budgets, subscriptions, and goals! Proceed?")) {
    transactions = [];
    budgets = {};
    savingsGoals = [];
    subscriptions = [];
    localStorage.clear();
    saveTransactions();
    renderApp();
    showToast("Database completely reset", "warning");
  }
}

// --- THEME & CURRENCY HANDLING ---
function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("expense_theme", theme);
  themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
  if (dashChartInstance) { dashChartInstance.destroy(); dashChartInstance = null; renderDashChart(); }
}

function toggleTheme() {
  const next = currentTheme === "dark" ? "light" : "dark";
  applyTheme(next);
  showToast(`Theme changed to ${next}`, "info");
}

function handleCurrencyChange(val) {
  currentCurrency = val;
  localStorage.setItem("expense_currency", currentCurrency);
  currencySelect.value = currentCurrency;
  settingsCurrencySelect.value = currentCurrency;
  inputCurrencySymbol.textContent = currentCurrency;
  renderApp();
  showToast(`Currency set to ${currentCurrency}`, "info");
}

function saveTransactions() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

// --- GLOBAL RENDER ---
function renderApp() {
  if (activeView === "dashboard") renderDashboard();
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
    if (navigator.onLine) offlineBanner.classList.add("hidden");
    else offlineBanner.classList.remove("hidden");
  }
  window.addEventListener("online", updateNet);
  window.addEventListener("offline", updateNet);
  updateNet();
}

function setupShortcuts() {
  window.addEventListener("keydown", (e) => {
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

  applyTheme(currentTheme);
  setFormType("expense");
  populateFilterCategories();

  // Navigation Tabs
  navTabs.forEach(tab => {
    tab.addEventListener("click", () => switchView(tab.getAttribute("data-view")));
  });

  // Header quick buttons & cross links
  headerQuickAddBtn.addEventListener("click", () => {
    switchView("dashboard");
    textInput.focus();
  });
  goToBudgetsTabBtn.addEventListener("click", () => switchView("budgets"));
  goToLedgerBtn.addEventListener("click", () => switchView("transactions"));

  // Dashboard Controls
  transactionForm.addEventListener("submit", handleFormSubmit);
  cancelEditBtn.addEventListener("click", resetForm);
  typeExpenseBtn.addEventListener("click", () => setFormType("expense"));
  typeIncomeBtn.addEventListener("click", () => setFormType("income"));
  currencySelect.addEventListener("change", (e) => handleCurrencyChange(e.target.value));
  themeToggleBtn.addEventListener("click", toggleTheme);

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

  // Ledger Controls
  searchInput.addEventListener("input", renderLedger);
  filterTypeSelect.addEventListener("change", renderLedger);
  filterCategorySelect.addEventListener("change", renderLedger);
  sortBySelect.addEventListener("change", renderLedger);
  selectAllCheckbox.addEventListener("change", handleSelectAll);
  bulkDeleteBtn.addEventListener("click", handleBulkDelete);
  ledgerPrintBtn.addEventListener("click", () => window.print());
  exportCsvBtn.addEventListener("click", exportToCSV);

  datePresetPills.forEach(pill => {
    pill.addEventListener("click", () => {
      datePresetPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeDatePreset = pill.getAttribute("data-range");
      renderLedger();
    });
  });

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

  // Settings Controls
  settingsCurrencySelect.addEventListener("change", (e) => handleCurrencyChange(e.target.value));
  settingsThemeToggle.addEventListener("click", toggleTheme);
  settingsExportJsonBtn.addEventListener("click", exportToJSON);
  settingsExportCsvBtn.addEventListener("click", exportToCSV);
  settingsJsonFileInput.addEventListener("change", handleJsonFileSelect);
  settingsRestoreBtn.addEventListener("click", executeRestore);
  settingsWipeBtn.addEventListener("click", wipeDatabase);

  // Modal backdrop click
  window.addEventListener("click", (e) => {
    if (e.target === budgetModal) closeBudgetConfigModal();
    if (e.target === goalModal) goalModal.classList.add("hidden");
    if (e.target === subModal) subModal.classList.add("hidden");
  });

  setupServiceWorkerAndNetwork();
  setupShortcuts();
  renderApp();
}

// Window bindings
window.startEditTransaction = startEditTransaction;
window.removeTransaction = removeTransaction;
window.openBudgetConfigModal = openBudgetConfigModal;
window.deleteGoal = deleteGoal;
window.promptDepositGoal = promptDepositGoal;
window.deleteSubscription = deleteSubscription;

init();
