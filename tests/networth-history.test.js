const assert = require("node:assert/strict")
const {
  calculateNetWorth
} = require("../public/js/networth-calculator.js")
const {
  MANILA_TIME_ZONE,
  getManilaDate,
  isEligibleSnapshotDate,
  captureNetWorthSnapshot
} = require("../public/js/networth-history.js")

function appState(storage) {
  return { storage }
}

function createSnapshotWriter(initial = {}) {
  const snapshots = new Map(Object.entries(initial))

  return {
    snapshots,
    async create(userId, date, snapshot) {
      const key = `${userId}/${date}`

      if (snapshots.has(key)) {
        return false
      }

      snapshots.set(key, {
        ...snapshot,
        capturedAt: "SERVER_TIMESTAMP"
      })
      return true
    }
  }
}

function capture({ userId = "user", asOfDate = "2026-09-15", states, writer }) {
  return captureNetWorthSnapshot({
    userId,
    asOfDate,
    loadUserAppState: async (_userId, appName) => states[appName] ?? null,
    createUserNetWorthSnapshot: writer.create.bind(writer),
    calculateNetWorth
  })
}

async function main() {
  assert.equal(MANILA_TIME_ZONE, "Asia/Manila")
  assert.equal(getManilaDate(new Date("2026-09-14T16:00:00.000Z")), "2026-09-15")
  assert.equal(isEligibleSnapshotDate("2026-09-14"), false)
  assert.equal(isEligibleSnapshotDate("2026-09-15"), true)
  assert.equal(isEligibleSnapshotDate("2026-10-01"), true)
  assert.equal(isEligibleSnapshotDate("2026-10-15"), true)
  assert.equal(isEligibleSnapshotDate("2026-10-16"), false)
  assert.equal(isEligibleSnapshotDate("2026-09-01"), false)

  const states = {
    spendit: appState({
      "expensepath-accounts-v1": JSON.stringify([{ id: "cash", initial: 100 }]),
      "expensepath-records-v1": JSON.stringify([
        { type: "income", accountId: "cash", amount: 25 }
      ])
    }),
    planit: appState({
      financePlanner: {},
      worthitPayoffs: [{ id: "loan", total: 50, paid: 20, monthly: 10 }]
    })
  }
  const writer = createSnapshotWriter()
  const first = await capture({ states, writer })
  const snapshotKey = "user/2026-09-15"

  assert.equal(first.status, "created")
  assert.deepEqual(writer.snapshots.get(snapshotKey), {
    date: "2026-09-15",
    netWorth: 95,
    totalAccountBalances: 125,
    remainingLiabilities: 30,
    capturedAt: "SERVER_TIMESTAMP",
    timezone: "Asia/Manila",
    calculationVersion: 1
  })

  const second = await capture({ states, writer })
  assert.equal(second.status, "existing")
  assert.equal(writer.snapshots.get(snapshotKey).netWorth, 95)

  const simultaneousWriter = createSnapshotWriter()
  const simultaneous = await Promise.all([
    capture({ states, writer: simultaneousWriter }),
    capture({ states, writer: simultaneousWriter })
  ])
  assert.deepEqual(
    simultaneous.map(result => result.status).sort(),
    ["created", "existing"]
  )
  assert.equal(simultaneousWriter.snapshots.size, 1)

  const spendItOnlyWriter = createSnapshotWriter()
  const spendItOnly = await capture({
    states: {
      spendit: appState({
        "expensepath-accounts-v1": [{ id: "cash", initial: 40 }],
        "expensepath-records-v1": []
      })
    },
    writer: spendItOnlyWriter
  })
  assert.equal(spendItOnly.status, "created")
  assert.equal(
    spendItOnlyWriter.snapshots.get(snapshotKey).netWorth,
    40
  )

  const planItOnlyWriter = createSnapshotWriter()
  const planItOnly = await capture({
    states: {
      planit: appState({
        financePlanner: {},
        worthitPayoffs: [{ id: "loan", total: 25, paid: 0 }]
      })
    },
    writer: planItOnlyWriter
  })
  assert.equal(planItOnly.status, "created")
  assert.equal(
    planItOnlyWriter.snapshots.get(snapshotKey).netWorth,
    -25
  )

  const emptyWriter = createSnapshotWriter()
  const empty = await capture({ states: {}, writer: emptyWriter })
  assert.equal(empty.status, "skipped")
  assert.equal(emptyWriter.snapshots.size, 0)

  const explicitDateWriter = createSnapshotWriter()
  const explicitDate = await capture({
    asOfDate: "2026-11-15",
    states: {
      planit: appState({
        financePlanner: {
          September: [{ label: "Phone", amount: 10, installmentTotal: 100 }],
          October: [{ label: "Phone", amount: 10, installmentTotal: 100 }]
        },
        worthitPayoffs: []
      })
    },
    writer: explicitDateWriter
  })
  assert.equal(explicitDate.result.remainingLiabilities, 0)

  console.log("Net Worth history verification passed.")
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
