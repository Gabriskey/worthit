const wishlistModal = document.getElementById("wishlistModal")
const wishlistCollectionModal = document.getElementById("wishlistCollectionModal")
const editWishlistCollectionModal = document.getElementById("editWishlistCollectionModal")
const moveWishlistItemModal = document.getElementById("moveWishlistItemModal")
const wishlistDisplayModal = document.getElementById("wishlistDisplayModal")

let wishlistSortState
let wishlistFilterState
let wishlistViewState

try {
  wishlistSortState = JSON.parse(localStorage.getItem(WISHLIST_SORT_KEY) || '{"column":null,"direction":"asc"}')
} catch (error) {
  wishlistSortState = { column: null, direction: "asc" }
}

try {
  wishlistFilterState = JSON.parse(localStorage.getItem(WISHLIST_FILTER_KEY) || '{"priority":"all","collectionId":"all"}')
} catch (error) {
  wishlistFilterState = { priority: "all", collectionId: "all" }
}

try {
  wishlistViewState = JSON.parse(localStorage.getItem(WISHLIST_VIEW_KEY) || '{"screenMode":"collections","displayStyle":"small","activeCollectionId":""}')
} catch (error) {
  wishlistViewState = { screenMode: "collections", displayStyle: "small", activeCollectionId: "" }
}

if (!wishlistFilterState || typeof wishlistFilterState !== "object") {
  wishlistFilterState = { priority: "all", collectionId: "all" }
}

if (!wishlistFilterState.priority) wishlistFilterState.priority = "all"
if (!wishlistFilterState.collectionId) wishlistFilterState.collectionId = "all"

if (!wishlistViewState || typeof wishlistViewState !== "object") {
  wishlistViewState = { screenMode: "collections", displayStyle: "small", activeCollectionId: "" }
}

let wishlistDeleteId = null
let wishlistDeleteCollectionId = null
let wishlistMoveItemId = null
let plannerDeleteTarget = null
let wishlistPlannerTargetId = null
let wishlistPlannerAction = "copy"
let wishlistPrioritySortDelayTimer = null

function safeRenderPlanner() {
  if (typeof render === "function") {
    render()
  }
}


function normalizeWishlistItem(item = {}) {
  return {
    id: String(item.id || Date.now() + Math.random()),
    name: item.name || "",
priority: ["low", "medium", "high"].includes(item.priority) ? item.priority : "low",
    collectionId: item.collectionId || "",
    category: item.category || "",
    price: Number(item.price || 0),
    link: item.link || "",
    status: item.status || "wishlist",
    plannedMonth: item.plannedMonth || "",
    plannedDate: item.plannedDate || "",
    plannerEntryId: item.plannerEntryId || "",
    purchasedAt: item.purchasedAt || ""
  }
}
let wishlistLinkTargetId = null

function editWishlistLink(id) {
  const items = loadWishlistItems()
  const item = items.find(item => item.id === id)
  if (!item) return

  wishlistLinkTargetId = id

  const input = document.getElementById("wishlistLinkEditInput")
  const modal = document.getElementById("wishlistLinkModal")

  if (input) input.value = item.link || ""
  if (modal) modal.style.display = "flex"

  setTimeout(() => input?.focus(), 0)
}

function closeWishlistLinkModal() {
  wishlistLinkTargetId = null

  const modal = document.getElementById("wishlistLinkModal")
  if (modal) modal.style.display = "none"
}

function saveWishlistLink() {
  if (!wishlistLinkTargetId) return

  const input = document.getElementById("wishlistLinkEditInput")
  const items = loadWishlistItems()
  const item = items.find(item => item.id === wishlistLinkTargetId)
  if (!item) return

  item.link = normalizeWishlistLink(input?.value || "")

  const d = loadData()
 let updatedPlanner = false

Object.entries(d).forEach(([month, entries]) => {
  entries.forEach(entry => {
    const sameWishlistId =
      entry.wishlistId &&
      entry.wishlistId === item.id

    const sameName =
      normalizeBridgeText(entry.label) ===
      normalizeBridgeText(item.name)

    if (sameWishlistId || sameName) {
      entry.link = item.link
      updatedPlanner = true
    }
  })
})

if (updatedPlanner) {
  saveData(d)
}

  saveWishlistItems(items)
  closeWishlistLinkModal()
  renderWishlist()
  safeRenderPlanner()
  showToast(item.link ? "Link updated" : "Link removed")
}

function removeWishlistLink() {
  if (!wishlistLinkTargetId) return

  const items = loadWishlistItems()
  const item = items.find(item => item.id === wishlistLinkTargetId)
  if (!item) return

  item.link = ""

  const d = loadData()
  const bridge = findPlannerEntryByWishlistId(d, item.id)

  if (bridge) {
    bridge.entry.link = ""
    saveData(d)
  }

  saveWishlistItems(items)
  closeWishlistLinkModal()
  renderWishlist()
  safeRenderPlanner()
  showToast("Link removed")
}

