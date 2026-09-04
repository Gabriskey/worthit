/* Centralized WorthIt backup export and conservative restore flow. */

import { watchAuthState } from "./auth.js"
import {
  loadUserAppState,
  runUserStorageRestoreTransaction
} from "./database.js"

const BACKUP_AREAS = Object.freeze({
  earnit: [
    { appName: "earnit", storageKey: "salary-growth-tracker-v1" },
    { appName: "earnit", storageKey: "salary-growth-tracker-companies-v1" }
  ],
  spendit: [
    { appName: "spendit", storageKey: "expensepath-accounts-v1" },
    { appName: "spendit", storageKey: "expensepath-records-v1" }
  ],
  planit: [
    { appName: "planit", storageKey: "financePlanner" },
    { appName: "planit", storageKey: "worthitPayoffs" },
    { appName: "planit", storageKey: "worthitPurchasedItems" }
  ],
  wishlist: [
    { appName: "planit", storageKey: "wishlistItems" },
    { appName: "planit", storageKey: "wishlistCollections" }
  ],
  saveit: [
    { appName: "saveit", storageKey: "savingsGoals" }
  ],
  preferences: [
    { appName: "earnit", storageKey: "salary-growth-tracker-ui-v1" },
    { appName: "earnit", storageKey: "salary-growth-tracker-active-page" },
    { appName: "spendit", storageKey: "expensepath-ui-v1" },
    { appName: "planit", storageKey: "collapsedMonths" },
    { appName: "planit", storageKey: "wishlistSortState" },
    { appName: "planit", storageKey: "wishlistFilterState" },
    { appName: "planit", storageKey: "wishlistViewState" },
    { storageKey: "worthit-theme", source: "local" }
  ]
})

const AREA_LABELS = Object.freeze({
  earnit: "EarnIt",
  spendit: "SpendIt",
  planit: "PlanIt",
  wishlist: "Wishlist",
  saveit: "SaveIt",
  preferences: "Preferences"
})

const SAFETY_BACKUP_AREAS = Object.freeze([
  "earnit",
  "spendit",
  "planit",
  "wishlist",
  "saveit",
  "preferences"
])

const JSON_STORAGE_KEYS = new Set([
  "salary-growth-tracker-v1",
  "salary-growth-tracker-companies-v1",
  "expensepath-accounts-v1",
  "expensepath-records-v1",
  "financePlanner",
  "worthitPayoffs",
  "worthitPurchasedItems",
  "wishlistItems",
  "wishlistCollections",
  "savingsGoals",
  "salary-growth-tracker-ui-v1",
  "expensepath-ui-v1",
  "collapsedMonths",
  "wishlistSortState",
  "wishlistFilterState",
  "wishlistViewState"
])

const IDENTITY_FIELD_NAMES = new Set([
  "uid",
  "userid",
  "email",
  "auth",
  "firebase",
  "firebaseconfig"
])

let currentUser = null
let authStateResolved = false

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function stableId(value) {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    String(value).trim() === ""
  ) {
    return ""
  }

  return String(value)
}

function assertNoIdentityData(value, location) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      assertNoIdentityData(item, `${location}[${index}]`)
    })
    return
  }

  if (!isPlainObject(value)) return

  Object.entries(value).forEach(([key, child]) => {
    if (IDENTITY_FIELD_NAMES.has(key.toLowerCase())) {
      throw new Error(`${location} contains unsupported account identity data.`)
    }

    assertNoIdentityData(child, `${location}.${key}`)
  })
}

function assertRecord(record, location) {
  if (!isPlainObject(record)) {
    throw new Error(`${location} must be an object.`)
  }
}

function assertOptionalString(record, key, location) {
  if (hasOwn(record, key) && typeof record[key] !== "string") {
    throw new Error(`${location}.${key} must be a string.`)
  }
}

function assertOptionalNumber(record, key, location) {
  if (
    hasOwn(record, key) &&
    (typeof record[key] !== "number" || !Number.isFinite(record[key]))
  ) {
    throw new Error(`${location}.${key} must be a finite number.`)
  }
}

function validateStableCollection(value, storageKey, validateRecord) {
  if (!Array.isArray(value)) {
    throw new Error(`${storageKey} must contain an array.`)
  }

  const ids = new Set()

  value.forEach((record, index) => {
    const location = `${storageKey}[${index}]`
    assertRecord(record, location)
    const id = stableId(record.id)

    if (!id) {
      throw new Error(`${location} is missing a stable ID.`)
    }

    if (ids.has(id)) {
      throw new Error(`${storageKey} contains duplicate ID "${id}".`)
    }

    ids.add(id)
    validateRecord(record, location)
  })
}

function validateEarnItEntry(entry, location) {
  ["job", "date", "color", "notes", "paidTime", "spendItAccountId", "spendItRecordId"]
    .forEach(key => assertOptionalString(entry, key, location))
  assertOptionalNumber(entry, "salary", location)
}

function validateSpendItAccount(account, location) {
  ["name", "type", "color"].forEach(key => {
    assertOptionalString(account, key, location)
  })
  assertOptionalNumber(account, "initial", location)
}

function validateSpendItRecord(record, location) {
  if (!["income", "expense", "transfer"].includes(record.type)) {
    throw new Error(`${location}.type must be income, expense, or transfer.`)
  }

  if (typeof record.amount !== "number" || !Number.isFinite(record.amount)) {
    throw new Error(`${location}.amount must be a finite number.`)
  }

  [
    "accountId", "fromId", "toId", "source", "earnItEntryId", "category",
    "subcategory", "description", "date", "time"
  ].forEach(key => assertOptionalString(record, key, location))
}

function validatePayoff(payoff, location) {
  ["name", "category", "source"].forEach(key => {
    assertOptionalString(payoff, key, location)
  });
  ["total", "paid", "monthly", "dueDay", "entryCount"].forEach(key => {
    assertOptionalNumber(payoff, key, location)
  })
}

function validatePurchasedItem(item, location) {
  ["wishlistId", "plannerEntryId", "name", "source"].forEach(key => {
    assertOptionalString(item, key, location)
  })
  assertOptionalNumber(item, "price", location)
}

function validateWishlistItem(item, location) {
  [
    "name", "priority", "collectionId", "category", "link", "status",
    "plannedMonth", "plannedDate", "plannerEntryId"
  ].forEach(key => assertOptionalString(item, key, location))
  assertOptionalNumber(item, "price", location)
}

function validateWishlistCollection(collection, location) {
  ["name", "symbol", "notes"].forEach(key => {
    assertOptionalString(collection, key, location)
  })
}

function validateSavingsGoal(goal, location) {
  ["name", "accountId"].forEach(key => assertOptionalString(goal, key, location));
  ["target", "saved"].forEach(key => assertOptionalNumber(goal, key, location))
}

function validateFinancePlanner(value) {
  if (!isPlainObject(value)) {
    throw new Error("financePlanner must contain an object.")
  }

  const ids = new Set()

  Object.entries(value).forEach(([month, entries]) => {
    if (!Array.isArray(entries)) {
      throw new Error(`financePlanner.${month} must contain an array.`)
    }

    entries.forEach((entry, index) => {
      const location = `financePlanner.${month}[${index}]`
      assertRecord(entry, location)
      ["label", "date", "link", "priority", "wishlistId"].forEach(key => {
        assertOptionalString(entry, key, location)
      })
      assertOptionalNumber(entry, "amount", location)

      if (!hasOwn(entry, "id")) return

      const id = stableId(entry.id)

      if (!id) {
        throw new Error(`${location}.id must be a non-empty stable ID.`)
      }

      if (ids.has(id)) {
        throw new Error(`financePlanner contains duplicate ID "${id}".`)
      }

      ids.add(id)
    })
  })
}

