/**
 * SMART EXPENSE TRACKER & BUDGET MANAGER (PRO PWA EDITION)
 * Advanced Features:
 * - Dynamic Categories with icons for Income & Expense
 * - Explicit Type Switcher (Income vs Expense)
 * - Complete CRUD (Add, Edit, Delete, Clear All)
 * - Dual Analytics Visualizer:
 *     1. Category Doughnut Chart
 *     2. 6-Month Income vs Expense Cash Flow Trend Bar Chart
 * - Financial Runway & Health Insights Engine
 * - Monthly Budget Goals & Threshold Progress/Alerts
 * - Quick Date Preset Filter Pills (All Time, This Month, Last Month, This Year)
 * - Full JSON Backup & Restore (Merge or Replace) + CSV Export
 * - Toast Notification Engine
 * - Global Keyboard Shortcuts (Ctrl+N, Ctrl+B, Esc)
 * - PWA Offline Installation (Service Worker + Manifest)
 * - Multi-Currency Support (USD, EUR, GBP, ETB, INR, JPY, CAD, AUD)
 * - Dark & Light Mode with LocalStorage persistence
 */

// --- CONFIGURATION & CATEGORY DEFINITIONS ---
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

// --- DOM ELEMENTS ---
const balanceEl = document.getElementById("balance");
const balanceBadge = document.getElementById("balanceBadge");
const savingsRateEl = document.getElementById("savingsRate");
const incomeEl = document.getElementById("income");
const incomeCountEl = document.getElementById("incomeCount");
const expenseEl = document.getElementById("expense");
const expenseCountEl = document.getElementById("expenseCount");
const runwayValueEl = document.getElementById("runwayValue");
const runwaySubtextEl = document.getElementById("runwaySubtext");

const transactionForm = document.getElementById("transactionForm");
const textInput = document.getElementById("text");
const amountInput = document.getElementById("amount");
const categorySelect = document.getElementById("category");
const dateInput = document.getElementById("date");
const submitBtn = document.getElementById("submitBtn");
const submitBtnText = document.getElementById("submitBtnText");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formTitle = document.getElementById("formTitle");
const editModeNotice = document.getElementById("editModeNotice");

const typeExpenseBtn = document.getElementById("typeExpenseBtn");
const typeIncomeBtn = document.getElementById("typeIncomeBtn");
const inputCurrencySymbol = document.getElementById("inputCurrencySymbol");
const currencySelect = document.getElementById("currencySelect");

const searchInput = document.getElementById("searchInput");
const filterTypeSelect = document.getElementById("filterType");
const filterCategorySelect = document.getElementById("filterCategory");
const sortBySelect = document.getElementById("sortBy");
const datePresetPills = document.querySelectorAll(".preset-pill");
const transactionsList = document.getElementById("list");
const emptyState = document.getElementById("emptyState");
const historyCountEl = document.getElementById("historyCount");

