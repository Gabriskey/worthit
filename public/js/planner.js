const summary=document.getElementById("summary")
const monthChecks=document.getElementById("monthChecks")
const planner = document.getElementById("planner")
const globalAdd = document.getElementById("globalAdd")
const modalBackdrop = document.getElementById("modalBackdrop")
const gLabel = document.getElementById("gLabel")
const gAmount = document.getElementById("gAmount")

const sortState={}
let selectedCell=null
let collapsed=JSON.parse(localStorage.getItem("collapsedMonths")||"{}")
let mode="select"
const totalAnimationMap = new WeakMap()

let plannerDateTarget = null
let plannerCalendarMonth = new Date()

let plannerLinkTarget = null
let editingPayoffId = ""
let plannerPurchaseTarget = null
let plannerPurchaseContext = null
let plannerPurchaseStep = "choice"
let plannerPurchaseSelectedRecordId = ""
let plannerPurchaseSubmitting = false

function normalizePlannerLink(value) {
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

function formatPlannerDueDate(dateStr) {
  if (!dateStr) return "Add Date"

  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  })
}

function toDateInputValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function saveCollapsed(){
  const raw =
    JSON.stringify(collapsed)

  localStorage.setItem(
    "collapsedMonths",
    raw
  )

  window.savePlanItKeyToCloud?.(
    "collapsedMonths",
    raw
  )
}


function getDueStatus(dateStr){
  if(!dateStr) return ""

  const today = new Date()
  today.setHours(0,0,0,0)

  const due = new Date(dateStr)
  due.setHours(0,0,0,0)

  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24))

  if(diffDays < 0) return "due-overdue"
  if(diffDays <= 7) return "due-soon"
  return ""
}


function toggleGlobal(force){
  const isOpen = globalAdd.style.display === "block"
  const shouldOpen = typeof force === "boolean" ? force : !isOpen

  globalAdd.style.display = shouldOpen ? "block" : "none"
  modalBackdrop.style.display = shouldOpen ? "block" : "none"

  if(shouldOpen){
    clearGlobalFormState()
    setTimeout(()=>gLabel.focus(), 0)
  }else{
    clearGlobalFormState()
  }
}


function sortMonth(month, field) {
  const d = loadData();
  if (!d[month]) return;

  const dir = sortState[month]?.[field] === "asc" ? "desc" : "asc";
  sortState[month] = { [field]: dir };

  d[month].sort((a, b) => {
    let x = a[field] || "";
    let y = b[field] || "";

    if (field === "amount") {
      x = Number(x);
      y = Number(y);
    }

    if (field === "date") {
      x = x || "";
      y = y || "";
    }

    if (field === "priority") {
      const priorityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 }
      x = priorityOrder[x] || 0
      y = priorityOrder[y] || 0
    }

    if (typeof x === "string") x = x.toLowerCase()
    if (typeof y === "string") y = y.toLowerCase()

    if (x < y) return dir === "asc" ? -1 : 1;
    if (x > y) return dir === "asc" ? 1 : -1;
    return 0;
  });

  saveData(d);
  render();
}


function handleSelect(td){
  if(selectedCell){
    selectedCell.classList.remove("selected","editing")
    selectedCell.contentEditable=false
  }
  mode="select"
  selectedCell=td
  td.classList.add("selected")
  td.focus()
}

function enableEdit(td){
  handleSelect(td)
  mode="edit"
  td.classList.add("editing")
  td.contentEditable=true
  td.focus()
}

/* ✅ EXCEL-LIKE NAVIGATION */
document.addEventListener("keydown",e=>{
  if(!selectedCell||mode!=="select") return

  const tr=selectedCell.parentElement
  const row=[...tr.querySelectorAll("td[tabindex]")]
  const rowIndex=row.indexOf(selectedCell)

  const tbody=tr.parentElement
  const rows=[...tbody.children]
  const trIndex=rows.indexOf(tr)

  if(e.key==="ArrowRight" && row[rowIndex+1]){
    handleSelect(row[rowIndex+1]);e.preventDefault()
  }
  if(e.key==="ArrowLeft" && row[rowIndex-1]){
    handleSelect(row[rowIndex-1]);e.preventDefault()
  }
  if(e.key==="ArrowDown" && rows[trIndex+1]){
    const next=[...rows[trIndex+1].querySelectorAll("td[tabindex]")]
    if(next[rowIndex]) handleSelect(next[rowIndex])
    e.preventDefault()
  }
  if(e.key==="ArrowUp" && rows[trIndex-1]){
    const prev=[...rows[trIndex-1].querySelectorAll("td[tabindex]")]
    if(prev[rowIndex]) handleSelect(prev[rowIndex])
    e.preventDefault()
  }

  if(e.key==="Enter"){
    enableEdit(selectedCell)
    e.preventDefault()
  }
})

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && globalAdd && globalAdd.style.display === "block") {
    toggleGlobal(false)
  }
})

