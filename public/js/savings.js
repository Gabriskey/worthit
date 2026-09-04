const SAVINGS_KEY = "savingsGoals"
const SPENDIT_ACCOUNT_KEY = "expensepath-accounts-v1"
const SPENDIT_RECORD_KEY = "expensepath-records-v1"

let savingsDeleteId = null

function loadSavingsGoals() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVINGS_KEY) || "[]")
    return Array.isArray(raw) ? raw : []
  } catch (error) {
    console.error("Invalid savingsGoals data in localStorage:", error)
    return []
  }
}

function loadSpendItAccountsForSavings() {
  try {
    const raw = JSON.parse(
      localStorage.getItem(SPENDIT_ACCOUNT_KEY) || "[]"
    )

    return Array.isArray(raw) ? raw : []
  } catch (error) {
    console.error("Invalid SpendIt accounts:", error)
    return []
  }
}

function loadSpendItRecordsForSavings() {
  try {
    const raw = JSON.parse(
      localStorage.getItem(SPENDIT_RECORD_KEY) || "[]"
    )

    return Array.isArray(raw) ? raw : []
  } catch (error) {
    console.error("Invalid SpendIt records:", error)
    return []
  }
}

function calculateSpendItBalanceForSavings(account, records) {
  let balance = Number(account?.initial || 0)

  records.forEach(record => {
    const amount = Number(record.amount || 0)

    if (
      record.type === "income" &&
      record.accountId === account.id
    ) {
      balance += amount
    }

    if (
      record.type === "expense" &&
      record.accountId === account.id
    ) {
      balance -= amount
    }

    if (record.type === "transfer") {
      if (record.fromId === account.id) balance -= amount
      if (record.toId === account.id) balance += amount
    }
  })

  return balance
}

function getSpendItBalanceForSavings(accountId) {
  const accounts = loadSpendItAccountsForSavings()
  const records = loadSpendItRecordsForSavings()

  const account = accounts.find(
    item => String(item.id || "") === String(accountId || "")
  )

  if (!account) return null

  return calculateSpendItBalanceForSavings(account, records)
}

function populateSavingsAccountSelect() {
  const select = document.getElementById("savingsAccount")
  if (!select) return

  const accounts = loadSpendItAccountsForSavings()

  select.innerHTML = ""

  const placeholder = document.createElement("option")
  placeholder.value = ""
  placeholder.textContent = accounts.length
    ? "Choose where this savings is stored"
    : "No SpendIt accounts found"

  select.appendChild(placeholder)

  accounts.forEach(account => {
    const option = document.createElement("option")
    option.value = String(account.id || "")
    option.textContent = account.name || "Unnamed Account"
    select.appendChild(option)
  })
}

function saveSavingsGoals(goals) {
  const raw =
    JSON.stringify(goals)

  localStorage.setItem(
    SAVINGS_KEY,
    raw
  )

  if (
    typeof window.saveSaveItToCloud ===
    "function"
  ) {
    window.saveSaveItToCloud(raw)
  }
}

function normalizeSavingsGoal(goal = {}) {
  return {
    id: goal.id || String(Date.now() + Math.random()),
    name: String(goal.name || "").trim(),
    target: Number(goal.target || 0),
    saved: Number(goal.saved || 0),
    accountId: String(goal.accountId || "")
  }
}

function openSavingsModal() {
  const modal = document.getElementById("savingsModal")

  if (modal) {
    modal.style.display = "flex"
  }

  try {
    if (typeof populateSavingsAccountSelect === "function") {
      populateSavingsAccountSelect()
    } else {
      console.error("populateSavingsAccountSelect is not defined")
    }
  } catch (error) {
    console.error("Could not load SpendIt accounts:", error)
  }

  const nameInput = document.getElementById("savingsName")

  if (nameInput) {
    nameInput.focus()
  }
}

function closeSavingsModal() {
  const modal = document.getElementById("savingsModal")
  if (modal) {
    modal.style.display = "none"
  }
}

