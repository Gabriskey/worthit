const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const WISHLIST_KEY = "wishlistItems"
const WISHLIST_COLLECTIONS_KEY = "wishlistCollections"
const WISHLIST_SORT_KEY = "wishlistSortState"
const WISHLIST_FILTER_KEY = "wishlistFilterState"
const WISHLIST_VIEW_KEY = "wishlistViewState"

const PAYOFF_KEY = "worthitPayoffs"
const PURCHASED_ITEMS_KEY = "worthitPurchasedItems"

function loadPurchasedItems() {
  try {
    const raw = JSON.parse(localStorage.getItem(PURCHASED_ITEMS_KEY) || "[]")
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function savePurchasedItems(items) {
  const raw =
    JSON.stringify(items)

  localStorage.setItem(
    PURCHASED_ITEMS_KEY,
    raw
  )

  window.savePlanItKeyToCloud?.(
    PURCHASED_ITEMS_KEY,
    raw
  )
}

function addPurchasedItem(item = {}) {
  const purchased = loadPurchasedItems()
  const id = item.id || item.wishlistId || item.plannerEntryId || String(Date.now())

  const existingIndex = purchased.findIndex(x => x.id === id)

  const nextItem = {
    id,
    wishlistId: item.wishlistId || "",
    plannerEntryId: item.plannerEntryId || item.id || "",
    name: item.name || item.label || "Purchased Item",
    price: Number(item.price || item.amount || 0),
    source: item.source || "planner",
    purchasedAt: item.purchasedAt || new Date().toISOString()
  }

  if (existingIndex >= 0) {
    purchased[existingIndex] = { ...purchased[existingIndex], ...nextItem }
  } else {
    purchased.unshift(nextItem)
  }

  savePurchasedItems(purchased)
}

function removePurchasedItem(id) {
  savePurchasedItems(loadPurchasedItems().filter(item => item.id !== id))
}

function migratePurchasedItemsStorage() {
  const purchased = loadPurchasedItems()
  const existingIds = new Set(purchased.map(item => item.id))

  let wishlistItems = []

  try {
    wishlistItems = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]")
  } catch {
    wishlistItems = []
  }

  if (!Array.isArray(wishlistItems)) return

  wishlistItems.forEach(item => {
    if (item.status === "purchased" && !existingIds.has(item.id)) {
      purchased.unshift({
        id: item.id,
        wishlistId: item.id,
        plannerEntryId: item.plannerEntryId || "",
        name: item.name || "Purchased Item",
        price: Number(item.price || 0),
        source: "wishlist",
        purchasedAt: item.purchasedAt || new Date().toISOString()
      })
    }
  })

  savePurchasedItems(purchased)
}

function loadPayoffs() {
  try {
    const raw = JSON.parse(localStorage.getItem(PAYOFF_KEY) || "[]")
    return Array.isArray(raw) ? raw : []
  } catch (error) {
    console.error("Invalid payoff data:", error)
    return []
  }
}

function savePayoffs(payoffs) {
  const raw =
    JSON.stringify(payoffs)

  localStorage.setItem(
    PAYOFF_KEY,
    raw
  )

  window.savePlanItKeyToCloud?.(
    PAYOFF_KEY,
    raw
  )
}

function normalizePayoff(item = {}) {
  return {
    id: item.id || String(Date.now() + Math.random()),
    name: String(item.name || "").trim(),
    total: Number(item.total || 0),
    paid: Number(item.paid || 0),
    monthly: Number(item.monthly || 0),
    dueDay: Number(item.dueDay || 1),
    category: String(item.category || "Installment").trim(),
    source: item.source || "",
    entryCount: Number(item.entryCount || 0)
  }
}
function getRecurringPlannerPayoffs() {
  const data = loadData()
  const grouped = {}

  const currentMonthIndex = new Date().getMonth()

Object.entries(data).forEach(([month, entries]) => {
  const monthIndex = months.indexOf(month)
  if (monthIndex < currentMonthIndex) return
    if (!Array.isArray(entries)) return

    entries.forEach(entry => {
      const label = String(entry.label || "").trim()
      if (!label) return

      const key = label.toLowerCase()
      const amount = Number(entry.amount || 0)
      const total = Number(entry.installmentTotal || 0)

      if (!grouped[key]) {
        grouped[key] = {
          id: `planner_${key.replace(/[^a-z0-9]+/g, "_")}`,
          name: label,
          total: 0,
          paid: 0,
          monthly: amount,
          dueDay: entry.date ? Number(String(entry.date).split("-")[2]) : 1,
          category: "Planner Installment",
          source: "planner",
          months: new Set(),
          entryCount: 0
        }
      }

      grouped[key].months.add(month)
      grouped[key].entryCount += 1

      if (amount > grouped[key].monthly) grouped[key].monthly = amount
      if (total > grouped[key].total) grouped[key].total = total
    })
  })

  return Object.values(grouped)
    .filter(item => item.months.size >= 2)
    .map(item => {
      const estimatedTotal = item.total > 0 ? item.total : item.monthly * item.entryCount

      return normalizePayoff({
        ...item,
        total: estimatedTotal
      })
    })
}

function getCombinedPayoffs() {
  const manualPayoffs = loadPayoffs().map(normalizePayoff)
  const plannerPayoffs = getRecurringPlannerPayoffs()

  const manualNames = new Set(
    manualPayoffs.map(item => item.name.toLowerCase().trim())
  )

  const filteredPlannerPayoffs = plannerPayoffs.filter(item => {
    return !manualNames.has(item.name.toLowerCase().trim())
  })

  return [...manualPayoffs, ...filteredPlannerPayoffs]
}
function getPayoffStats() {
  const payoffs = getCombinedPayoffs()

  const totalOriginal = payoffs.reduce((sum, p) => sum + Number(p.total || 0), 0)
  const totalRemaining = totalOriginal
  const monthlyDue = payoffs.reduce((sum, p) => sum + Number(p.monthly || 0), 0)
  const entryCount = payoffs.reduce((sum, p) => sum + Number(p.entryCount || 1), 0)

  return {
    payoffs,
    totalOriginal,
    totalPaid: 0,
    totalRemaining,
    monthlyDue,
    activeCount: payoffs.length,
    entryCount
  }
}

document.addEventListener('DOMContentLoaded', () => {
  migratePurchasedItemsStorage()
})

/* ========================================
   EXISTING SHARED FUNCTIONS
   ======================================== */
function renderWishlistPlannerMonthButtons() {
  const monthGrid = document.getElementById("wishlistPlannerMonthGrid")
  if (!monthGrid) return

  const currentMonthIndex = new Date().getMonth()

  monthGrid.innerHTML = months.map((month, index) => {
    const disabled = index < currentMonthIndex

    return `
      <button
        class="btn btn-primary wishlist-month-option ${disabled ? "is-disabled" : ""}"
        type="button"
        data-month="${month}"
        ${disabled ? "disabled" : ""}
      >
        ${month}
      </button>
    `
  }).join("")
}

function cap(s) {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

function formatCurrency(value, withSymbol = true) {
  const n = Number(value || 0)
  const hasDecimals = n % 1 !== 0

  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  })

  return withSymbol ? `₱${formatted}` : formatted
}

