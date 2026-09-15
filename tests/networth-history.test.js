const assert = require("node:assert/strict")
const {
  calculateNetWorth
} = require("../public/js/networth-calculator.js")
const {
  MANILA_TIME_ZONE,
  getManilaDate,
  isEligibleSnapshotDate,
  isNetWorthSourceChange,
  buildSnapshot,
  captureNetWorthSnapshot
} = require("../public/js/networth-history.js")

function appState(storage) {
  return { storage }
}

function createSnapshotWriter(initial = {}) {
  const snapshots = new Map(Object.entries(initial))
  let timestampCount = 0
  let transaction = Promise.resolve()

  return {
    snapshots,
    refresh(userId, date, buildSnapshot, states) {
      const run = transaction.then(async () => {
        const outcome = await buildSnapshot(
          states.spendit ?? null,
          states.planit ?? null
        )

        if (!outcome) {
          return { status: "skipped" }
        }

        const key = `${userId}/${date}`
        const existing = snapshots.get(key)
        timestampCount += 1
        const serverTime = `SERVER_TIMESTAMP_${timestampCount}`

        if (existing) {
          snapshots.set(key, {
            ...existing,
            netWorth: outcome.snapshot.netWorth,
            totalAccountBalances: outcome.snapshot.totalAccountBalances,
            remainingLiabilities: outcome.snapshot.remainingLiabilities,
            updatedAt: serverTime
          })
          return { status: "updated", ...outcome }
        }

        snapshots.set(key, {
          ...outcome.snapshot,
          capturedAt: serverTime,
          updatedAt: serverTime
        })
        return { status: "created", ...outcome }
      })

      transaction = run.catch(() => {})
      return run
    }
  }
}

function capture({
  userId = "user",
  asOfDate = "2026-09-15",
  currentDate = asOfDate,
  states,
  writer
}) {
  return captureNetWorthSnapshot({
    userId,
    asOfDate,
    currentDate,
    refreshUserNetWorthSnapshot: (id, date, buildSnapshot) =>
      writer.refresh(id, date, buildSnapshot, states),
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

  assert.deepEqual(
    buildSnapshot({
      netWorth: 446.18999999999996,
      totalAccountBalances: -446.18999999999996,
      remainingLiabilities: 100.005
    }, "2026-10-01"),
    {
      date: "2026-10-01",
      netWorth: 446.19,
      totalAccountBalances: -446.19,
      remainingLiabilities: 100.01,
      timezone: "Asia/Manila",
      calculationVersion: 1
    }
  )

  assert.equal(isNetWorthSourceChange({
    appName: "spendit",
    storageKey: "expensepath-accounts-v1"
  }), true)
  assert.equal(isNetWorthSourceChange({
    appName: "spendit",
    storageKey: "expensepath-records-v1"
  }), true)
  assert.equal(isNetWorthSourceChange({
    appName: "planit",
    storageKey: "financePlanner"
  }), true)
  assert.equal(isNetWorthSourceChange({
    appName: "planit",
    storageKey: "worthitPayoffs"
  }), true)
  assert.equal(isNetWorthSourceChange({
    appName: "planit",
    storageKey: "wishlistItems"
  }), false)
  assert.equal(isNetWorthSourceChange({
    appName: "saveit",
    storageKey: "savingsGoals"
  }), false)

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
    capturedAt: "SERVER_TIMESTAMP_1",
    updatedAt: "SERVER_TIMESTAMP_1",
    timezone: "Asia/Manila",
    calculationVersion: 1
  })

  const capturedAt = writer.snapshots.get(snapshotKey).capturedAt
  const updated = await capture({
    states: {
      ...states,
      spendit: appState({
        "expensepath-accounts-v1": [{ id: "cash", initial: 200 }],
        "expensepath-records-v1": []
      })
    },
    writer
  })
  assert.equal(updated.status, "updated")
  assert.equal(writer.snapshots.size, 1)
  assert.equal(writer.snapshots.get(snapshotKey).capturedAt, capturedAt)
  assert.notEqual(writer.snapshots.get(snapshotKey).updatedAt, capturedAt)
  assert.equal(writer.snapshots.get(snapshotKey).netWorth, 170)

  await capture({
    states: {
      ...states,
      spendit: appState({
        "expensepath-accounts-v1": [{ id: "cash", initial: 300 }],
        "expensepath-records-v1": []
      })
    },
    writer
  })
  assert.equal(writer.snapshots.get(snapshotKey).netWorth, 270)

  const sep16 = await capture({
    asOfDate: "2026-09-15",
    currentDate: "2026-09-16",
    states,
    writer
  })
  assert.equal(sep16.status, "ineligible")
  assert.equal(writer.snapshots.get(snapshotKey).netWorth, 270)

  const oct1 = await capture({
    asOfDate: "2026-10-01",
    currentDate: "2026-10-01",
    states,
    writer
  })
  assert.equal(oct1.status, "created")
  assert.equal(writer.snapshots.size, 2)
  assert.equal(writer.snapshots.get(snapshotKey).netWorth, 270)

  const oct1Updated = await capture({
    asOfDate: "2026-10-01",
    currentDate: "2026-10-01",
    states: {
      ...states,
      spendit: appState({
        "expensepath-accounts-v1": [{ id: "cash", initial: 400 }],
        "expensepath-records-v1": []
      })
    },
    writer
  })
  assert.equal(oct1Updated.status, "updated")
  assert.equal(writer.snapshots.size, 2)
  assert.equal(writer.snapshots.get("user/2026-10-01").netWorth, 370)
  assert.equal(writer.snapshots.get(snapshotKey).netWorth, 270)

  const nonEligible = await capture({
    asOfDate: "2026-10-02",
    currentDate: "2026-10-02",
    states,
    writer
  })
  assert.equal(nonEligible.status, "ineligible")
  assert.equal(writer.snapshots.size, 2)

  const missedDateWriter = createSnapshotWriter()
  await capture({
    asOfDate: "2026-10-01",
    currentDate: "2026-10-01",
    states,
    writer: missedDateWriter
  })
  assert.equal(missedDateWriter.snapshots.has("user/2026-09-15"), false)
  assert.equal(missedDateWriter.snapshots.has("user/2026-10-01"), true)

  const simultaneousWriter = createSnapshotWriter()
  const simultaneous = await Promise.all([
    capture({ states, writer: simultaneousWriter }),
    capture({ states, writer: simultaneousWriter })
  ])
  assert.deepEqual(
    simultaneous.map(result => result.status).sort(),
    ["created", "updated"]
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
  assert.equal(spendItOnlyWriter.snapshots.get(snapshotKey).netWorth, 40)

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
  assert.equal(planItOnlyWriter.snapshots.get(snapshotKey).netWorth, -25)

  const emptyWriter = createSnapshotWriter()
  const empty = await capture({ states: {}, writer: emptyWriter })
  assert.equal(empty.status, "skipped")
  assert.equal(emptyWriter.snapshots.size, 0)

  const explicitDateWriter = createSnapshotWriter()
  const explicitDate = await capture({
    asOfDate: "2026-11-15",
    currentDate: "2026-11-15",
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