function addSavingsGoal() {
  const nameInput = document.getElementById("savingsName")
  const targetInput = document.getElementById("savingsTarget")
  const savedInput = document.getElementById("savingsSaved")
  const accountInput = document.getElementById("savingsAccount")

  const name = String(nameInput.value || "").trim()
  const target = Number(targetInput.value || 0)
  const saved = Number(savedInput.value || 0)
  const accountId = String(accountInput?.value || "")

  if (!name) {
    showToast("Please enter a goal name")
    nameInput.focus()
    return
  }

  if (target <= 0) {
    showToast("Please enter a target amount")
    targetInput.focus()
    return
  }

  if (!accountId) {
  showToast("Please choose a SpendIt account")
  accountInput?.focus()
  return
}

  const goals = loadSavingsGoals()

  const accountBalance = getSpendItBalanceForSavings(accountId)

if (accountBalance === null) {
  showToast("Selected SpendIt account was not found")
  return
}

const alreadyAllocated = goals.reduce((sum, goal) => {
  const usesSameAccount =
    String(goal.accountId || "") === accountId

  return usesSameAccount
    ? sum + Number(goal.saved || 0)
    : sum
}, 0)

const availableToAllocate = Math.max(
  accountBalance - alreadyAllocated,
  0
)

if (saved > availableToAllocate) {
  showToast(
    `Only ${formatCurrency(availableToAllocate)} is available in this account`
  )

  savedInput.focus()
  return
}

goals.push(normalizeSavingsGoal({
  id: String(Date.now()),
  name,
  target,
  saved,
  accountId
}))

  saveSavingsGoals(goals)
  closeSavingsModal()
  renderSavingsPage()
  showToast(`${name} added!`)

  nameInput.value = ""
  targetInput.value = ""
  savedInput.value = ""
  accountInput.value = ""
}

function updateSavingsField(id, key, value) {
  const goals = loadSavingsGoals()
  const goal = goals.find(item => item.id === id)
  if (!goal) return

  if (key === "name") {
    goal.name = String(value || "").trim()
  }

  if (key === "target") {
    goal.target = Number(String(value || "").replace(/[^0-9.]/g, "")) || 0
  }

if (key === "saved") {
  const nextSaved =
    Number(String(value || "").replace(/[^0-9.]/g, "")) || 0

  const accountId = String(goal.accountId || "")

  if (!accountId) {
    showToast("This goal has no SpendIt account assigned")
    renderSavingsPage()
    return
  }

  const accountBalance = getSpendItBalanceForSavings(accountId)

  if (accountBalance === null) {
    showToast("Linked SpendIt account was not found")
    renderSavingsPage()
    return
  }

  const allocatedToOtherGoals = goals.reduce((sum, item) => {
    if (String(item.id) === String(goal.id)) return sum

    const usesSameAccount =
      String(item.accountId || "") === accountId

    return usesSameAccount
      ? sum + Number(item.saved || 0)
      : sum
  }, 0)

  const availableForThisGoal = Math.max(
    accountBalance - allocatedToOtherGoals,
    0
  )

  if (nextSaved > availableForThisGoal) {
    showToast(
      `Only ${formatCurrency(availableForThisGoal)} is available in this account`
    )

    renderSavingsPage()
    return
  }

  goal.saved = nextSaved
}

  saveSavingsGoals(goals)
  renderSavingsPage()
}

function openSavingsDeleteModal(id) {
  const goals = loadSavingsGoals()
  const goal = goals.find(item => item.id === id)
  if (!goal) return

  savingsDeleteId = id

  const nameEl = document.getElementById("savingsDeleteName")
  if (nameEl) {
    nameEl.textContent = goal.name || "this goal"
  }

  const modal = document.getElementById("savingsDeleteModal")
  if (modal) {
    modal.style.display = "flex"
  }
}

function closeSavingsDeleteModal() {
  savingsDeleteId = null

  const modal = document.getElementById("savingsDeleteModal")
  if (modal) {
    modal.style.display = "none"
  }
}

