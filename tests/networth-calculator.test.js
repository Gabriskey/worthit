const assert = require("node:assert/strict")
const {
  calculateNetWorth
} = require("../public/js/networth-calculator.js")

function calculate(input) {
  const before = JSON.stringify(input)
  const result = calculateNetWorth(input)
  assert.equal(JSON.stringify(input), before, "calculator must not mutate inputs")
  return result
}

let result = calculate({
  accounts: [{ id: "cash", initial: 100 }],
  records: [],
  financePlanner: {},
  payoffs: [],
  asOfDate: "2026-09-15"
})
assert.equal(result.totalAccountBalances, 100)
assert.equal(result.remainingLiabilities, 0)
assert.equal(result.netWorth, 100)

result = calculate({
  accounts: [{ id: "cash", initial: 100 }],
  records: [
    { type: "income", accountId: "cash", amount: 50 },
    { type: "expense", accountId: "cash", amount: 20 }
  ],
  financePlanner: {},
  payoffs: [],
  asOfDate: "2026-09-15"
})
assert.equal(result.totalAccountBalances, 130)

result = calculate({
  accounts: [
    { id: "a", initial: 100 },
    { id: "b", initial: 50 }
  ],
  records: [{ type: "transfer", fromId: "a", toId: "b", amount: 30 }],
  financePlanner: {},
  payoffs: [],
  asOfDate: "2026-09-15"
})
assert.deepEqual(result.accountBalances.map(account => account.balance), [70, 80])
assert.equal(result.totalAccountBalances, 150)

result = calculate({
  accounts: [{ id: "cash", initial: 0 }],
  records: [{ type: "income", accountId: "cash", amount: 75, source: "earnit" }],
  financePlanner: {},
  payoffs: [],
  asOfDate: "2026-09-15"
})
assert.equal(result.netWorth, 75)

result = calculate({
  accounts: [{ id: "cash", initial: 100 }],
  records: [],
  financePlanner: {},
  payoffs: [{ id: "manual", total: 100, paid: 40, monthly: 20 }],
  asOfDate: "2026-09-15"
})
assert.equal(result.remainingLiabilities, 60)
assert.equal(result.netWorth, 40)

result = calculate({
  accounts: [],
  records: [],
  financePlanner: {},
  payoffs: [{ id: "paid", total: 100, paid: 100, monthly: 20 }],
  asOfDate: "2026-09-15"
})
assert.equal(result.remainingLiabilities, 0)
assert.equal(result.payoffStats.monthlyDue, 0)

result = calculate({
  accounts: [],
  records: [],
  financePlanner: {
    September: [{ label: "Phone", amount: 10, installmentTotal: 100, date: "2026-09-15" }],
    October: [{ label: "Phone", amount: 10, installmentTotal: 100, date: "2026-10-15" }]
  },
  payoffs: [],
  asOfDate: "2026-09-15"
})
assert.equal(result.remainingLiabilities, 100)
assert.equal(result.payoffStats.monthlyDue, 10)

result = calculate({
  accounts: [{ id: "cash", initial: 200 }, { id: "bank", initial: 80 }],
  records: [{ type: "expense", accountId: "bank", amount: 30 }],
  financePlanner: {},
  payoffs: [{ id: "loan", total: 150, paid: 50 }],
  asOfDate: "2026-09-15"
})
assert.equal(result.totalAccountBalances, 250)
assert.equal(result.remainingLiabilities, 100)
assert.equal(result.netWorth, 150)

result = calculate({
  accounts: [],
  records: [],
  financePlanner: {
    September: [{ label: "Phone", amount: 10, date: "2026-09-15" }],
    October: [{ label: "Phone", amount: 10, date: "2026-10-15" }]
  },
  payoffs: [],
  asOfDate: "2026-11-15"
})
assert.equal(result.remainingLiabilities, 0)

console.log("Net Worth calculator verification passed.")
