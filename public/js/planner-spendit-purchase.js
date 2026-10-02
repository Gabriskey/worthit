import { watchAuthState } from "./auth.js"
import {
  loadUserAppState,
  runUserStorageRestoreTransaction
} from "./database.js"

const SPENDIT_APP = "spendit"
const PLANIT_APP = "planit"
const ACCOUNT_KEY = "expensepath-accounts-v1"
const RECORD_KEY = "expensepath-records-v1"
const PURCHASED_ITEMS_KEY = "worthitPurchasedItems"

let currentUser = null
let resolveAuthState
const authStateReady = new Promise(resolve => {
  resolveAuthState = resolve
})

watchAuthState(user => {
  currentUser = user
  resolveAuthState?.()
  resolveAuthState = null
})

function parseStorageArray(value, label) {
  if (value === null || value === undefined) return []

  let parsed = value

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value)
    } catch {
      throw new Error(`Could not read current ${label}.`)
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Could not read current ${label}.`)
  }

  return parsed
}

function storageValue(state, key) {
  const storage = state?.storage

  if (!storage || typeof storage !== "object") {
    return null
  }

  return Object.prototype.hasOwnProperty.call(storage, key)
    ? storage[key]
    : null
}

async function requireSignedInUser() {
  await authStateReady

  if (!currentUser) {
    throw new Error("Sign in to add or link a Spending expense.")
  }

  return currentUser
}

function createSpendItRecordId() {
  return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getEligibleExpenses(records, linkedRecordIds) {
  return records.filter(record => {
    return (
      record?.type === "expense" &&
      !record.source &&
      !record.transferRecordId &&
      !linkedRecordIds.has(String(record.id || ""))
    )
  })
}

async function loadSpendItPurchaseContext() {
  const user = await requireSignedInUser()
  const [spendItState, planItState] = await Promise.all([
    loadUserAppState(user.uid, SPENDIT_APP),
    loadUserAppState(user.uid, PLANIT_APP)
  ])

  const accounts = parseStorageArray(
    storageValue(spendItState, ACCOUNT_KEY),
    "Spending accounts"
  )
  const records = parseStorageArray(
    storageValue(spendItState, RECORD_KEY),
    "Spending records"
  )
  const purchasedItems = parseStorageArray(
    storageValue(planItState, PURCHASED_ITEMS_KEY),
    "purchase history"
  )
  const linkedRecordIds = new Set(
    purchasedItems
      .map(item => String(item?.spendItRecordId || ""))
      .filter(Boolean)
  )

  return {
    accounts,
    eligibleExpenses: getEligibleExpenses(records, linkedRecordIds)
  }
}

function validLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""))
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

function normalizeExpenseInput(input, accounts) {
  const accountId = String(input?.accountId || "")
  const description = String(input?.description || "").trim()
  const notes = String(input?.notes || "").trim()
  const amount = Number(input?.amount)
  const date = String(input?.date || "")
  const time = String(input?.time || "")
  const category = String(input?.category || "")
  const subcategory = String(input?.subcategory || "")
  const categories = window.WorthItSpendItCategories || []
  const categoryDefinition = categories.find(item => item.name === category)

  if (!accounts.some(account => String(account?.id) === accountId)) {
    throw new Error("Choose an existing Spending account.")
  }

  if (!description) {
    throw new Error("Enter a purchase name.")
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than 0.")
  }

  if (!validLocalDate(date)) {
    throw new Error("Choose a valid purchase date.")
  }

  if (time && !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Choose a valid purchase time.")
  }

  if (!categoryDefinition) {
    throw new Error("Choose a Spending category.")
  }

  if (subcategory && !categoryDefinition.subs.includes(subcategory)) {
    throw new Error("Choose a valid Spending subcategory.")
  }

  return {
    accountId,
    amount,
    category,
    subcategory,
    date,
    time,
    description: notes ? `${description}: ${notes}` : description
  }
}

function updateLocalSpendItRecords(userId, rawRecords) {
  if (currentUser?.uid !== userId) return

  localStorage.setItem(RECORD_KEY, rawRecords)
  window.dispatchEvent(new CustomEvent("worthit:cloud-storage-saved", {
    detail: {
      userId,
      appName: SPENDIT_APP,
      storageKey: RECORD_KEY
    }
  }))
}

async function createPlannerPurchaseExpense(input) {
  const user = await requireSignedInUser()
  const recordId = createSpendItRecordId()
  const createdAt = Date.now()

  const result = await runUserStorageRestoreTransaction(
    user.uid,
    [SPENDIT_APP],
    freshStates => {
      const spendItState = freshStates.get(SPENDIT_APP)
      const accounts = parseStorageArray(
        storageValue(spendItState, ACCOUNT_KEY),
        "Spending accounts"
      )
      const records = parseStorageArray(
        storageValue(spendItState, RECORD_KEY),
        "Spending records"
      )
      const expense = normalizeExpenseInput(input, accounts)

      if (records.some(record => String(record?.id) === recordId)) {
        throw new Error("Could not create a unique Spending expense.")
      }

      const record = {
        id: recordId,
        createdAt,
        type: "expense",
        ...expense
      }
      const nextRecords = [record, ...records]
      const rawRecords = JSON.stringify(nextRecords)

      return {
        storageUpdates: {
          [SPENDIT_APP]: {
            [RECORD_KEY]: rawRecords
          }
        },
        record,
        rawRecords
      }
    }
  )

  updateLocalSpendItRecords(user.uid, result.rawRecords)

  return {
    recordId: result.record.id,
    record: result.record
  }
}

async function verifySpendItPurchaseExpense(recordId) {
  const context = await loadSpendItPurchaseContext()
  const record = context.eligibleExpenses.find(
    item => String(item?.id) === String(recordId || "")
  )

  if (!record) {
    throw new Error(
      "This Spending expense is no longer available to link. Refresh the list and choose another expense."
    )
  }

  return record
}

window.PlannerSpendItPurchase = {
  loadSpendItPurchaseContext,
  createPlannerPurchaseExpense,
  verifySpendItPurchaseExpense
}