function validateStorageValue(storageKey, value) {
  if (value === null) return

  switch (storageKey) {
    case "salary-growth-tracker-v1":
      validateStableCollection(value, storageKey, validateEarnItEntry)
      return
    case "salary-growth-tracker-companies-v1":
      if (!isPlainObject(value)) {
        throw new Error(`${storageKey} must contain an object.`)
      }
      Object.entries(value).forEach(([company, settings]) => {
        if (!isPlainObject(settings)) {
          throw new Error(`${storageKey}.${company} must be an object.`)
        }
      })
      return
    case "expensepath-accounts-v1":
      validateStableCollection(value, storageKey, validateSpendItAccount)
      return
    case "expensepath-records-v1":
      validateStableCollection(value, storageKey, validateSpendItRecord)
      return
    case "financePlanner":
      validateFinancePlanner(value)
      return
    case "worthitPayoffs":
      validateStableCollection(value, storageKey, validatePayoff)
      return
    case "worthitPurchasedItems":
      validateStableCollection(value, storageKey, validatePurchasedItem)
      return
    case "wishlistItems":
      validateStableCollection(value, storageKey, validateWishlistItem)
      return
    case "wishlistCollections":
      validateStableCollection(value, storageKey, validateWishlistCollection)
      return
    case "savingsGoals":
      validateStableCollection(value, storageKey, validateSavingsGoal)
      return
    case "salary-growth-tracker-ui-v1":
    case "expensepath-ui-v1":
    case "collapsedMonths":
    case "wishlistSortState":
    case "wishlistFilterState":
    case "wishlistViewState":
      if (!isPlainObject(value)) {
        throw new Error(`${storageKey} must contain an object.`)
      }
      return
    case "salary-growth-tracker-active-page":
    case "worthit-theme":
      if (typeof value !== "string") {
        throw new Error(`${storageKey} must contain a string.`)
      }
      return
    default:
      throw new Error(`Unknown WorthIt storage key "${storageKey}".`)
  }
}

function toLocalStorageValue(value, storageKey) {
  if (value === null || value === undefined) return null
  if (typeof value === "string") return value

  const serialized = JSON.stringify(value)

  if (typeof serialized !== "string") {
    throw new Error(`Could not serialize ${storageKey} for backup.`)
  }

  return serialized
}

function parseStorageValue(rawValue, storageKey, sourceLabel) {
  if (rawValue === null) return null

  if (typeof rawValue !== "string") {
    throw new Error(`${sourceLabel} has an invalid ${storageKey} value.`)
  }

  let value = rawValue

  if (JSON_STORAGE_KEYS.has(storageKey)) {
    try {
      value = JSON.parse(rawValue)
    } catch {
      throw new Error(`${sourceLabel} has invalid JSON for ${storageKey}.`)
    }
  }

  assertNoIdentityData(value, storageKey)
  validateStorageValue(storageKey, value)
  return value
}

function readCloudStorageValue(cloudStates, appName, storageKey) {
  const storage = cloudStates.get(appName)?.storage

  if (!storage || typeof storage !== "object" || !hasOwn(storage, storageKey)) {
    return null
  }

  return toLocalStorageValue(storage[storageKey], storageKey)
}

async function loadCloudStates(userId, areas) {
  const appNames = new Set()

  areas.forEach(area => {
    BACKUP_AREAS[area]?.forEach(item => {
      if (item.appName) appNames.add(item.appName)
    })
  })

  const entries = await Promise.all(
    [...appNames].map(async appName => [
      appName,
      await loadUserAppState(userId, appName)
    ])
  )

  return new Map(entries)
}

function buildBackup(selectedAreas, cloudStates) {
  const data = {}

  selectedAreas.forEach(area => {
    data[area] = {}

    BACKUP_AREAS[area].forEach(item => {
      data[area][item.storageKey] = item.source === "local"
        ? localStorage.getItem(item.storageKey)
        : readCloudStorageValue(cloudStates, item.appName, item.storageKey)
    })
  })

  return {
    format: "worthit-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    included: selectedAreas,
    data
  }
}

function backupFilename() {
  return `worthit-backup-${new Date().toISOString().slice(0, 10)}.json`
}

function safetyBackupFilename() {
  const timestamp = new Date().toISOString()
  const filenameTimestamp = `${timestamp.slice(0, 10)}-${timestamp.slice(11, 19).replace(/:/g, "")}`

  return `worthit-before-restore-${filenameTimestamp}.json`
}

function downloadBackup(backup, filename = backupFilename()) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json"
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function expectedStorageKeys(area) {
  return BACKUP_AREAS[area].map(item => item.storageKey)
}

function validateBackup(backup) {
  if (!isPlainObject(backup)) {
    throw new Error("The selected file must contain a WorthIt backup object.")
  }

  if (backup.format !== "worthit-backup") {
    throw new Error("This file is not a WorthIt backup.")
  }

  if (backup.version !== 1) {
    throw new Error("This backup version is not supported.")
  }

  if (!Array.isArray(backup.included)) {
    throw new Error("The backup has an invalid included sections list.")
  }

  if (!isPlainObject(backup.data)) {
    throw new Error("The backup has invalid data sections.")
  }

  if (typeof backup.exportedAt !== "string" || Number.isNaN(Date.parse(backup.exportedAt))) {
    throw new Error("The backup has an invalid export date.")
  }

  const included = []
  const includedSet = new Set()

  backup.included.forEach(area => {
    if (typeof area !== "string" || !hasOwn(BACKUP_AREAS, area)) {
      throw new Error("The backup includes an unknown WorthIt section.")
    }

    if (includedSet.has(area)) {
      throw new Error(`The backup includes ${AREA_LABELS[area]} more than once.`)
    }

    includedSet.add(area)
    included.push(area)
  })

  Object.keys(backup.data).forEach(area => {
    if (!includedSet.has(area) || !hasOwn(BACKUP_AREAS, area)) {
      throw new Error("The backup contains an unexpected data section.")
    }
  })

  const data = {}
  const rawData = {}

  included.forEach(area => {
    const section = backup.data[area]

    if (!isPlainObject(section)) {
      throw new Error(`${AREA_LABELS[area]} has invalid backup data.`)
    }

    const expectedKeys = expectedStorageKeys(area)

    Object.keys(section).forEach(storageKey => {
      if (!expectedKeys.includes(storageKey)) {
        throw new Error(`${AREA_LABELS[area]} contains an unknown storage key.`)
      }
    })

    data[area] = {}
    rawData[area] = {}

    expectedKeys.forEach(storageKey => {
      if (!hasOwn(section, storageKey)) {
        throw new Error(`${AREA_LABELS[area]} is missing ${storageKey}.`)
      }

      const rawValue = section[storageKey]

      data[area][storageKey] = parseStorageValue(
        rawValue,
        storageKey,
        "The backup"
      )
      rawData[area][storageKey] = rawValue
    })
  })

  return { exportedAt: backup.exportedAt, included, data, rawData }
}

function buildCurrentData(cloudStates) {
  const data = {}

  Object.keys(BACKUP_AREAS).forEach(area => {
    data[area] = {}

    BACKUP_AREAS[area].forEach(item => {
      const rawValue = item.source === "local"
        ? localStorage.getItem(item.storageKey)
        : readCloudStorageValue(cloudStates, item.appName, item.storageKey)

      data[area][item.storageKey] = parseStorageValue(
        rawValue,
        item.storageKey,
        "Current cloud data"
      )
    })
  })

  return data
}

function buildCurrentStorageValues(cloudStates) {
  const values = {}

  Object.keys(BACKUP_AREAS).forEach(area => {
    values[area] = {}

    BACKUP_AREAS[area].forEach(item => {
      values[area][item.storageKey] = item.source === "local"
        ? localStorage.getItem(item.storageKey)
        : readCloudStorageValue(cloudStates, item.appName, item.storageKey)
    })
  })

  return values
}

function arrayValue(data, area, storageKey) {
  const value = data[area]?.[storageKey]
  return Array.isArray(value) ? value : []
}

function objectValue(data, area, storageKey) {
  const value = data[area]?.[storageKey]
  return isPlainObject(value) ? value : {}
}

function plannerEntries(data, area) {
  return Object.values(objectValue(data, area, "financePlanner"))
    .flatMap(entries => entries)
}

function countPlannerEntries(data, area) {
  return plannerEntries(data, area).length
}

function countIdlessPlannerEntries(data, area) {
  return plannerEntries(data, area).filter(entry => !stableId(entry.id)).length
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`
  }

  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map(key => {
      return `${JSON.stringify(key)}:${stableStringify(value[key])}`
    }).join(",")}}`
  }

  return JSON.stringify(value)
}