function showToast(message) {
  const toast = document.getElementById("toast")
  if (!toast) return

  toast.textContent = message
  toast.classList.add("show")

  setTimeout(() => {
    toast.classList.remove("show")
  }, 2500)
}

function normalizeBridgeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function findWishlistItemByPlannerEntry(entry) {
  if (!entry) return null

  let wishlistItems = []

  try {
    const raw = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]")
    wishlistItems = Array.isArray(raw) ? raw : []
  } catch {
    wishlistItems = []
  }

  if (entry.wishlistId) {
    const exact = wishlistItems.find(item => {
      return String(item.id) === String(entry.wishlistId)
    })

    if (exact) return exact
  }

  const normalizedLabel = normalizeBridgeText(entry.label)

  if (!normalizedLabel) return null

  return wishlistItems.find(item => {
    return normalizeBridgeText(item.name) === normalizedLabel
  }) || null
}

function findPlannerEntryByWishlistId(data, wishlistId) {
  if (!data || !wishlistId) return null

  for (const [month, entries] of Object.entries(data)) {
    if (!Array.isArray(entries)) continue

    const index = entries.findIndex(entry => {
      return (
        String(entry.wishlistId || "") === String(wishlistId) ||
        String(entry.plannerEntryId || "") === String(wishlistId)
      )
    })

    if (index !== -1) {
      return {
        month,
        index,
        entry: entries[index]
      }
    }
  }

  return null
}