function normalizeWishlistCollection(collection = {}) {
  return {
    id: collection.id || `collection_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: String(collection.name || "").trim() || "untitled",
    symbol: String(collection.symbol || "✨").trim() || "✨",
    notes: String(collection.notes || "").trim()
  }
}

function loadWishlistCollections() {
  try {
    const raw = JSON.parse(localStorage.getItem(WISHLIST_COLLECTIONS_KEY) || "[]")
    return Array.isArray(raw) ? raw.map(normalizeWishlistCollection) : []
  } catch (error) {
    console.error("Invalid wishlistCollections data in localStorage:", error)
    return []
  }
}

function saveWishlistCollections(
  collections
) {
  const raw =
    JSON.stringify(collections)

  localStorage.setItem(
    WISHLIST_COLLECTIONS_KEY,
    raw
  )

  window.savePlanItKeyToCloud?.(
    WISHLIST_COLLECTIONS_KEY,
    raw
  )
}

function slugifyCollectionName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "collection"
}

function parseLegacyCategory(categoryValue) {
  const raw = String(categoryValue || "").trim()
  if (!raw) {
    return { name: "untitled", symbol: "✨" }
  }

  const match = raw.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*(.*)$/u)

  if (match) {
    return {
      symbol: match[1] || "✨",
      name: (match[2] || "").trim() || "untitled"
    }
  }

  return {
    symbol: "✨",
    name: raw
  }
}

function migrateLegacyWishlistData() {
  let items = []

  try {
    items = JSON.parse(
      localStorage.getItem(WISHLIST_KEY) || "[]"
    )
  } catch (error) {
    console.error(
      "Unable to read legacy wishlist items for migration:",
      error
    )
    return
  }

  if (
    !Array.isArray(items) ||
    !items.length
  ) return

  const collections =
    loadWishlistCollections()

  const validCollectionIds =
    new Set(
      collections.map(
        collection => collection.id
      )
    )

  const migratedItems =
    items.map(item => {
      if (
        item &&
        item.collectionId &&
        validCollectionIds.has(
          item.collectionId
        )
      ) {
        return item
      }

      return {
        ...item,
        collectionId: ""
      }
    })

  saveWishlistItems(
    migratedItems.map(item => ({
      ...item,

      id:
        item.id ||
        String(
          Date.now() +
          Math.random()
        ),

      name:
        item.name || "",

      priority:
        ["low", "medium", "high"]
          .includes(item.priority)
          ? item.priority
          : "low",

      category:
        item.category || "",

      price:
        Number(item.price || 0),

      link:
        item.link || "",

      status:
        item.status || "wishlist",

      plannedMonth:
        item.plannedMonth || "",

      plannedDate:
        item.plannedDate || "",

      plannerEntryId:
        item.plannerEntryId || "",

      collectionId:
        item.collectionId || ""
    }))
  )
}

function getCollectionById(collectionId) {
  return loadWishlistCollections().find(collection => collection.id === collectionId) || null
}

function getCollectionName(collectionId) {
  const collection = getCollectionById(collectionId)
  return collection ? collection.name : "Not in a wishlist"
}

function getCollectionOptionsMarkup(selectedCollectionId = "", includeUnassigned = false) {
  const collections = loadWishlistCollections()

  const options = collections.map(collection => `
    <option value="${collection.id}" ${collection.id === selectedCollectionId ? "selected" : ""}>
      ${collection.symbol} ${cap(collection.name)}
    </option>
  `)

  if (includeUnassigned) {
    options.unshift(`
      <option value="" ${!selectedCollectionId ? "selected" : ""}>
        Not in a Wishlist
      </option>
    `)
  }

  return options.join("")
}

function populateWishlistCollectionsSelect() {
  const select = document.getElementById("wishlistCollection")
  if (!select) return

  const collections = loadWishlistCollections()

  if (!collections.length) {
    select.innerHTML = `<option value="">No wishlists yet</option>`
    return
  }

  select.innerHTML = collections.map(collection => `
    <option value="${collection.id}">
      ${collection.symbol} ${cap(collection.name)}
    </option>
  `).join("")
}

function populateWishlistCollectionFilter() {
  const select = document.getElementById("wishlistCollectionFilter")
  if (!select) return

  const collections = loadWishlistCollections()

  select.innerHTML = `
    <option value="all">All Wishlists</option>
    ${collections.map(collection => `
      <option value="${collection.id}">
        ${collection.symbol} ${cap(collection.name)}
      </option>
    `).join("")}
  `

  select.value = wishlistFilterState.collectionId || "all"
}

function createWishlistCollection() {
  const nameInput = document.getElementById("wishlistCollectionName")
  const symbolInput = document.getElementById("wishlistCollectionSymbol")
  const notesInput = document.getElementById("wishlistCollectionNotes")

  const name = String(nameInput.value || "").trim()
  const symbol = String(symbolInput.value || "").trim() || "✨"
  const notes = String(notesInput.value || "").trim()

  if (!name) {
    showToast("Please enter a wishlist name")
    nameInput.focus()
    return
  }

  const collections = loadWishlistCollections()
  collections.push(normalizeWishlistCollection({
    id: `collection_${Date.now()}`,
    name,
    symbol,
    notes
  }))

  saveWishlistCollections(collections)
  closeCreateCollectionModal()
  populateWishlistCollectionsSelect()
  populateWishlistCollectionFilter()
  renderWishlist()
  showToast(`${name} wishlist created!`)

  nameInput.value = ""
  symbolInput.value = ""
  notesInput.value = ""
}

function openEditCollectionModal() {
  const collectionId = wishlistViewState.activeCollectionId
  if (!collectionId) return

  const collection = getCollectionById(collectionId)
  if (!collection) return

  document.getElementById("editWishlistCollectionName").value = collection.name || ""
  document.getElementById("editWishlistCollectionSymbol").value = collection.symbol || ""
  document.getElementById("editWishlistCollectionNotes").value = collection.notes || ""

  if (editWishlistCollectionModal) {
    editWishlistCollectionModal.style.display = "flex"
  }
}

function closeEditCollectionModal() {
  if (editWishlistCollectionModal) {
    editWishlistCollectionModal.style.display = "none"
  }
}

function saveEditedCollection() {
  const collectionId = wishlistViewState.activeCollectionId
  if (!collectionId) return

  const nameInput = document.getElementById("editWishlistCollectionName")
  const symbolInput = document.getElementById("editWishlistCollectionSymbol")
  const notesInput = document.getElementById("editWishlistCollectionNotes")

  const name = String(nameInput.value || "").trim()
  const symbol = String(symbolInput.value || "").trim() || "✨"
  const notes = String(notesInput.value || "").trim()

  if (!name) {
    showToast("Please enter a collection name")
    nameInput.focus()
    return
  }

  const collections = loadWishlistCollections()
  const collection = collections.find(c => c.id === collectionId)
  if (!collection) return

  collection.name = name
  collection.symbol = symbol
  collection.notes = notes

  saveWishlistCollections(collections)
  closeEditCollectionModal()
  populateWishlistCollectionsSelect()
  populateWishlistCollectionFilter()
  renderWishlist()
  showToast("Wishlist updated")
}

function confirmDeleteCollection() {
  const collectionId = wishlistViewState.activeCollectionId
  if (!collectionId) return

  const collection = getCollectionById(collectionId)
  if (!collection) return

  wishlistDeleteCollectionId = collectionId
  document.getElementById("deleteItemName").textContent = collection.name
  document.getElementById("deleteModal").style.display = "flex"
}

function deleteCollection() {
  if (!wishlistDeleteCollectionId) return

  const collectionId = wishlistDeleteCollectionId

  const collections = loadWishlistCollections().filter(c => c.id !== collectionId)
  const items = loadWishlistItems().map(item => {
    if (item.collectionId === collectionId) {
      return {
        ...item,
        collectionId: ""
      }
    }
    return item
  })

  saveWishlistCollections(collections)
  saveWishlistItems(items)

  wishlistDeleteCollectionId = null
  wishlistViewState.activeCollectionId = ""
  saveWishlistViewState()

  populateWishlistCollectionsSelect()
  populateWishlistCollectionFilter()
  closeDeleteModal()
  renderWishlist()
  showToast("Wishlist deleted")
}

function loadWishlistItems() {
  try {
    const rawItems = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]")
    return Array.isArray(rawItems) ? rawItems.map(normalizeWishlistItem) : []
  } catch (error) {
    console.error("Invalid wishlistItems data in localStorage:", error)
    return []
  }
}

function saveWishlistItems(items) {
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

function populateWishlistCategories() {
  populateWishlistCollectionsSelect()
}

function addItem() {
  const nameInput = document.getElementById("wishlistName")
  const priorityInput = document.getElementById("wishlistPriority")
  const collectionInput = document.getElementById("wishlistCollection")
  const priceInput = document.getElementById("wishlistPrice")
  const linkInput = document.getElementById("wishlistLink")

  const name = nameInput.value.trim()
  const priority = priorityInput.value
  const collectionId = collectionInput.value

  if (!collectionId) {
  showToast("Create a wishlist first")
  closeWishlistModal()
  openCreateCollectionModal()
  return
}
  const price = Number(String(priceInput.value || "").replace(/[^0-9.]/g, "")) || 0
  const link = normalizeWishlistLink(linkInput.value)

  if (!name) {
    showToast("Please enter an item name")
    nameInput.focus()
    return
  }

  const items = loadWishlistItems()

  items.push(normalizeWishlistItem({
    id: String(Date.now()),
    name,
    priority,
    collectionId,
    price,
    link
  }))

  saveWishlistItems(items)
renderWishlist()
closeWishlistModal()
showToast(`${name} added!`)

nameInput.value = ""
priorityInput.value = "low"
collectionInput.selectedIndex = 0
priceInput.value = ""
linkInput.value = ""
}

function updateWishlistStats(items) {
  let highCount = 0
  let veryHighCount = 0
  let highTotal = 0
  let veryHighTotal = 0
  let grandTotal = 0

  items.forEach(item => {
    const price = Number(item.price || 0)
    grandTotal += price

    if (item.priority === "high") {
      highCount++
      highTotal += price
    }

    if (item.priority === "very-high") {
      veryHighCount++
      veryHighTotal += price
    }
  })

  document.getElementById("wishlistTotalCount").textContent = items.length
  document.getElementById("wishlistGrandTotal").textContent = grandTotal.toLocaleString()
  document.getElementById("wishlistHighCount").textContent = highCount
  document.getElementById("wishlistVeryHighCount").textContent = veryHighCount
  document.getElementById("wishlistHighTotal").textContent = highTotal.toLocaleString()
  document.getElementById("wishlistVeryHighTotal").textContent = veryHighTotal.toLocaleString()
}

function saveWishlistSortState() {
  const raw =
    JSON.stringify(
      wishlistSortState
    )

  localStorage.setItem(
    WISHLIST_SORT_KEY,
    raw
  )

  window.savePlanItKeyToCloud?.(
    WISHLIST_SORT_KEY,
    raw
  )
}

function saveWishlistFilterState() {
  const raw =
    JSON.stringify(
      wishlistFilterState
    )

  localStorage.setItem(
    WISHLIST_FILTER_KEY,
    raw
  )

  window.savePlanItKeyToCloud?.(
    WISHLIST_FILTER_KEY,
    raw
  )
}

function setWishlistFilter(key, value) {
  wishlistFilterState[key] = value
  saveWishlistFilterState()
  renderWishlist()
}


function clearWishlistFilters() {
  wishlistFilterState = {
    priority: "all",
    collectionId: "all"
  }

  saveWishlistFilterState()
  renderWishlist()
}

function filterWishlistItems(items) {
  return items.filter(item => {
    const matchesPriority =
      wishlistFilterState.priority === "all" ||
      item.priority === wishlistFilterState.priority

    const matchesCollection =
      wishlistFilterState.collectionId === "all" ||
      item.collectionId === wishlistFilterState.collectionId

    const matchesActiveCollection =
      !wishlistViewState.activeCollectionId ||
      item.collectionId === wishlistViewState.activeCollectionId

    return matchesPriority && matchesCollection && matchesActiveCollection
  })
}

function formatWishlistPrice(value) {
  const num = Number(String(value || "").replace(/[^0-9.]/g, ""))
  if (!num) return ""
  return num.toLocaleString()
}

function formatWishlistPlannedDate(item) {
  if (item.plannedDate) {
    return new Date(item.plannedDate + "T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    })
  }

  return item.plannedMonth || ""
}

function formatWishlistPriority(priority) {
  const labels = {
    low: "Low",
    medium: "Medium",
    high: "High"
  }

  return labels[priority] || "Low"
}

function normalizeWishlistLink(value) {
  let link = String(value || "").trim()

  if (!link) return ""

  if (
    !link.startsWith("http://") &&
    !link.startsWith("https://")
  ) {
    link = "https://" + link
  }

  return link
}

function updateWishlistItem(id, key, value) {
  const items = loadWishlistItems()
  const item = items.find(item => item.id === id)
  if (!item) return

  if (key === "price") {
    item.price = Number(String(value || "").replace(/[^0-9.]/g, "")) || 0
  } else if (key === "name") {
    item.name = String(value || "").trim()
  } else if (key === "link") {
    item.link = normalizeWishlistLink(value)
  } else {
    item[key] = String(value || "").trim()
  }

  saveWishlistItems(items)
  renderWishlist()
}

function updateWishlistItemCollection(id, collectionId) {
  const items = loadWishlistItems()
  const item = items.find(item => item.id === id)
  if (!item) return

  item.collectionId = String(collectionId || "").trim()

  saveWishlistItems(items)
  populateWishlistCollectionsSelect()
  populateWishlistCollectionFilter()
  renderWishlist()
  showToast(item.collectionId ? "Wishlist updated" : "Item is not in a wishlist")
}

function openMoveWishlistItemModal(itemId) {
  const items = loadWishlistItems()
  const item = items.find(x => x.id === itemId)
  if (!item) return

  wishlistMoveItemId = itemId

  const label = document.getElementById("moveWishlistItemLabel")
  const select = document.getElementById("moveWishlistItemCollection")
  const collections = loadWishlistCollections()

  if (label) {
    label.textContent = `Move "${item.name}" to another wishlist`
  }

  if (select) {
    select.innerHTML = collections
      .filter(collection => collection.id !== item.collectionId)
      .map(collection => `
        <option value="${collection.id}">
          ${collection.symbol} ${cap(collection.name)}
        </option>
      `).join("")

    if (!select.innerHTML) {
      select.innerHTML = `<option value="">No other collections available</option>`
    }
  }

  if (moveWishlistItemModal) {
    moveWishlistItemModal.style.display = "flex"
  }
}

function closeMoveWishlistItemModal() {
  wishlistMoveItemId = null
  if (moveWishlistItemModal) {
    moveWishlistItemModal.style.display = "none"
  }
}

function moveWishlistItemToSelectedCollection() {
  if (!wishlistMoveItemId) return

  const select = document.getElementById("moveWishlistItemCollection")
  const nextCollectionId = select ? select.value : ""

  if (!nextCollectionId) {
    showToast("Choose a collection first")
    return
  }

  const items = loadWishlistItems()
  const item = items.find(x => x.id === wishlistMoveItemId)
  if (!item) return

  item.collectionId = nextCollectionId

  saveWishlistItems(items)
  closeMoveWishlistItemModal()
  renderWishlist()
  showToast("Item moved")
}
function toggleWishlistPriority(id) {
  const items = loadWishlistItems()
  const item = items.find(item => item.id === id)
  if (!item) return

  const priorityLevels = ["low", "medium", "high"]
  const currentIndex = priorityLevels.indexOf(item.priority)
  const nextIndex = (currentIndex + 1) % priorityLevels.length

  item.priority = priorityLevels[nextIndex]
  saveWishlistItems(items)

  if (wishlistSortState.column === "priority") {
    clearTimeout(wishlistPrioritySortDelayTimer)
    wishlistPrioritySortDelayTimer = setTimeout(() => {
      renderWishlist()
    }, 4000)

    const pill = document.querySelector(`.wishlist-pill[onclick="toggleWishlistPriority('${id}')"]`)
    if (pill) {
      pill.className = `wishlist-pill ${item.priority}`
      pill.textContent = item.priority.toUpperCase()
    }

    return
  }

  renderWishlist()
}

function getWishlistPriorityRank(priority) {
  const order = {
    low: 1,
    medium: 2,
    high: 3
  }

  return order[priority] || 1
}

function sortWishlistItems(items) {
  if (!Array.isArray(items)) return []

  if (!wishlistSortState || !wishlistSortState.column) {
    return [...items]
  }

  const sorted = [...items]

  sorted.sort((a, b) => {
    let x
    let y

    if (wishlistSortState.column === "price") {
      x = Number(a.price || 0)
      y = Number(b.price || 0)
    } else if (wishlistSortState.column === "priority") {
      x = getWishlistPriorityRank(a.priority)
      y = getWishlistPriorityRank(b.priority)
    } else {
      x = String(a[wishlistSortState.column] || "").toLowerCase()
      y = String(b[wishlistSortState.column] || "").toLowerCase()
    }

    if (x < y) return wishlistSortState.direction === "asc" ? -1 : 1
    if (x > y) return wishlistSortState.direction === "asc" ? 1 : -1
    return 0
  })

  return sorted
}

function setWishlistSort(column) {
  if (wishlistSortState.column === column) {
    wishlistSortState.direction = wishlistSortState.direction === "asc" ? "desc" : "asc"
  } else {
    wishlistSortState.column = column
    wishlistSortState.direction = "asc"
  }

  saveWishlistSortState()
  renderWishlist()
}

function updateWishlistToolbar() {
  const status = document.getElementById("wishlistActiveFilters")
  if (!status) return

  const activeParts = []

  if (wishlistFilterState.priority && wishlistFilterState.priority !== "all") {
    activeParts.push(`Priority: <strong>${formatWishlistPriority(wishlistFilterState.priority)}</strong>`)
  }

  if (wishlistFilterState.collectionId && wishlistFilterState.collectionId !== "all") {
    activeParts.push(`Wishlist: <strong>${cap(getCollectionName(wishlistFilterState.collectionId))}</strong>`)
  }

  activeParts.push(`View: <strong>${cap(wishlistViewState.displayStyle)}</strong>`)

  status.innerHTML = activeParts.length
    ? `Active filters — ${activeParts.join(" • ")}`
    : "Active filters — None"
}

function updateWishlistToolbarVisibility() {
  const tableControls = document.getElementById("wishlistTableControls")
  const collectionControls = document.getElementById("wishlistCollectionControls")
  const activeFilters = document.getElementById("wishlistActiveFilters")
  const wishlistsViewBtn = document.getElementById("wishlistWishlistsViewBtn")
  const tableViewBtn = document.getElementById("wishlistTableViewBtn")

  const isTableMode = wishlistViewState.screenMode === "table"
  const isCollectionMode = wishlistViewState.screenMode === "collections"

  if (tableControls) {
    tableControls.style.display = isTableMode ? "flex" : "none"
  }

  if (collectionControls) {
    collectionControls.style.display = isCollectionMode ? "flex" : "none"
  }

  if (activeFilters) {
    activeFilters.style.display = isTableMode ? "block" : "none"
  }

  if (wishlistsViewBtn) {
    wishlistsViewBtn.classList.toggle("is-active", isCollectionMode)
  }

  if (tableViewBtn) {
    tableViewBtn.classList.toggle("is-active", isTableMode)
  }

  const largeViewBtn = document.getElementById("wishlistLargeViewBtn")
const smallViewBtn = document.getElementById("wishlistSmallViewBtn")
const compactViewBtn = document.getElementById("wishlistCompactViewBtn")

if (largeViewBtn) {
  largeViewBtn.classList.toggle("is-active", wishlistViewState.displayStyle === "large")
}

if (smallViewBtn) {
  smallViewBtn.classList.toggle("is-active", wishlistViewState.displayStyle === "small")
}

if (compactViewBtn) {
  compactViewBtn.classList.toggle("is-active", wishlistViewState.displayStyle === "compact")
}
}

function saveWishlistViewState() {
  const raw =
    JSON.stringify(
      wishlistViewState
    )

  localStorage.setItem(
    WISHLIST_VIEW_KEY,
    raw
  )

  window.savePlanItKeyToCloud?.(
    WISHLIST_VIEW_KEY,
    raw
  )
}

function setWishlistScreenMode(mode) {
  wishlistViewState.screenMode = mode

  if (mode === "table") {
    wishlistViewState.activeCollectionId = ""

    wishlistFilterState.priority = "all"
    wishlistFilterState.collectionId = "all"

    saveWishlistFilterState()
  }

  saveWishlistViewState()
  renderWishlist()
}

function setWishlistDisplayStyle(style) {
  wishlistViewState.displayStyle = style
  saveWishlistViewState()
  renderWishlist()
}

function openWishlistDisplayModal() {
  if (wishlistDisplayModal) wishlistDisplayModal.style.display = "flex"
}

function closeWishlistDisplayModal() {
  if (wishlistDisplayModal) wishlistDisplayModal.style.display = "none"
}

function openCreateCollectionModal() {
  if (wishlistCollectionModal) wishlistCollectionModal.style.display = "flex"
  const nameInput = document.getElementById("wishlistCollectionName")
  if (nameInput) nameInput.focus()
}

function closeCreateCollectionModal() {
  if (wishlistCollectionModal) wishlistCollectionModal.style.display = "none"
}

function openWishlistCollection(collectionId) {
  wishlistViewState.screenMode = "collections"
  wishlistViewState.activeCollectionId = collectionId
  saveWishlistViewState()
  renderWishlist()
}

function backToCollectionsView() {
  wishlistViewState.activeCollectionId = ""
  wishlistViewState.screenMode = "collections"
  saveWishlistViewState()
  renderWishlist()
}

function getWishlistCollectionStats(collection, items) {
  const collectionItems = items.filter(item => item.collectionId === collection.id)
  const total = collectionItems.reduce((sum, item) => sum + Number(item.price || 0), 0)

  return {
    count: collectionItems.length,
    total,
    items: collectionItems
  }
}

function renderWishlistCollections(items) {
  const grid = document.getElementById("wishlistCollectionsGrid")
  const header = document.getElementById("wishlistCollectionsHeader")
  const title = document.getElementById("activeCollectionTitle")
  const notes = document.getElementById("activeCollectionNotes")
  if (!grid) return

  const styleClass = wishlistViewState.displayStyle || "small"

  const collections = loadWishlistCollections()

  grid.className = `wishlist-collections-grid ${styleClass}`

  if (!collections.length) {
    if (header) header.style.display = "none"

    grid.innerHTML = `
      <div class="wishlist-table-empty">
        No collections yet. Create your first Wishlist to start planning.
      </div>
    `
    return
  }

  if (
    wishlistViewState.activeCollectionId &&
    !collections.some(collection => collection.id === wishlistViewState.activeCollectionId)
  ) {
    wishlistViewState.activeCollectionId = ""
    saveWishlistViewState()
  }

  if (!wishlistViewState.activeCollectionId) {
    if (header) header.style.display = "none"

    grid.innerHTML = collections.map(collection => {
      const stats = getWishlistCollectionStats(collection, items)

      return `
        <button
          type="button"
          class="wishlist-collection-card ${styleClass}"
          onclick="openWishlistCollection('${collection.id}')"
        >
          <div class="wishlist-collection-main">
            <div>
              <div class="wishlist-collection-name">${cap(collection.name)}</div>
              <div class="wishlist-collection-meta">
                open wishes ${stats.count}
              </div>
              <div class="wishlist-collection-total">
                total ${formatCurrency(stats.total)}
              </div>
            </div>

            <div class="wishlist-collection-symbol-wrap">
              <span class="wishlist-collection-symbol">${collection.symbol}</span>
            </div>
          </div>
        </button>
      `
    }).join("")

    return
  }

  const activeCollection = collections.find(
    collection => collection.id === wishlistViewState.activeCollectionId
  )
  const activeItems = items.filter(
    item => item.collectionId === wishlistViewState.activeCollectionId
  )

  if (header && activeCollection) {
    header.style.display = "flex"
    title.textContent = `${activeCollection.symbol} ${cap(activeCollection.name)}`
    notes.textContent = activeCollection.notes || "No notes yet."
  }

  if (!activeItems.length) {
    grid.innerHTML = `<div class="wishlist-table-empty">No items in this wishlist yet.</div>`
    return
  }

  grid.innerHTML = activeItems.map(item => {
    const isPlanned =
  item.status === "planned" ||
  !!item.plannedMonth ||
  !!item.plannedDate ||
  !!item.plannerEntryId

    return `
      <div class="wishlist-collection-item-card">
        <div>
          <div class="wishlist-collection-item-name">${item.name}</div>
          <div class="wishlist-collection-item-price">${formatCurrency(item.price)}</div>
          <div style="margin-top:10px;">
            <span class="wishlist-pill ${item.priority}">
              ${formatWishlistPriority(item.priority)}
            </span>
          </div>
        </div>

        <div class="wishlist-collection-item-actions">
        ${item.link ? `<a class="wishlist-link" href="${item.link}" target="_blank" rel="noopener noreferrer">Open Link</a>` : ""}
        <button class="wishlist-add-btn" type="button" onclick="openMoveWishlistItemModal('${item.id}')">
          Move
        </button>
        ${
isPlanned
  ? `<button
  class="wishlist-icon-btn wishlist-change-month-btn"
  type="button"
  data-id="${item.id}"
  onclick="event.preventDefault(); event.stopPropagation(); openWishlistPlannerModal('${item.id}', 'move')"
  title="Edit date"
  aria-label="Edit date"
>
  ✎
</button>`
  : `<button class="wishlist-add-btn" type="button" onclick="openWishlistPlannerModal('${item.id}', 'copy')">Add Date</button>`
        }
        ${
  item.status === "purchased"
    ? `
      <button class="wishlist-owned-btn" onclick="restoreWishlistItem('${item.id}')">
        Restore
      </button>
    `
    : `
      <button class="wishlist-owned-btn" onclick="markWishlistPurchased('${item.id}')">
        Mark as purchased
      </button>
    `
}

<button class="wishlist-delete-btn" onclick="confirmWishlistDelete('${item.id}')">
  🗑
</button>
      </div>
      </div>
    `
  }).join("")
}


  function renderWishlist() {
  const section = document.getElementById("wishlistSection")
  const body = document.getElementById("wishlistTableBody")
  const collectionsSection = document.getElementById("wishlistCollectionsSection")
  if (!section || !body || !collectionsSection) return

const allItems = loadWishlistItems().map(item => ({
  ...item,
  collectionName: getCollectionName(item.collectionId)
}))

const activeWishlistItems = allItems.filter(item => item.status !== "purchased")
const purchasedWishlistItems = allItems.filter(item => item.status === "purchased")

const items = filterWishlistItems(sortWishlistItems(activeWishlistItems))
  const totalCountEl = document.getElementById("wishlistTotalCount")
  const grandTotalEl = document.getElementById("wishlistGrandTotal")
const mediumCountEl = document.getElementById("wishlistMediumCount")
const mediumTotalEl = document.getElementById("wishlistMediumTotal")
  const highCountEl = document.getElementById("wishlistHighCount")
  const highTotalEl = document.getElementById("wishlistHighTotal")
  const priorityFilterEl = document.getElementById("wishlistPriorityFilter")

  if (priorityFilterEl) {
    priorityFilterEl.value = wishlistFilterState.priority || "all"
  }

  populateWishlistCollectionFilter()

  const grandTotal = allItems.reduce((sum, item) => sum + Number(item.price || 0), 0)
  const mediumItems = allItems.filter(item => item.priority === "medium")
  const highItems = allItems.filter(item => item.priority === "high")

  if (totalCountEl) totalCountEl.textContent = allItems.length
  if (grandTotalEl) grandTotalEl.textContent = grandTotal.toLocaleString()
if (mediumCountEl) mediumCountEl.textContent = mediumItems.length
if (mediumTotalEl) {
  mediumTotalEl.textContent = mediumItems.reduce((sum, item) => sum + Number(item.price || 0), 0).toLocaleString()
}
  if (highCountEl) highCountEl.textContent = highItems.length
  if (highTotalEl) {
    highTotalEl.textContent = highItems.reduce((sum, item) => sum + Number(item.price || 0), 0).toLocaleString()
  }

  updateWishlistToolbar()
  updateWishlistToolbarVisibility()

  if (wishlistViewState.screenMode === "table") {
  collectionsSection.style.display = "none"
  section.style.display = "block"
} else {
  collectionsSection.style.display = "block"
  section.style.display = "none"
}

 renderWishlistCollections(allItems)

if (!items.length) {
  body.innerHTML = `<div class="wishlist-table-empty">No wishlist items found.</div>`
  renderPurchasedWishlistItems(purchasedWishlistItems)
  return
}

  body.innerHTML = items.map(item => {
const isPlanned =
  item.status === "planned" ||
  !!item.plannedMonth ||
  !!item.plannedDate ||
  !!item.plannerEntryId
const safeLink = item.link
  ? `
    <div class="wishlist-link-cell">
      <a class="wishlist-link" href="${item.link}" target="_blank" rel="noopener noreferrer">Open</a>
      <button
        class="wishlist-icon-btn"
        type="button"
        onclick="event.preventDefault(); event.stopPropagation(); editWishlistLink('${item.id}')"
        title="Edit link"
        aria-label="Edit link"
      >
        ✎
      </button>
    </div>
  `
  : `
    <button
      class="wishlist-add-btn"
      type="button"
      onclick="editWishlistLink('${item.id}')"
    >
      Add Link
    </button>
  `

    return `
      <div class="wishlist-table-row ${item.status === "purchased" ? "is-purchased" : ""}">
        <div class="wishlist-editable" contenteditable="true" onblur="updateWishlistItem('${item.id}', 'name', this.innerText)">
          ${item.name}
        </div>

        <div class="wishlist-price-cell wishlist-editable" contenteditable="true" onblur="updateWishlistItem('${item.id}', 'price', this.innerText)">
          ₱${formatWishlistPrice(item.price)}
        </div>
<div>
  <span class="wishlist-pill ${item.priority}" onclick="toggleWishlistPriority('${item.id}')" style="cursor:pointer;">
    ${item.priority.replace("-", " ").toUpperCase()}
  </span>
</div>

<div>
  <select
    class="wishlist-inline-collection-select"
    onchange="updateWishlistItemCollection('${item.id}', this.value)"
  >
    ${getCollectionOptionsMarkup(item.collectionId, true)}
  </select>
</div>
<div class="wishlist-planner-cell">
  ${
    isPlanned
      ? `
        <button
          class="wishlist-planner-date-btn"
          type="button"
          data-id="${item.id}"
          onclick="openWishlistPlannerModal('${item.id}', 'move')"
        >
          <span>${formatWishlistPlannedDate(item)}</span>
        </button>
      `
      : `
        <button
          class="wishlist-add-btn wishlist-add-to-planner-btn"
          type="button"
          data-id="${item.id}"
          onclick="openWishlistPlannerModal('${item.id}', 'copy')"
        >
          Add Date
        </button>
      `
  }
</div>

<div class="wishlist-link-column">
  ${safeLink}
</div>

<div class="wishlist-actions-cell">
  <button class="wishlist-owned-btn" type="button" onclick="markWishlistPurchased('${item.id}')">
    Mark as purchased
  </button>
  <button class="wishlist-delete-btn" onclick="confirmWishlistDelete('${item.id}')">🗑</button>
</div>
      </div>
    `
    }).join("")

  renderPurchasedWishlistItems(purchasedWishlistItems)
}
function renderPurchasedWishlistItems(items = []) {
  const list = document.getElementById("purchasedWishlistList")
  if (!list) return

  const sharedPurchased = loadPurchasedItems()
  const wishlistPurchased = items.map(item => ({
    id: item.id,
    wishlistId: item.id,
    name: item.name || "Purchased Item",
    price: Number(item.price || 0),
    source: "wishlist",
    purchasedAt: item.purchasedAt || ""
  }))

  const merged = [...sharedPurchased, ...wishlistPurchased]
    .filter((item, index, arr) => arr.findIndex(x => x.id === item.id) === index)
    .sort((a, b) => new Date(b.purchasedAt || 0) - new Date(a.purchasedAt || 0))

  if (!merged.length) {
    list.innerHTML = `<div class="wishlist-table-empty">No purchased items yet.</div>`
    return
  }

  list.innerHTML = merged.map(item => `
    <div class="purchased-wishlist-item">
      <div>
        <strong>${item.name || "Purchased Item"}</strong>
        <span>₱${Number(item.price || 0).toLocaleString()}</span>
      </div>

      <button class="wishlist-owned-btn" type="button" onclick="restorePurchasedItem('${item.id}', '${item.wishlistId || ""}')">
        Restore
      </button>
    </div>
  `).join("")
}

function openWishlistModal() {
  populateWishlistCollectionsSelect()
  document.getElementById("wishlistModal").style.display = "flex"
  document.getElementById("wishlistName").focus()
}

function closeWishlistModal() {
  document.getElementById("wishlistModal").style.display = "none"
}


function generatePlannerEntryId() {
  return "planner_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8)
}

function convertWishlistToPlannerEntry(item, existingEntryId = "") {
  return {
    id: existingEntryId || generatePlannerEntryId(),
    wishlistId: item.id,
    label: cap(String(item.name || "").trim()),
    amount: Number(item.price || 0),
date: null,
link: item.link || "",
priority: item.priority === "very-high" || item.priority === "high"
      ? "HIGH"
      : item.priority === "medium"
      ? "MEDIUM"
      : "LOW"
  }
}
function findPlannerEntryByWishlistId(data, wishlistId) {
  if (!data || !wishlistId) return null

  for (const [month, entries] of Object.entries(data)) {
    if (!Array.isArray(entries)) continue

    const index = entries.findIndex(entry => {
      return String(entry.wishlistId || "") === String(wishlistId)
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

function getSyncedWishlistItems() {
  const items = loadWishlistItems()
  const d = loadData()
  let changed = false

  const syncedItems = items.map(item => {
    const existingBridge = findPlannerEntryByWishlistId(d, item.id)

    if (existingBridge) {
      const updatedItem = {
        ...item,
        status: "planned",
        plannedMonth: existingBridge.month,
        plannedDate: existingBridge.entry.date || "",
        plannerEntryId: existingBridge.entry.id || ""
      }

      if (
        updatedItem.status !== item.status ||
        updatedItem.plannedMonth !== item.plannedMonth ||
        updatedItem.plannedDate !== item.plannedDate ||
        updatedItem.plannerEntryId !== item.plannerEntryId
      ) {
        changed = true
      }

      return updatedItem
    }

    if (item.status === "planned" || item.plannedMonth || item.plannedDate || item.plannerEntryId) {
      changed = true
      return {
        ...item,
        status: "wishlist",
        plannedMonth: "",
        plannedDate: "",
        plannerEntryId: ""
      }
    }

    return item
  })

  if (changed) {
    saveWishlistItems(syncedItems)
  }

  return syncedItems
}

function syncWishlistPlannerState(items) {
  const d = loadData()
  let changed = false

  const syncedItems = items.map(item => {
    const existingBridge = findPlannerEntryByWishlistId(d, item.id)

    if (existingBridge) {
      const syncedItem = {
        ...item,
        status: "planned",
        plannedMonth: existingBridge.month,
        plannedDate: existingBridge.entry.date || "",
        plannerEntryId: existingBridge.entry.id || item.plannerEntryId || ""
      }

      if (
        syncedItem.status !== item.status ||
        syncedItem.plannedMonth !== item.plannedMonth ||
        syncedItem.plannedDate !== item.plannedDate ||
        syncedItem.plannerEntryId !== item.plannerEntryId
      ) {
        changed = true
      }

      return syncedItem
    }

    if (item.status === "planned" || item.plannedMonth || item.plannedDate || item.plannerEntryId) {
      changed = true
      return {
        ...item,
        status: "wishlist",
        plannedMonth: "",
        plannedDate: "",
        plannerEntryId: ""
      }
    }

    return item
  })

  if (changed) {
    saveWishlistItems(syncedItems)
  }

  return syncedItems
}
function openWishlistPlannerModal(id, action = "copy") {
  wishlistPlannerTargetId = String(id)
  wishlistPlannerAction = action

  const modal = document.getElementById("wishlistPlannerModal")
  const title = document.getElementById("wishlistPlannerModalTitle")
  const description = document.getElementById("wishlistPlannerModalDescription")
  const removeSection = document.getElementById("wishlistPlannerRemoveSection")

  if (!modal) {
    alert("Wishlist planner modal is missing in wishlist.html")
    return
  }

  const items = loadWishlistItems()
  const item = items.find(item => String(item.id) === String(id))

  if (!item) {
    alert("Wishlist item not found")
    return
  }

  // Show modal FIRST so even if calendar has an issue, you still see it
  modal.style.display = "flex"

  let existingBridge = null

  try {
    const d = loadData()
    if (typeof findPlannerEntryByWishlistId === "function") {
      existingBridge = findPlannerEntryByWishlistId(d, String(id))
    }
  } catch (error) {
    console.error("Planner bridge error:", error)
  }

  const isPlanned =
    !!existingBridge ||
    item.status === "planned" ||
    !!item.plannedDate ||
    !!item.plannedMonth ||
    !!item.plannerEntryId

  if (title) title.textContent = isPlanned ? "Change Date" : "Add Date"

  if (description) {
    description.textContent = isPlanned
      ? "Choose a new date, or remove it from planner."
      : "Choose the date where you want to add this wishlist item."
  }

  if (removeSection) {
    removeSection.style.display = isPlanned ? "block" : "none"
  }

  try {
    const currentDate =
      existingBridge?.entry?.date
        ? getLocalDate(existingBridge.entry.date)
        : item.plannedDate
        ? getLocalDate(item.plannedDate)
        : new Date()

    wishlistCalendarMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    )

    renderWishlistPlannerCalendar()
  } catch (error) {
    console.error("Wishlist calendar render error:", error)
  }
}

function closeWishlistPlannerModal() {
  wishlistPlannerTargetId = null
  wishlistPlannerAction = "copy"

  const modal = document.getElementById("wishlistPlannerModal")
  const title = document.getElementById("wishlistPlannerModalTitle")
  const description = document.getElementById("wishlistPlannerModalDescription")
  const removeSection = document.getElementById("wishlistPlannerRemoveSection")

  if (modal) modal.style.display = "none"
  if (title) title.textContent = "Add to Planner"
  if (description) {
    description.textContent = "Choose the month where you want to add this wishlist item."
  }
  if (removeSection) {
    removeSection.style.display = "none"
  }
}

let wishlistCalendarMonth = new Date()

function toDateInputValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getLocalDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`)
}