function deleteSavingsGoal() {
  if (!savingsDeleteId) return

  const goals = loadSavingsGoals()
  const goal = goals.find(item => item.id === savingsDeleteId)
  const updatedGoals = goals.filter(item => item.id !== savingsDeleteId)

  saveSavingsGoals(updatedGoals)
  closeSavingsDeleteModal()
  renderSavingsPage()
  showToast(`${goal?.name || "Goal"} deleted!`)
}

function renderSavingsSummary(goals) {
  const totalGoals = goals.length
  const totalTarget = goals.reduce((sum, goal) => sum + Number(goal.target || 0), 0)
  const totalSaved = goals.reduce((sum, goal) => sum + Number(goal.saved || 0), 0)
  const totalLeft = Math.max(totalTarget - totalSaved, 0)

  document.getElementById("savingsGoalCount").textContent = totalGoals
  document.getElementById("savingsTotalTarget").textContent = formatCurrency(totalTarget)
  document.getElementById("savingsTotalSaved").textContent = formatCurrency(totalSaved)
  document.getElementById("savingsLeftTotal").textContent = formatCurrency(totalLeft)
}

function renderSavingsPage() {
  const list = document.getElementById("savingsList")
  if (!list) return
const goals = loadSavingsGoals()
const spendItAccounts = loadSpendItAccountsForSavings()

const spendItAccountMap = new Map(
  spendItAccounts.map(account => [
    String(account.id || ""),
    account
  ])
)

renderSavingsSummary(goals)

  if (!goals.length) {
    list.innerHTML = `<div class="wishlist-table-empty">No savings goals yet.</div>`
    return
  }

  list.innerHTML = goals.map(goal => {
    const target = Number(goal.target || 0)
    const saved = Number(goal.saved || 0)
    const left = Math.max(target - saved, 0)
    const percent = target > 0 ? Math.min((saved / target) * 100, 100) : 0
    const linkedAccount = spendItAccountMap.get(
  String(goal.accountId || "")
)

const accountName = linkedAccount?.name ||
  (goal.accountId ? "Account unavailable" : "No account assigned")

    return `
      <div class="savings-card">
        <div class="savings-card-top">
          <div class="savings-card-title-wrap">
            <div
              class="savings-goal-name"
              contenteditable="true"
              onblur="updateSavingsField('${goal.id}', 'name', this.innerText)"
            >${goal.name}</div>

<div class="savings-goal-meta">
  ${formatCurrency(target)} target ·
  ${formatCurrency(saved)} saved ·
  Stored in ${accountName}
</div>
          </div>

          <button class="wishlist-delete-btn" onclick="openSavingsDeleteModal('${goal.id}')">🗑</button>
        </div>

        <div class="savings-progress-row">
          <div class="savings-progress-bar">
            <div class="savings-progress-fill" style="width:${percent}%;"></div>
          </div>
          <div class="savings-progress-text">${percent.toFixed(0)}%</div>
        </div>

        <div class="savings-grid">
          <div class="savings-field">
            <label>Target</label>
            <div
              class="savings-editable"
              contenteditable="true"
              onblur="updateSavingsField('${goal.id}', 'target', this.innerText)"
            >₱${target.toLocaleString()}</div>
          </div>

          <div class="savings-field">
            <label>Saved</label>
            <div
              class="savings-editable"
              contenteditable="true"
              onblur="updateSavingsField('${goal.id}', 'saved', this.innerText)"
            >₱${saved.toLocaleString()}</div>
          </div>

          <div class="savings-field">
            <label>Left to Save</label>
            <div class="savings-static-value">${formatCurrency(left)}</div>
          </div>
        </div>
      </div>
    `
  }).join("")
}

function initSavingsPage() {
  const savingsModal = document.getElementById("savingsModal")
  if (savingsModal) {
    savingsModal.addEventListener("click", function(e) {
      if (e.target === this) {
        closeSavingsModal()
      }
    })
  }

  const savingsDeleteModal = document.getElementById("savingsDeleteModal")
  if (savingsDeleteModal) {
    savingsDeleteModal.addEventListener("click", function(e) {
      if (e.target === this) {
        closeSavingsDeleteModal()
      }
    })
  }

  renderSavingsPage()
}

initSavingsPage()