const exportCsvBtn = document.getElementById("exportCsvBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

const themeToggleBtn = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const offlineBanner = document.getElementById("offlineBanner");
const toastContainer = document.getElementById("toastContainer");

// Chart elements
const chartCanvas = document.getElementById("categoryChart");
const chartPlaceholder = document.getElementById("chartPlaceholder");
const chartTabCategory = document.getElementById("chartTabCategory");
const chartTabCashflow = document.getElementById("chartTabCashflow");

// Budget elements
const budgetProgressList = document.getElementById("budgetProgressList");
const currentMonthYearLabel = document.getElementById("currentMonthYearLabel");
const openBudgetBtn = document.getElementById("openBudgetBtn");
const editBudgetsQuickBtn = document.getElementById("editBudgetsQuickBtn");
const budgetModal = document.getElementById("budgetModal");
const closeBudgetModalBtn = document.getElementById("closeBudgetModalBtn");
const cancelBudgetBtn = document.getElementById("cancelBudgetBtn");
const budgetConfigForm = document.getElementById("budgetConfigForm");
const budgetInputsContainer = document.getElementById("budgetInputsContainer");

// Financial Insights elements
const openInsightsBtn = document.getElementById("openInsightsBtn");
const insightsModal = document.getElementById("insightsModal");
const closeInsightsModalBtn = document.getElementById("closeInsightsModalBtn");
const closeInsightsActionBtn = document.getElementById("closeInsightsActionBtn");
const insightAvgBurn = document.getElementById("insightAvgBurn");
const insightRunwayMonths = document.getElementById("insightRunwayMonths");
const insightTopCategory = document.getElementById("insightTopCategory");
const insightSavingsRate = document.getElementById("insightSavingsRate");
const insightRecommendations = document.getElementById("insightRecommendations");

// Backup & Restore elements
const openBackupBtn = document.getElementById("openBackupBtn");
const backupModal = document.getElementById("backupModal");
const closeBackupModalBtn = document.getElementById("closeBackupModalBtn");
const downloadJsonBtn = document.getElementById("downloadJsonBtn");
const jsonFileInput = document.getElementById("jsonFileInput");
const restoreJsonBtn = document.getElementById("restoreJsonBtn");

// --- APPLICATION STATE ---
let currentType = "expense";
let editingId = null;
let currentCurrency = localStorage.getItem("expense_currency") || "$";
let currentTheme = localStorage.getItem("expense_theme") || "light";
let budgets = JSON.parse(localStorage.getItem("expense_budgets")) || DEFAULT_BUDGETS;
let activeChartTab = "category"; // 'category' or 'cashflow'
let activeDatePreset = "all"; // 'all', 'this-month', 'last-month', 'this-year'
let categoryChart = null;
let pendingImportData = null;

// Load and migrate transactions
let rawTransactions = JSON.parse(localStorage.getItem("transactions")) || [];
let transactions = rawTransactions.map(t => {
  const isOldFormat = typeof t.type === "undefined";
  const type = isOldFormat ? (t.amount < 0 ? "expense" : "income") : t.type;
  const absAmount = Math.abs(t.amount);
  const category = t.category || (type === "expense" ? "Food & Drinks" : "Salary");
  const date = t.date || new Date(t.id || Date.now()).toISOString().split("T")[0];

  return {
    id: t.id || Date.now() + Math.random(),
    text: t.text || "Untitled",
    amount: absAmount,
    type: type,
    category: category,
    date: date
  };
});

// --- TOAST NOTIFICATIONS ---
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

// --- HELPER UTILITIES ---
function formatCurrency(amount) {
  const formattedNumber = Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${currentCurrency} ${formattedNumber}`;
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

// --- CATEGORY DROPDOWN MANAGEMENT ---
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

  if (currentSelection) {
    filterCategorySelect.value = currentSelection;
  }
}

// --- FORM HANDLING (ADD & EDIT) ---
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
    showToast("Please provide valid description, date, and amount > 0", "warning");
    return;
  }

  if (editingId !== null) {
    transactions = transactions.map(t => {
      if (t.id === editingId) {
        return {
          ...t,
          text: textVal,
          amount: amountVal,
          type: currentType,
          category: categoryVal,
          date: dateVal
        };
      }
      return t;
    });
    showToast("Transaction updated successfully", "success");
  } else {
    const newTransaction = {
      id: Date.now(),
      text: textVal,
      amount: amountVal,
      type: currentType,
      category: categoryVal,
      date: dateVal
    };
    transactions.unshift(newTransaction);
    showToast("Transaction added successfully", "success");
  }

  saveTransactions();
  resetForm();
  renderApp();
}

function removeTransaction(id) {
  if (confirm("Are you sure you want to delete this transaction?")) {
    transactions = transactions.filter(t => t.id !== id);
    if (editingId === id) {
      resetForm();
    }
    saveTransactions();
    renderApp();
    showToast("Transaction deleted", "info");
  }
}

function clearAllTransactions() {
  if (transactions.length === 0) {
    showToast("No transactions to clear", "info");
    return;
  }

  if (confirm("Warning: This will permanently delete ALL transactions! Proceed?")) {
    transactions = [];
    resetForm();
    saveTransactions();
    renderApp();
    showToast("All transactions cleared", "warning");
  }
}

// --- STATS, RUNWAY & CASH FLOW CALCULATIONS ---
function updateOverviewStats() {
  const incomeTotal = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseTotal = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = incomeTotal - expenseTotal;
  const incomeCount = transactions.filter(t => t.type === "income").length;
  const expenseCount = transactions.filter(t => t.type === "expense").length;

  balanceEl.textContent = formatCurrency(netBalance);
  incomeEl.textContent = formatCurrency(incomeTotal);
  expenseEl.textContent = formatCurrency(expenseTotal);

  incomeCountEl.textContent = `${incomeCount} transaction${incomeCount === 1 ? "" : "s"}`;
  expenseCountEl.textContent = `${expenseCount} transaction${expenseCount === 1 ? "" : "s"}`;

  if (netBalance >= 0) {
    balanceBadge.textContent = "Positive";
    balanceBadge.classList.remove("negative");
  } else {
    balanceBadge.textContent = "Deficit";
    balanceBadge.classList.add("negative");
  }

  if (incomeTotal > 0) {
    const rate = Math.round(((incomeTotal - expenseTotal) / incomeTotal) * 100);
    savingsRateEl.textContent = `${rate}%`;
  } else {
    savingsRateEl.textContent = expenseTotal > 0 ? "-100%" : "0%";
  }

  // Calculate Monthly Burn and Runway
  const monthlyExpenseMap = {};
  transactions
    .filter(t => t.type === "expense" && t.date)
    .forEach(t => {
      const ym = t.date.substring(0, 7);
      monthlyExpenseMap[ym] = (monthlyExpenseMap[ym] || 0) + t.amount;
    });

  const monthKeys = Object.keys(monthlyExpenseMap);
  const avgMonthlyBurn = monthKeys.length > 0
    ? monthKeys.reduce((acc, m) => acc + monthlyExpenseMap[m], 0) / monthKeys.length
    : expenseTotal;

  if (netBalance <= 0) {
    runwayValueEl.textContent = "0 Mos";
    runwaySubtextEl.textContent = "Net balance in deficit";
  } else if (avgMonthlyBurn <= 0) {
    runwayValueEl.textContent = "∞ Mos";
    runwaySubtextEl.textContent = "No monthly expenses logged";
  } else {
    const months = (netBalance / avgMonthlyBurn).toFixed(1);
    runwayValueEl.textContent = `${months} Mos`;
    runwaySubtextEl.textContent = `Avg burn: ${formatCurrency(avgMonthlyBurn)}/mo`;
  }
}

// --- FINANCIAL HEALTH & INSIGHTS ENGINE ---
function openInsightsModal() {
  const incomeTotal = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseTotal = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = incomeTotal - expenseTotal;

  const monthlyExpenseMap = {};
  const categoryExpenses = {};

  transactions
    .filter(t => t.type === "expense")
    .forEach(t => {
      if (t.date) {
        const ym = t.date.substring(0, 7);
        monthlyExpenseMap[ym] = (monthlyExpenseMap[ym] || 0) + t.amount;
      }
      categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
    });

  const monthKeys = Object.keys(monthlyExpenseMap);
  const avgMonthlyBurn = monthKeys.length > 0
    ? monthKeys.reduce((acc, m) => acc + monthlyExpenseMap[m], 0) / monthKeys.length
    : expenseTotal;

  const runwayMonths = (netBalance > 0 && avgMonthlyBurn > 0)
    ? (netBalance / avgMonthlyBurn).toFixed(1)
    : "0";

  // Identify top category
  let topCatName = "None";
  let topCatAmount = 0;
  for (const [cat, amt] of Object.entries(categoryExpenses)) {
    if (amt > topCatAmount) {
      topCatAmount = amt;
      topCatName = cat;
    }
  }

  const savingsRate = incomeTotal > 0 ? Math.round(((incomeTotal - expenseTotal) / incomeTotal) * 100) : 0;

  insightAvgBurn.textContent = formatCurrency(avgMonthlyBurn);
  insightRunwayMonths.textContent = `${runwayMonths} Months`;
  insightTopCategory.textContent = topCatName !== "None" ? `${topCatName} (${formatCurrency(topCatAmount)})` : "None";
  insightSavingsRate.textContent = `${savingsRate}%`;

  // Generate dynamic recommendations
  insightRecommendations.innerHTML = "";
  const tips = [];

  if (parseFloat(runwayMonths) < 3 && netBalance > 0) {
    tips.push({
      icon: "🚨",
      text: "<strong>Low Runway Alert:</strong> Your emergency runway is under 3 months. Aim to save at least 3-6 months of living expenses."
    });
  } else if (parseFloat(runwayMonths) >= 6) {
    tips.push({
      icon: "🌟",
      text: "<strong>Strong Resilience:</strong> You have over 6 months of financial runway! Consider allocating excess savings toward investments."
    });
  }

  if (topCatAmount > 0 && expenseTotal > 0) {
    const pct = Math.round((topCatAmount / expenseTotal) * 100);
    if (pct >= 40) {
      tips.push({
        icon: "⚠️",
        text: `<strong>Category Concentration:</strong> <strong>${topCatName}</strong> represents ${pct}% of your total spending. Look for potential optimizations here.`
      });
    }
  }

  if (savingsRate >= 20) {
    tips.push({
      icon: "🎯",
      text: "<strong>50/30/20 Rule:</strong> You're meeting the recommended 20%+ savings threshold! Keep up the disciplined cash flow."
    });
  } else if (savingsRate > 0) {
    tips.push({
      icon: "💡",
      text: "<strong>Savings Opportunity:</strong> Your current savings rate is below 20%. Review non-essential subscriptions or shopping to increase margin."
    });
  } else {
    tips.push({
      icon: "🛑",
      text: "<strong>Deficit Warning:</strong> Outflows are currently matching or exceeding inflows. Audit active budgets to avoid debt."
    });
  }

  tips.forEach(t => {
    const card = document.createElement("div");
    card.className = "tip-card";
    card.innerHTML = `<span class="tip-icon">${t.icon}</span> <div>${t.text}</div>`;
    insightRecommendations.appendChild(card);
  });

  insightsModal.classList.remove("hidden");
}

function closeInsightsModal() {
  insightsModal.classList.add("hidden");
}

// --- MONTHLY BUDGETS & THRESHOLD ALERTS ---
function renderBudgets() {
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  
  currentMonthYearLabel.textContent = now.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const monthlyExpenses = {};
  transactions
    .filter(t => t.type === "expense" && t.date && t.date.startsWith(currentYearMonth))
    .forEach(t => {
      monthlyExpenses[t.category] = (monthlyExpenses[t.category] || 0) + t.amount;
    });

  budgetProgressList.innerHTML = "";

  const budgetedCategories = Object.keys(budgets).filter(cat => budgets[cat] > 0);

  if (budgetedCategories.length === 0) {
    budgetProgressList.innerHTML = `
      <div class="empty-budgets-hint">
        <p>No budgets set yet.</p>
        <button type="button" class="btn-sm btn-outline" style="margin-top:8px;" onclick="openBudgetConfigModal()">
          🎯 Set Category Budgets
        </button>
      </div>
    `;
    return;
  }

  budgetedCategories.forEach(catId => {
    const meta = getCategoryMeta(catId, "expense");
    const budgetLimit = budgets[catId];
    const spent = monthlyExpenses[catId] || 0;
    const percentage = Math.round((spent / budgetLimit) * 100);

    let statusClass = "safe";
    let statusText = `${percentage}%`;

    if (percentage >= 100) {
      statusClass = "danger";
      statusText = "Exceeded!";
    } else if (percentage >= 80) {
      statusClass = "warning";
      statusText = `${percentage}% Warning`;
    }

    const row = document.createElement("div");
    row.className = "budget-item";
    row.innerHTML = `
      <div class="budget-info-row">
        <div class="budget-cat-name">
          <span>${meta.icon}</span>
          <span>${meta.label}</span>
          <span class="budget-status-tag ${statusClass}">${statusText}</span>
        </div>
        <div class="budget-amounts">
          <strong>${formatCurrency(spent)}</strong> / ${formatCurrency(budgetLimit)}
        </div>
      </div>
      <div class="progress-track" role="progressbar" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-fill ${statusClass}" style="width: ${Math.min(percentage, 100)}%;"></div>
      </div>
    `;

    budgetProgressList.appendChild(row);
  });
}

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
    if (!isNaN(val) && val > 0) {
      newBudgets[cat] = val;
    }
  });

  budgets = newBudgets;
  localStorage.setItem("expense_budgets", JSON.stringify(budgets));
  closeBudgetConfigModal();
  renderBudgets();
  showToast("Category budgets saved", "success");
}

// --- DUAL ANALYTICS CHART RENDERING ---
function updateChart() {
  if (typeof Chart === "undefined") {
    return;
  }

  if (activeChartTab === "category") {
    renderCategoryDoughnut();
  } else {
    renderCashFlowBarChart();
  }
}

function renderCategoryDoughnut() {
  const expenseTransactions = transactions.filter(t => t.type === "expense");

  if (expenseTransactions.length === 0) {
    chartCanvas.style.display = "none";
    chartPlaceholder.style.display = "block";
    if (categoryChart) {
      categoryChart.destroy();
      categoryChart = null;
    }
    return;
  }

  chartCanvas.style.display = "block";
  chartPlaceholder.style.display = "none";

  const categoryTotals = {};
  expenseTransactions.forEach(t => {
    const meta = getCategoryMeta(t.category, "expense");
    const name = `${meta.icon} ${meta.label}`;
    categoryTotals[name] = (categoryTotals[name] || 0) + t.amount;
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  const palette = [
    "#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4",
    "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#64748b"
  ];

  if (categoryChart) {
    categoryChart.destroy();
  }

  const ctx = chartCanvas.getContext("2d");
  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: data,
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
            padding: 10,
            color: currentTheme === "dark" ? "#94a3b8" : "#64748b",
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw || 0;
              return ` ${context.label}: ${formatCurrency(val)}`;
            }
          }
        }
      },
      cutout: "65%"
    }
  });
}

function renderCashFlowBarChart() {
  if (transactions.length === 0) {
    chartCanvas.style.display = "none";
    chartPlaceholder.style.display = "block";
    if (categoryChart) {
      categoryChart.destroy();
      categoryChart = null;
    }
    return;
  }

  chartCanvas.style.display = "block";
  chartPlaceholder.style.display = "none";

  // Calculate past 6 months chronologically
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(undefined, { month: "short" });
    months.push({ key, label });
  }

  const incomeData = [];
  const expenseData = [];

  months.forEach(m => {
    const monthTx = transactions.filter(t => t.date && t.date.startsWith(m.key));
    const inc = monthTx.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const exp = monthTx.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    incomeData.push(inc);
    expenseData.push(exp);
  });

  if (categoryChart) {
    categoryChart.destroy();
  }

  const ctx = chartCanvas.getContext("2d");
  categoryChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: months.map(m => m.label),
      datasets: [
        {
          label: "Income",
          data: incomeData,
          backgroundColor: "#10b981",
          borderRadius: 4
        },
        {
          label: "Expense",
          data: expenseData,
          backgroundColor: "#ef4444",
          borderRadius: 4
        }
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
            label: function (context) {
              return ` ${context.dataset.label}: ${formatCurrency(context.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: currentTheme === "dark" ? "#94a3b8" : "#64748b" }
        },
        y: {
          grid: { color: currentTheme === "dark" ? "#27354f" : "#e2e8f0" },
          ticks: {
            color: currentTheme === "dark" ? "#94a3b8" : "#64748b",
            callback: val => `${currentCurrency}${val}`
          }
        }
      }
    }
  });
}