function render(){
  if (!planner || !summary) return

  const d = loadData()
  planner.innerHTML = ""
  summary.innerHTML = ""

  let grandLow=0
  let grandMed=0
  let grandHigh=0
  let grandTotal=0

 const currentMonthIndex = new Date().getMonth()
 const visibleMonths = months.filter((month, index) => {
  return index >= currentMonthIndex || (Array.isArray(d[month]) && d[month].length > 0)
 })

visibleMonths.forEach(m=>{
  const entries = d[m] || []

  let low=0,med=0,high=0,total=0

  entries.forEach(e=>{
    const a=Number(e.amount||0)
    total+=a
    if(e.priority==="HIGH") high+=a
    else if(e.priority==="MEDIUM") med+=a
    else low+=a
  })

  grandLow += low
  grandMed += med
  grandHigh += high
  grandTotal += total

  let rows=""

  if(!entries.length){
    rows = `
      <tr>
        <td colspan="6" class="empty-month-cell">No expenses yet</td>
      </tr>
    `
  } else {
    entries.forEach((e,i)=>{
const p=e.priority||"LOW"
const dueStatus = getDueStatus(e.date)
const linkedWishlistItem = findWishlistItemByPlannerEntry(e)

if (linkedWishlistItem && linkedWishlistItem.link && !e.link) {
  e.link = linkedWishlistItem.link
}

const safeLink = e.link
  ? `
    <div class="wishlist-link-cell">
      <a
        class="wishlist-link"
        href="${e.link}"
        target="_blank"
        rel="noopener noreferrer"
        onclick="event.stopPropagation()"
      >
        Open
      </a>

      <button
        class="wishlist-icon-btn"
        type="button"
        onclick="event.preventDefault(); event.stopPropagation(); editPlannerLink('${m}', ${i})"
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
      onclick="event.preventDefault(); event.stopPropagation(); editPlannerLink('${m}', ${i})"
    >
      Add Link
    </button>
  `
  
rows+=`
<tr class="${dueStatus}">
<td tabindex="0" onclick="handleSelect(this)" ondblclick="enableEdit(this)"
onblur="updateField('${m}',${i},'label',this.textContent)">${e.label||""}</td>

<td class="amount-cell" tabindex="0" onclick="handleSelect(this)" ondblclick="enableEdit(this)"
onblur="updateField('${m}',${i},'amount',this.textContent)">${e.amount||""}</td>
<td tabindex="0" class="priority-cell priority-${p}"
onclick="cyclePriority('${m}',${i})">${p}</td>

<td tabindex="0" class="planner-due-cell" onclick="openPlannerDateModal('${m}', ${i})">
  ${e.date
  ? `<span>${formatPlannerDueDate(e.date)}</span>`
  : `<button class="planner-due-add-btn" type="button">Add Date</button>`
}
</td>

<td class="planner-link-cell">
  ${safeLink}
</td>

<td class="remove-cell planner-actions-cell">
  <button class="wishlist-owned-btn" type="button" onclick="markPlannerPurchased('${m}', ${i})">
    Mark as purchased
  </button>
  <span class="remove-btn" onclick="removeExpense('${m}',${i})">✕</span>
</td>
</tr>`
    })
  }

    planner.innerHTML+=`
<div class="month ${collapsed[m]?"collapsed":""}" id="month-${m}">
<h2 onclick="
  collapsed['${m}'] = !collapsed['${m}'];
  saveCollapsed();
  render();
">
<span>${m.toUpperCase()} <span class="total">${formatCurrency(total)}</span></span></h2>

<div class="side-totals">
   <span class="high">HIGH <strong data-value="${high}">₱0</strong></span>
  <span class="med">MED <strong data-value="${med}">₱0</strong></span>
  <span class="low">LOW <strong data-value="${low}">₱0</strong></span>
</div>

<div class="table-wrapper">
<table>
<thead>
<tr>
<th class="label" onclick="sortMonth('${m}','label')">Label</th>
<th class="amount" onclick="sortMonth('${m}','amount')">Amount</th>
<th class="priority" onclick="sortMonth('${m}','priority')">Priority</th>
<th class="due" onclick="sortMonth('${m}','date')">Due</th>
<th class="link">Link</th>
<th class="actions">Actions</th>
</tr>
</thead>
<tbody>${rows}</tbody>
</table>
</div>

<button class="add-month" onclick="addMonth('${m}')">+ Add</button>
</div>`
  })

    summary.innerHTML = `
  <div class="summary-card total">
    <span class="label">TOTAL PLANNED</span>
    <div class="value">${formatCurrency(grandTotal)}</div>
  </div>

  <div class="summary-card high">
    <span class="label">HIGH PRIORITY</span>
    <div class="value">${formatCurrency(grandHigh)}</div>
  </div>

  <div class="summary-card med">
    <span class="label">MEDIUM PRIORITY</span>
    <div class="value">${formatCurrency(grandMed)}</div>
  </div>

  <div class="summary-card low">
    <span class="label">LOW PRIORITY</span>
    <div class="value">${formatCurrency(grandLow)}</div>
  </div>
`

    requestAnimationFrame(runTotalsAnimation)
}
function updateField(m, i, f, v) {
  const d = loadData()
  if (!d[m] || !d[m][i]) return

  if (f === "amount") {
    const n = parseFloat(String(v).replace(/[^\d.-]/g, ""))

    if (isNaN(n) || n <= 0) {
      showToast("Amount must be greater than 0.")
      render()
      return
    }

    d[m][i].amount = n
  } else if (f === "label") {
    d[m][i][f] = cap(v.trim())
  } else if (f === "date") {
    const newDate = String(v || "").trim()
    d[m][i].date = newDate

    if (newDate) {
      const monthIndex = new Date(newDate + "T00:00:00").getMonth()
      const targetMonth = months[monthIndex]

      if (targetMonth && targetMonth !== m) {
        const movedItem = d[m].splice(i, 1)[0]
        if (!d[targetMonth]) d[targetMonth] = []
        d[targetMonth].push(movedItem)

saveData(d)
syncWishlistDateFromPlannerEntry(movedItem, targetMonth)
render()
showToast(`Moved "${movedItem.label || "item"}" to ${targetMonth}`)
return
      }
    }
  } else {
    d[m][i][f] = String(v).trim()
  }

saveData(d)

if (f === "date" && d[m] && d[m][i]) {
  syncWishlistDateFromPlannerEntry(d[m][i], m)
}

render()
}

function cyclePriority(m,i){
  const d=loadData()
  const o=["LOW","MEDIUM","HIGH"]
  const c=d[m][i].priority||"LOW"
  d[m][i].priority=o[(o.indexOf(c)+1)%3]
  saveData(d)
  render()
}


function addMonth(m){
  const d=loadData()
  if(!d[m]) d[m]=[]
d[m].push({label:"",amount:0,date:null,link:"",priority:"LOW"})
  saveData(d)
  render()
}