function renderWishlistPlannerCalendar() {
  const calendar = document.getElementById("wishlistPlannerCalendar")
  if (!calendar) return

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const year = wishlistCalendarMonth.getFullYear()
  const monthIndex = wishlistCalendarMonth.getMonth()
  const firstDay = new Date(year, monthIndex, 1)
  const lastDay = new Date(year, monthIndex + 1, 0)

  const canGoBack =
    year > today.getFullYear() ||
    (year === today.getFullYear() && monthIndex > today.getMonth())

  let days = ""

  for (let i = 0; i < firstDay.getDay(); i++) {
    days += `<div></div>`
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, monthIndex, day)
    date.setHours(0, 0, 0, 0)

    const dateStr = toDateInputValue(date)
    const isPast = date < today

    days += `
      <button
        type="button"
        class="wishlist-date-option ${isPast ? "disabled" : ""}"
        ${isPast ? "disabled" : ""}
        data-date="${dateStr}"
      >
        ${day}
      </button>
    `
  }

  calendar.innerHTML = `
    <div class="wishlist-date-picker-header">
      <button type="button" class="btn btn-secondary" onclick="changeWishlistCalendarMonth(-1)" ${canGoBack ? "" : "disabled"}>
        ‹
      </button>

      <strong>${months[monthIndex]} ${year}</strong>

      <button type="button" class="btn btn-secondary" onclick="changeWishlistCalendarMonth(1)">
        ›
      </button>
    </div>

    <div class="wishlist-date-weekdays">
      <span>Sun</span>
      <span>Mon</span>
      <span>Tue</span>
      <span>Wed</span>
      <span>Thu</span>
      <span>Fri</span>
      <span>Sat</span>
    </div>

    <div class="wishlist-date-grid">
      ${days}
    </div>
  `
}