function compareStableCollection(incoming, current) {
  const currentById = new Map()
  const currentDuplicateIds = new Set()

  current.forEach(record => {
    const id = stableId(record.id)

    if (currentById.has(id)) {
      currentDuplicateIds.add(id)
      return
    }

    currentById.set(id, record)
  })

  const result = {
    newRecords: [],
    duplicates: [],
    conflicts: [],
    currentDuplicateIds
  }

  incoming.forEach(record => {
    const id = stableId(record.id)
    const currentRecord = currentById.get(id)

    if (!currentRecord) {
      result.newRecords.push(record)
    } else if (stableStringify(record) === stableStringify(currentRecord)) {
      result.duplicates.push(record)
    } else {
      result.conflicts.push(record)
    }
  })

  return result
}

function compareCompanySettings(incoming, current) {
  let newCompanies = 0
  let duplicates = 0
  let currentWins = 0

  Object.entries(incoming).forEach(([company, settings]) => {
    if (!hasOwn(current, company)) {
      newCompanies += 1
    } else if (stableStringify(settings) === stableStringify(current[company])) {
      duplicates += 1
    } else {
      currentWins += 1
    }
  })

  return { newCompanies, duplicates, currentWins }
}

function comparisonForArea(collections, area, storageKey) {
  return compareStableCollection(
    arrayValue(collections.backup.data, area, storageKey),
    arrayValue(collections.current, area, storageKey)
  )
}

function selectedAreasFromChoices(container) {
  return Array.from(container.querySelectorAll("[data-worthit-restore-area]"))
    .filter(choice => choice.checked && !choice.disabled)
    .map(choice => choice.dataset.worthitRestoreArea)
}

function availableStableRecords(collections, selectedAreas, mode, area, storageKey) {
  if (!selectedAreas.includes(area)) {
    return arrayValue(collections.current, area, storageKey)
  }

  const incoming = arrayValue(collections.backup.data, area, storageKey)

  if (mode === "replace") return incoming

  const comparison = comparisonForArea(collections, area, storageKey)
  // Add keeps every current record and appends only genuinely new IDs.
  return [
    ...arrayValue(collections.current, area, storageKey),
    ...comparison.newRecords
  ]
}

function availablePlannerEntries(collections, selectedAreas, mode) {
  if (!selectedAreas.includes("planit")) {
    return plannerEntries(collections.current, "planit")
  }

  if (mode === "replace") {
    return plannerEntries(collections.backup.data, "planit")
  }

  // Phase 2B does not add Planner rows, so only current rows can prove links.
  return plannerEntries(collections.current, "planit")
}

function createRelationshipBlockers(collections, selectedAreas, mode) {
  const blockers = []
  const addBlocker = message => {
    if (!blockers.includes(message)) blockers.push(message)
  }
  const accounts = availableStableRecords(
    collections, selectedAreas, mode, "spendit", "expensepath-accounts-v1"
  )
  const records = availableStableRecords(
    collections, selectedAreas, mode, "spendit", "expensepath-records-v1"
  )
  const earnEntries = availableStableRecords(
    collections, selectedAreas, mode, "earnit", "salary-growth-tracker-v1"
  )
  const wishlistItems = availableStableRecords(
    collections, selectedAreas, mode, "wishlist", "wishlistItems"
  )
  const wishlistCollections = availableStableRecords(
    collections, selectedAreas, mode, "wishlist", "wishlistCollections"
  )
  const planner = availablePlannerEntries(collections, selectedAreas, mode)
  const accountIds = new Set(accounts.map(account => stableId(account.id)))
  const recordById = new Map(records.map(record => [stableId(record.id), record]))
  const earnById = new Map(earnEntries.map(entry => [stableId(entry.id), entry]))
  const wishlistById = new Map(wishlistItems.map(item => [stableId(item.id), item]))
  const collectionIds = new Set(wishlistCollections.map(item => stableId(item.id)))
  const plannerById = new Map(
    planner.filter(entry => stableId(entry.id))
      .map(entry => [stableId(entry.id), entry])
  )

  if (selectedAreas.includes("spendit")) {
    availableStableRecords(
      collections, selectedAreas, mode, "spendit", "expensepath-records-v1"
    ).forEach(record => {
      const id = stableId(record.id)

      if (
        ["income", "expense"].includes(record.type) &&
        !accountIds.has(String(record.accountId || ""))
      ) {
        addBlocker(`SpendIt record ${id} has no resolvable account.`)
      }

      if (record.type === "transfer") {
        if (!accountIds.has(String(record.fromId || ""))) {
          addBlocker(`SpendIt transfer ${id} has no resolvable source account.`)
        }
        if (!accountIds.has(String(record.toId || ""))) {
          addBlocker(`SpendIt transfer ${id} has no resolvable destination account.`)
        }
      }
    })
  }

  if (
    selectedAreas.includes("earnit") ||
    (mode === "replace" && selectedAreas.includes("spendit"))
  ) {
    availableStableRecords(
      collections, selectedAreas, mode, "earnit", "salary-growth-tracker-v1"
    ).forEach(entry => {
      const entryId = stableId(entry.id)
      const accountId = String(entry.spendItAccountId || "")
      const recordId = String(entry.spendItRecordId || "")

      if (!accountId && !recordId) return

      if (!accountId || !recordId) {
        addBlocker(`EarnIt entry ${entryId} has an incomplete SpendIt link.`)
        return
      }

      const record = recordById.get(recordId)

      if (
        !accountIds.has(accountId) ||
        !record ||
        record.source !== "earnit" ||
        String(record.earnItEntryId || "") !== entryId ||
        String(record.accountId || "") !== accountId
      ) {
        addBlocker(`EarnIt entry ${entryId} has no proven matching SpendIt income.`)
      }
    })
  }

  if (
    selectedAreas.includes("spendit") ||
    (mode === "replace" && selectedAreas.includes("earnit"))
  ) {
    availableStableRecords(
      collections, selectedAreas, mode, "spendit", "expensepath-records-v1"
    ).filter(record => record.source === "earnit")
      .forEach(record => {
        const entry = earnById.get(String(record.earnItEntryId || ""))
        const recordId = stableId(record.id)

        if (
          !entry ||
          String(entry.spendItRecordId || "") !== recordId ||
          String(entry.spendItAccountId || "") !== String(record.accountId || "")
        ) {
          addBlocker(`EarnIt-linked SpendIt record ${recordId} has no proven matching EarnIt entry.`)
        }
      })
  }

  if (
    selectedAreas.includes("saveit") ||
    (mode === "replace" && selectedAreas.includes("spendit"))
  ) {
    availableStableRecords(
      collections, selectedAreas, mode, "saveit", "savingsGoals"
    ).forEach(goal => {
      const accountId = String(goal.accountId || "")
      if (accountId && !accountIds.has(accountId)) {
        addBlocker(`SaveIt goal ${stableId(goal.id)} has no resolvable SpendIt account.`)
      }
    })
  }

  if (
    selectedAreas.includes("wishlist") ||
    (mode === "replace" && selectedAreas.includes("planit"))
  ) {
    availableStableRecords(
      collections, selectedAreas, mode, "wishlist", "wishlistItems"
    ).forEach(item => {
      const itemId = stableId(item.id)
      const collectionId = String(item.collectionId || "")
      const plannerEntryId = String(item.plannerEntryId || "")
      const hasPlannerState = Boolean(
        item.status === "planned" || item.plannedMonth || item.plannedDate || plannerEntryId
      )

      if (collectionId && !collectionIds.has(collectionId)) {
        addBlocker(`Wishlist item ${itemId} has no resolvable collection.`)
      }

      if (!hasPlannerState) return

      const plannerEntry = plannerEntryId
        ? plannerById.get(plannerEntryId)
        : planner.find(entry => String(entry.wishlistId || "") === itemId)

      if (!plannerEntry || String(plannerEntry.wishlistId || "") !== itemId) {
        addBlocker(`Wishlist item ${itemId} has no resolvable Planner link.`)
      }
    })
  }

  if (
    selectedAreas.includes("planit") ||
    (mode === "replace" && selectedAreas.includes("wishlist"))
  ) {
    planner.filter(entry => entry.wishlistId).forEach(entry => {
      const wishlistId = String(entry.wishlistId)
      const item = wishlistById.get(wishlistId)
      const plannerId = stableId(entry.id)

      if (!item) {
        addBlocker(`Planner entry${plannerId ? ` ${plannerId}` : ""} has no resolvable Wishlist item.`)
      } else if (
        plannerId &&
        item.plannerEntryId &&
        String(item.plannerEntryId) !== plannerId
      ) {
        addBlocker(`Planner entry ${plannerId} conflicts with its Wishlist link.`)
      }
    })
  }

  return blockers
}

