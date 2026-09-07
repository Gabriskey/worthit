/* Client-side, immutable Net Worth history capture. */

(() => {
  const FIRST_SNAPSHOT_DATE = "2026-09-15"
  const MANILA_TIME_ZONE = "Asia/Manila"

  function getManilaDate(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: MANILA_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(now)
    const value = type => parts.find(part => part.type === type)?.value

    return `${value("year")}-${value("month")}-${value("day")}`
  }

  function isEligibleSnapshotDate(asOfDate) {
    if (typeof asOfDate !== "string" || asOfDate < FIRST_SNAPSHOT_DATE) {
      return false
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asOfDate)

    return Boolean(match) && ["01", "15"].includes(match[3])
  }

  function storageValue(appState, storageKey, fallback) {
    const storage = appState?.storage

    if (
      !storage ||
      typeof storage !== "object" ||
      !Object.prototype.hasOwnProperty.call(storage, storageKey)
    ) {
      return fallback
    }

    const value = storage[storageKey]

    if (value === null || value === undefined) {
      return fallback
    }

    if (typeof value !== "string") {
      return value
    }

    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }

  function arrayStorageValue(appState, storageKey) {
    const value = storageValue(appState, storageKey, [])

    return Array.isArray(value) ? value : []
  }

  function objectStorageValue(appState, storageKey) {
    const value = storageValue(appState, storageKey, {})

    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {}
  }

  function buildSnapshot(result, asOfDate) {
    return {
      date: asOfDate,
      netWorth: result.netWorth,
      totalAccountBalances: result.totalAccountBalances,
      remainingLiabilities: result.remainingLiabilities,
      timezone: MANILA_TIME_ZONE,
      calculationVersion: 1
    }
  }

  async function captureNetWorthSnapshot({
    userId,
    asOfDate,
    loadUserAppState,
    createUserNetWorthSnapshot,
    calculateNetWorth
  }) {
    if (!isEligibleSnapshotDate(asOfDate)) {
      return { status: "ineligible" }
    }

    const [spendItState, planItState] = await Promise.all([
      loadUserAppState(userId, "spendit"),
      loadUserAppState(userId, "planit")
    ])

    if (spendItState === null && planItState === null) {
      return { status: "skipped" }
    }

    const result = calculateNetWorth({
      accounts: arrayStorageValue(spendItState, "expensepath-accounts-v1"),
      records: arrayStorageValue(spendItState, "expensepath-records-v1"),
      financePlanner: objectStorageValue(planItState, "financePlanner"),
      payoffs: arrayStorageValue(planItState, "worthitPayoffs"),
      asOfDate
    })
    const snapshot = buildSnapshot(result, asOfDate)
    const created = await createUserNetWorthSnapshot(
      userId,
      asOfDate,
      snapshot
    )

    return {
      status: created ? "created" : "existing",
      result,
      snapshot
    }
  }

  function initializeNetWorthHistoryCapture() {
    Promise.all([
      import("./auth.js"),
      import("./database.js")
    ]).then(([{ watchAuthState }, {
      loadUserAppState,
      createUserNetWorthSnapshot
    }]) => {
      const capturedUserIds = new Set()

      watchAuthState(async user => {
        if (!user || capturedUserIds.has(user.uid)) {
          return
        }

        capturedUserIds.add(user.uid)

        try {
          await captureNetWorthSnapshot({
            userId: user.uid,
            asOfDate: getManilaDate(),
            loadUserAppState,
            createUserNetWorthSnapshot,
            calculateNetWorth: globalThis.WorthItNetWorthCalculator.calculateNetWorth
          })
        } catch (error) {
          console.warn("Net Worth history capture failed:", error)
        }
      })
    }).catch(error => {
      console.warn("Net Worth history could not start:", error)
    })
  }

  const api = {
    FIRST_SNAPSHOT_DATE,
    MANILA_TIME_ZONE,
    getManilaDate,
    isEligibleSnapshotDate,
    buildSnapshot,
    captureNetWorthSnapshot
  }

  if (typeof module === "object" && module.exports) {
    module.exports = api
  }

  globalThis.WorthItNetWorthHistory = api

  if (typeof window !== "undefined" && window.document) {
    initializeNetWorthHistoryCapture()
  }
})()
