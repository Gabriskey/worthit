/* Client-side Net Worth history capture for the current eligible Manila day. */

(() => {
  const FIRST_SNAPSHOT_DATE = "2026-09-15"
  const MANILA_TIME_ZONE = "Asia/Manila"
  const NET_WORTH_SOURCE_KEYS = Object.freeze({
    spendit: new Set([
      "expensepath-accounts-v1",
      "expensepath-records-v1"
    ]),
    planit: new Set([
      "financePlanner",
      "worthitPayoffs"
    ])
  })

  function roundMoney(value) {
    const amount = Number(value)

    if (!Number.isFinite(amount)) {
      return 0
    }

    const rounded = Math.round(
      (Math.abs(amount) + Number.EPSILON) * 100
    ) / 100

    return amount < 0 ? -rounded : rounded
  }

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
      netWorth: roundMoney(result.netWorth),
      totalAccountBalances: roundMoney(result.totalAccountBalances),
      remainingLiabilities: roundMoney(result.remainingLiabilities),
      timezone: MANILA_TIME_ZONE,
      calculationVersion: 1
    }
  }

  function isNetWorthSourceChange(change) {
    const appName = String(change?.appName || "")
    const storageKey = String(change?.storageKey || "")

    return NET_WORTH_SOURCE_KEYS[appName]?.has(storageKey) || false
  }

  async function captureNetWorthSnapshot({
    userId,
    asOfDate,
    currentDate = getManilaDate(),
    refreshUserNetWorthSnapshot,
    calculateNetWorth
  }) {
    if (
      asOfDate !== currentDate ||
      !isEligibleSnapshotDate(asOfDate)
    ) {
      return { status: "ineligible" }
    }

    return refreshUserNetWorthSnapshot(
      userId,
      asOfDate,
      (spendItState, planItState) => {
        if (spendItState === null && planItState === null) {
          return null
        }

        const result = calculateNetWorth({
          accounts: arrayStorageValue(spendItState, "expensepath-accounts-v1"),
          records: arrayStorageValue(spendItState, "expensepath-records-v1"),
          financePlanner: objectStorageValue(planItState, "financePlanner"),
          payoffs: arrayStorageValue(planItState, "worthitPayoffs"),
          asOfDate
        })

        return {
          result,
          snapshot: buildSnapshot(result, asOfDate)
        }
      }
    )
  }

  function initializeNetWorthHistoryCapture() {
    Promise.all([
      import("./auth.js"),
      import("./database.js")
    ]).then(([{ watchAuthState }, {
      refreshUserNetWorthSnapshot
    }]) => {
      const capturedUserIds = new Set()

      const refreshTodayForUser = async user => {
        const currentDate = getManilaDate()

        try {
          const outcome = await captureNetWorthSnapshot({
            userId: user.uid,
            asOfDate: currentDate,
            currentDate,
            refreshUserNetWorthSnapshot,
            calculateNetWorth: globalThis.WorthItNetWorthCalculator.calculateNetWorth
          })

          if (
            outcome.status === "created" ||
            outcome.status === "updated"
          ) {
            window.dispatchEvent(
              new CustomEvent("worthit:networth-snapshot-refreshed")
            )
          }
        } catch (error) {
          console.warn("Net Worth history capture failed:", error)
        }
      }

      let currentUser = null

      watchAuthState(async user => {
        currentUser = user

        if (!user || capturedUserIds.has(user.uid)) {
          return
        }

        capturedUserIds.add(user.uid)

        await refreshTodayForUser(user)
      })

      window.addEventListener("worthit:cloud-storage-saved", event => {
        const change = event.detail

        if (
          !currentUser ||
          change?.userId !== currentUser.uid ||
          !isNetWorthSourceChange(change)
        ) {
          return
        }

        refreshTodayForUser(currentUser)
      })
    }).catch(error => {
      console.warn("Net Worth history could not start:", error)
    })
  }

  const api = {
    FIRST_SNAPSHOT_DATE,
    MANILA_TIME_ZONE,
    roundMoney,
    isNetWorthSourceChange,
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
