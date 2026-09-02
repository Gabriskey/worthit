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

function calculateSpendItAccountBalance(account, records) {
  let balance = Number(account?.initial || 0)

  records.forEach(record => {
    const amount = Number(record.amount || 0)

    if (
      record.type === "income" &&
      record.accountId === account.id
    ) {
      balance += amount
    }

    if (
      record.type === "expense" &&
      record.accountId === account.id
    ) {
      balance -= amount
    }

    if (record.type === "transfer") {
      if (record.fromId === account.id) balance -= amount
      if (record.toId === account.id) balance += amount
    }
  })

  return balance
}

function getSpendItBalancesForNetWorth() {
  const accounts = loadSpendItAccountsForNetWorth()
  const records = loadSpendItRecordsForNetWorth()

  return accounts.map(account => ({
    ...account,
    balance: calculateSpendItAccountBalance(account, records)
  }))
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
  if (el) el.textContent = Number(value || 0).toLocaleString()
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
  const payoffStats = getPayoffStats()

  const spendItAccounts = getSpendItBalancesForNetWorth()

const totalSpendItBalance = spendItAccounts.reduce(
  (sum, account) => sum + Number(account.balance || 0),
  0
)

  const totalSavings = savings.reduce((sum, goal) => sum + Number(goal.saved || 0), 0)
  const wishlistValue = wishlist.reduce((sum, item) => sum + Number(item.price || 0), 0)
  const plannerBurn = getCurrentMonthPlannerTotal()
  const monthlyBurn = plannerBurn + payoffStats.monthlyDue

  const netWorth = totalSpendItBalance - payoffStats.totalRemaining

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
        <strong>${account.name || "SpendIt Account"}</strong>
        <span class="${balanceClass}">
          ₱${balance.toLocaleString()}
        </span>
      </div>
    `
  }),
  "No SpendIt accounts found."
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
          ₱${Number(goal.saved || 0).toLocaleString()}
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
          <span class="networth-liabilities">₱${remaining.toLocaleString()}</span>
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
        <span>₱${Number(item.price || 0).toLocaleString()}</span>
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
          <span>₱${plannerBurn.toLocaleString()}</span>
        </div>
      `,
      `
        <div class="networth-row">
          <strong>Payoff Monthly Payments</strong>
          <span>₱${payoffStats.monthlyDue.toLocaleString()}</span>
        </div>
      `,
      `
        <div class="networth-row">
          <strong>Total Monthly Burn</strong>
          <span>₱${monthlyBurn.toLocaleString()}</span>
        </div>
      `
    ],
    "No monthly burn data yet."
  )
}

renderNetWorthPage()