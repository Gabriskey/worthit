import { watchAuthState } from "./auth.js"
import { loadUserAppState } from "./database.js"
import "./cloud-loading.js"

const HOME_STORAGE_KEYS = Object.freeze([
  "expensepath-accounts-v1",
  "expensepath-records-v1",
  "financePlanner",
  "worthitPayoffs",
  "wishlistItems"
])

let currentUser = null

function readCloudStorageValue(appState, storageKey) {
  const storage = appState?.storage

  if (
    !storage ||
    typeof storage !== "object" ||
    !Object.prototype.hasOwnProperty.call(storage, storageKey)
  ) {
    return null
  }

  const value = storage[storageKey]

  if (value === null || value === undefined) {
    return null
  }

  return typeof value === "string"
    ? value
    : JSON.stringify(value)
}

function applyHomeStorageValues(storageValues) {
  storageValues.forEach(([storageKey, value]) => {
    if (value === null) {
      localStorage.removeItem(storageKey)
    } else {
      localStorage.setItem(storageKey, value)
    }
  })
}

function clearHomePrivateCache() {
  HOME_STORAGE_KEYS.forEach(storageKey => {
    localStorage.removeItem(storageKey)
  })
}

async function loadHomeForUser(user) {
  const userId = user.uid

  const [spendItState, planItState] = await Promise.all([
    loadUserAppState(userId, "spendit"),
    loadUserAppState(userId, "planit")
  ])

  // Do not apply a previous user's cloud data after auth changes.
  if (!currentUser || currentUser.uid !== userId) {
    return
  }

  const storageValues = [
    [
      "expensepath-accounts-v1",
      readCloudStorageValue(spendItState, "expensepath-accounts-v1")
    ],
    [
      "expensepath-records-v1",
      readCloudStorageValue(spendItState, "expensepath-records-v1")
    ],
    [
      "financePlanner",
      readCloudStorageValue(planItState, "financePlanner")
    ],
    [
      "worthitPayoffs",
      readCloudStorageValue(planItState, "worthitPayoffs")
    ],
    [
      "wishlistItems",
      readCloudStorageValue(planItState, "wishlistItems")
    ]
  ]

  applyHomeStorageValues(storageValues)
  window.renderWorthItHome?.()
}

watchAuthState(async user => {
  currentUser = user

  if (!user) {
    clearHomePrivateCache()
    window.renderWorthItHome?.()
    window.finishWorthItCloudLoading?.()
    return
  }

  window.showWorthItCloudLoading?.()

  try {
    await loadHomeForUser(user)
  } catch (error) {
    console.error("Home cloud load failed:", error)
  } finally {
    if (currentUser?.uid === user.uid) {
      window.finishWorthItCloudLoading?.()
    }
  }
})