function loadData() {
  try {
    return JSON.parse(localStorage.getItem("financePlanner") || "{}")
  } catch (error) {
    console.error("Invalid financePlanner data in localStorage:", error)
    return {}
  }
}

function saveData(data) {
  const raw =
    JSON.stringify(data)

  localStorage.setItem(
    "financePlanner",
    raw
  )

  window.savePlanItKeyToCloud?.(
    "financePlanner",
    raw
  )
}

function loadWishlistItemsRaw() {
  try {
    const raw = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]")
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function saveWishlistItemsRaw(items) {
  const raw =
    JSON.stringify(items)

  localStorage.setItem(
    WISHLIST_KEY,
    raw
  )

  window.savePlanItKeyToCloud?.(
    WISHLIST_KEY,
    raw
  )
}

function syncWishlistDateFromPlannerEntry(entry, month) {
  if (!entry || !entry.wishlistId) return

  const items = loadWishlistItemsRaw()
  const item = items.find(x => String(x.id) === String(entry.wishlistId))
  if (!item) return

  item.status = "planned"
  item.plannedMonth = month || ""
  item.plannedDate = entry.date || ""
  item.plannerEntryId = entry.id || item.plannerEntryId || ""

  saveWishlistItemsRaw(items)
}

function syncWishlistLinkFromPlannerEntry(entry) {
  if (!entry || !entry.wishlistId) return

  const items = loadWishlistItemsRaw()
  const item = items.find(x => String(x.id) === String(entry.wishlistId))
  if (!item) return

  item.link = entry.link || ""

  saveWishlistItemsRaw(items)
}

function clearWishlistPlannerLink(wishlistId) {
  if (!wishlistId) return

  const items = loadWishlistItemsRaw()
  const item = items.find(x => String(x.id) === String(wishlistId))
  if (!item) return

  item.status = "wishlist"
  item.plannedMonth = ""
  item.plannedDate = ""
  item.plannerEntryId = ""

  saveWishlistItemsRaw(items)
}

function safeRenderPlanner() {
  if (typeof render === "function") {
    render()
  }
}

function toggleQuickAddMenu() {
  const menu = document.getElementById("quickActionMenu")
  const overlay = document.getElementById("quickActionOverlay")
  const button = document.getElementById("floatingAddBtn")

  if (!menu || !overlay || !button) return

  const isOpen = menu.classList.contains("open")

  if (isOpen) {
    closeQuickAddMenu()
  } else {
    openQuickAddMenu()
  }
}

function openQuickAddMenu() {
  document.getElementById("quickActionMenu")?.classList.add("open")
  document.getElementById("quickActionOverlay")?.classList.add("open")
  document.getElementById("floatingAddBtn")?.classList.add("open")
}

function closeQuickAddMenu() {
  document.getElementById("quickActionMenu")?.classList.remove("open")
  document.getElementById("quickActionOverlay")?.classList.remove("open")
  document.getElementById("floatingAddBtn")?.classList.remove("open")
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeQuickAddMenu()
  }
})