function addCurrentMonthExpense() {
  const currentMonth = months[new Date().getMonth()]
  addMonth(currentMonth)

  setTimeout(() => {
    const monthCard = document.getElementById(`month-${currentMonth}`)
    if (monthCard) {
      monthCard.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, 100)
}

function addGlobal(){
  const labelInput = document.getElementById("gLabel")
  const amountInput = document.getElementById("gAmount")

  const l = cap(labelInput.value.trim())
  const a = parseFloat(amountInput.value)
  const s = [...monthChecks.querySelectorAll("input:checked")].map(c => c.value)

  labelInput.classList.remove("invalid")
  amountInput.classList.remove("invalid")
  monthChecks.classList.remove("invalid")

  let hasError = false

  if(!l){
    labelInput.classList.add("invalid")
    hasError = true
  }

  if(isNaN(a) || a <= 0){
    amountInput.classList.add("invalid")
    hasError = true
  }

  if(!s.length){
    monthChecks.classList.add("invalid")
    hasError = true
  }

  if(hasError){
    showToast(
      a <= 0
        ? "Amount must be greater than 0."
        : "Please enter a label, amount, and select at least one month"
    )
    return
  }

  const d=loadData()
  s.forEach(m=>{
    if(!d[m]) d[m]=[]
    d[m].push({label:l,amount:a,date:null,link:"",priority:"LOW"})
  })

  saveData(d)
  labelInput.value=""
  amountInput.value=""
  monthChecks.querySelectorAll("input").forEach(c=>c.checked=false)

  toggleGlobal()
  render()
  showToast(`Added "${l}" to ${s.length} month${s.length > 1 ? "s" : ""}`)
}

function addMonthly() {
  const labelInput = document.getElementById("gLabel")
  const amountInput = document.getElementById("gAmount")
  const dayInput = document.getElementById("gDay")
  const installmentTotalInput = document.getElementById("gInstallmentTotal")

  const label = cap(labelInput.value.trim())
  const amount = parseFloat(amountInput.value)
  const day = parseInt(dayInput.value)
  const installmentTotal = Number(installmentTotalInput?.value || 0)

  const selectedMonths = [...monthChecks.querySelectorAll("input:checked")]
    .map(c => c.value)

  // reset validation
  labelInput.classList.remove("invalid")
  amountInput.classList.remove("invalid")
  dayInput.classList.remove("invalid")
  monthChecks.classList.remove("invalid")

  let hasError = false

  if (!label) {
    labelInput.classList.add("invalid")
    hasError = true
  }

  if (isNaN(amount) || amount <= 0) {
    amountInput.classList.add("invalid")
    hasError = true
  }

  if (!day || day < 1 || day > 31) {
    dayInput.classList.add("invalid")
    hasError = true
  }

  if (!selectedMonths.length) {
    monthChecks.classList.add("invalid")
    hasError = true
  }

  if (hasError) {
    showToast(
      amount <= 0
        ? "Amount must be greater than 0."
        : "Please fill all fields correctly"
    )
    return
  }

  const data = loadData()

  selectedMonths.forEach(month => {
    if (!data[month]) data[month] = []

    // create date string YYYY-MM-DD
    const year = new Date().getFullYear()
    const monthIndex = months.indexOf(month) + 1
    const formattedMonth = String(monthIndex).padStart(2, "0")
    const formattedDay = String(day).padStart(2, "0")

    const dateStr = `${year}-${formattedMonth}-${formattedDay}`

data[month].push({
  label: label,
  amount: amount,
  date: dateStr,
  link: "",
  priority: "LOW",
  recurring: true,
  installmentTotal: installmentTotal
})
  })

  saveData(data)

  // clear inputs
labelInput.value = ""
amountInput.value = ""
dayInput.value = ""
if (installmentTotalInput) installmentTotalInput.value = ""
monthChecks.querySelectorAll("input").forEach(c => c.checked = false)

  toggleGlobal(false)
  render()

  showToast(`Added recurring "${label}"`)
}
function escapePlannerPurchaseHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function getPlannerPurchaseTarget() {
  if (!plannerPurchaseTarget) return null

  const data = loadData()
  const entries = data[plannerPurchaseTarget.month]

  if (!Array.isArray(entries)) return null

  const index = plannerPurchaseTarget.itemId
    ? entries.findIndex(item => String(item?.id) === plannerPurchaseTarget.itemId)
    : plannerPurchaseTarget.index
  const item = entries[index]

  if (!item) return null

  return {
    data,
    month: plannerPurchaseTarget.month,
    index,
    item
  }
}

function plannerPurchaseSummary(item, month) {
  const due = item.date ? formatPlannerDueDate(item.date) : month

  return `
    <div class="planner-purchase-summary">
      <strong>${escapePlannerPurchaseHtml(item.label || "Planner item")}</strong>
      <span>Planned: ${formatCurrency(Number(item.amount || 0))}</span>
      <span>${escapePlannerPurchaseHtml(due)}</span>
    </div>
  `
}

function closePlannerPurchaseModal(force = false) {
  if (plannerPurchaseSubmitting && !force) return

  const modal = document.getElementById("plannerPurchaseModal")
  if (modal) modal.style.display = "none"

  plannerPurchaseTarget = null
  plannerPurchaseContext = null
  plannerPurchaseStep = "choice"
  plannerPurchaseSelectedRecordId = ""
  plannerPurchaseSubmitting = false
}

function setPlannerPurchaseSubmitting(isSubmitting) {
  plannerPurchaseSubmitting = isSubmitting

  document
    .querySelectorAll("#plannerPurchaseModal button")
    .forEach(button => {
      button.disabled = isSubmitting
    })
}

function renderPlannerPurchaseModal() {
  const modal = document.getElementById("plannerPurchaseModal")
  const content = document.getElementById("plannerPurchaseModalContent")
  const target = getPlannerPurchaseTarget()

  if (!modal || !content || !target) {
    closePlannerPurchaseModal()
    return
  }

  const { item, month } = target
  const summary = plannerPurchaseSummary(item, month)

  if (plannerPurchaseStep === "choice") {
    content.innerHTML = `
      <h3>Complete Purchase</h3>
      ${summary}
      <p class="planner-purchase-description">Choose how to record this completed purchase.</p>
      <div class="planner-purchase-choice-actions">
        <button class="btn btn-primary" type="button" onclick="openPlannerPurchaseAddToSpending()">Add to Spending</button>
        <button class="btn btn-secondary" type="button" onclick="openPlannerPurchaseLinkExisting()">Link Existing Spending</button>
      </div>
      <div class="planner-purchase-footer">
        <button class="btn btn-secondary" type="button" onclick="closePlannerPurchaseModal()">Cancel</button>
      </div>
    `
    return
  }

  if (plannerPurchaseStep === "loading") {
    content.innerHTML = `
      <h3>Complete Purchase</h3>
      ${summary}
      <p class="planner-purchase-description">Loading current Spending data...</p>
      <div class="planner-purchase-footer">
        <button class="btn btn-secondary" type="button" onclick="closePlannerPurchaseModal()">Cancel</button>
      </div>
    `
    return
  }

  if (plannerPurchaseStep === "add") {
    const accounts = plannerPurchaseContext?.accounts || []
    const categories = window.WorthItSpendItCategories || []

    if (!accounts.length) {
      content.innerHTML = `
        <h3>Add to Spending</h3>
        ${summary}
        <p class="planner-purchase-description">Create a Spending account first, then return here to complete this purchase.</p>
        <div class="planner-purchase-footer">
          <button class="btn btn-secondary" type="button" onclick="openPlannerPurchaseChoice()">Back</button>
          <button class="btn btn-secondary" type="button" onclick="closePlannerPurchaseModal()">Cancel</button>
        </div>
      `
      return
    }

    content.innerHTML = `
      <h3>Add to Spending</h3>
      ${summary}
      <div class="form-group">
        <label class="payoff-form-label" for="plannerPurchaseAccount">Account</label>
        <select id="plannerPurchaseAccount">
          ${accounts.map(account => `<option value="${escapePlannerPurchaseHtml(account.id)}">${escapePlannerPurchaseHtml(account.name || "Account")} &middot; ${escapePlannerPurchaseHtml(account.type || "")}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label class="payoff-form-label" for="plannerPurchaseName">Name</label>
        <input id="plannerPurchaseName" value="${escapePlannerPurchaseHtml(item.label || "")}">
      </div>
      <div class="form-group">
        <label class="payoff-form-label" for="plannerPurchaseAmount">Amount</label>
        <input id="plannerPurchaseAmount" type="number" min="0.01" step="0.01" value="${Number(item.amount || 0)}">
      </div>
      <div class="form-group">
        <label class="payoff-form-label" for="plannerPurchaseDate">Date</label>
        <input id="plannerPurchaseDate" type="date" value="${toDateInputValue(new Date())}">
      </div>
      <div class="form-group">
        <label class="payoff-form-label" for="plannerPurchaseTime">Time</label>
        <input id="plannerPurchaseTime" type="time" value="${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}">
      </div>
      <div class="form-group">
        <label class="payoff-form-label" for="plannerPurchaseCategory">Category</label>
        <select id="plannerPurchaseCategory" onchange="updatePlannerPurchaseSubcategories()">
          <option value="">Choose a category</option>
          ${categories.filter(category => category.name !== "Income").map(category => `<option value="${escapePlannerPurchaseHtml(category.name)}">${escapePlannerPurchaseHtml(category.name)}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label class="payoff-form-label" for="plannerPurchaseSubcategory">Subcategory</label>
        <select id="plannerPurchaseSubcategory" disabled>
          <option value="">Choose a category first</option>
        </select>
      </div>
      <div class="form-group">
        <label class="payoff-form-label" for="plannerPurchaseNotes">Notes</label>
        <input id="plannerPurchaseNotes" placeholder="Optional notes">
      </div>
      <div class="planner-purchase-footer">
        <button class="btn btn-secondary" type="button" onclick="openPlannerPurchaseChoice()">Back</button>
        <button class="btn btn-secondary" type="button" onclick="closePlannerPurchaseModal()">Cancel</button>
        <button id="plannerPurchaseSubmit" class="btn btn-primary" type="button" onclick="savePlannerPurchaseExpense()">Add Expense & Complete Purchase</button>
      </div>
    `
    return
  }

  const expenses = plannerPurchaseContext?.eligibleExpenses || []
  const accountsById = new Map(
    (plannerPurchaseContext?.accounts || []).map(account => [String(account.id), account])
  )

  content.innerHTML = `
    <h3>Link Existing Spending</h3>
    ${summary}
    <p class="planner-purchase-description">Choose one existing normal expense. Its amount will not be changed.</p>
    <div class="planner-purchase-record-list">
      ${expenses.length ? expenses.map(record => {
        const account = accountsById.get(String(record.accountId || ""))
        const selected = String(record.id) === plannerPurchaseSelectedRecordId
        const detail = [record.category, record.subcategory].filter(Boolean).join(" / ")

        return `
          <button class="planner-purchase-record${selected ? " selected" : ""}" type="button" onclick="selectPlannerPurchaseExpense('${escapePlannerPurchaseHtml(record.id)}')">
            <span>${escapePlannerPurchaseHtml(formatPlannerDueDate(record.date))} &middot; ${escapePlannerPurchaseHtml(account?.name || "Unavailable account")}</span>
            <strong>${escapePlannerPurchaseHtml(record.description || record.category || "Expense")} &middot; ${formatCurrency(Number(record.amount || 0))}</strong>
            <small>${escapePlannerPurchaseHtml(detail)}</small>
          </button>
        `
      }).join("") : `<div class="wishlist-table-empty">No eligible Spending expenses are available.</div>`}
    </div>
    <div class="planner-purchase-footer">
      <button class="btn btn-secondary" type="button" onclick="openPlannerPurchaseChoice()">Back</button>
      <button class="btn btn-secondary" type="button" onclick="closePlannerPurchaseModal()">Cancel</button>
      <button id="plannerPurchaseLinkSubmit" class="btn btn-primary" type="button" onclick="linkExistingPlannerPurchaseExpense()" ${plannerPurchaseSelectedRecordId ? "" : "disabled"}>Link & Complete Purchase</button>
    </div>
  `
}

function openPlannerPurchaseChoice() {
  if (plannerPurchaseSubmitting) return

  plannerPurchaseStep = "choice"
  plannerPurchaseContext = null
  plannerPurchaseSelectedRecordId = ""
  renderPlannerPurchaseModal()
}

async function loadPlannerPurchaseContext(step) {
  if (!window.PlannerSpendItPurchase) {
    await window.WorthItModal.notice("The Spending purchase service is still loading. Please try again.")
    return
  }

  plannerPurchaseStep = "loading"
  renderPlannerPurchaseModal()

  try {
    plannerPurchaseContext = await window.PlannerSpendItPurchase.loadSpendItPurchaseContext()
    plannerPurchaseStep = step
    renderPlannerPurchaseModal()
  } catch (error) {
    plannerPurchaseStep = "choice"
    renderPlannerPurchaseModal()
    await window.WorthItModal.notice(error.message || "Could not load current Spending data.")
  }
}

function openPlannerPurchaseAddToSpending() {
  if (plannerPurchaseSubmitting) return

  void loadPlannerPurchaseContext("add")
}

function openPlannerPurchaseLinkExisting() {
  if (plannerPurchaseSubmitting) return

  void loadPlannerPurchaseContext("link")
}

function updatePlannerPurchaseSubcategories() {
  const categoryInput = document.getElementById("plannerPurchaseCategory")
  const subcategoryInput = document.getElementById("plannerPurchaseSubcategory")
  const category = (window.WorthItSpendItCategories || []).find(
    item => item.name === categoryInput?.value
  )

  if (!subcategoryInput) return

  if (!category) {
    subcategoryInput.disabled = true
    subcategoryInput.innerHTML = `<option value="">Choose a category first</option>`
    return
  }

  subcategoryInput.disabled = false
  subcategoryInput.innerHTML = `
    <option value="">No subcategory</option>
    ${category.subs.map(subcategory => `<option value="${escapePlannerPurchaseHtml(subcategory)}">${escapePlannerPurchaseHtml(subcategory)}</option>`).join("")}
  `
}

async function savePlannerPurchaseExpense() {
  if (plannerPurchaseSubmitting) return

  const target = getPlannerPurchaseTarget()
  if (!target) {
    await window.WorthItModal.notice("This Planner item is no longer available.")
    closePlannerPurchaseModal()
    return
  }

  const submitButton = document.getElementById("plannerPurchaseSubmit")
  const input = {
    accountId: document.getElementById("plannerPurchaseAccount")?.value,
    description: document.getElementById("plannerPurchaseName")?.value,
    amount: document.getElementById("plannerPurchaseAmount")?.value,
    date: document.getElementById("plannerPurchaseDate")?.value,
    time: document.getElementById("plannerPurchaseTime")?.value,
    category: document.getElementById("plannerPurchaseCategory")?.value,
    subcategory: document.getElementById("plannerPurchaseSubcategory")?.value,
    notes: document.getElementById("plannerPurchaseNotes")?.value
  }

  setPlannerPurchaseSubmitting(true)
  if (submitButton) {
    submitButton.textContent = "Adding..."
  }

  try {
    const result = await window.PlannerSpendItPurchase.createPlannerPurchaseExpense(input)
    finalizePlannerPurchase(result.recordId, "created")
  } catch (error) {
    await window.WorthItModal.notice(error.message || "Could not add the Spending expense. The Planner item is unchanged.")
    setPlannerPurchaseSubmitting(false)
    renderPlannerPurchaseModal()
  }
}

function selectPlannerPurchaseExpense(recordId) {
  if (plannerPurchaseSubmitting) return

  plannerPurchaseSelectedRecordId = String(recordId || "")
  renderPlannerPurchaseModal()
}

async function linkExistingPlannerPurchaseExpense() {
  if (plannerPurchaseSubmitting || !plannerPurchaseSelectedRecordId) return

  const submitButton = document.getElementById("plannerPurchaseLinkSubmit")
  setPlannerPurchaseSubmitting(true)
  if (submitButton) {
    submitButton.textContent = "Linking..."
  }

  try {
    const record = await window.PlannerSpendItPurchase.verifySpendItPurchaseExpense(
      plannerPurchaseSelectedRecordId
    )
    finalizePlannerPurchase(record.id, "existing")
  } catch (error) {
    await window.WorthItModal.notice(error.message || "Could not link this Spending expense. The Planner item is unchanged.")
    setPlannerPurchaseSubmitting(false)
    renderPlannerPurchaseModal()
  }
}

function markPlannerPurchased(m, i) {
  const data = loadData()
  const item = data[m] && data[m][i]
  if (!item) return

  plannerPurchaseTarget = {
    month: m,
    index: i,
    itemId: item.id ? String(item.id) : ""
  }
  plannerPurchaseStep = "choice"
  plannerPurchaseContext = null
  plannerPurchaseSelectedRecordId = ""

  const modal = document.getElementById("plannerPurchaseModal")
  if (modal) modal.style.display = "flex"
  renderPlannerPurchaseModal()
}

function finalizePlannerPurchase(spendItRecordId, spendingLinkMode) {
  const target = getPlannerPurchaseTarget()
  if (!target) {
    void window.WorthItModal.notice("This Planner item is no longer available.")
    closePlannerPurchaseModal(true)
    return
  }

  const { data, month, index, item } = target

  addPurchasedItem({
    id: item.wishlistId || item.id || `${month}_${index}_${Date.now()}`,
    wishlistId: item.wishlistId || "",
    plannerEntryId: item.id || "",
    name: item.label,
    price: item.amount,
    source: "planner",
    purchasedAt: new Date().toISOString(),
    spendItRecordId,
    spendingLinkMode
  })

  if (item.wishlistId) {
    const wishlistItems = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]")
    const wishlistItem = wishlistItems.find(x => x.id === item.wishlistId)

    if (wishlistItem) {
      wishlistItem.status = "purchased"
      wishlistItem.purchasedAt = new Date().toISOString()
      wishlistItem.plannedMonth = ""
      wishlistItem.plannedDate = ""
      wishlistItem.plannerEntryId = ""
      saveWishlistItemsRaw(wishlistItems)
    }
  }

  data[month].splice(index, 1)
  saveData(data)
  plannerPurchaseSubmitting = false
  closePlannerPurchaseModal()
  render()
  renderPlannerPurchasedItems()
  showToast(`Marked "${item.label || "item"}" as purchased`)
}

function renderPlannerPurchasedItems() {
  const list = document.getElementById("plannerPurchasedList")
  if (!list) return

  const items = loadPurchasedItems()

  if (!items.length) {
    list.innerHTML = `<div class="wishlist-table-empty">No purchased items yet.</div>`
    return
  }

  list.innerHTML = items.map(item => `
    <div class="purchased-wishlist-item">
      <div>
        <strong>${item.name || "Purchased Item"}</strong>
        <span>${formatCurrency(item.price)}</span>
      </div>

      <button class="wishlist-owned-btn" type="button" onclick="removePurchasedItemFromPlanner('${item.id}')">
        Remove
      </button>
    </div>
  `).join("")
}

function removePurchasedItemFromPlanner(id) {
  removePurchasedItem(id)
  renderPlannerPurchasedItems()
  if (typeof renderWishlist === "function") {
    renderWishlist()
  }
}

function removeExpense(m, i) {
  const d = loadData()
  const item = d[m] && d[m][i]
  if (!item) return

  plannerDeleteTarget = { month: m, index: i }

  document.getElementById("deleteItemName").textContent = item.label || "this item"
  document.getElementById("deleteModal").style.display = "flex"
}

function closeDeleteModal() {
  plannerDeleteTarget = null

  const modal = document.getElementById("deleteModal")
  if (modal) {
    modal.style.display = "none"
  }
}

function deletePlannerItem() {
  if (!plannerDeleteTarget) return

  const { month, index } = plannerDeleteTarget
  const data = loadData()

  if (!data[month] || !data[month][index]) {
    closeDeleteModal()
    return
  }

  const item = data[month][index]

  if (item.wishlistId) {
    clearWishlistPlannerLink(item.wishlistId)
  }

  data[month].splice(index, 1)

  saveData(data)
  closeDeleteModal()
  render()
  showToast("Planner item deleted")
}

function animateTotals(monthEl) {
  monthEl.querySelectorAll(".side-totals strong").forEach(strong => {
    const target = Number(strong.dataset.value || 0)
    const oldAnimation = totalAnimationMap.get(strong)

    if (oldAnimation) cancelAnimationFrame(oldAnimation)

    const start = performance.now()
    const duration = 700

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1)
      const current = Math.round(target * progress)
            strong.textContent = formatCurrency(current)

      if (progress < 1) {
        const frameId = requestAnimationFrame(tick)
        totalAnimationMap.set(strong, frameId)
      } else {
        totalAnimationMap.delete(strong)
      }
    }

    strong.textContent = "₱0"
    const frameId = requestAnimationFrame(tick)
    totalAnimationMap.set(strong, frameId)
  })
}

function runTotalsAnimation() {
  document.querySelectorAll(".month").forEach(monthEl => {
    const totals = monthEl.querySelectorAll(".side-totals strong")

    if (monthEl.classList.contains("collapsed")) {
      totals.forEach(strong => {
        const target = Number(strong.dataset.value || 0)
                strong.textContent = formatCurrency(target)
      })
      return
    }

    animateTotals(monthEl)
  })
}

function clearGlobalFormState() {
  const labelInput = document.getElementById("gLabel")
  const amountInput = document.getElementById("gAmount")
  const dayInput = document.getElementById("gDay")
  const installmentTotalInput = document.getElementById("gInstallmentTotal")
  
  if (labelInput) {
    labelInput.value = ""
    labelInput.classList.remove("invalid")
  }
  
  if (amountInput) {
    amountInput.value = ""
    amountInput.classList.remove("invalid")
  }
  
  if (dayInput) {
    dayInput.value = ""
    dayInput.classList.remove("invalid")
  }

  if (installmentTotalInput) {
  installmentTotalInput.value = ""
  installmentTotalInput.classList.remove("invalid")
}
  
  if (monthChecks) {
    monthChecks.classList.remove("invalid")
    monthChecks.querySelectorAll("input").forEach(c => c.checked = false)
  }
}

function openPlannerDateModal(month, index) {
  plannerDateTarget = { month, index }

  const item = loadData()[month]?.[index]
  const currentDate = item?.date ? new Date(item.date + "T00:00:00") : new Date()

  plannerCalendarMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)

  const modal = document.getElementById("plannerDateModal")
  if (modal) modal.style.display = "flex"

  renderPlannerDateCalendar()
}