function sectionCounts(data, area) {
  switch (area) {
    case "earnit":
      return [
        `${arrayValue(data, area, "salary-growth-tracker-v1").length} entries`,
        `${Object.keys(objectValue(data, area, "salary-growth-tracker-companies-v1")).length} companies`
      ]
    case "spendit":
      return [
        `${arrayValue(data, area, "expensepath-accounts-v1").length} accounts`,
        `${arrayValue(data, area, "expensepath-records-v1").length} records`
      ]
    case "planit":
      return [
        `${countPlannerEntries(data, area)} planner entries`,
        `${arrayValue(data, area, "worthitPayoffs").length} payoffs`,
        `${arrayValue(data, area, "worthitPurchasedItems").length} purchased items`
      ]
    case "wishlist":
      return [
        `${arrayValue(data, area, "wishlistItems").length} items`,
        `${arrayValue(data, area, "wishlistCollections").length} collections`
      ]
    case "saveit":
      return [`${arrayValue(data, area, "savingsGoals").length} goals`]
    case "preferences":
      return ["Included"]
    default:
      return []
  }
}

function addResultLine(parent, symbol, text, type = "valid") {
  const line = document.createElement("div")
  line.className = `worthit-restore-result__line worthit-restore-result__line--${type}`
  line.textContent = `${symbol} ${text}`
  parent.appendChild(line)
}

function addResultCard(parent, title) {
  const card = document.createElement("section")
  const heading = document.createElement("strong")
  const details = document.createElement("div")

  card.className = "worthit-restore-result"
  details.className = "worthit-restore-result__details"
  heading.textContent = title
  card.append(heading, details)
  parent.appendChild(card)
  return details
}

function addComparisonLines(details, label, comparison) {
  addResultLine(details, "+", `${label}: New ${comparison.newRecords.length}`, "new")
  addResultLine(details, "=", `${label}: Duplicates ${comparison.duplicates.length}`, "valid")

  if (comparison.conflicts.length) {
    addResultLine(
      details,
      "!",
      `${label}: Conflicts ${comparison.conflicts.length} (same ID, different contents)`,
      "warning"
    )
  }

  if (comparison.currentDuplicateIds.size) {
    addResultLine(
      details,
      "!",
      `${label}: Current data already has duplicate IDs and cannot be safely merged.`,
      "warning"
    )
  }
}

const ADD_STABLE_COLLECTIONS = Object.freeze([
  {
    area: "earnit",
    appName: "earnit",
    storageKey: "salary-growth-tracker-v1",
    label: "EarnIt entries"
  },
  {
    area: "spendit",
    appName: "spendit",
    storageKey: "expensepath-accounts-v1",
    label: "SpendIt accounts"
  },
  {
    area: "spendit",
    appName: "spendit",
    storageKey: "expensepath-records-v1",
    label: "SpendIt records"
  },
  {
    area: "planit",
    appName: "planit",
    storageKey: "worthitPayoffs",
    label: "PlanIt payoffs"
  },
  {
    area: "planit",
    appName: "planit",
    storageKey: "worthitPurchasedItems",
    label: "PlanIt purchased items"
  },
  {
    area: "wishlist",
    appName: "planit",
    storageKey: "wishlistItems",
    label: "Wishlist items"
  },
  {
    area: "wishlist",
    appName: "planit",
    storageKey: "wishlistCollections",
    label: "Wishlist collections"
  },
  {
    area: "saveit",
    appName: "saveit",
    storageKey: "savingsGoals",
    label: "SaveIt goals"
  }
])

function addBlockingIssue(blockers, message) {
  if (!blockers.includes(message)) blockers.push(message)
}

function addStorageUpdate(storageUpdates, appName, storageKey, value) {
  if (!hasOwn(storageUpdates, appName)) {
    storageUpdates[appName] = {}
  }

  storageUpdates[appName][storageKey] = JSON.stringify(value)
}

function addRawStorageUpdate(storageUpdates, appName, storageKey, value) {
  if (!hasOwn(storageUpdates, appName)) {
    storageUpdates[appName] = {}
  }

  storageUpdates[appName][storageKey] = value
}

function buildReplaceRestorePlan(backup, current, currentValues, selectedAreas) {
  const collections = { backup, current }
  const blockers = createRelationshipBlockers(collections, selectedAreas, "replace")
  const storageUpdates = {}
  const localStorageUpdates = {}
  const replacedAreas = []

  if (!selectedAreas.length) {
    addBlockingIssue(blockers, "Choose at least one section to replace.")
  }

  selectedAreas.forEach(area => {
    let areaChanged = false

    BACKUP_AREAS[area].forEach(item => {
      const replacement = backup.rawData[area][item.storageKey]
      const currentValue = currentValues[area][item.storageKey]

      if (replacement === currentValue) return

      areaChanged = true

      if (item.source === "local") {
        localStorageUpdates[item.storageKey] = replacement
        return
      }

      addRawStorageUpdate(
        storageUpdates,
        item.appName,
        item.storageKey,
        replacement
      )
      localStorageUpdates[item.storageKey] = replacement
    })

    if (areaChanged) replacedAreas.push(area)
  })

  return {
    blockers,
    storageUpdates,
    localStorageUpdates,
    replacedAreas
  }
}

function storageValuesMatchSafetySnapshot(currentValues, safetySnapshot) {
  return SAFETY_BACKUP_AREAS.every(area => {
    return BACKUP_AREAS[area].every(item => {
      return currentValues[area][item.storageKey] ===
        safetySnapshot[area][item.storageKey]
    })
  })
}

function buildAddRestorePlan(backup, current, selectedAreas) {
  const collections = { backup, current }
  const blockers = []
  const storageUpdates = {}
  const added = {
    earnit: { entries: 0, companies: 0 },
    spendit: { accounts: 0, records: 0 },
    planit: { payoffs: 0, purchasedItems: 0 },
    wishlist: { items: 0, collections: 0 },
    saveit: { goals: 0 }
  }

  if (!selectedAreas.length) {
    addBlockingIssue(blockers, "Choose at least one available section to add.")
  }

  if (selectedAreas.includes("preferences")) {
    addBlockingIssue(blockers, "Preferences cannot be added in this restore mode.")
  }

  if (
    selectedAreas.includes("planit") &&
    countIdlessPlannerEntries(backup.data, "planit")
  ) {
    addBlockingIssue(
      blockers,
      "PlanIt contains Planner rows without stable IDs, so PlanIt cannot be safely added."
    )
  }

  if (selectedAreas.includes("planit")) {
    const plannerComparison = compareStableCollection(
      plannerEntries(backup.data, "planit").filter(entry => stableId(entry.id)),
      plannerEntries(current, "planit").filter(entry => stableId(entry.id))
    )

    if (plannerComparison.conflicts.length) {
      addBlockingIssue(
        blockers,
        "PlanIt Planner entries have same-ID records with different contents."
      )
    }

    if (plannerComparison.currentDuplicateIds.size) {
      addBlockingIssue(
        blockers,
        "PlanIt Planner entries have duplicate IDs in current cloud data and cannot be safely compared."
      )
    }
  }

  ADD_STABLE_COLLECTIONS.forEach(item => {
    if (!selectedAreas.includes(item.area)) return

    const comparison = comparisonForArea(collections, item.area, item.storageKey)

    if (comparison.conflicts.length) {
      addBlockingIssue(
        blockers,
        `${item.label} has same-ID records with different contents.`
      )
    }

    if (comparison.currentDuplicateIds.size) {
      addBlockingIssue(
        blockers,
        `${item.label} has duplicate IDs in current cloud data and cannot be safely merged.`
      )
    }

    if (!comparison.newRecords.length) return

    const merged = [
      ...arrayValue(current, item.area, item.storageKey),
      ...comparison.newRecords
    ]
    addStorageUpdate(storageUpdates, item.appName, item.storageKey, merged)

    if (item.storageKey === "salary-growth-tracker-v1") {
      added.earnit.entries = comparison.newRecords.length
    } else if (item.storageKey === "expensepath-accounts-v1") {
      added.spendit.accounts = comparison.newRecords.length
    } else if (item.storageKey === "expensepath-records-v1") {
      added.spendit.records = comparison.newRecords.length
    } else if (item.storageKey === "worthitPayoffs") {
      added.planit.payoffs = comparison.newRecords.length
    } else if (item.storageKey === "worthitPurchasedItems") {
      added.planit.purchasedItems = comparison.newRecords.length
    } else if (item.storageKey === "wishlistItems") {
      added.wishlist.items = comparison.newRecords.length
    } else if (item.storageKey === "wishlistCollections") {
      added.wishlist.collections = comparison.newRecords.length
    } else if (item.storageKey === "savingsGoals") {
      added.saveit.goals = comparison.newRecords.length
    }
  })

  if (selectedAreas.includes("earnit")) {
    const incoming = objectValue(
      backup.data, "earnit", "salary-growth-tracker-companies-v1"
    )
    const currentCompanies = objectValue(
      current, "earnit", "salary-growth-tracker-companies-v1"
    )
    const newCompanies = Object.fromEntries(
      Object.entries(incoming).filter(([company]) => !hasOwn(currentCompanies, company))
    )

    if (Object.keys(newCompanies).length) {
      addStorageUpdate(
        storageUpdates,
        "earnit",
        "salary-growth-tracker-companies-v1",
        { ...currentCompanies, ...newCompanies }
      )
      added.earnit.companies = Object.keys(newCompanies).length
    }
  }

  createRelationshipBlockers(collections, selectedAreas, "add")
    .forEach(message => addBlockingIssue(blockers, message))

  const addedCount = Object.values(added).reduce((total, section) => {
    return total + Object.values(section).reduce((sum, count) => sum + count, 0)
  }, 0)

  return { blockers, storageUpdates, added, addedCount }
}