function changeWishlistCalendarMonth(direction) {
  wishlistCalendarMonth = new Date(
    wishlistCalendarMonth.getFullYear(),
    wishlistCalendarMonth.getMonth() + direction,
    1
  )

  renderWishlistPlannerCalendar()
}

function chooseWishlistPlannerDate(dateStr) {
  if (!wishlistPlannerTargetId) return
  addWishlistItemToPlannerDate(dateStr)
}



function confirmWishlistDelete(id) {
  const items = loadWishlistItems()
  const item = items.find(item => item.id === id)
  if (!item) return

  wishlistDeleteId = id
  document.getElementById("deleteItemName").textContent = item.name
  document.getElementById("deleteModal").style.display = "flex"
}

function closeDeleteModal() {
  const modal = document.getElementById("deleteModal")
  if (modal) {
    modal.style.display = "none"
  }

  wishlistDeleteId = null
  plannerDeleteTarget = null
}
function markWishlistPurchased(id) {
  const items = loadWishlistItems()
  const item = items.find(item => item.id === id)
  if (!item) return

  item.status = "purchased"
  item.purchasedAt = new Date().toISOString()

  addPurchasedItem({
    id: item.id,
    wishlistId: item.id,
    name: item.name,
    price: item.price,
    source: "wishlist",
    purchasedAt: item.purchasedAt
  })

  saveWishlistItems(items)
  renderWishlist()
  showToast(`${item.name || "Item"} moved to Purchased Items`)
}