// --- FILTER, SEARCH & SORT TRANSACTIONS ---
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
    // Search query match
    const matchesSearch = !query || t.text.toLowerCase().includes(query) || t.category.toLowerCase().includes(query);

    // Type match
    const matchesType = filterType === "all" || t.type === filterType;

    // Category match
    const matchesCategory = filterCat === "all" || t.category === filterCat;

    // Date preset match
    let matchesPreset = true;
    if (activeDatePreset === "this-month") {
      matchesPreset = t.date && t.date.startsWith(currentYM);
    } else if (activeDatePreset === "last-month") {
      matchesPreset = t.date && t.date.startsWith(lastYM);
    } else if (activeDatePreset === "this-year") {
      matchesPreset = t.date && t.date.startsWith(currentYear);
    }

    return matchesSearch && matchesType && matchesCategory && matchesPreset;
  });

  filtered.sort((a, b) => {
    if (sortBy === "date-desc") {
      return new Date(b.date) - new Date(a.date) || b.id - a.id;
    } else if (sortBy === "date-asc") {
      return new Date(a.date) - new Date(b.date) || a.id - b.id;
    } else if (sortBy === "amount-desc") {
      return b.amount - a.amount;
    } else if (sortBy === "amount-asc") {
      return a.amount - b.amount;
    }
    return 0;
  });

  return filtered;
}