function addSummaryLines(parent, added, selectedAreas = null) {
  if (
    added.earnit.entries || added.earnit.companies ||
    selectedAreas?.includes("earnit")
  ) {
    addResultLine(
      parent,
      "+",
      `EarnIt: ${added.earnit.entries} entries, ${added.earnit.companies} companies`,
      "new"
    )
  }

  if (
    added.spendit.accounts || added.spendit.records ||
    selectedAreas?.includes("spendit")
  ) {
    addResultLine(
      parent,
      "+",
      `SpendIt: ${added.spendit.accounts} accounts, ${added.spendit.records} records`,
      "new"
    )
  }

  if (
    added.planit.payoffs || added.planit.purchasedItems ||
    selectedAreas?.includes("planit")
  ) {
    addResultLine(
      parent,
      "+",
      `PlanIt: ${added.planit.payoffs} payoffs, ${added.planit.purchasedItems} purchased items`,
      "new"
    )
  }

  if (
    added.wishlist.items || added.wishlist.collections ||
    selectedAreas?.includes("wishlist")
  ) {
    addResultLine(
      parent,
      "+",
      `Wishlist: ${added.wishlist.items} items, ${added.wishlist.collections} collections`,
      "new"
    )
  }

  if (added.saveit.goals || selectedAreas?.includes("saveit")) {
    addResultLine(parent, "+", `SaveIt: ${added.saveit.goals} goals`, "new")
  }
}

function renderRestoreInformation(container, backup) {
  const meta = document.createElement("div")
  const date = new Date(backup.exportedAt)

  meta.className = "worthit-restore-info__meta"
  meta.append(
    document.createTextNode(`Exported: ${date.toLocaleString()}`),
    document.createTextNode("Backup version: 1"),
    document.createTextNode(
      `Sections included: ${backup.included.map(area => AREA_LABELS[area]).join(", ")}`
    )
  )
  container.replaceChildren(meta)
}