function restoreWishlistItem(id) {
  const items = loadWishlistItems()
  const item = items.find(item => item.id === id)

  removePurchasedItem(id)

  if (item) {
    item.status = "wishlist"
    item.purchasedAt = ""
    saveWishlistItems(items)
  }

  renderWishlist()
  showToast(`${item?.name || "Item"} restored`)
}

function restorePurchasedItem(id, wishlistId = "") {
  restoreWishlistItem(wishlistId || id)
}

function deleteItem() {
  if (wishlistDeleteCollectionId) {
    deleteCollection()
    return
  }

  if (wishlistDeleteId) {
    const items = loadWishlistItems()
    const itemToDelete = items.find(item => item.id === wishlistDeleteId)
    const updatedItems = items.filter(item => item.id !== wishlistDeleteId)

    saveWishlistItems(updatedItems)
    renderWishlist()
    closeDeleteModal()
    showToast(`${itemToDelete?.name || "Item"} deleted!`)
    return
  }

  if (plannerDeleteTarget) {
    const { month, index } = plannerDeleteTarget
    const d = loadData()
    const item = d[month] && d[month][index]
    if (!item) {
      closeDeleteModal()
      return
    }

    const removedItem = d[month][index]
    d[month].splice(index, 1)
    saveData(d)

    if (removedItem.wishlistId) {
      const wishlistItems = loadWishlistItems()
      const wishlistItem = wishlistItems.find(x => x.id === removedItem.wishlistId)

      if (wishlistItem) {
        wishlistItem.status = "wishlist"
        wishlistItem.plannedMonth = ""
        wishlistItem.plannerEntryId = ""
        saveWishlistItems(wishlistItems)
      }
    }

    safeRenderPlanner()

if (document.getElementById("wishlistTableBody")) {
  populateWishlistCategories()
  renderWishlist()
}
    renderWishlist()
    closeDeleteModal()
    showToast(`Removed "${removedItem.label || "item"}" from planner`)
  }
}

