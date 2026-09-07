const SAVINGS_KEY = "savingsGoals"

const SPENDIT_ACCOUNT_KEY = "expensepath-accounts-v1"
const SPENDIT_RECORD_KEY = "expensepath-records-v1"

function loadSpendItAccountsForNetWorth() {
  try {
    const raw = JSON.parse(
      localStorage.getItem(SPENDIT_ACCOUNT_KEY) || "[]"
    )

    return Array.isArray(raw) ? raw : []
  } catch (error) {
    console.error("Invalid SpendIt accounts:", error)
    return []
  }
}

function loadSpendItRecordsForNetWorth() {
  try {
    const raw = JSON.parse(
      localStorage.getItem(SPENDIT_RECORD_KEY) || "[]"
    )

    return Array.isArray(raw) ? raw : []
  } catch (error) {
    console.error("Invalid SpendIt records:", error)
    return []
  }
}

function loadSavingsGoalsForNetWorth() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVINGS_KEY) || "[]")
    return Array.isArray(raw) ? raw : []
  } catch (error) {
    console.error("Invalid savings goals:", error)
    return []
  }
}

function loadWishlistItemsForNetWorth() {
  try {
    const raw = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]")
    return Array.isArray(raw) ? raw : []
  } catch (error) {
    console.error("Invalid wishlist items:", error)
    return []
  }
}

function getCurrentMonthPlannerTotal() {
  const data = loadData()
  const currentMonth = months[new Date().getMonth()]
  const entries = data[currentMonth] || []

  return entries.reduce((sum, item) => {
    return sum + Number(item.amount || 0)
  }, 0)
}

function setMoney(id, value) {
  const el = document.getElementById(id)
  if (el) el.textContent = formatCurrency(value)
}

function renderNetWorthList(id, items, emptyText) {
  const el = document.getElementById(id)
  if (!el) return

  if (!items.length) {
    el.innerHTML = `<div class="networth-empty">${emptyText}</div>`
    return
  }

  el.innerHTML = items.join("")
}

function renderNetWorthPage() {
  const savings = loadSavingsGoalsForNetWorth()
  const wishlist = loadWishlistItemsForNetWorth()
  const today = new Date()
  const netWorthCalculation = WorthItNetWorthCalculator.calculateNetWorth({
    accounts: loadSpendItAccountsForNetWorth(),
    records: loadSpendItRecordsForNetWorth(),
    financePlanner: loadData(),
    payoffs: loadPayoffs(),
    asOfDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  })
  const payoffStats = netWorthCalculation.payoffStats
  const spendItAccounts = netWorthCalculation.accountBalances
  const totalSpendItBalance = netWorthCalculation.totalAccountBalances

  const totalSavings = savings.reduce((sum, goal) => sum + Number(goal.saved || 0), 0)
  const wishlistValue = wishlist.reduce((sum, item) => sum + Number(item.price || 0), 0)
  const plannerBurn = getCurrentMonthPlannerTotal()
  const monthlyBurn = plannerBurn + payoffStats.monthlyDue

  const netWorth = netWorthCalculation.netWorth

  setMoney("netWorthTotal", netWorth)
  setMoney("nwSavings", totalSpendItBalance)
  setMoney("nwPaid", payoffStats.totalPaid)
  setMoney("nwDebt", payoffStats.totalRemaining)
  setMoney("nwBurn", monthlyBurn)

  renderNetWorthList(
  "nwSpendItAccountsList",
  spendItAccounts.map(account => {
    const balance = Number(account.balance || 0)

    const balanceClass = balance >= 0
      ? "networth-assets"
      : "networth-liabilities"

    return `
      <div class="networth-row">
        <strong>${account.name || "Spending Account"}</strong>
        <span class="${balanceClass}">
          ${formatCurrency(balance)}
        </span>
      </div>
    `
  }),
  "No Spending accounts found."
)

renderNetWorthList(
  "nwSavingsList",
  savings.map(goal => {
    const linkedAccount = spendItAccounts.find(account => {
      return String(account.id || "") === String(goal.accountId || "")
    })

    const accountName = linkedAccount?.name ||
      (goal.accountId ? "Account unavailable" : "No account assigned")

    return `
      <div class="networth-row">
        <div>
          <strong>${goal.name || "Savings Goal"}</strong>
          <div style="margin-top:4px; color:var(--text-secondary); font-size:0.85rem;">
            Stored in ${accountName}
          </div>
        </div>

        <span class="networth-assets">
          ${formatCurrency(goal.saved)}
        </span>
      </div>
    `
  }),
  "No savings goals yet."
)

  renderNetWorthList(
    "nwDebtList",
    payoffStats.payoffs.map(item => {
      const remaining = Math.max(Number(item.total || 0) - Number(item.paid || 0), 0)

      return `
        <div class="networth-row">
          <strong>${item.name || "Payoff Item"}</strong>
          <span class="networth-liabilities">${formatCurrency(remaining)}</span>
        </div>
      `
    }),
    "No payoff balances yet."
  )

  renderNetWorthList(
    "nwWishlistList",
    wishlist.map(item => `
      <div class="networth-row">
        <strong>${item.name || "Wishlist Item"}</strong>
        <span>${formatCurrency(item.price)}</span>
      </div>
    `),
    "No wishlist items yet."
  )

  renderNetWorthList(
    "nwBurnList",
    [
      `
        <div class="networth-row">
          <strong>Planner Expenses</strong>
          <span>${formatCurrency(plannerBurn)}</span>
        </div>
      `,
      `
        <div class="networth-row">
          <strong>Payoff Monthly Payments</strong>
          <span>${formatCurrency(payoffStats.monthlyDue)}</span>
        </div>
      `,
      `
        <div class="networth-row">
          <strong>Total Monthly Burn</strong>
          <span>${formatCurrency(monthlyBurn)}</span>
        </div>
      `
    ],
    "No monthly burn data yet."
  )
}

renderNetWorthPage()
