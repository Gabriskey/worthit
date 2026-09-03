/* Centralized WorthIt backup export and read-only restore preview. */

import { watchAuthState } from "./auth.js"
import { loadUserAppState } from "./database.js"

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

function downloadBackup(backup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json"
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = backupFilename()
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

    expectedKeys.forEach(storageKey => {
      if (!hasOwn(section, storageKey)) {
        throw new Error(`${AREA_LABELS[area]} is missing ${storageKey}.`)
      }

      data[area][storageKey] = parseStorageValue(
        section[storageKey],
        storageKey,
        "The backup"
      )
    })
  })

  return { exportedAt: backup.exportedAt, included, data }
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
  return [...comparison.newRecords, ...comparison.duplicates]
}

function availablePlannerEntries(collections, selectedAreas, mode) {
  if (!selectedAreas.includes("planit")) {
    return plannerEntries(collections.current, "planit")
  }

  if (mode === "replace") {
    return plannerEntries(collections.backup.data, "planit")
  }

  // Generic Planner rows are a visible Add blocker, so they cannot prove links.
  return plannerEntries(collections.backup.data, "planit")
    .filter(entry => stableId(entry.id))
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

  if (selectedAreas.includes("earnit")) {
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

  if (selectedAreas.includes("spendit")) {
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

  if (selectedAreas.includes("saveit")) {
    availableStableRecords(
      collections, selectedAreas, mode, "saveit", "savingsGoals"
    ).forEach(goal => {
      const accountId = String(goal.accountId || "")
      if (accountId && !accountIds.has(accountId)) {
        addBlocker(`SaveIt goal ${stableId(goal.id)} has no resolvable SpendIt account.`)
      }
    })
  }

  if (selectedAreas.includes("wishlist")) {
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

  if (selectedAreas.includes("planit")) {
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
  const backButton = document.getElementById("backToWorthItBackup")
  const restoreCancelButton = document.getElementById("cancelWorthItRestore")
  const status = document.getElementById("worthitBackupStatus")

  if (
    !modal || !openButton || !closeButton || !exportView || !restoreView ||
    !title || !eyebrow || !cancelButton || !selectAllButton || !exportButton ||
    !restoreButton || !restoreFile || !restoreInfo || !restoreChoices ||
    !restoreResults || !backButton || !restoreCancelButton || !status
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

  function setStatus(message = "", isError = false) {
    status.textContent = message
    status.classList.toggle("is-error", isError)
  }

  function showExportView() {
    exportView.hidden = false
    restoreView.hidden = true
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

    if (!currentUser || currentUser.uid !== restoreUserId) {
      restoreResults.replaceChildren()
      const details = addResultCard(restoreResults, "Preview unavailable")
      addResultLine(
        details,
        "×",
        "The signed-in account changed. Choose the backup file again.",
        "blocking"
      )
      return
    }

    const mode = restoreModes.find(input => input.checked)?.value || "add"
    const selectedAreas = selectedAreasFromChoices(restoreChoices)

    restoreResults.replaceChildren()
    const summary = addResultCard(restoreResults, "Restore preview")
    addResultLine(summary, "✓", "Valid backup. This preview makes no changes.", "valid")

    if (!selectedAreas.length) {
      addResultLine(summary, "!", "Choose at least one available section to preview.", "warning")
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
          addResultLine(
            details,
            "✓",
            `Planner entries: ${countPlannerEntries(restoreBackup.data, area)}`,
            "valid"
          )
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

    const blockers = createRelationshipBlockers(
      restoreCollections,
      selectedAreas,
      mode
    )

    if (blockers.length) {
      const details = addResultCard(restoreResults, "Blocking relationship conflicts")
      blockers.forEach(message => addResultLine(details, "×", message, "blocking"))
    } else {
      const details = addResultCard(restoreResults, "Relationships")
      addResultLine(
        details,
        "✓",
        "Selected active relationships can be resolved by stable IDs.",
        "valid"
      )
    }
  }

  function showRestorePreview(validBackup, currentData, userId) {
    restoreBackup = validBackup
    restoreCollections = { backup: validBackup, current: currentData }
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

      showRestorePreview(validBackup, buildCurrentData(cloudStates), userId)
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