// --- RENDER TRANSACTIONS LIST ---
function renderTransactionsList() {
  const filtered = getFilteredAndSortedTransactions();
  transactionsList.innerHTML = "";

  historyCountEl.textContent = `Showing ${filtered.length} of ${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`;

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  filtered.forEach(t => {
    const isIncome = t.type === "income";
    const meta = getCategoryMeta(t.category, t.type);

    const li = document.createElement("li");
    li.className = `transaction-item ${isIncome ? "income-item" : "expense-item"}`;

    li.innerHTML = `
      <div class="item-left">
        <div class="category-icon-box" title="${meta.label}">
          ${meta.icon}
        </div>
        <div class="item-info">
          <div class="item-title" title="${t.text}">${t.text}</div>
          <div class="item-meta">
            <span class="category-badge">${meta.label}</span>
            <span>•</span>
            <span>${formatDateDisplay(t.date)}</span>
          </div>
        </div>
      </div>

      <div class="item-right">
        <div class="item-amount ${isIncome ? "income" : "expense"}">
          ${isIncome ? "+" : "-"}${formatCurrency(t.amount)}
        </div>
        <div class="item-actions">
          <button class="btn-action edit-btn" title="Edit" onclick="startEditTransaction(${t.id})">✏️</button>
          <button class="btn-action delete-btn" title="Delete" onclick="removeTransaction(${t.id})">🗑️</button>
        </div>
      </div>
    `;

    transactionsList.appendChild(li);
  });
}