document.getElementById("wishlistModal").addEventListener("click", function(e) {
  if (e.target === this) {
    closeWishlistModal()
  }
})

document.addEventListener("DOMContentLoaded", () => {
  safeRenderPlanner()

  if (document.getElementById("wishlistTableBody")) {
    populateWishlistCategories()
    renderWishlist()
  }
})
function addWishlistItemToPlannerDate(dateStr) {
  const targetId = wishlistPlannerTargetId
  if (!targetId || !dateStr) return

  const selectedDate = getLocalDate(dateStr)
  const month = months[selectedDate.getMonth()]

  const items = loadWishlistItems()
  const item = items.find(item => String(item.id) === String(targetId))
  if (!item) return

  const data = loadData()
  if (!data[month]) data[month] = []

  const existingBridge = findPlannerEntryByWishlistId(data, item.id)

  if (existingBridge) {
    const oldMonth = existingBridge.month
    const oldIndex = existingBridge.index
    const existingEntry = data[oldMonth][oldIndex]

    const updatedEntry = {
      ...existingEntry,
      id: existingEntry.id || item.plannerEntryId || generatePlannerEntryId(),
      wishlistId: item.id,
      label: existingEntry.label || cap(item.name),
      amount: Number(existingEntry.amount || item.price || 0),
      link: existingEntry.link || item.link || "",
      date: dateStr
    }

    data[oldMonth].splice(oldIndex, 1)
    data[month].push(updatedEntry)

    item.status = "planned"
    item.plannedMonth = month
    item.plannedDate = dateStr
    item.plannerEntryId = updatedEntry.id

    saveData(data)
    saveWishlistItems(items)
    closeWishlistPlannerModal()
    safeRenderPlanner()
    renderWishlist()
    showToast(`Moved "${item.name}" to ${dateStr}`)
    return
  }

  const newEntry = convertWishlistToPlannerEntry(item)
  newEntry.date = dateStr

  data[month].push(newEntry)

  item.status = "planned"
  item.plannedMonth = month
  item.plannedDate = dateStr
  item.plannerEntryId = newEntry.id

  saveData(data)
  saveWishlistItems(items)
  closeWishlistPlannerModal()
  safeRenderPlanner()
  renderWishlist()
  showToast(`Added "${item.name}" to ${dateStr}`)
}
function removeWishlistItemFromPlanner(id) {
  const items = loadWishlistItems()
  const item = items.find(item => item.id === id)
  if (!item) return

  const d = loadData()

  months.forEach(month => {
    if (!Array.isArray(d[month])) return

    d[month] = d[month].filter(entry => {
      return entry.wishlistId !== id && entry.id !== item.plannerEntryId
    })
  })

  item.status = "wishlist"
  item.plannedMonth = ""
  item.plannedDate = ""
  item.plannerEntryId = ""

  saveData(d)
  saveWishlistItems(items)

  closeWishlistPlannerModal()
  safeRenderPlanner()
  renderWishlist()

  showToast(`Removed "${item.name}" from planner`)
}