function closePlannerDateModal() {
  plannerDateTarget = null
  const modal = document.getElementById("plannerDateModal")
  if (modal) modal.style.display = "none"
}

function renderPlannerDateCalendar() {
  const calendar = document.getElementById("plannerDateCalendar")
  if (!calendar) return

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const year = plannerCalendarMonth.getFullYear()
  const monthIndex = plannerCalendarMonth.getMonth()
  const firstDay = new Date(year, monthIndex, 1)
  const lastDay = new Date(year, monthIndex + 1, 0)

  let days = ""

  for (let i = 0; i < firstDay.getDay(); i++) days += `<div></div>`

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
      <button type="button" class="btn btn-secondary" onclick="changePlannerCalendarMonth(-1)">‹</button>
      <strong>${months[monthIndex]} ${year}</strong>
      <button type="button" class="btn btn-secondary" onclick="changePlannerCalendarMonth(1)">›</button>
    </div>

    <div class="wishlist-date-weekdays">
      <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
    </div>

    <div class="wishlist-date-grid">${days}</div>
  `
}

function changePlannerCalendarMonth(direction) {
  plannerCalendarMonth = new Date(
    plannerCalendarMonth.getFullYear(),
    plannerCalendarMonth.getMonth() + direction,
    1
  )

  renderPlannerDateCalendar()
}

function choosePlannerDate(dateStr) {
  if (!plannerDateTarget) return

  const { month, index } = plannerDateTarget
  closePlannerDateModal()
  updateField(month, index, "date", dateStr)
}

document.addEventListener("click", e => {
  const plannerDateModal = document.getElementById("plannerDateModal")
  if (!plannerDateModal) return

  const dateBtn = e.target.closest("#plannerDateModal .wishlist-date-option")
  if (dateBtn && !dateBtn.disabled) {
    choosePlannerDate(dateBtn.dataset.date)
    return
  }

  if (e.target === plannerDateModal) {
    closePlannerDateModal()
  }
})

function editPlannerLink(month, index) {
  plannerLinkTarget = { month, index }

  const item = loadData()[month]?.[index]
  const input = document.getElementById("plannerLinkEditInput")
  const modal = document.getElementById("plannerLinkModal")

  if (input) input.value = item?.link || ""
  if (modal) modal.style.display = "flex"

  setTimeout(() => input?.focus(), 0)
}

function closePlannerLinkModal() {
  plannerLinkTarget = null

  const modal = document.getElementById("plannerLinkModal")
  if (modal) modal.style.display = "none"
}
function savePlannerLink() {
  if (!plannerLinkTarget) return

  const { month, index } = plannerLinkTarget

  const input = document.getElementById("plannerLinkInput")
  const d = loadData()

  if (!d[month] || !d[month][index]) return

  const entry = d[month][index]

  entry.link = normalizePlannerLink(input?.value || "")

  const wishlistItem = findWishlistItemByPlannerEntry(entry)

  if (wishlistItem) {
    const wishlistItems = loadWishlistItems()

    const target = wishlistItems.find(item => item.id === wishlistItem.id)

    if (target) {
      target.link = entry.link
      saveWishlistItems(wishlistItems)
    }
  }

  saveData(d)

  closePlannerLinkModal()
  render()

  if (typeof renderWishlist === "function") {
    renderWishlist()
  }

  showToast(entry.link ? "Link updated" : "Link removed")
}

function removePlannerLink() {
  if (!plannerLinkTarget) return

  const { month, index } = plannerLinkTarget
  const d = loadData()

  if (!d[month] || !d[month][index]) return

  d[month][index].link = ""

  syncWishlistLinkFromPlannerEntry(d[month][index])

  saveData(d)
  closePlannerLinkModal()
  render()
  showToast("Link removed")
}

function initPlannerPage() {
  if (monthChecks) {
    monthChecks.innerHTML = ""

    months.forEach(month => {
      monthChecks.innerHTML += `<label><input type="checkbox" value="${month}"> ${month}</label>`
    })
  }

  render()
  renderPayoffTracker()
  renderPlannerPurchasedItems()
}

initPlannerPage()

window.reloadPlanItPlannerFromStorage =
  function() {
    try {
      collapsed =
        JSON.parse(
          localStorage.getItem(
            "collapsedMonths"
          ) || "{}"
        )
    } catch {
      collapsed = {}
    }

    initPlannerPage()
  }

function openPayoffModal() {
  editingPayoffId = ""

  document.getElementById("payoffModalTitle").textContent = "Add Payoff"
  document.getElementById("payoffSaveButton").textContent = "Save Payoff"
  document.getElementById("payoffName").value = ""
  document.getElementById("payoffTotal").value = ""
  document.getElementById("payoffPaid").value = ""
  document.getElementById("payoffMonthly").value = ""
  document.getElementById("payoffDueDay").value = ""
  document.getElementById("payoffCategory").value = ""

  const modal = document.getElementById("payoffModal")
  if (modal) modal.style.display = "flex"

  const input = document.getElementById("payoffName")
  if (input) input.focus()
}

function closePayoffModal() {
  editingPayoffId = ""

  const modal = document.getElementById("payoffModal")
  if (modal) modal.style.display = "none"
}

function editPayoff(id) {
  const payoff = loadPayoffs().find(item => String(item.id) === String(id))
  if (!payoff || payoff.source === "planner") return

  editingPayoffId = String(payoff.id)

  document.getElementById("payoffModalTitle").textContent = "Edit Payoff"
  document.getElementById("payoffSaveButton").textContent = "Save Changes"
  document.getElementById("payoffName").value = payoff.name || ""
  document.getElementById("payoffTotal").value = Number(payoff.total || 0)
  document.getElementById("payoffPaid").value = Number(payoff.paid || 0)
  document.getElementById("payoffMonthly").value = Number(payoff.monthly || 0)
  document.getElementById("payoffDueDay").value = Number(payoff.dueDay || 1)
  document.getElementById("payoffCategory").value = payoff.category || "Installment"

  const modal = document.getElementById("payoffModal")
  if (modal) modal.style.display = "flex"

  const input = document.getElementById("payoffName")
  if (input) input.focus()
}

function addPayoff() {
  const nameInput = document.getElementById("payoffName")
  const totalInput = document.getElementById("payoffTotal")
  const paidInput = document.getElementById("payoffPaid")
  const monthlyInput = document.getElementById("payoffMonthly")
  const dueDayInput = document.getElementById("payoffDueDay")
  const categoryInput = document.getElementById("payoffCategory")

  const name = String(nameInput.value || "").trim()
  const total = Number(totalInput.value || 0)
  const paid = Number(paidInput.value || 0)
  const monthly = Number(monthlyInput.value || 0)
  const dueDay = Number(dueDayInput.value || 1)
  const category = String(categoryInput.value || "Installment").trim()

  if (!name) {
    showToast("Please enter a payoff name")
    nameInput.focus()
    return
  }

  if (total <= 0) {
    showToast("Please enter the total amount")
    totalInput.focus()
    return
  }

  if (monthly < 0) {
    showToast("Monthly payment cannot be negative.")
    monthlyInput.focus()
    return
  }

  if (paid < 0) {
    showToast("Paid amount cannot be negative.")
    paidInput.focus()
    return
  }

  if (paid > total) {
    showToast("Paid amount cannot exceed the total.")
    paidInput.focus()
    return
  }

  const payoffs = loadPayoffs()

  if (editingPayoffId) {
    const payoff = payoffs.find(item => String(item.id) === editingPayoffId)

    if (!payoff || payoff.source === "planner") {
      closePayoffModal()
      renderPayoffTracker()
      showToast("This payoff can no longer be edited.")
      return
    }

    payoff.name = name
    payoff.total = total
    payoff.paid = paid
    payoff.monthly = monthly
    payoff.dueDay = dueDay
    payoff.category = category

    savePayoffs(payoffs)
    closePayoffModal()
    renderPayoffTracker()
    showToast(`${name} updated`)
    return
  }

  payoffs.push(normalizePayoff({
    id: String(Date.now()),
    name,
    total,
    paid,
    monthly,
    dueDay,
    category
  }))

  savePayoffs(payoffs)

  nameInput.value = ""
  totalInput.value = ""
  paidInput.value = ""
  monthlyInput.value = ""
  dueDayInput.value = ""
  categoryInput.value = ""

  closePayoffModal()
  renderPayoffTracker()
  showToast(`${name} added to Payoff Tracker`)
}

function updatePayoffField(id, key, value) {
  const payoffs = loadPayoffs()
  const item = payoffs.find(p => p.id === id)
  if (!item) return

  if (key === "name" || key === "category") {
    item[key] = String(value || "").trim()
  } else if (key === "paid") {
    const nextPaid =
      Number(String(value || "").replace(/[^0-9.-]/g, "")) || 0

    if (nextPaid < 0) {
      showToast("Paid amount cannot be negative.")
      renderPayoffTracker()
      return
    }

    if (nextPaid > Number(item.total || 0)) {
      showToast("Paid amount cannot exceed the total.")
      renderPayoffTracker()
      return
    }

    item.paid = nextPaid
  } else if (key === "total") {
    const nextTotal =
      Number(String(value || "").replace(/[^0-9.]/g, "")) || 0
    const currentPaid = Number(item.paid || 0)

    if (currentPaid < 0) {
      showToast("Paid amount cannot be negative.")
      renderPayoffTracker()
      return
    }

    if (currentPaid > nextTotal) {
      showToast("Paid amount cannot exceed the total.")
      renderPayoffTracker()
      return
    }

    item.total = nextTotal
  } else if (key === "monthly") {
    const nextMonthly =
      Number(String(value || "").replace(/[^0-9.-]/g, "")) || 0

    if (nextMonthly < 0) {
      showToast("Monthly payment cannot be negative.")
      renderPayoffTracker()
      return
    }

    item.monthly = nextMonthly
  } else {
    item[key] = Number(String(value || "").replace(/[^0-9.]/g, "")) || 0
  }

  savePayoffs(payoffs)
  renderPayoffTracker()
}

function deletePayoff(id) {
  const payoffs = loadPayoffs()
  const index = payoffs.findIndex(p => String(p.id) === String(id))

  if (index < 0) return

  const [item] = payoffs.splice(index, 1)
  savePayoffs(payoffs)
  renderPayoffTracker()
  showToast(`${item?.name || "Payoff"} deleted`)
}

function updatePlannerInstallmentTotal(label, value) {
  const data = loadData()
  const total = Number(String(value || "").replace(/[^0-9.]/g, "")) || 0
  const target = String(label || "").trim().toLowerCase()

  Object.keys(data).forEach(month => {
    if (!Array.isArray(data[month])) return

    data[month].forEach(entry => {
      const name = String(entry.label || "").trim().toLowerCase()

      if (name === target) {
        entry.installmentTotal = total
      }
    })
  })

  saveData(data)
  render()
renderPayoffTracker()
  showToast("Installment total updated")
}

function renderPayoffTracker() {
  const list = document.getElementById("payoffList")
  if (!list) return

  const stats = getPayoffStats()

  document.getElementById("payoffActiveCount").textContent = stats.activeCount
  document.getElementById("payoffTotalOriginal").textContent = stats.entryCount.toLocaleString()
  document.getElementById("payoffTotalRemaining").textContent = formatCurrency(stats.totalRemaining)
  document.getElementById("payoffMonthlyDue").textContent = formatCurrency(stats.monthlyDue)

  if (!stats.payoffs.length) {
    list.innerHTML = `<div class="wishlist-table-empty">No payoff items yet.</div>`
    return
  }

list.innerHTML = stats.payoffs.map(item => {
  const total = Number(item.total || 0)
  const remaining = Math.max(Number(item.total || 0) - Number(item.paid || 0), 0)
  const monthly = Number(item.effectiveMonthlyDue || 0)
  const dueDay = Number(item.dueDay || 1)
  const monthsLeft = item.source === "planner" && Number(item.entryCount || 0) > 0
  ? Number(item.entryCount || 0)
  : monthly > 0
  ? Math.ceil(remaining / monthly)
  : 0
  const category = item.category || "Installment"
  const manualControls = item.source === "planner"
    ? ""
    : `
      <div class="payoff-row-actions">
        <button
          class="btn btn-secondary"
          type="button"
          data-edit-payoff-id="${encodeURIComponent(item.id)}"
        >
          Edit
        </button>
        <button
          class="btn btn-secondary payoff-delete-button"
          type="button"
          data-payoff-id="${encodeURIComponent(item.id)}"
        >
          Delete
        </button>
      </div>
    `

  return `
    <div class="payoff-row-compact">
      <div class="payoff-row-main">
        <strong>${item.name || "Payoff Item"}</strong>
        <span>${category}${item.source === "planner" ? " · Managed by Planner" : ""}</span>
      </div>

      <div class="payoff-row-stat">
        <span>Total</span>
        <strong>${formatCurrency(total)}</strong>
      </div>

      <div class="payoff-row-stat payoff-danger">
        <span>Remaining</span>
        <strong>${formatCurrency(remaining)}</strong>
      </div>

      <div class="payoff-row-stat payoff-accent">
        <span>Monthly</span>
        <strong>${formatCurrency(monthly)}</strong>
      </div>

      <div class="payoff-row-stat">
        <span>Due</span>
        <strong>${dueDay}${getDaySuffix(dueDay)}</strong>
      </div>

      <div class="payoff-row-stat">
        <span>Months left</span>
        <strong>${monthsLeft} mo</strong>
      </div>

      ${manualControls}
    </div>
  `
}).join("")

  list.querySelectorAll("[data-payoff-id]").forEach(button => {
    button.addEventListener("click", () => {
      deletePayoff(decodeURIComponent(button.dataset.payoffId || ""))
    })
  })

  list.querySelectorAll("[data-edit-payoff-id]").forEach(button => {
    button.addEventListener("click", () => {
      editPayoff(decodeURIComponent(button.dataset.editPayoffId || ""))
    })
  })
}

function getDaySuffix(day) {
  const n = Number(day || 0)
  if ([11, 12, 13].includes(n % 100)) return "th"
  if (n % 10 === 1) return "st"
  if (n % 10 === 2) return "nd"
  if (n % 10 === 3) return "rd"
  return "th"
}

document.addEventListener("DOMContentLoaded", () => {
  renderPayoffTracker()

  const payoffModal = document.getElementById("payoffModal")
  if (payoffModal) {
    payoffModal.addEventListener("click", function(e) {
      if (e.target === this) closePayoffModal()
    })
  }
})