// --- DATA EXPORT (CSV & JSON) ---
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

  const csvContent = "data:text/csv;charset=utf-8,"
    + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  const today = new Date().toISOString().split("T")[0];
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `expenses_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("CSV file exported successfully", "success");
}

function exportToJSON() {
  const snapshot = {
    app: "Smart Expense Tracker",
    version: "2.1",
    exportedAt: new Date().toISOString(),
    currency: currentCurrency,
    theme: currentTheme,
    budgets: budgets,
    transactions: transactions
  };

  const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
  const downloadAnchor = document.createElement("a");
  const today = new Date().toISOString().split("T")[0];
  downloadAnchor.setAttribute("href", jsonStr);
  downloadAnchor.setAttribute("download", `expense_tracker_backup_${today}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
  showToast("Full JSON snapshot exported", "success");
}

// --- DATA IMPORT (JSON RESTORE) ---
function handleJsonFileSelect(e) {
  const file = e.target.files[0];
  if (!file) {
    restoreJsonBtn.disabled = true;
    return;
  }

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const data = JSON.parse(event.target.result);
      if (!data || !Array.isArray(data.transactions)) {
        showToast("Invalid backup: missing 'transactions' collection", "warning");
        restoreJsonBtn.disabled = true;
        return;
      }
      pendingImportData = data;
      restoreJsonBtn.disabled = false;
      showToast(`Loaded file with ${data.transactions.length} records ready to restore`, "info");
    } catch (err) {
      showToast("JSON parsing error: " + err.message, "warning");
      restoreJsonBtn.disabled = true;
    }
  };
  reader.readAsText(file);
}