function initializeWorthItBackup() {
  const modal = document.getElementById("worthitBackupModal")
  const openButton = document.getElementById("openWorthItBackupModal")
  const closeButton = document.getElementById("closeWorthItBackupModal")
  const exportView = document.getElementById("worthitBackupExportView")
  const restoreView = document.getElementById("worthitRestorePreview")
  const title = document.getElementById("worthitBackupModalTitle")
  const eyebrow = document.getElementById("worthitBackupModalEyebrow")
  const cancelButton = document.getElementById("cancelWorthItBackup")
  const selectAllButton = document.getElementById("selectAllWorthItBackup")
  const exportButton = document.getElementById("exportWorthItBackup")
  const restoreButton = document.getElementById("restoreWorthItBackup")
  const restoreFile = document.getElementById("worthitRestoreFile")
  const restoreInfo = document.getElementById("worthitRestoreInfo")
  const restoreChoices = document.getElementById("worthitRestoreChoices")
  const restoreResults = document.getElementById("worthitRestorePreviewResults")
  const restoreStatus = document.getElementById("worthitRestoreStatus")
  const addRestoreButton = document.getElementById("addWorthItRestore")
  const addConfirmation = document.getElementById("worthitAddRestoreConfirmation")
  const addRestoreSummary = document.getElementById("worthitAddRestoreSummary")
  const cancelAddRestoreButton = document.getElementById("cancelWorthItAddRestore")
  const confirmAddRestoreButton = document.getElementById("confirmWorthItAddRestore")
  const prepareReplaceRestoreButton = document.getElementById("prepareWorthItReplaceRestore")
  const replaceConfirmation = document.getElementById("worthitReplaceRestoreConfirmation")
  const replaceRestoreSummary = document.getElementById("worthitReplaceRestoreSummary")
  const verifySafetyBackup = document.getElementById("verifyWorthItSafetyBackup")
  const cancelReplaceRestoreButton = document.getElementById("cancelWorthItReplaceRestore")
  const confirmReplaceRestoreButton = document.getElementById("confirmWorthItReplaceRestore")
  const backButton = document.getElementById("backToWorthItBackup")
  const restoreCancelButton = document.getElementById("cancelWorthItRestore")
  const status = document.getElementById("worthitBackupStatus")

  if (
    !modal || !openButton || !closeButton || !exportView || !restoreView ||
    !title || !eyebrow || !cancelButton || !selectAllButton || !exportButton ||
    !restoreButton || !restoreFile || !restoreInfo || !restoreChoices ||
    !restoreResults || !restoreStatus || !addRestoreButton || !addConfirmation ||
    !addRestoreSummary ||
    !cancelAddRestoreButton || !confirmAddRestoreButton || !backButton ||
    !prepareReplaceRestoreButton || !replaceConfirmation || !replaceRestoreSummary ||
    !verifySafetyBackup || !cancelReplaceRestoreButton || !confirmReplaceRestoreButton ||
    !restoreCancelButton || !status
  ) {
    return
  }

  const exportChoices = Array.from(
    modal.querySelectorAll("[data-worthit-backup-area]")
  )
  const restoreModes = Array.from(
    modal.querySelectorAll("[name=worthitRestoreMode]")
  )
  let lastFocusedElement = null
  let restoreCollections = null
  let restoreBackup = null
  let restoreUserId = ""
  let latestAddPlan = null
  let latestReplacePlan = null
  let safetySnapshot = null
  let safetySelectedAreas = []

  function setStatus(message = "", isError = false) {
    status.textContent = message
    status.classList.toggle("is-error", isError)
    restoreStatus.textContent = message
    restoreStatus.classList.toggle("is-error", isError)
  }

  function showExportView() {
    exportView.hidden = false
    restoreView.hidden = true
    addConfirmation.hidden = true
    invalidateSafetyBackup()
    eyebrow.textContent = "BACK UP WORTHIT"
    title.textContent = "Choose what to include"
    closeButton.setAttribute("aria-label", "Close backup options")
  }

  function showRestoreView() {
    exportView.hidden = true
    restoreView.hidden = false
    eyebrow.textContent = "RESTORE BACKUP"
    title.textContent = "Review restore preview"
    closeButton.setAttribute("aria-label", "Close restore preview")
  }

  function updateAddRestoreAction(mode, plan = null) {
    latestAddPlan = mode === "add" ? plan : null
    addConfirmation.hidden = true
    addRestoreButton.hidden = mode !== "add"
    addRestoreButton.disabled = !plan || Boolean(plan.blockers.length)
    addRestoreButton.title = !plan || plan.blockers.length
      ? "Resolve the Add blockers before restoring."
      : plan.addedCount
        ? "Review the Add confirmation."
        : "Show the no-op restore result."
  }

  function invalidateSafetyBackup() {
    safetySnapshot = null
    safetySelectedAreas = []
    replaceConfirmation.hidden = true
    verifySafetyBackup.checked = false
    confirmReplaceRestoreButton.disabled = true
  }

  function updateReplaceRestoreAction(mode, plan = null) {
    latestReplacePlan = mode === "replace" ? plan : null
    prepareReplaceRestoreButton.hidden = mode !== "replace"
    prepareReplaceRestoreButton.disabled = !plan || Boolean(plan.blockers.length)
    prepareReplaceRestoreButton.title = !plan || plan.blockers.length
      ? "Resolve the Replace blockers before restoring."
      : plan.replacedAreas.length
        ? "Prepare a safety backup before replacing."
        : "Show the no-op replace result."
  }

  function openModal() {
    lastFocusedElement = document.activeElement
    setStatus()
    showExportView()
    modal.hidden = false
    exportChoices[0]?.focus()
  }

  function closeModal() {
    modal.hidden = true
    setStatus()
    showExportView()
    lastFocusedElement?.focus?.()
  }

  async function exportBackup() {
    const selectedAreas = exportChoices.filter(choice => choice.checked)
      .map(choice => choice.dataset.worthitBackupArea)

    if (!selectedAreas.length) {
      setStatus("Choose at least one data area to export.", true)
      return
    }

    if (!authStateResolved) {
      setStatus("Checking sign-in status. Please try again.", true)
      return
    }

    if (!currentUser) {
      setStatus("Sign in to create a cloud backup.", true)
      return
    }

    const userId = currentUser.uid
    exportButton.disabled = true
    setStatus("Preparing backup...")

    try {
      const cloudStates = await loadCloudStates(userId, selectedAreas)

      if (!currentUser || currentUser.uid !== userId) {
        throw new Error("Your signed-in account changed before the backup was ready.")
      }

      downloadBackup(buildBackup(selectedAreas, cloudStates))
      setStatus("Backup downloaded. Keep the file somewhere safe.")
    } catch (error) {
      console.error("WorthIt backup export failed:", error)
      setStatus(error.message || "Could not read your cloud data for backup.", true)
    } finally {
      exportButton.disabled = false
    }
  }

  function renderRestoreChoices(selectedAreaSet = null) {
    const mode = restoreModes.find(input => input.checked)?.value || "add"
    const fragment = document.createDocumentFragment()

    restoreBackup.included.forEach(area => {
      const label = document.createElement("label")
      const input = document.createElement("input")
      const text = document.createElement("span")
      const name = document.createElement("strong")
      const detail = document.createElement("small")
      const preferenceInAddMode = area === "preferences" && mode === "add"

      label.className = "worthit-backup-option"
      input.type = "checkbox"
      input.checked = selectedAreaSet
        ? selectedAreaSet.has(area) && !preferenceInAddMode
        : !preferenceInAddMode
      input.disabled = preferenceInAddMode
      input.dataset.worthitRestoreArea = area
      name.textContent = AREA_LABELS[area]
      detail.textContent = preferenceInAddMode
        ? "Preferences are restored only in Replace mode."
        : sectionCounts(restoreBackup.data, area).join(" • ")
      text.append(name, detail)
      label.append(input, text)

      if (preferenceInAddMode) label.classList.add("is-disabled")

      input.addEventListener("change", renderRestorePreview)
      fragment.appendChild(label)
    })

    const ownIt = document.createElement("div")
    const ownItText = document.createElement("span")
    const ownItTitle = document.createElement("strong")
    const ownItDetail = document.createElement("small")

    ownIt.className = "worthit-backup-option worthit-backup-option--disabled"
    ownIt.setAttribute("aria-disabled", "true")
    ownItTitle.textContent = "OwnIt"
    ownItDetail.textContent = "Calculated automatically - no independent data to restore."
    ownItText.append(ownItTitle, ownItDetail)
    ownIt.append(ownItText)
    fragment.appendChild(ownIt)
    restoreChoices.replaceChildren(fragment)
  }

  function renderRestorePreview() {
    if (!restoreCollections || !restoreBackup) return

    invalidateSafetyBackup()

    if (!currentUser || currentUser.uid !== restoreUserId) {
      restoreResults.replaceChildren()
      const details = addResultCard(restoreResults, "Preview unavailable")
      addResultLine(
        details,
        "×",
        "The signed-in account changed. Choose the backup file again.",
        "blocking"
      )
      updateAddRestoreAction("replace")
      updateReplaceRestoreAction("add")
      return
    }

    const mode = restoreModes.find(input => input.checked)?.value || "add"
    const selectedAreas = selectedAreasFromChoices(restoreChoices)
    const addPlan = mode === "add"
      ? buildAddRestorePlan(restoreBackup, restoreCollections.current, selectedAreas)
      : null
    const replacePlan = mode === "replace"
      ? buildReplaceRestorePlan(
        restoreBackup,
        restoreCollections.current,
        restoreCollections.currentValues,
        selectedAreas
      )
      : null

    restoreResults.replaceChildren()
    const summary = addResultCard(restoreResults, "Restore preview")
    addResultLine(summary, "✓", "Valid backup. This preview makes no changes.", "valid")

    if (!selectedAreas.length) {
      addResultLine(summary, "!", "Choose at least one available section to preview.", "warning")
      updateAddRestoreAction(mode, addPlan)
      updateReplaceRestoreAction(mode, replacePlan)
      return
    }

    if (mode === "replace") {
      addResultLine(
        summary,
        "!",
        "Only selected WorthIt sections would be replaced. Unselected sections would remain unchanged.",
        "warning"
      )

      selectedAreas.forEach(area => {
        const details = addResultCard(restoreResults, AREA_LABELS[area])
        addResultLine(
          details,
          "✓",
          `Would replace: ${expectedStorageKeys(area).join(", ")}`,
          "valid"
        )
        addResultLine(details, "✓", sectionCounts(restoreBackup.data, area).join(" • "), "valid")
      })

      if (!replacePlan.blockers.length && !replacePlan.replacedAreas.length) {
        addResultLine(summary, "=", "Selected data already matches this backup.", "valid")
      }
    } else {
      selectedAreas.forEach(area => {
        const details = addResultCard(restoreResults, AREA_LABELS[area])

        if (area === "earnit") {
          addComparisonLines(details, "Entries", comparisonForArea(
            restoreCollections, area, "salary-growth-tracker-v1"
          ))
          const companies = compareCompanySettings(
            objectValue(restoreBackup.data, area, "salary-growth-tracker-companies-v1"),
            objectValue(restoreCollections.current, area, "salary-growth-tracker-companies-v1")
          )
          addResultLine(details, "+", `Companies: New ${companies.newCompanies}`, "new")
          addResultLine(details, "=", `Companies: Duplicates ${companies.duplicates}`, "valid")
          if (companies.currentWins) {
            addResultLine(
              details,
              "!",
              `Companies: ${companies.currentWins} current settings would be kept.`,
              "warning"
            )
          }
          return
        }

        if (area === "spendit") {
          addComparisonLines(details, "Accounts", comparisonForArea(
            restoreCollections, area, "expensepath-accounts-v1"
          ))
          addComparisonLines(details, "Records", comparisonForArea(
            restoreCollections, area, "expensepath-records-v1"
          ))
          return
        }

        if (area === "planit") {
          const idless = countIdlessPlannerEntries(restoreBackup.data, area)
          const plannerCount = countPlannerEntries(restoreBackup.data, area)
          addResultLine(
            details,
            "✓",
            `Planner entries: ${countPlannerEntries(restoreBackup.data, area)}`,
            "valid"
          )
          if (plannerCount) {
            addResultLine(
              details,
              "!",
              "Planner entries are preview-only and will not be added in Phase 2B.",
              "warning"
            )
          }
          if (idless) {
            addResultLine(
              details,
              "×",
              `${idless} Planner entries cannot currently be safely added because they do not have stable IDs.`,
              "blocking"
            )
          }
          addComparisonLines(details, "Manual payoffs", comparisonForArea(
            restoreCollections, area, "worthitPayoffs"
          ))
          addComparisonLines(details, "Purchased items", comparisonForArea(
            restoreCollections, area, "worthitPurchasedItems"
          ))
          return
        }

        if (area === "wishlist") {
          addComparisonLines(details, "Items", comparisonForArea(
            restoreCollections, area, "wishlistItems"
          ))
          addComparisonLines(details, "Collections", comparisonForArea(
            restoreCollections, area, "wishlistCollections"
          ))
          return
        }

        if (area === "saveit") {
          addComparisonLines(details, "Goals", comparisonForArea(
            restoreCollections, area, "savingsGoals"
          ))
        }
      })
    }

    const blockers = mode === "add"
      ? addPlan.blockers
      : replacePlan.blockers

    if (blockers.length) {
      const details = addResultCard(
        restoreResults,
        mode === "add" ? "Add blockers" : "Blocking relationship conflicts"
      )
      blockers.forEach(message => addResultLine(details, "×", message, "blocking"))
    } else {
      const details = addResultCard(restoreResults, "Relationships")
      addResultLine(
        details,
        "✓",
        "Selected active relationships can be resolved by stable IDs.",
        "valid"
      )

      if (mode === "add") {
        if (addPlan.addedCount) {
          const details = addResultCard(restoreResults, "Ready to add")
          addSummaryLines(details, addPlan.added)
        } else {
          addResultLine(summary, "=", "Nothing new to add.", "valid")
        }
      }
    }

    updateAddRestoreAction(mode, addPlan)
    updateReplaceRestoreAction(mode, replacePlan)
  }

  function showAddConfirmation() {
    if (!latestAddPlan) {
      setStatus("Add preview is unavailable. Choose the backup file again.", true)
      return
    }

    if (latestAddPlan.blockers.length) {
      setStatus("Resolve the Add blockers before restoring.", true)
      return
    }

    if (!latestAddPlan.addedCount) {
      setStatus("Nothing new to add.")
      return
    }

    addRestoreSummary.replaceChildren()
    addSummaryLines(
      addRestoreSummary,
      latestAddPlan.added,
      selectedAreasFromChoices(restoreChoices)
    )
    addConfirmation.hidden = false
    confirmAddRestoreButton.focus()
  }

  function updateRestoredLocalStorage(storageUpdates) {
    Object.values(storageUpdates).forEach(storage => {
      Object.entries(storage).forEach(([storageKey, value]) => {
        if (value === null) {
          localStorage.removeItem(storageKey)
        } else {
          localStorage.setItem(storageKey, value)
        }
      })
    })
  }

  function updateLocalStorageValues(storageValues) {
    Object.entries(storageValues).forEach(([storageKey, value]) => {
      if (value === null) {
        localStorage.removeItem(storageKey)
      } else {
        localStorage.setItem(storageKey, value)
      }
    })
  }

  function showReplaceConfirmation(selectedAreas) {
    const unchangedAreas = SAFETY_BACKUP_AREAS.filter(
      area => !selectedAreas.includes(area)
    )
    const details = replaceRestoreSummary

    details.replaceChildren()
    addResultLine(
      details,
      "!",
      `Selected: ${selectedAreas.map(area => AREA_LABELS[area]).join(", ")}`,
      "warning"
    )
    addResultLine(
      details,
      "=",
      `Unchanged: ${unchangedAreas.map(area => AREA_LABELS[area]).join(", ") || "None"}`,
      "valid"
    )
    replaceConfirmation.hidden = false
    verifySafetyBackup.checked = false
    confirmReplaceRestoreButton.disabled = true
    verifySafetyBackup.focus()
  }

  async function prepareReplaceSafetyBackup() {
    const mode = restoreModes.find(input => input.checked)?.value || "add"
    const selectedAreas = selectedAreasFromChoices(restoreChoices)

    if (mode !== "replace" || !restoreBackup || !currentUser || currentUser.uid !== restoreUserId) {
      setStatus("The signed-in account changed. Choose the backup file again.", true)
      return
    }

    if (!latestReplacePlan || latestReplacePlan.blockers.length) {
      setStatus("Resolve the Replace blockers before restoring.", true)
      return
    }

    if (!latestReplacePlan.replacedAreas.length) {
      setStatus("Selected data already matches this backup.")
      return
    }

    const userId = restoreUserId

    prepareReplaceRestoreButton.disabled = true
    setStatus("Preparing a safety backup of your current cloud data...")

    try {
      const cloudStates = await loadCloudStates(userId, SAFETY_BACKUP_AREAS)

      if (!currentUser || currentUser.uid !== userId) {
        throw new Error("Your signed-in account changed before the safety backup was ready.")
      }

      const freshCurrent = buildCurrentData(cloudStates)
      const freshValues = buildCurrentStorageValues(cloudStates)
      const freshPlan = buildReplaceRestorePlan(
        restoreBackup,
        freshCurrent,
        freshValues,
        selectedAreas
      )

      if (freshPlan.blockers.length) {
        throw new Error(`Replace stopped: ${freshPlan.blockers[0]}`)
      }

      if (!freshPlan.replacedAreas.length) {
        restoreCollections = {
          backup: restoreBackup,
          current: freshCurrent,
          currentValues: freshValues
        }
        setStatus("Selected data already matches this backup.")
        renderRestorePreview()
        return
      }

      const safetyBackup = buildBackup(SAFETY_BACKUP_AREAS, cloudStates)
      downloadBackup(safetyBackup, safetyBackupFilename())

      restoreCollections = {
        backup: restoreBackup,
        current: freshCurrent,
        currentValues: freshValues
      }
      latestReplacePlan = freshPlan
      safetySnapshot = freshValues
      safetySelectedAreas = [...selectedAreas]
      showReplaceConfirmation(selectedAreas)
      setStatus(
        "Safety backup download initiated. Verify it in your browser Downloads before continuing."
      )
    } catch (error) {
      console.error("WorthIt safety backup preparation failed:", error)
      invalidateSafetyBackup()
      setStatus(error.message || "Could not prepare the safety backup. No data was replaced.", true)
    } finally {
      prepareReplaceRestoreButton.disabled = false
    }
  }

  async function replaceBackupInCurrentAccount() {
    const mode = restoreModes.find(input => input.checked)?.value || "add"
    const selectedAreas = selectedAreasFromChoices(restoreChoices)

    if (mode !== "replace" || !restoreBackup || !currentUser || currentUser.uid !== restoreUserId) {
      setStatus("The signed-in account changed. Choose the backup file again.", true)
      return
    }

    if (!safetySnapshot || !verifySafetyBackup.checked) {
      setStatus("Verify the safety backup download before replacing data.", true)
      return
    }

    if (selectedAreas.join("|") !== safetySelectedAreas.join("|")) {
      invalidateSafetyBackup()
      setStatus("Restore choices changed. Create a new safety backup before replacing.", true)
      return
    }

    const userId = restoreUserId
    let cloudCommitted = false

    confirmReplaceRestoreButton.disabled = true
    cancelReplaceRestoreButton.disabled = true
    prepareReplaceRestoreButton.disabled = true
    setStatus("Replacing selected cloud data...")

    try {
      const result = await runUserStorageRestoreTransaction(
        userId,
        ["earnit", "spendit", "planit", "saveit"],
        freshCloudStates => {
          if (!currentUser || currentUser.uid !== userId) {
            throw new Error("Your signed-in account changed before the replace could be applied.")
          }

          const freshValues = buildCurrentStorageValues(freshCloudStates)

          if (!storageValuesMatchSafetySnapshot(freshValues, safetySnapshot)) {
            throw new Error(
              "WorthIt changed after the safety backup was prepared. Create a new safety backup before replacing."
            )
          }

          const freshCurrent = buildCurrentData(freshCloudStates)
          const freshPlan = buildReplaceRestorePlan(
            restoreBackup,
            freshCurrent,
            freshValues,
            selectedAreas
          )

          if (freshPlan.blockers.length) {
            throw new Error(`Replace stopped: ${freshPlan.blockers[0]}`)
          }

          return {
            storageUpdates: freshPlan.storageUpdates,
            replacePlan: freshPlan
          }
        }
      )

      if (!result.replacePlan.replacedAreas.length) {
        invalidateSafetyBackup()
        setStatus("Selected data already matches this backup.")
        renderRestorePreview()
        return
      }

      cloudCommitted = Object.keys(result.storageUpdates).length > 0

      if (!currentUser || currentUser.uid !== userId) {
        throw new Error(
          "The cloud replace succeeded, but this browser changed accounts before its local cache could update."
        )
      }

      try {
        updateLocalStorageValues(result.replacePlan.localStorageUpdates)
      } catch (error) {
        console.error("WorthIt backup local cache update failed:", error)
        throw new Error(
          "Your cloud data was replaced, but this browser could not refresh its local cache. Reload Home before continuing."
        )
      }

      replaceConfirmation.hidden = true
      restoreResults.replaceChildren()
      const details = addResultCard(restoreResults, "Replace complete")
      addResultLine(
        details,
        "✓",
        `Replaced: ${result.replacePlan.replacedAreas.map(area => AREA_LABELS[area]).join(", ")}`,
        "valid"
      )
      addResultLine(
        details,
        "=",
        `Unchanged: ${SAFETY_BACKUP_AREAS
          .filter(area => !result.replacePlan.replacedAreas.includes(area))
          .map(area => AREA_LABELS[area])
          .join(", ") || "None"}`,
        "valid"
      )
      setStatus("Selected data replaced. Reloading Home...")
      window.setTimeout(() => window.location.reload(), 700)
    } catch (error) {
      console.error("WorthIt backup Replace restore failed:", error)
      replaceConfirmation.hidden = true

      if (cloudCommitted) {
        setStatus(error.message, true)
        return
      }

      invalidateSafetyBackup()
      setStatus(error.message || "Could not replace this backup data.", true)
      renderRestorePreview()
    } finally {
      prepareReplaceRestoreButton.disabled = false
      confirmReplaceRestoreButton.disabled = false
      cancelReplaceRestoreButton.disabled = false
    }
  }

  async function addBackupToCurrentAccount() {
    const mode = restoreModes.find(input => input.checked)?.value || "add"
    const selectedAreas = selectedAreasFromChoices(restoreChoices)

    if (mode !== "add" || !restoreBackup || !currentUser || currentUser.uid !== restoreUserId) {
      setStatus("The signed-in account changed. Choose the backup file again.", true)
      return
    }

    if (!latestAddPlan || latestAddPlan.blockers.length) {
      setStatus("Resolve the Add blockers before restoring.", true)
      return
    }

    if (!latestAddPlan.addedCount) {
      setStatus("Nothing new to add.")
      return
    }

    const userId = restoreUserId
    const selectedAreaSet = new Set(selectedAreas)

    addRestoreButton.disabled = true
    confirmAddRestoreButton.disabled = true
    cancelAddRestoreButton.disabled = true
    setStatus("Adding new data to your signed-in account...")

    try {
      const result = await runUserStorageRestoreTransaction(
        userId,
        ["earnit", "spendit", "planit", "saveit"],
        freshCloudStates => {
          if (!currentUser || currentUser.uid !== userId) {
            throw new Error("Your signed-in account changed before the restore could be applied.")
          }

          const freshCurrent = buildCurrentData(freshCloudStates)
          const freshPlan = buildAddRestorePlan(
            restoreBackup,
            freshCurrent,
            [...selectedAreaSet]
          )

          if (freshPlan.blockers.length) {
            throw new Error(`Restore stopped: ${freshPlan.blockers[0]}`)
          }

          return {
            storageUpdates: freshPlan.storageUpdates,
            addPlan: freshPlan
          }
        }
      )

      if (!result.addPlan.addedCount) {
        addConfirmation.hidden = true
        setStatus("Nothing new to add.")
        renderRestorePreview()
        return
      }

      if (!currentUser || currentUser.uid !== userId) {
        throw new Error(
          "The cloud restore succeeded, but this browser changed accounts before its local cache could update."
        )
      }

      try {
        updateRestoredLocalStorage(result.storageUpdates)
      } catch (error) {
        console.error("WorthIt backup local cache update failed:", error)
        throw new Error(
          "Your cloud data was restored, but this browser could not refresh its local cache. Reload Home before continuing."
        )
      }

      setStatus("Added new backup data. Reloading Home...")
      window.setTimeout(() => window.location.reload(), 500)
    } catch (error) {
      console.error("WorthIt backup Add restore failed:", error)
      addConfirmation.hidden = true
      setStatus(error.message || "Could not add this backup to your cloud data.", true)
      renderRestoreChoices(selectedAreaSet)
      renderRestorePreview()
    } finally {
      addRestoreButton.disabled = false
      confirmAddRestoreButton.disabled = false
      cancelAddRestoreButton.disabled = false
    }
  }

  function showRestorePreview(validBackup, currentData, currentValues, userId) {
    restoreBackup = validBackup
    restoreCollections = {
      backup: validBackup,
      current: currentData,
      currentValues
    }
    restoreUserId = userId
    restoreModes.forEach(input => {
      input.checked = input.value === "add"
    })
    renderRestoreInformation(restoreInfo, validBackup)
    renderRestoreChoices()
    showRestoreView()
    renderRestorePreview()
  }

  function openRestoreFilePicker() {
    if (!authStateResolved) {
      setStatus("Checking sign-in status. Please try again.", true)
      return
    }

    if (!currentUser) {
      setStatus("Sign in to preview a backup restore.", true)
      return
    }

    restoreFile.value = ""
    restoreFile.click()
  }

  async function previewSelectedRestoreFile() {
    const file = restoreFile.files?.[0]
    if (!file) return

    if (!currentUser) {
      setStatus("Sign in to preview a backup restore.", true)
      return
    }

    const userId = currentUser.uid
    restoreButton.disabled = true
    setStatus("Validating backup...")

    try {
      const contents = await file.text()
      let fileData

      try {
        fileData = JSON.parse(contents)
      } catch {
        throw new Error("The selected file is not valid JSON.")
      }

      const validBackup = validateBackup(fileData)
      setStatus("Reading current cloud data for comparison...")
      const cloudStates = await loadCloudStates(userId, Object.keys(BACKUP_AREAS))

      if (!currentUser || currentUser.uid !== userId) {
        throw new Error("Your signed-in account changed before the preview was ready.")
      }

      showRestorePreview(
        validBackup,
        buildCurrentData(cloudStates),
        buildCurrentStorageValues(cloudStates),
        userId
      )
      setStatus()
    } catch (error) {
      console.error("WorthIt backup restore preview failed:", error)
      setStatus(error.message || "Could not safely preview this backup.", true)
    } finally {
      restoreButton.disabled = false
    }
  }

  openButton.addEventListener("click", openModal)
  closeButton.addEventListener("click", closeModal)
  cancelButton.addEventListener("click", closeModal)
  restoreCancelButton.addEventListener("click", closeModal)
  backButton.addEventListener("click", () => {
    showExportView()
    setStatus()
    restoreButton.focus()
  })
  selectAllButton.addEventListener("click", () => {
    exportChoices.forEach(choice => {
      choice.checked = true
    })
  })
  exportButton.addEventListener("click", exportBackup)
  restoreButton.addEventListener("click", openRestoreFilePicker)
  restoreFile.addEventListener("change", previewSelectedRestoreFile)
  addRestoreButton.addEventListener("click", showAddConfirmation)
  cancelAddRestoreButton.addEventListener("click", () => {
    addConfirmation.hidden = true
    addRestoreButton.focus()
  })
  confirmAddRestoreButton.addEventListener("click", addBackupToCurrentAccount)
  prepareReplaceRestoreButton.addEventListener("click", prepareReplaceSafetyBackup)
  cancelReplaceRestoreButton.addEventListener("click", () => {
    invalidateSafetyBackup()
    prepareReplaceRestoreButton.focus()
  })
  verifySafetyBackup.addEventListener("change", () => {
    confirmReplaceRestoreButton.disabled = !verifySafetyBackup.checked
  })
  confirmReplaceRestoreButton.addEventListener("click", replaceBackupInCurrentAccount)
  restoreModes.forEach(input => {
    input.addEventListener("change", () => {
      renderRestoreChoices(new Set(
        selectedAreasFromChoices(restoreChoices)
      ))
      renderRestorePreview()
    })
  })

  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal()
  })

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !modal.hidden) closeModal()
  })
}

watchAuthState(user => {
  currentUser = user
  authStateResolved = true
})

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeWorthItBackup)
} else {
  initializeWorthItBackup()
}
