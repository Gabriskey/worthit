/* Pure Net Worth calculations shared by browser pages and future backend code. */

(() => {
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  function arrayValue(value) {
    return Array.isArray(value) ? value : []
  }

  function asOfMonthIndex(asOfDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(asOfDate || ""))

    if (!match) {
      throw new Error("asOfDate must use YYYY-MM-DD format.")
    }

    const month = Number(match[2])
    const day = Number(match[3])

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error("asOfDate must be a valid calendar date.")
    }

    return month - 1
  }

  function normalizePayoff(item = {}) {
    return {
      id: item.id || "",
      name: String(item.name || "").trim(),
      total: Number(item.total || 0),
      paid: Number(item.paid || 0),
      monthly: Number(item.monthly || 0),
      dueDay: Number(item.dueDay || 1),
      category: String(item.category || "Installment").trim(),
      source: item.source || "",
      entryCount: Number(item.entryCount || 0)
    }
  }

  function calculateSpendItAccountBalance(account, records) {
    let balance = Number(account?.initial || 0)

    arrayValue(records).forEach(record => {
      const amount = Number(record.amount || 0)

      if (record.type === "income" && record.accountId === account.id) {
        balance += amount
      }

      if (record.type === "expense" && record.accountId === account.id) {
        balance -= amount
      }

      if (record.type === "transfer") {
        if (record.fromId === account.id) balance -= amount
        if (record.toId === account.id) balance += amount
      }
    })

    return balance
  }

  function getAccountBalances(accounts, records) {
    return arrayValue(accounts).map(account => ({
      ...account,
      balance: calculateSpendItAccountBalance(account, records)
    }))
  }

  function getRecurringPlannerPayoffs(financePlanner, asOfDate) {
    const grouped = {}
    const currentMonthIndex = asOfMonthIndex(asOfDate)

    Object.entries(financePlanner || {}).forEach(([month, entries]) => {
      const monthIndex = MONTHS.indexOf(month)
      if (monthIndex < currentMonthIndex || !Array.isArray(entries)) return

      entries.forEach(entry => {
        const label = String(entry.label || "").trim()
        if (!label) return

        const key = label.toLowerCase()
        const amount = Number(entry.amount || 0)
        const total = Number(entry.installmentTotal || 0)

        if (!grouped[key]) {
          grouped[key] = {
            id: `planner_${key.replace(/[^a-z0-9]+/g, "_")}`,
            name: label,
            total: 0,
            paid: 0,
            monthly: amount,
            dueDay: entry.date ? Number(String(entry.date).split("-")[2]) : 1,
            category: "Planner Installment",
            source: "planner",
            months: new Set(),
            entryCount: 0
          }
        }

        grouped[key].months.add(month)
        grouped[key].entryCount += 1

        if (amount > grouped[key].monthly) grouped[key].monthly = amount
        if (total > grouped[key].total) grouped[key].total = total
      })
    })

    return Object.values(grouped)
      .filter(item => item.months.size >= 2)
      .map(item => {
        const estimatedTotal = item.total > 0
          ? item.total
          : item.monthly * item.entryCount

        return normalizePayoff({
          ...item,
          total: estimatedTotal
        })
      })
  }

  function getCombinedPayoffs({ financePlanner, payoffs, asOfDate }) {
    const manualPayoffs = arrayValue(payoffs).map(normalizePayoff)
    const plannerPayoffs = getRecurringPlannerPayoffs(financePlanner, asOfDate)
    const manualNames = new Set(
      manualPayoffs.map(item => item.name.toLowerCase().trim())
    )

    return [
      ...manualPayoffs,
      ...plannerPayoffs.filter(item => !manualNames.has(item.name.toLowerCase().trim()))
    ]
  }

  function calculatePayoffStats({ financePlanner, payoffs, asOfDate }) {
    const combinedPayoffs = getCombinedPayoffs({
      financePlanner,
      payoffs,
      asOfDate
    })

    const calculatedPayoffs = combinedPayoffs.map(payoff => {
      const remaining = Math.max(
        Number(payoff.total || 0) - Number(payoff.paid || 0),
        0
      )

      return {
        ...payoff,
        effectiveMonthlyDue:
          payoff.source !== "planner" && remaining <= 0
            ? 0
            : Number(payoff.monthly || 0)
      }
    })

    const totalOriginal = calculatedPayoffs.reduce(
      (sum, payoff) => sum + Number(payoff.total || 0),
      0
    )
    const totalPaid = calculatedPayoffs.reduce(
      (sum, payoff) => sum + Number(payoff.paid || 0),
      0
    )
    const totalRemaining = calculatedPayoffs.reduce(
      (sum, payoff) => sum + Math.max(
        Number(payoff.total || 0) - Number(payoff.paid || 0),
        0
      ),
      0
    )
    const monthlyDue = calculatedPayoffs.reduce(
      (sum, payoff) => sum + payoff.effectiveMonthlyDue,
      0
    )
    const entryCount = calculatedPayoffs.reduce(
      (sum, payoff) => sum + Number(payoff.entryCount || 1),
      0
    )

    return {
      payoffs: calculatedPayoffs,
      totalOriginal,
      totalPaid,
      totalRemaining,
      monthlyDue,
      activeCount: calculatedPayoffs.length,
      entryCount
    }
  }

  function calculateNetWorth({ accounts, records, financePlanner, payoffs, asOfDate }) {
    const accountBalances = getAccountBalances(accounts, records)
    const payoffStats = calculatePayoffStats({
      financePlanner,
      payoffs,
      asOfDate
    })
    const totalAccountBalances = accountBalances.reduce(
      (sum, account) => sum + Number(account.balance || 0),
      0
    )
    const remainingLiabilities = payoffStats.totalRemaining

    return {
      accountBalances,
      payoffStats,
      totalAccountBalances,
      remainingLiabilities,
      netWorth: totalAccountBalances - remainingLiabilities
    }
  }

  const api = {
    calculateSpendItAccountBalance,
    getAccountBalances,
    getRecurringPlannerPayoffs,
    getCombinedPayoffs,
    calculatePayoffStats,
    calculateNetWorth
  }

  if (typeof module === "object" && module.exports) {
    module.exports = api
  }

  globalThis.WorthItNetWorthCalculator = api
})()