function executeRestore() {
  if (!pendingImportData) return;

  const mode = document.querySelector('input[name="importMode"]:checked').value;
  const incomingTransactions = pendingImportData.transactions.map(t => ({
    id: t.id || Date.now() + Math.random(),
    text: t.text || "Untitled",
    amount: Math.abs(t.amount),
    type: t.type || (t.amount < 0 ? "expense" : "income"),
    category: t.category || "Other Expense",
    date: t.date || new Date().toISOString().split("T")[0]
  }));

  if (mode === "replace") {
    transactions = incomingTransactions;
  } else {
    const existingIds = new Set(transactions.map(t => t.id));
    const newItems = incomingTransactions.filter(t => !existingIds.has(t.id));
    transactions = [...newItems, ...transactions];
  }

  if (pendingImportData.budgets && typeof pendingImportData.budgets === "object") {
    budgets = { ...budgets, ...pendingImportData.budgets };
    localStorage.setItem("expense_budgets", JSON.stringify(budgets));
  }

  if (pendingImportData.currency) {
    currentCurrency = pendingImportData.currency;
    localStorage.setItem("expense_currency", currentCurrency);
    currencySelect.value = currentCurrency;
    inputCurrencySymbol.textContent = currentCurrency;
  }

  saveTransactions();
  backupModal.classList.add("hidden");
  jsonFileInput.value = "";
  restoreJsonBtn.disabled = true;
  pendingImportData = null;

  renderApp();
  showToast(`Restored successfully in '${mode}' mode!`, "success");
}