function removeWishlistItemFromPlannerInModal() {
  if (!wishlistPlannerTargetId) return
  removeWishlistItemFromPlanner(wishlistPlannerTargetId)
}



document.getElementById("deleteModal").addEventListener("click", function(e) {
  if (e.target === this) {
    closeDeleteModal()
  }
})

const wishlistPlannerModalEl = document.getElementById("wishlistPlannerModal")

if (wishlistPlannerModalEl) {
  wishlistPlannerModalEl.addEventListener("click", function(e) {
    const dateBtn = e.target.closest(".wishlist-date-option")

    if (dateBtn && !dateBtn.disabled) {
      e.preventDefault()
      e.stopPropagation()

      const date = dateBtn.dataset.date
      if (date) addWishlistItemToPlannerDate(date)

      return
    }

    if (e.target === wishlistPlannerModalEl) {
      closeWishlistPlannerModal()
    }
  })
}


if (wishlistModal) {
  wishlistModal.addEventListener("click", function(e) {
    if (e.target === this) {
      closeWishlistModal()
    }
  })
}
document.addEventListener("click", function(e) {
  const plannerBtn = e.target.closest(
    ".wishlist-planner-date-btn, .wishlist-change-month-btn, .wishlist-add-to-planner-btn"
  )

  if (!plannerBtn) return

  e.preventDefault()
  e.stopPropagation()

  const id = plannerBtn.dataset.id
  if (!id) {
    alert("No wishlist item ID found on this button")
    return
  }

  const action =
    plannerBtn.classList.contains("wishlist-add-to-planner-btn")
      ? "copy"
      : "move"

  openWishlistPlannerModal(id, action)
})

