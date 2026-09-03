/* Centralized, export-only backup for the WorthIt homepage. */

import {
  watchAuthState
} from "./auth.js"

import {
  loadUserAppState
} from "./database.js"

const BACKUP_AREAS = Object.freeze({
  earnit: [
    {
      appName: "earnit",
      storageKey: "salary-growth-tracker-v1"
    },
    {
      appName: "earnit",
      storageKey: "salary-growth-tracker-companies-v1"
    }
  ],
  spendit: [
    {
      appName: "spendit",
      storageKey: "expensepath-accounts-v1"
    },
    {
      appName: "spendit",
      storageKey: "expensepath-records-v1"
    }
  ],
  planit: [
    {
      appName: "planit",
      storageKey: "financePlanner"
    },
    {
      appName: "planit",
      storageKey: "worthitPayoffs"
    },
    {
      appName: "planit",
      storageKey: "worthitPurchasedItems"
    }
  ],
  wishlist: [
    {
      appName: "planit",
      storageKey: "wishlistItems"
    },
    {
      appName: "planit",
      storageKey: "wishlistCollections"
    }
  ],
  saveit: [
    {
      appName: "saveit",
      storageKey: "savingsGoals"
    }
  ],
  preferences: [
    {
      appName: "earnit",
      storageKey: "salary-growth-tracker-ui-v1"
    },
    {
      appName: "earnit",
      storageKey: "salary-growth-tracker-active-page"
    },
    {
      appName: "spendit",
      storageKey: "expensepath-ui-v1"
    },
    {
      appName: "planit",
      storageKey: "collapsedMonths"
    },
    {
      appName: "planit",
      storageKey: "wishlistSortState"
    },
    {
      appName: "planit",
      storageKey: "wishlistFilterState"
    },
    {
      appName: "planit",
      storageKey: "wishlistViewState"
    },
    {
      storageKey: "worthit-theme",
      source: "local"
    }
  ]
})

let currentUser = null
let authStateResolved = false

function toLocalStorageValue(value, storageKey) {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === "string") {
    return value
  }

  const serializedValue = JSON.stringify(value)

  if (typeof serializedValue !== "string") {
    throw new Error(
      `Could not serialize ${storageKey} for backup.`
    )
  }

  return serializedValue
}

function readCloudStorageValue(
  cloudStates,
  appName,
  storageKey
) {
  const storage = cloudStates.get(appName)?.storage

  if (
    !storage ||
    typeof storage !== "object" ||
    !Object.prototype.hasOwnProperty.call(
      storage,
      storageKey
    )
  ) {
    return null
  }

  return toLocalStorageValue(
    storage[storageKey],
    storageKey
  )
}

async function loadSelectedCloudStates(
  userId,
  selectedAreas
) {
  const appNames = new Set()

  selectedAreas.forEach(area => {
    BACKUP_AREAS[area]?.forEach(item => {
      if (item.appName) {
        appNames.add(item.appName)
      }
    })
  })

  const entries = await Promise.all(
    [...appNames].map(async appName => {
      const state = await loadUserAppState(
        userId,
        appName
      )

      return [appName, state]
    })
  )

  return new Map(entries)
}

function buildBackup(selectedAreas, cloudStates) {
  const data = {}

  selectedAreas.forEach(area => {
    const storageItems = BACKUP_AREAS[area]

    if (!storageItems) {
      return
    }

    data[area] = {}

    storageItems.forEach(item => {
      data[area][item.storageKey] =
        item.source === "local"
          ? localStorage.getItem(item.storageKey)
          : readCloudStorageValue(
            cloudStates,
            item.appName,
            item.storageKey
          )
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
  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  )
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = backupFilename()
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function initializeWorthItBackup() {
  const modal = document.getElementById("worthitBackupModal")
  const openButton = document.getElementById("openWorthItBackupModal")
  const closeButton = document.getElementById("closeWorthItBackupModal")
  const cancelButton = document.getElementById("cancelWorthItBackup")
  const selectAllButton = document.getElementById("selectAllWorthItBackup")
  const exportButton = document.getElementById("exportWorthItBackup")
  const status = document.getElementById("worthitBackupStatus")

  if (
    !modal ||
    !openButton ||
    !closeButton ||
    !cancelButton ||
    !selectAllButton ||
    !exportButton ||
    !status
  ) {
    return
  }

  const choices = Array.from(
    modal.querySelectorAll("[data-worthit-backup-area]")
  )
  let lastFocusedElement = null

  function setStatus(message = "", isError = false) {
    status.textContent = message
    status.classList.toggle("is-error", isError)
  }

  function openModal() {
    lastFocusedElement = document.activeElement
    setStatus()
    modal.hidden = false
    choices[0]?.focus()
  }

  function closeModal() {
    modal.hidden = true
    setStatus()
    lastFocusedElement?.focus?.()
  }

  async function exportBackup() {
    const selectedAreas = choices
      .filter(choice => choice.checked)
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
      const cloudStates = await loadSelectedCloudStates(
        userId,
        selectedAreas
      )

      if (
        !currentUser ||
        currentUser.uid !== userId
      ) {
        throw new Error(
          "Your signed-in account changed before the backup was ready."
        )
      }

      const backup = buildBackup(
        selectedAreas,
        cloudStates
      )

      downloadBackup(backup)
      setStatus("Backup downloaded. Keep the file somewhere safe.")
    } catch (error) {
      console.error("WorthIt backup export failed:", error)
      setStatus(
        error.message || "Could not read your cloud data for backup.",
        true
      )
    } finally {
      exportButton.disabled = false
    }
  }

  openButton.addEventListener("click", openModal)
  closeButton.addEventListener("click", closeModal)
  cancelButton.addEventListener("click", closeModal)
  selectAllButton.addEventListener("click", () => {
    choices.forEach(choice => {
      choice.checked = true
    })
  })
  exportButton.addEventListener("click", exportBackup)

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      closeModal()
    }
  })

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal()
    }
  })
}

watchAuthState(user => {
  currentUser = user
  authStateResolved = true
})

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeWorthItBackup
  )
} else {
  initializeWorthItBackup()
}