// --- THEME & CURRENCY HANDLING ---
function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("expense_theme", theme);
  themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";

  if (categoryChart) {
    categoryChart.destroy();
    categoryChart = null;
    updateChart();
  }
}

function toggleTheme() {
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  showToast(`Switched to ${nextTheme} mode`, "info");
}

function handleCurrencyChange(e) {
  currentCurrency = e.target.value;
  localStorage.setItem("expense_currency", currentCurrency);
  inputCurrencySymbol.textContent = currentCurrency;
  renderApp();
  showToast(`Currency changed to ${currentCurrency}`, "info");
}

// --- LOCAL STORAGE PERSISTENCE ---
function saveTransactions() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

// --- GLOBAL APP RENDER ---
function renderApp() {
  updateOverviewStats();
  renderBudgets();
  renderTransactionsList();
  updateChart();
}

// --- SERVICE WORKER & NETWORK MONITOR ---
function setupServiceWorkerAndNetwork() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.log("Service Worker active."))
      .catch(err => console.log("Service Worker registration notice:", err));
  }

  function updateNetworkStatus() {
    if (navigator.onLine) {
      offlineBanner.classList.add("hidden");
    } else {
      offlineBanner.classList.remove("hidden");
    }
  }

  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);
  updateNetworkStatus();
}