const wishlistPlannerModal = document.getElementById("wishlistPlannerModal")

if (wishlistPlannerModal) {
  wishlistPlannerModal.addEventListener("click", function(e) {
    if (e.target === this) {
      closeWishlistPlannerModal()
    }
  })

  wishlistPlannerModal.addEventListener("mousedown", function(e) {
    if (e.target === this) {
      e.preventDefault()
    }
  })
}

if (wishlistCollectionModal) {
  wishlistCollectionModal.addEventListener("click", function(e) {
    if (e.target === this) {
      closeCreateCollectionModal()
    }
  })
}

if (wishlistDisplayModal) {
  wishlistDisplayModal.addEventListener("click", function(e) {
    if (e.target === this) {
      closeWishlistDisplayModal()
    }
  })
}

if (editWishlistCollectionModal) {
  editWishlistCollectionModal.addEventListener("click", function(e) {
    if (e.target === this) {
      closeEditCollectionModal()
    }
  })
}

if (moveWishlistItemModal) {
  moveWishlistItemModal.addEventListener("click", function(e) {
    if (e.target === this) {
      closeMoveWishlistItemModal()
    }
  })
}

function initWishlistPage() {
  renderWishlistPlannerMonthButtons()
  migrateLegacyWishlistData()
  populateWishlistCollectionsSelect()
  populateWishlistCollectionFilter()
  renderWishlist()
}

initWishlistPage()

window.reloadPlanItWishlistFromStorage =
  function() {
    const sortFallback = {
      column: null,
      direction: "asc"
    }

    const filterFallback = {
      priority: "all",
      collectionId: "all"
    }

    const viewFallback = {
      screenMode: "collections",
      displayStyle: "small",
      activeCollectionId: ""
    }

    try {
      const stored =
        JSON.parse(
          localStorage.getItem(
            WISHLIST_SORT_KEY
          ) || "null"
        )

      wishlistSortState =
        stored &&
        typeof stored === "object"
          ? {
              ...sortFallback,
              ...stored
            }
          : sortFallback
    } catch {
      wishlistSortState =
        sortFallback
    }

    try {
      const stored =
        JSON.parse(
          localStorage.getItem(
            WISHLIST_FILTER_KEY
          ) || "null"
        )

      wishlistFilterState =
        stored &&
        typeof stored === "object"
          ? {
              ...filterFallback,
              ...stored
            }
          : filterFallback
    } catch {
      wishlistFilterState =
        filterFallback
    }

    try {
      const stored =
        JSON.parse(
          localStorage.getItem(
            WISHLIST_VIEW_KEY
          ) || "null"
        )

      wishlistViewState =
        stored &&
        typeof stored === "object"
          ? {
              ...viewFallback,
              ...stored
            }
          : viewFallback
    } catch {
      wishlistViewState =
        viewFallback
    }

    initWishlistPage()
  }