// --- KEYBOARD SHORTCUTS ---
function setupKeyboardShortcuts() {
  window.addEventListener("keydown", (e) => {
    // Ctrl+N or Cmd+N: Focus Add Transaction input
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
      e.preventDefault();
      textInput.focus();
      textInput.select();
    }
    // Ctrl+B or Cmd+B: Open Budget Modal
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      openBudgetConfigModal();
    }
    // Escape: Close open modals or cancel edit mode
    if (e.key === "Escape") {
      closeBudgetConfigModal();
      closeInsightsModal();
      backupModal.classList.add("hidden");
      if (editingId !== null) {
        resetForm();
      }
    }
  });
}

// --- EVENT LISTENERS & INITIALIZATION ---
function init() {
  dateInput.value = new Date().toISOString().split("T")[0];
  currencySelect.value = currentCurrency;
  inputCurrencySymbol.textContent = currentCurrency;

  applyTheme(currentTheme);
  setFormType("expense");
  populateFilterCategories();

  // Form Events
  transactionForm.addEventListener("submit", handleFormSubmit);
  cancelEditBtn.addEventListener("click", resetForm);
  typeExpenseBtn.addEventListener("click", () => setFormType("expense"));
  typeIncomeBtn.addEventListener("click", () => setFormType("income"));

  // Header Controls
  currencySelect.addEventListener("change", handleCurrencyChange);
  themeToggleBtn.addEventListener("click", toggleTheme);

  // Search, Filters & Date Presets
  searchInput.addEventListener("input", renderTransactionsList);
  filterTypeSelect.addEventListener("change", renderTransactionsList);
  filterCategorySelect.addEventListener("change", renderTransactionsList);
  sortBySelect.addEventListener("change", renderTransactionsList);

  datePresetPills.forEach(pill => {
    pill.addEventListener("click", () => {
      datePresetPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeDatePreset = pill.getAttribute("data-range");
      renderTransactionsList();
    });
  });

  // Chart Tab Toggles
  chartTabCategory.addEventListener("click", () => {
    chartTabCategory.classList.add("active");
    chartTabCashflow.classList.remove("active");
    activeChartTab = "category";
    updateChart();
  });

  chartTabCashflow.addEventListener("click", () => {
    chartTabCashflow.classList.add("active");
    chartTabCategory.classList.remove("active");
    activeChartTab = "cashflow";
    updateChart();
  });

  // Export & Clear All
  exportCsvBtn.addEventListener("click", exportToCSV);
  clearAllBtn.addEventListener("click", clearAllTransactions);

  // Budget Modals
  openBudgetBtn.addEventListener("click", openBudgetConfigModal);
  editBudgetsQuickBtn.addEventListener("click", openBudgetConfigModal);
  closeBudgetModalBtn.addEventListener("click", closeBudgetConfigModal);
  cancelBudgetBtn.addEventListener("click", closeBudgetConfigModal);
  budgetConfigForm.addEventListener("submit", saveBudgets);

  // Financial Insights Modal
  openInsightsBtn.addEventListener("click", openInsightsModal);
  closeInsightsModalBtn.addEventListener("click", closeInsightsModal);
  closeInsightsActionBtn.addEventListener("click", closeInsightsModal);

  // Backup & Restore Modals
  openBackupBtn.addEventListener("click", () => backupModal.classList.remove("hidden"));
  closeBackupModalBtn.addEventListener("click", () => backupModal.classList.add("hidden"));
  downloadJsonBtn.addEventListener("click", exportToJSON);
  jsonFileInput.addEventListener("change", handleJsonFileSelect);
  restoreJsonBtn.addEventListener("click", executeRestore);

  // Backdrop dismissal
  window.addEventListener("click", (e) => {
    if (e.target === budgetModal) closeBudgetConfigModal();
    if (e.target === insightsModal) closeInsightsModal();
    if (e.target === backupModal) backupModal.classList.add("hidden");
  });

  setupServiceWorkerAndNetwork();
  setupKeyboardShortcuts();
  renderApp();
}

// Expose functions for inline HTML attributes
window.startEditTransaction = startEditTransaction;
window.removeTransaction = removeTransaction;
window.openBudgetConfigModal = openBudgetConfigModal;

init();
