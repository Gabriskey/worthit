const ACCOUNT_KEY = 'expensepath-accounts-v1';
const RECORD_KEY = 'expensepath-records-v1';
const UI_KEY = 'expensepath-ui-v1';
const categories = [
  { name:'Food & Drinks', icon:'🍴', color:'#AF5031', subs:['Bar, cafe','Groceries','Restaurant, fast-food'] },

  { name:'Shopping', icon:'🛍️', color:'#77C7CC', subs:[
    'Clothes & shoes',
    'Drug-store, chemist',
    'Electronics, accessories',
    'Free time',
    'Gifts, joy',
    'Health and beauty',
    'Home, garden',
    'Jewels, accessories',
    'Kids',
    'Pets, animals',
    'Stationery, tools'
  ] },

  { name:'Housing', icon:'🏠', color:'#F28A13', subs:[
    'Energy, utilities',
    'Maintenance, repairs',
    'Family',
    'Property insurance',
    'Rent',
    'Services'
  ] },

  { name:'Transportation', icon:'🚌', color:'#092F33', subs:[
    'Business trips',
    'Long distance',
    'Public transport',
    'Taxi'
  ] },

  { name:'Vehicle', icon:'🚗', color:'#092F33', subs:[
    'Fuel',
    'Leasing',
    'Parking',
    'Rentals',
    'Vehicle insurance',
    'Vehicle maintenance'
  ] },

  { name:'Life & Entertainment', icon:'🧍', color:'#4B5B34', subs:[
    'Active sport, fitness',
    'Alcohol, tobacco',
    'Books, audio, subscriptions',
    'Charity, gifts',
    'Culture, sport events',
    'Education, development',
    'Health care, doctor',
    'Maggie',
    'Holiday, trips, hotels',
    'Life events',
    'Cigarettes',
    'TV, Streaming',
    'Wellness, beauty'
  ] },

  { name:'Communication, PC', icon:'💻', color:'#890204', subs:[
    'Internet',
    'Phone, cell phone',
    'Postal services',
    'Software, apps, games'
  ] },

  { name:'Financial expenses', icon:'⑤', color:'#7D6A91', subs:[
    'Advisory',
    'Charges, Fees',
    'Child Support',
    'Fines',
    'Insurances',
    'Loan, interests',
    'Taxes'
  ] },

  { name:'Investments', icon:'💸', color:'#B8845F', subs:[
    'Collections',
    'Financial investments',
    'Realty',
    'Savings',
    'Vehicles, chattels'
  ] },

  { name:'Income', icon:'💰', color:'#D7A958', subs:[
    'Checks, coupons',
    'Child Support',
    'Dues & grants',
    'Gifts',
    'Interests, dividends',
    'Lending, renting',
    'Lottery, gambling',
    'Refunds (tax, purchase)',
    'Rental income',
    'Sale',
    'Wage, invoices'
  ] },

  { name:'Others', icon:'☰', color:'#74766F', subs:['Missing'] }
];

let accounts = loadAccounts();
let records = loadRecords();
let ui = loadUi();
let selectedAccountId = ui.selectedAccountId || accounts[0]?.id || '';
let recordType = 'income';
let amountBuffer = '';
let currentPageId = ui.currentPageId || 'dashboardPage';
let editingRecordId = null;

let editingTransferId = null;
let pendingDelete = null;

let dashboardRange = 'thisMonth';
let dashboardCashFlowMode = 'monthly';
let dashboardSpendMode = 'weekly';
let dashboardEnabledCategories = new Set(categories.map(c => c.name));
let dashboardCollapsedCategories = new Set();

let enabledAccountIds = new Set(ui.enabledAccountIds || accounts.map(a => a.id));

function accountIsEnabled(id){
  return enabledAccountIds.has(id);
}

function recordUsesEnabledAccount(record){
  if (!enabledAccountIds.size) return false;

  if (record.type === 'transfer') {
    return enabledAccountIds.has(record.fromId) || enabledAccountIds.has(record.toId);
  }

  return enabledAccountIds.has(record.accountId);
}

function toggleAccountForReports(id){
  if (enabledAccountIds.has(id)) {
    enabledAccountIds.delete(id);
  } else {
    enabledAccountIds.add(id);
  }

  saveUi();
  render();
}

function uid(prefix='id'){ return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
function money(value){
  return new Intl.NumberFormat('en-PH',{
    style:'currency',
    currency:'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value)||0);
}

function compactMoney(value){
  const num = Number(value) || 0;

  if (num >= 1000000) return `₱${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `₱${(num / 1000).toFixed(1)}K`;

  return `₱${Math.round(num)}`;
}

function nowDate(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDisplayDate(dateString){
  if (!dateString) return '';

  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric'
  }).toUpperCase();
}
function nowTime(){ const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function loadAccounts(){ try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || '[]'); } catch { return []; } }

function saveAccounts(){
  const raw =
    JSON.stringify(accounts);

  localStorage.setItem(
    ACCOUNT_KEY,
    raw
  );

  window.saveSpendItKeyToCloud?.(
    ACCOUNT_KEY,
    raw
  );
}

function loadRecords(){ try { return JSON.parse(localStorage.getItem(RECORD_KEY) || '[]'); } catch { return []; } }

function saveRecords(){
  const raw =
    JSON.stringify(records);

  localStorage.setItem(
    RECORD_KEY,
    raw
  );

  window.saveSpendItKeyToCloud?.(
    RECORD_KEY,
    raw
  );
}

function loadUi(){ try { return JSON.parse(localStorage.getItem(UI_KEY) || '{}'); } catch { return {}; } }

function saveUi(){
  const raw =
    JSON.stringify({
      selectedAccountId,
      currentPageId,
      enabledAccountIds:
        [...enabledAccountIds]
    });

  localStorage.setItem(
    UI_KEY,
    raw
  );

  window.saveSpendItKeyToCloud?.(
    UI_KEY,
    raw
  );
}

window.reloadSpendItFromStorage =
  function() {
    accounts =
      loadAccounts();

    records =
      loadRecords();

    ui =
      loadUi();

    selectedAccountId =
      ui.selectedAccountId ||
      accounts[0]?.id ||
      "";

    currentPageId =
      ui.currentPageId ||
      "dashboardPage";

    enabledAccountIds =
      new Set(
        ui.enabledAccountIds ||
        accounts.map(
          account => account.id
        )
      );

    setPage(currentPageId);
    render();
  };

function accountBalance(accountId){
  const account = accounts.find(a => a.id === accountId);
  let balance = Number(account?.initial || 0);
  records.forEach(r => {
    const amount = Number(r.amount || 0);
    if (r.type === 'income' && r.accountId === accountId) balance += amount;
    if (r.type === 'expense' && r.accountId === accountId) balance -= amount;
    if (r.type === 'transfer') {
      if (r.fromId === accountId) balance -= amount;
      if (r.toId === accountId) balance += amount;
    }
  });
  return balance;
}

document.querySelectorAll('[data-page]').forEach(btn => {
  btn.addEventListener('click', () => setPage(btn.dataset.page));
});


document.querySelectorAll('[data-range]').forEach(btn => {
  btn.addEventListener('click', () => setDashboardRange(btn.dataset.range));
});

document.querySelectorAll('[data-cashflow-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    dashboardCashFlowMode = btn.dataset.cashflowMode;
    renderDashboard();
  });
});

document.querySelectorAll('[data-spend-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    dashboardSpendMode = btn.dataset.spendMode;
    renderDashboard();
  });
});

function setPage(pageId){
  currentPageId = pageId;

  const inAccountPage = pageId === 'dashboardPage' || pageId === 'accountDetailPage';
const isGraphPage = pageId === 'graphPage';

  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === pageId);
  });

  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });

  const hideHero = pageId === 'accountDetailPage' || pageId === 'accountsPage' || isGraphPage;
  document.getElementById('mainHero').style.display = hideHero ? 'none' : '';

  document.getElementById('quickAddBtn').style.display = inAccountPage ? 'grid' : 'none';

  if (!inAccountPage) {
    toggleQuick(false);
  }

  document.body.classList.toggle('graph-mode', isGraphPage);

if (isGraphPage) {
  setTimeout(renderCharts, 50);
}
window.updateWorthItSubNavigation?.(pageId);
saveUi();
}

function render(){
  if (!accounts.length) {
    selectedAccountId = '';
  } else if (!accounts.some(a => a.id === selectedAccountId)) {
    selectedAccountId = accounts[0].id;
  }
  saveUi();
  renderSummary();
  renderAccounts();
  renderRecords();
  renderAccountDetail();
  populateAccountSelects();
  renderDashboard();
  renderCharts();
}

function renderSummary(){
  const net = accounts.reduce((sum,a) => sum + accountBalance(a.id), 0);
  const income = records.filter(r => r.type === 'income').reduce((s,r) => s + Number(r.amount || 0), 0);
  const expense = records.filter(r => r.type === 'expense').reduce((s,r) => s + Number(r.amount || 0), 0);
  const selected = accounts.find(a => a.id === selectedAccountId);
  const selectedRecords = records.filter(r => r.accountId === selectedAccountId || r.fromId === selectedAccountId || r.toId === selectedAccountId);

  setText('sumNet', money(net));
  setText('sumIncome', money(income));
  setText('sumExpense', money(expense));
  setText('sumAccounts', accounts.length);
  setText('statSelected', selected?.name || '—');
  setText('statBalance', money(selected ? accountBalance(selected.id) : 0));
  setText('statRecords', selectedRecords.length);
  setText('statTransfers', selectedRecords.filter(r => r.type === 'transfer').length);
}

function accountMarkup(account, mode = 'home'){
  const openButton = `<button class="btn account-open-btn" type="button" onclick="event.stopPropagation(); openAccountPage('${account.id}')">Open</button>`;

  return `<div class="account-card ${accountIsEnabled(account.id) ? 'active' : ''}" onclick="toggleAccountForReports('${account.id}')">
    <div class="account-top">
      <div>
        <div class="account-name">
          <span class="account-dot" style="background:${account.color}"></span>
          ${escapeHtml(account.name)}
        </div>
        <div class="account-type">${escapeHtml(account.type)}</div>
      </div>

      ${openButton}
    </div>

    <div class="account-value">${money(accountBalance(account.id))}</div>
  </div>`;
}

function openAccountPage(id){
  selectedAccountId = id;
  setPage('accountDetailPage');
  render();
}
function renderAccounts(){
  const empty = '<div class="empty">No accounts yet. Create your first account.</div>';
  const accountsList = document.getElementById('accountsList');
  const accountsListFull = document.getElementById('accountsListFull');

  if (accountsList) {
    accountsList.innerHTML = accounts.length
    ? accounts.map(account => accountMarkup(account, 'home')).join('') + `
      <button class="add-account-card" type="button" onclick="openAccountModal()">
    <span>Add account</span>
    <span class="add-account-plus">＋</span>
  </button>
    `
    : `
      <button class="add-account-card" type="button" onclick="openAccountModal()">
        <span>Add Account</span>
        <span class="add-account-plus">+</span>
      </button>
    `;
  }

  if (accountsListFull) {
    accountsListFull.innerHTML = accounts.length
      ? accounts.map(account => accountMarkup(account, 'accounts')).join('')
      : empty;
  }
}
function selectAccount(id){
  selectedAccountId = id;
  render();
}

function backToAccounts(){
  setPage('accountsPage');
  render();
}

function openDeleteModal(title, text, onDelete){
  pendingDelete = onDelete;
  document.getElementById('deleteModalTitle').textContent = title;
  document.getElementById('deleteModalText').textContent = text;
  document.getElementById('deleteModalBackdrop').classList.add('open');
}

function closeDeleteModal(){
  pendingDelete = null;
  document.getElementById('deleteModalBackdrop').classList.remove('open');
}

function confirmDelete(){
  const action = pendingDelete;
  closeDeleteModal();

  if (typeof action === 'function') {
    action();
  }
}

function deleteAccount(id){
  const account = accounts.find(a => a.id === id);
  if (!account) return;

  openDeleteModal(
    `Delete ${account.name}?`,
    'Records linked to this account will stay, but balances may change.',
    () => {
      accounts = accounts.filter(a => a.id !== id);
      saveAccounts();
      render();
    }
  );
}

function sortNewestFirst(a, b) {
  const dateCompare = `${b.date || ''}T${b.time || ''}`.localeCompare(`${a.date || ''}T${a.time || ''}`);
  if (dateCompare !== 0) return dateCompare;

  return Number(b.createdAt || 0) - Number(a.createdAt || 0);
}

function renderRecords(){
  const recordsTitle = document.getElementById('recordsTitle');
  const recordFilter = document.getElementById('recordFilter');
  const recordsList = document.getElementById('recordsList');

  if (!recordsTitle || !recordFilter || !recordsList) return;

  const selected = accounts.find(a => a.id === selectedAccountId);
  recordsTitle.textContent = selected ? `📋 ${selected.name} Records` : '📋 Records';
  const filter = recordFilter.value;
  let list = records.filter(r => r.accountId === selectedAccountId || r.fromId === selectedAccountId || r.toId === selectedAccountId);
  if (filter !== 'all') list = list.filter(r => r.type === filter);
  list.sort(sortNewestFirst);
  if (!list.length) {
    recordsList.innerHTML = '<div class="empty">No records for this account yet.</div>';
    return;
  }
  recordsList.innerHTML = list.map(r => {
    const cat = categories.find(c => c.name === r.category) || categories[categories.length - 1];
    let title = r.description || r.category || 'Record';
    let meta = `${formatDisplayDate(r.date)} ${r.time || ''}`;
    let amountClass = r.type;
    let sign = r.type === 'income' ? '+' : '-';
    if (r.type === 'transfer') {
      const from = accounts.find(a => a.id === r.fromId)?.name || 'Account';
      const to = accounts.find(a => a.id === r.toId)?.name || 'Account';
      title = r.description || `Transfer: ${from} → ${to}`;
      meta = `${from} → ${to} · ${formatDisplayDate(r.date)} ${r.time || ''}`;
      amountClass = r.fromId === selectedAccountId ? 'expense' : 'income';
      sign = r.fromId === selectedAccountId ? '-' : '+';
    }
    return `<div class="record-row">
      <div class="record-icon" style="background:${cat.color}">${cat.icon}</div>
      <div><div class="record-title">${escapeHtml(title)}</div><div class="record-meta">${escapeHtml(r.subcategory || r.category || 'Transfer')} · ${escapeHtml(meta)}</div></div>
      <div>
  <div class="record-amount ${amountClass}">${sign}${money(r.amount)}</div>
<div class="record-actions">
  <button class="record-edit-btn" type="button" onclick="${r.type === 'transfer' ? `editTransfer('${r.id}')` : `editRecord('${r.id}')`}" title="Edit">✎</button>
  <button class="record-delete-btn" type="button" onclick="deleteRecord('${r.id}')" title="Delete">🗑</button>
</div>
</div>
    </div>`;
  }).join('');
}

function renderAccountDetail(){
  const selected = accounts.find(a => a.id === selectedAccountId);
  if (!selected) return;

  const accountRecords = records.filter(r =>
    r.accountId === selectedAccountId ||
    r.fromId === selectedAccountId ||
    r.toId === selectedAccountId
  );

  const income = accountRecords
    .filter(r => r.type === 'income')
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const expense = accountRecords
    .filter(r => r.type === 'expense')
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  document.getElementById('accountDetailTitle').innerHTML =
  `<span class="account-dot" style="background:${selected.color}"></span>${escapeHtml(selected.name)}`;
  document.getElementById('accountDetailRecordsTitle').textContent = `📋 ${selected.name} Records`;
  document.getElementById('detailBalance').textContent = money(accountBalance(selected.id));
  document.getElementById('detailRecords').textContent = accountRecords.length;
  document.getElementById('detailIncome').textContent = money(income);
  document.getElementById('detailExpense').textContent = money(expense);

  const filter = document.getElementById('detailRecordFilter').value;

  let list = [...accountRecords];

  if (filter !== 'all') {
    list = list.filter(r => r.type === filter);
  }

  list.sort(sortNewestFirst);

  if (!list.length) {
    document.getElementById('accountDetailRecordsList').innerHTML =
      '<div class="empty">No records for this account yet.</div>';
    return;
  }

  document.getElementById('accountDetailRecordsList').innerHTML = list.map(r => {
    const cat = categories.find(c => c.name === r.category) || categories[categories.length - 1];

    let title = r.description || r.category || 'Record';
    let meta = `${formatDisplayDate(r.date)} ${r.time || ''}`;
    let amountClass = r.type;
    let sign = r.type === 'income' ? '+' : '-';

    if (r.type === 'transfer') {
      const from = accounts.find(a => a.id === r.fromId)?.name || 'Account';
      const to = accounts.find(a => a.id === r.toId)?.name || 'Account';

      title = r.description || `Transfer: ${from} → ${to}`;
      meta = `${from} → ${to} · ${formatDisplayDate(r.date)} ${r.time || ''}`;
      amountClass = r.fromId === selectedAccountId ? 'expense' : 'income';
      sign = r.fromId === selectedAccountId ? '-' : '+';
    }

    return `<div class="record-row">
      <div class="record-icon" style="background:${cat.color}">${cat.icon}</div>
      <div>
        <div class="record-title">${escapeHtml(title)}</div>
        <div class="record-meta">${escapeHtml(r.subcategory || r.category || 'Transfer')} · ${escapeHtml(meta)}</div>
      </div>
      <div>
  <div class="record-amount ${amountClass}">${sign}${money(r.amount)}</div>
<div class="record-actions">
  <button class="record-edit-btn" type="button" onclick="${r.type === 'transfer' ? `editTransfer('${r.id}')` : `editRecord('${r.id}')`}" title="Edit">✎</button>
  <button class="record-delete-btn" type="button" onclick="deleteRecord('${r.id}')" title="Delete">🗑</button>
</div>
</div>
    </div>`;
  }).join('');
}

function renderCharts(){
  renderCategoryPieChart();
  renderWeeklyTrendChart();
  renderDashboardCashFlowChart();
  renderDashboardSpendChart();
  renderDashboardSpendingMixChart();
}

function clearCanvas(canvas){
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function setupCanvas(canvas){
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function renderCategoryPieChart(){
  const canvas = document.getElementById('categoryPieChart');
  if (!canvas) return;

  const { ctx, width, height } = setupCanvas(canvas);
  clearCanvas(canvas);

  const expenseTotals = {};
  records
    .filter(r => r.type === 'expense' && recordUsesEnabledAccount(r))
    .forEach(r => {
      expenseTotals[r.category] = (expenseTotals[r.category] || 0) + Number(r.amount || 0);
    });

  const data = Object.entries(expenseTotals).filter(([name, total]) => total > 0);
  const total = data.reduce((sum, item) => sum + item[1], 0);

  if (!total) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
    ctx.font = '14px Segoe UI';
    ctx.fillText('No expense data yet.', 20, 40);
    return;
  }

  let start = -Math.PI / 2;
  const cx = width / 2;
  const cy = height / 2 - 10;
  const radius = Math.min(width, height) * 0.40;
  const hoverPoints = [];

  data.forEach(([categoryName, amount]) => {
    const cat = categories.find(c => c.name === categoryName) || categories[categories.length - 1];
    const slice = (amount / total) * Math.PI * 2;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = cat.color;
ctx.fill();

    hoverPoints.push({
      kind: 'arc',
      cx,
      cy,
      radius,
      inner: 0,
      start,
      end: start + slice,
      title: `${categoryName} · ${money(amount)} · ${Math.round((amount / total) * 100)}%`
    });

    start += slice;
  });

  let legendY = height - 55;
  data.slice(0, 4).forEach(([categoryName, amount], index) => {
    const cat = categories.find(c => c.name === categoryName) || categories[categories.length - 1];
    const x = 20 + (index % 2) * (width / 2);
    const y = legendY + Math.floor(index / 2) * 24;

    ctx.fillStyle = cat.color;
    ctx.fillRect(x, y, 10, 10);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
    ctx.font = '12px Segoe UI';
    ctx.fillText(`${categoryName}: ${money(amount)}`, x + 16, y + 10);
  });

  attachCanvasHover(canvas, hoverPoints);
}

function renderWeeklyTrendChart(){
  const canvas = document.getElementById('weeklyTrendChart');
  if (!canvas) return;

  const { ctx, width, height } = setupCanvas(canvas);
  clearCanvas(canvas);

  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i);

    return {
      label: d.toLocaleDateString('en-PH', { weekday: 'short' }),
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      total: 0
    };
  });

records
  .filter(r => r.type === 'expense' && recordUsesEnabledAccount(r))
    .forEach(r => {
      const day = weekDays.find(d => d.date === r.date);
      if (day) day.total += Number(r.amount || 0);
    });

  const max = Math.max(...weekDays.map(d => d.total), 1);
  const chartLeft = 34;
  const chartBottom = height - 34;
  const chartTop = 24;
  const chartWidth = width - 54;
  const chartHeight = chartBottom - chartTop;

  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border');
  ctx.beginPath();
  ctx.moveTo(chartLeft, chartTop);
  ctx.lineTo(chartLeft, chartBottom);
  ctx.lineTo(width - 20, chartBottom);
  ctx.stroke();

  ctx.beginPath();
  weekDays.forEach((d, i) => {
    const x = chartLeft + (chartWidth / 6) * i;
    const y = chartBottom - (d.total / max) * chartHeight;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
  ctx.lineWidth = 3;
  ctx.stroke();

  weekDays.forEach((d, i) => {
    const x = chartLeft + (chartWidth / 6) * i;
    const y = chartBottom - (d.total / max) * chartHeight;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
    ctx.fill();

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
    ctx.font = '12px Segoe UI';
    ctx.fillText(d.label, x - 12, height - 10);
  });
}


function setText(id, value){
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function dateKey(date){
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function parseDateKey(value){
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function addDays(date, days){
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfMonth(date){
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getDashboardDateRange(){
  const today = new Date();
  let start = startOfMonth(today);
  let end = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (dashboardRange === 'last3') start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  if (dashboardRange === 'last6') start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  if (dashboardRange === 'last12') start = new Date(today.getFullYear(), today.getMonth() - 11, 1);

  if (dashboardRange === 'all') {
    const dated = records.map(r => parseDateKey(r.date)).filter(Boolean).sort((a,b) => a - b);
    start = dated[0] || start;
    end = dated[dated.length - 1] || end;
  }

  if (dashboardRange === 'custom') {
    start = parseDateKey(document.getElementById('dashboardStartDate')?.value) || start;
    end = parseDateKey(document.getElementById('dashboardEndDate')?.value) || end;
  }

  return { start, end };
}

function isWithinRange(record, range){
  const d = parseDateKey(record.date);
  if (!d) return false;
  return d >= range.start && d <= range.end;
}

function getDashboardRecords(){
  const range = getDashboardDateRange();

  return records.filter(r =>
    isWithinRange(r, range) &&
    recordUsesEnabledAccount(r) &&
    (r.type !== 'expense' || dashboardEnabledCategories.has(r.category || 'Others')) &&
    (r.type !== 'income' || dashboardEnabledCategories.has('Income'))
  );
}

function getDashboardExpenses(){
  return getDashboardRecords().filter(r => r.type === 'expense');
}

function setDashboardRange(range){
  dashboardRange = range;

  document.querySelectorAll('[data-range]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.range === dashboardRange);
  });

  renderDashboard();
}

function toggleAllDashboardCategories(){
  if (dashboardEnabledCategories.size === categories.length) {
    dashboardEnabledCategories = new Set();
  } else {
    dashboardEnabledCategories = new Set(categories.map(c => c.name));
  }
  renderDashboard();
}

function toggleDashboardCategory(name){
  if (dashboardEnabledCategories.has(name)) {
    dashboardEnabledCategories.delete(name);
  } else {
    dashboardEnabledCategories.add(name);
  }
  renderDashboard();
}

function toggleDashboardCategoryCollapse(name){
  if (dashboardCollapsedCategories.has(name)) {
    dashboardCollapsedCategories.delete(name);
  } else {
    dashboardCollapsedCategories.add(name);
  }
  renderDashboard();
}

function renderDashboard(){
  renderDashboardAccounts();
  renderDashboardCategories();
  renderDashboardKpis();
  renderDashboardHeatmap();
  renderDashboardCashFlowChart();
  renderDashboardSpendChart();
  renderDashboardSpendingMixChart();

  document.querySelectorAll('[data-range]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.range === dashboardRange);
  });

  document.querySelectorAll('[data-cashflow-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cashflowMode === dashboardCashFlowMode);
  });

  document.querySelectorAll('[data-spend-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.spendMode === dashboardSpendMode);
  });
}

function renderDashboardAccounts(){
  const wrap = document.getElementById('dashboardAccountsGrid');
  if (!wrap) return;

if (!accounts.length) {
  wrap.innerHTML = `
    <button class="add-account-card" type="button" onclick="openAccountModal()">
      <span>Add account</span>
      <span class="add-account-plus">＋</span>
    </button>
  `;
  return;
}

  wrap.innerHTML = accounts.map(account => `
<div class="dashboard-account-card ${accountIsEnabled(account.id) ? 'active' : ''}" onclick="toggleAccountForReports('${account.id}')">
      <div class="dashboard-account-top">
        <div>
          <div class="dashboard-account-name">
            <span class="account-dot" style="background:${account.color}"></span>
            ${escapeHtml(account.name)}
          </div>
          <div class="dashboard-account-type">${escapeHtml(account.type)}</div>
        </div>
        <button class="btn account-open-btn" type="button" onclick="event.stopPropagation(); openAccountPage('${account.id}')">Open</button>
      </div>
      <div class="dashboard-account-balance">${money(accountBalance(account.id))}</div>
    </div>
  `).join('') + `
  <button class="add-account-card" type="button" onclick="openAccountModal()">
    <span>Add account</span>
    <span class="add-account-plus">＋</span>
  </button>
`;
}

function renderDashboardCategories(){
  const wrap = document.getElementById('dashboardCategoryList');
  if (!wrap) return;

  const search = (document.getElementById('dashboardCategorySearch')?.value || '').toLowerCase().trim();

  const filtered = categories.filter(cat => {
    const haystack = `${cat.name} ${cat.subs.join(' ')}`.toLowerCase();
    return !search || haystack.includes(search);
  });

  wrap.innerHTML = filtered.map(cat => {
    const enabled = dashboardEnabledCategories.has(cat.name);
return `
  <div class="dashboard-category-item">
    <button class="dashboard-category-main" type="button" onclick="toggleDashboardCategory('${escapeAttr(cat.name)}')">
      <span class="dashboard-category-check ${enabled ? '' : 'off'}">✓</span>
      <span class="dashboard-category-name">${escapeHtml(cat.name)}</span>
      <span>${cat.icon}</span>
    </button>
  </div>
`;
  }).join('');
}

function renderDashboardKpis(){
  const range = getDashboardDateRange();
  const list = getDashboardRecords();
  const income = list.filter(r => r.type === 'income').reduce((s,r) => s + Number(r.amount || 0), 0);
  const expense = list.filter(r => r.type === 'expense').reduce((s,r) => s + Number(r.amount || 0), 0);
  const savingsRate = income ? ((income - expense) / income) * 100 : 0;
  const days = Math.max(1, Math.round((range.end - range.start) / 86400000) + 1);
  const avgDailySpend = expense / days;

  const essentialCategories = new Set(['Food & Drinks', 'Housing', 'Transportation', 'Vehicle', 'Communication, PC', 'Financial expenses']);
  const essential = list
    .filter(r => r.type === 'expense' && essentialCategories.has(r.category))
    .reduce((s,r) => s + Number(r.amount || 0), 0);
  const essentialPercent = expense ? (essential / expense) * 100 : 0;

  setText('kpiSavingsRate', `${savingsRate.toFixed(1)}%`);
  setText('kpiAvgDailySpend', money(avgDailySpend));
  setText('kpiEssentialSpend', `${essentialPercent.toFixed(1)}%`);
  setText('kpiSavingsHint', income ? (savingsRate >= 20 ? 'Great! Exceeding the 20% rule' : 'Below the 20% savings goal') : 'No income in this range');
  setText('kpiAvgDailyHint', `Based on ${money(expense)} spend over ${days} days`);
  setText('kpiEssentialHint', `${money(essential)} of ${money(expense)} total spending`);
}
function renderDashboardHeatmap(){
  const wrap = document.getElementById('expenseHeatmap');
  if (!wrap) return;

  const range = getDashboardDateRange();
  const totals = {};

  getDashboardExpenses().forEach(r => {
    totals[r.date] = (totals[r.date] || 0) + Number(r.amount || 0);
  });

  const values = Object.values(totals);
  const max = Math.max(...values, 1);
  const total = values.reduce((s,v) => s + v, 0);
  setText('heatmapRangeTotal', `Total range spend: ${money(total)}`);

  const months = {};
  let d = new Date(range.start);
  const end = new Date(range.end);

  while (d <= end) {
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
    if (!months[monthKey]) {
      months[monthKey] = {
        label: d.toLocaleDateString('en-US', { month:'short', year:'numeric' }),
        cells: []
      };
    }

    const key = dateKey(d);
    const amount = totals[key] || 0;
    const level = amount <= 0 ? 0 : Math.min(4, Math.ceil((amount / max) * 4));

    months[monthKey].cells.push(`
      <span 
        class="heatmap-cell level-${level}" 
        title="${formatDisplayDate(key)} · ${money(amount)}">
      </span>
    `);

    d = addDays(d, 1);
  }

  wrap.innerHTML = `
    <div class="heatmap-grid">
      ${Object.values(months).map(month => `
        <div class="heatmap-month-row">
          <div class="heatmap-month-label">${month.label}</div>
          ${month.cells.join('')}
        </div>
      `).join('')}
    </div>
  `;
}

function groupRecordsByMode(list, mode){
  const map = {};

  list.forEach(r => {
    const d = parseDateKey(r.date);
    if (!d) return;

    let key = r.date;
    let label = d.toLocaleDateString('en-PH', { month:'short', day:'numeric' });

    if (mode === 'weekly') {
      const monday = addDays(d, d.getDay() === 0 ? -6 : 1 - d.getDay());
      key = dateKey(monday);
      label = monday.toLocaleDateString('en-PH', { month:'short', day:'numeric' });
    }

    if (mode === 'monthly') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
      label = d.toLocaleDateString('en-PH', { month:'short', year:'2-digit' });
    }

    if (!map[key]) map[key] = { key, label, income:0, expense:0, categories:{} };

    if (r.type === 'income') map[key].income += Number(r.amount || 0);
    if (r.type === 'expense') {
      const amount = Number(r.amount || 0);
      map[key].expense += amount;
      map[key].categories[r.category] = (map[key].categories[r.category] || 0) + amount;
    }
  });

  return Object.values(map).sort((a,b) => a.key.localeCompare(b.key));
}

function renderDashboardCashFlowChart(){
  const canvas = document.getElementById('dashboardCashFlowChart');
  if (!canvas) return;

  const list = groupRecordsByMode(getDashboardRecords(), dashboardCashFlowMode);
  const income = list.reduce((s,d) => s + d.income, 0);
  const expense = list.reduce((s,d) => s + d.expense, 0);

  setText('cashMoneyIn', money(income));
  setText('cashMoneyOut', money(expense));
  setText('cashWhatsLeft', money(income - expense));

  const { ctx, width, height } = setupCanvas(canvas);
  clearCanvas(canvas);

  if (!list.length) {
    drawEmptyChart(ctx, 'No cash flow data yet.');
    return;
  }

  drawLineChart(ctx, width, height, list, [
    { key:'income', color:'#14f195' },
    { key:'expense', color:'#7c3cff' }
  ]);
}

function renderDashboardSpendChart(){
  const canvas = document.getElementById('dashboardSpendChart');
  if (!canvas) return;

  const list = groupRecordsByMode(getDashboardRecords(), dashboardSpendMode);
  const max = Math.max(...list.map(d => d.expense), 0);
  const avg = list.length ? list.reduce((s,d) => s + d.expense, 0) / list.length : 0;

  setText('spendPeak', money(max));
  setText('spendAverage', money(avg));

  const { ctx, width, height } = setupCanvas(canvas);
  clearCanvas(canvas);

  if (!list.length) {
    drawEmptyChart(ctx, 'No spend data yet.');
    return;
  }

  drawStackedSpendChart(ctx, width, height, list);
}

function renderDashboardSpendingMixChart(){
  const canvas = document.getElementById('dashboardSpendingMixChart');
  const listWrap = document.getElementById('spendingMixList');
  if (!canvas || !listWrap) return;

  const totals = {};
  getDashboardExpenses().forEach(r => {
    totals[r.category] = (totals[r.category] || 0) + Number(r.amount || 0);
  });

  const data = Object.entries(totals)
    .map(([name, total]) => ({ name, total, cat: categories.find(c => c.name === name) || categories[categories.length - 1] }))
    .filter(item => item.total > 0)
    .sort((a,b) => b.total - a.total);

  const total = data.reduce((s,item) => s + item.total, 0);
  setText('spendingMixTotal', `Total spend: ${money(total)}`);

  const { ctx, width, height } = setupCanvas(canvas);
  clearCanvas(canvas);

  if (!data.length) {
    drawEmptyChart(ctx, 'No spending mix yet.');
    listWrap.innerHTML = '<div class="empty">No category spending yet.</div>';
    return;
  }

  drawDonut(ctx, width, height, data, total);

  listWrap.innerHTML = data.slice(0, 8).map(item => {
    const percent = total ? (item.total / total) * 100 : 0;
    return `
      <div class="mix-row" title="${escapeHtml(item.name)} · ${money(item.total)} · ${percent.toFixed(1)}%">
        <div>
          <div class="mix-name"><span class="mix-dot" style="background:${item.cat.color}"></span>${escapeHtml(item.name)}</div>
          <div class="mix-bar"><div class="mix-bar-fill" style="width:${percent}%; background:${item.cat.color}"></div></div>
        </div>
        <div class="mix-percent">${percent.toFixed(0)}%</div>
      </div>
    `;
  }).join('');
}

function drawEmptyChart(ctx, text){
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
  ctx.font = '14px Segoe UI';
  ctx.fillText(text, 20, 40);
}

function drawChartGrid(ctx, width, height, left, right, top, bottom){
  ctx.strokeStyle = 'rgba(244,240,232,.07)';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i++) {
    const y = top + ((bottom - top) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }
}
function roundUpTo5k(value){
  return Math.max(5000, Math.ceil((Number(value) || 0) / 5000) * 5000);
}

function drawYAxisLabels(ctx, left, top, bottom, max){
  const labelColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
  const roundedMax = roundUpTo5k(max);

  ctx.fillStyle = labelColor;
  ctx.font = '11px Segoe UI';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const steps = 4;

  for (let i = 0; i <= steps; i++) {
    const value = roundedMax - (roundedMax / steps) * i;
    const y = top + ((bottom - top) / steps) * i;

    ctx.fillText(compactMoney(value), left - 8, y);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  return roundedMax;
}
function getCanvasTooltip(){
  let tooltip = document.getElementById('canvasTooltip');

  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'canvasTooltip';
    tooltip.className = 'canvas-tooltip';
    document.body.appendChild(tooltip);
  }

  return tooltip;
}

function attachCanvasHover(canvas, points){
  const tooltip = getCanvasTooltip();

  canvas.onmousemove = function(event){
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const hit = points.find(point => {
      if (point.kind === 'arc') {
        const dx = x - point.cx;
        const dy = y - point.cy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx);
        if (angle < -Math.PI / 2) angle += Math.PI * 2;

        return distance <= point.radius &&
               distance >= (point.inner || 0) &&
               angle >= point.start &&
               angle <= point.end;
      }

      return x >= point.x - point.w / 2 &&
             x <= point.x + point.w / 2 &&
             y >= point.y - point.h / 2 &&
             y <= point.y + point.h / 2;
    });

    if (hit) {
      tooltip.textContent = hit.title;
      tooltip.style.left = event.clientX + 'px';
      tooltip.style.top = event.clientY + 'px';
      tooltip.style.opacity = '1';
    } else {
      tooltip.style.opacity = '0';
    }
  };

  canvas.onmouseleave = function(){
    tooltip.style.opacity = '0';
  };
}

function drawLineChart(ctx, width, height, data, lines){
  const canvas = ctx.canvas;
  const left = 56;
  const right = width - 22;
  const top = 22;
  const bottom = height - 44;
  const max = roundUpTo5k(Math.max(...data.flatMap(d => lines.map(line => d[line.key])), 1));
  const hoverPoints = [];

  drawChartGrid(ctx, width, height, left, right, top, bottom);
  drawYAxisLabels(ctx, left, top, bottom, max);

  lines.forEach(line => {
    ctx.beginPath();

    data.forEach((d, i) => {
      const x = left + ((right - left) / Math.max(1, data.length - 1)) * i;
      const y = bottom - (d[line.key] / max) * (bottom - top);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = line.color;
    ctx.lineWidth = 3;
    ctx.stroke();

    data.forEach((d, i) => {
      const x = left + ((right - left) / Math.max(1, data.length - 1)) * i;
      const y = bottom - (d[line.key] / max) * (bottom - top);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = line.color;
      ctx.fill();

      hoverPoints.push({
        x,
        y,
        w: 18,
        h: 18,
        title: `${line.key === 'income' ? 'Income' : 'Expense'} · ${d.label} · ${money(d[line.key])}`
      });
    });
  });

  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
  ctx.font = '12px Segoe UI';

  data.forEach((d, i) => {
    if (data.length > 12 && i % Math.ceil(data.length / 8) !== 0) return;
    const x = left + ((right - left) / Math.max(1, data.length - 1)) * i;
    ctx.fillText(d.label, x - 18, height - 14);
  });

  attachCanvasHover(canvas, hoverPoints);
}
function drawStackedSpendChart(ctx, width, height, data){
  const canvas = ctx.canvas;
  const left = 56;
  const right = width - 20;
  const top = 22;
  const bottom = height - 44;
  const max = roundUpTo5k(Math.max(...data.map(d => d.expense), 1));
  const barGap = 5;
  const barWidth = Math.max(8, ((right - left) / data.length) - barGap);
  const hoverPoints = [];

  drawChartGrid(ctx, width, height, left, right, top, bottom);
  drawYAxisLabels(ctx, left, top, bottom, max);

  data.forEach((d, i) => {
    const x = left + ((right - left) / data.length) * i;
    let y = bottom;

    Object.entries(d.categories).forEach(([categoryName, amount]) => {
      if (!dashboardEnabledCategories.has(categoryName)) return;

      const cat = categories.find(c => c.name === categoryName) || categories[categories.length - 1];
      const h = (amount / max) * (bottom - top);

      y -= h;

      ctx.fillStyle = cat.color;
      ctx.fillRect(x, y, barWidth, h);

      hoverPoints.push({
        x: x + barWidth / 2,
        y: y + h / 2,
        w: barWidth,
        h: Math.max(h, 10),
        title: `${categoryName} · ${d.label} · ${money(amount)}`
      });
    });
  });

  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
  ctx.font = '12px Segoe UI';

  data.forEach((d, i) => {
    if (data.length > 14 && i % Math.ceil(data.length / 8) !== 0) return;
    const x = left + ((right - left) / data.length) * i;
    ctx.fillText(d.label, x - 10, height - 14);
  });

  attachCanvasHover(canvas, hoverPoints);
}

function drawDonut(ctx, width, height, data, total){
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 3;
  const inner = radius * .58;
  let start = -Math.PI / 2;

  data.forEach(item => {
    const slice = (item.total / total) * Math.PI * 2;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, start + slice);
    ctx.arc(cx, cy, inner, start + slice, start, true);
    ctx.closePath();
    ctx.fillStyle = item.cat.color;
    ctx.fill();

    start += slice;
  });

  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
  ctx.font = '12px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText('total spend', cx, cy - 6);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text');
  ctx.font = '700 14px Segoe UI';
  ctx.fillText(money(total), cx, cy + 14);
  ctx.textAlign = 'left';
}

function escapeAttr(value){
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function renderCategories(){
  document.getElementById('categoryGrid').innerHTML = categories.map(c => `<div class="category-card">
    <div class="category-icon" style="background:${c.color}">${c.icon}</div>
    <div><div class="category-name">${c.name}</div><div class="category-sub">${c.subs.join(' · ')}</div></div>
  </div>`).join('');
}

function syncSelectedCategory(){
  updateCategoryPickerButton();
}

let pickerCategory = null;

function categoryValueParts(){
  const [category, subcategory = ''] = recordCategory.value.split('|');
  return { category, subcategory };
}

function updateCategoryPickerButton(){
  const { category, subcategory } = categoryValueParts();
  const cat = categories.find(c => c.name === category) || categories[0];

  categoryPickerIcon.textContent = cat.icon;
  categoryPickerIcon.style.background = cat.color;
  categoryPickerText.textContent = subcategory || category;
}

function positionCategoryDropdown(){
  const btn = document.querySelector('.category-picker-btn');
  const dropdown = document.getElementById('categoryPickerDropdown');
  if (!btn || !dropdown) return;

  const rect = btn.getBoundingClientRect();
  const gap = 8;
  const sidePadding = 16;

  dropdown.style.left = rect.left + 'px';
  dropdown.style.width = rect.width + 'px';
  dropdown.style.top = (rect.bottom + gap) + 'px';

  const availableBelow = window.innerHeight - rect.bottom - gap - sidePadding;
  dropdown.style.maxHeight = Math.max(260, availableBelow) + 'px';
}

function openCategoryPicker(){
  renderCategoryPickerAll();
  categoryPickerDropdown.classList.toggle('open');
  positionCategoryDropdown();
}

function closeCategoryPicker(){
  categoryPickerDropdown.classList.remove('open');
}

function renderCategoryPickerAll(){
  categoryPickerDropdown.innerHTML = `
    <div class="picker-section-title">All Categories</div>
    ${categories.map(cat => `
      <button class="picker-row" type="button" onclick="renderCategoryPickerSubs('${cat.name}')">
        <span class="picker-circle" style="background:${cat.color}">${cat.icon}</span>
        <span>${cat.name}</span>
      </button>
    `).join('')}
  `;
}
function renderCategoryPickerSubs(categoryName){
  const cat = categories.find(c => c.name === categoryName);
  if (!cat) return;

  categoryPickerDropdown.innerHTML = `
    <div class="picker-section-title picker-title-row">
      <button class="picker-back-btn" type="button" onclick="renderCategoryPickerAll()">←</button>
      <span>General</span>
    </div>

    <button class="picker-row" type="button" onclick="chooseCategory('${cat.name}', '')">
      <span class="picker-circle" style="background:${cat.color}">${cat.icon}</span>
      <span>${cat.name}</span>
    </button>

    <div class="picker-section-title">Subcategories</div>
    ${cat.subs.map(sub => `
      <button class="picker-row" type="button" onclick="chooseCategory('${cat.name}', '${sub}')">
        <span class="picker-circle" style="background:${cat.color}">${cat.icon}</span>
        <span>${sub}</span>
      </button>
    `).join('')}
  `;
  positionCategoryDropdown();
categoryPickerDropdown.scrollTop = 0;
}

function chooseCategory(category, subcategory = ''){
  recordCategory.value = `${category}|${subcategory}`;
  updateCategoryPickerButton();
  closeCategoryPicker();
}

function populateAccountSelects(){
  const accountOptions = accounts
    .map(a => `<option value="${a.id}">${escapeHtml(a.name)} · ${escapeHtml(a.type)}</option>`)
    .join('');

  ['recordAccount','recordFromAccount','recordToAccount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = accountOptions;
  });

  if (selectedAccountId && document.getElementById('recordAccount')) {
    document.getElementById('recordAccount').value = selectedAccountId;
  }
}

let pendingImportedRows = [];

function downloadPaidItData(){
  const cleanRecords = records.map(r => ({
    type: r.type,
    amount: Number(r.amount || 0),
    accountId: r.accountId || '',
    fromId: r.fromId || '',
    toId: r.toId || '',
    category: r.category || '',
    subcategory: r.subcategory || '',
    description: r.description || '',
    date: r.date || '',
    time: r.time || '',
    notes: r.notes || ''
  }));

  const backup = {
    app: 'PaidIt',
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    records: cleanRecords
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `paidit-backup-${nowDate()}.json`);
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearAllEntries(){
  const confirmed = confirm('This will delete all PaidIt records but keep your accounts. Continue?');
  if (!confirmed) return;

  records = [];
  saveRecords();
  render();
}

async function handlePaidItUpload(event){
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'json') {
    await importPaidItJson(file);
    return;
  }

  if (['csv', 'xls', 'xlsx'].includes(ext)) {
    await importSpreadsheetFile(file, ext);
    return;
  }

  alert('Unsupported file type. Use .json, .csv, .xls, or .xlsx.');
}

async function importPaidItJson(file){
  const text = await file.text();

  try {
    const data = JSON.parse(text);

    if (!Array.isArray(data.accounts) || !Array.isArray(data.records)) {
      alert('This JSON does not look like a PaidIt backup.');
      return;
    }

    const confirmed = confirm('Import this backup? This will replace your current accounts and records.');
    if (!confirmed) return;

    accounts = data.accounts;
    records = data.records.map(normalizeImportedRecord);
    selectedAccountId = accounts[0]?.id || '';

    saveAccounts();
    saveRecords();
    render();

    alert('PaidIt backup imported.');
  } catch (error) {
    alert('Could not read this JSON file.');
  }
}

async function importSpreadsheetFile(file, ext){
  let rows = [];

  if (ext === 'csv') {
    const text = await file.text();
    rows = parseCsv(text);
  } else {
    if (typeof XLSX === 'undefined') {
      alert('Spreadsheet import needs internet because SheetJS is loaded from CDN.');
      return;
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
  }

  pendingImportedRows = rows
    .map(row => mapSpreadsheetRowToRecord(row))
    .filter(Boolean);

  if (!pendingImportedRows.length) {
    alert('No usable rows found in this spreadsheet.');
    return;
  }

  openImportAccountModal();
}

function openImportAccountModal(){
  if (!accounts.length) {
    alert('Create an account first before importing records.');
    return;
  }

  importAccountSelect.innerHTML = accounts
    .map(a => `<option value="${a.id}">${escapeHtml(a.name)} · ${escapeHtml(a.type)}</option>`)
    .join('');

  importAccountSelect.value = selectedAccountId || accounts[0].id;
  importPreviewText.textContent = `${pendingImportedRows.length} records ready to import.`;
  importAccountModalBackdrop.classList.add('open');
}

function closeImportAccountModal(){
  importAccountModalBackdrop.classList.remove('open');
}

function confirmSpreadsheetImport(){
  const accountId = importAccountSelect.value;
  if (!accountId || !pendingImportedRows.length) return;

  const newRecords = pendingImportedRows.map(r => ({
    ...r,
    id: uid('rec'),
    createdAt: Date.now(),
    accountId
  }));

  records = [...newRecords, ...records];
  saveRecords();

  pendingImportedRows = [];
  closeImportAccountModal();
  render();

  alert(`${newRecords.length} records imported.`);
}

function normalizeImportedRecord(record){
  return {
    id: record.id || uid('rec'),
    createdAt: record.createdAt || Date.now(),
    type: record.type || 'expense',
    amount: Number(record.amount || 0),
    accountId: record.accountId || '',
    fromId: record.fromId || '',
    toId: record.toId || '',
    category: record.category || 'Others',
    subcategory: record.subcategory || '',
    description: record.description || '',
    date: normalizeDate(record.date),
    time: record.time || '12:00',
    notes: record.notes || ''
  };
}
function mapSpreadsheetRowToRecord(row){
  const get = (...names) => {
    const keys = Object.keys(row);
    const found = keys.find(k =>
      names.some(name => cleanHeader(k) === cleanHeader(name))
    );
    return found ? row[found] : '';
  };

  const description =
    get('name', 'item', 'item name', 'description', 'title', 'note') || 'Imported record';

  const amountRaw =
    get('amount', 'expense', 'expenses', 'cost', 'price', 'value', 'total');

  const dateRaw =
    get('date', 'transaction date', 'created', 'created at');

  const categoryRaw =
    get('category', 'main category', 'custom category');

  const subcategoryRaw =
    get('subcategory', 'sub category', 'category name');

  const notesRaw =
    get('notes', 'note', 'memo', 'comment');

  const typeRaw =
    get('payment_type', 'payment type', 'payment_type_local', 'payment type local', 'income/expense');

  const amount = parseMoney(amountRaw);
  if (!amount) return null;

  const detectedType = detectSpreadsheetRecordType(typeRaw, amountRaw, categoryRaw);
  const matched = matchPaidItCategory(categoryRaw, subcategoryRaw);

  return {
    type: detectedType,
    amount,
    category: detectedType === 'income' && matched.category === 'Others' ? 'Income' : matched.category,
    subcategory: detectedType === 'income' && matched.category === 'Others' ? '' : matched.subcategory,
    description: String(description || '').trim(),
    date: normalizeDate(dateRaw),
    time: '12:00',
    notes: String(notesRaw || '').trim()
  };
}

function matchPaidItCategory(categoryRaw, subcategoryRaw){
  const categoryText = String(categoryRaw || '').trim();
  const subcategoryText = String(subcategoryRaw || '').trim();

  const directCategory = categories.find(c =>
    cleanText(c.name) === cleanText(categoryText)
  );

  if (directCategory) {
    const sub = directCategory.subs.find(s =>
      cleanText(s) === cleanText(subcategoryText)
    );

    return {
      category: directCategory.name,
      subcategory: sub || ''
    };
  }

  for (const cat of categories) {
    const sub = cat.subs.find(s =>
      cleanText(s) === cleanText(categoryText) ||
      cleanText(s) === cleanText(subcategoryText)
    );

    if (sub) {
      return {
        category: cat.name,
        subcategory: sub
      };
    }
  }

  return {
    category: 'Others',
    subcategory: 'Missing'
  };
}

function cleanHeader(value){
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function cleanText(value){
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}

function detectSpreadsheetRecordType(typeRaw, amountRaw, categoryRaw){
  const typeText = cleanText(typeRaw);
  const categoryText = cleanText(categoryRaw);
  const amountText = String(amountRaw || '').trim();

  if (typeText.includes('income')) return 'income';
  if (typeText.includes('expense')) return 'expense';

  if (categoryText === 'income') return 'income';

  if (amountText.startsWith('+')) return 'income';
  if (amountText.startsWith('-')) return 'expense';

  const num = Number(amountText.replace(/[₱,$,\s]/g, ''));
  if (num > 0) return 'income';
  if (num < 0) return 'expense';

  return 'expense';
}

function parseMoney(value){
  if (typeof value === 'number') return Math.abs(value);

  const cleaned = String(value || '')
    .replace(/[₱,$,\s]/g, '')
    .replace(/[()]/g, '')
    .trim();

  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.abs(num) : 0;
}

function normalizeDate(value){
  if (!value) return nowDate();

  if (typeof value === 'number') {
    const excelDate = new Date(Math.round((value - 25569) * 86400 * 1000));
    return `${excelDate.getFullYear()}-${String(excelDate.getMonth() + 1).padStart(2,'0')}-${String(excelDate.getDate()).padStart(2,'0')}`;
  }

  const text = String(value).trim();

  const yyyyMmDd = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (yyyyMmDd) {
    return `${yyyyMmDd[1]}-${yyyyMmDd[2].padStart(2,'0')}-${yyyyMmDd[3].padStart(2,'0')}`;
  }

  const mmDdYyyy = text.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (mmDdYyyy) {
    return `${mmDdYyyy[3]}-${mmDdYyyy[1].padStart(2,'0')}-${mmDdYyyy[2].padStart(2,'0')}`;
  }

  const parsed = new Date(text);
  if (!isNaN(parsed)) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2,'0')}-${String(parsed.getDate()).padStart(2,'0')}`;
  }

  return nowDate();
}

function parseCsv(text){
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return [];

  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

function splitCsvLine(line){
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function openAccountModal(){
  editingAccountId = null;
  document.getElementById('accountModalTitle').textContent = 'Create account';
  document.getElementById('accountSubmitBtn').textContent = 'Create Account';
  document.getElementById('accountModalBackdrop').classList.add('open');
  setTimeout(() => document.getElementById('accountName').focus(),0);
}

function closeAccountModal(){
  editingAccountId = null;
  document.getElementById('accountModalBackdrop').classList.remove('open');
  document.getElementById('accountForm').reset();
  document.getElementById('accountColor').value = '#24e384';
}

function openBalanceChoiceModal(){
  document.getElementById('balanceChoiceModalBackdrop').classList.add('open');
}

function closeBalanceChoiceModal(){
  document.getElementById('balanceChoiceModalBackdrop').classList.remove('open');
}

let balanceAdjustMode = 'record';

function openBalanceAdjustModal(mode = 'record'){
  balanceAdjustMode = mode;

  const selected = accounts.find(a => a.id === selectedAccountId);
  if (!selected) return;

  document.getElementById('adjustBalanceTitle').textContent =
    mode === 'initial' ? 'Change initial balance' : 'Adjust balance';

  document.getElementById('adjustBalanceInput').value =
    mode === 'initial'
      ? Number(selected.initial || 0).toFixed(2)
      : accountBalance(selected.id).toFixed(2);

  document.getElementById('balanceAdjustModalBackdrop').classList.add('open');

  setTimeout(() => {
    adjustBalanceInput.focus();
    adjustBalanceInput.select();
  }, 0);
}

function closeBalanceAdjustModal(){
  document.getElementById('balanceAdjustModalBackdrop').classList.remove('open');
}

function adjustByRecord(){
  openBalanceAdjustModal('record');
}

function changeInitialBalance(){
  openBalanceAdjustModal('initial');
}

function insertAdjustedBalance(){
  const selected = accounts.find(a => a.id === selectedAccountId);
  if (!selected) return;

  const wantedBalance = Number(adjustBalanceInput.value || 0);

  if (balanceAdjustMode === 'initial') {
    selected.initial = wantedBalance;
    saveAccounts();
  } else {
    const currentBalance = accountBalance(selected.id);
    const difference = wantedBalance - currentBalance;

    if (difference !== 0) {
      records.unshift({
        id: uid('rec'),
        createdAt: Date.now(),
        type: difference > 0 ? 'income' : 'expense',
        amount: Math.abs(difference),
        accountId: selected.id,
        category: 'Others',
        description: 'Balance adjustment',
        date: nowDate(),
        time: nowTime()
      });

      saveRecords();
    }
  }

  closeBalanceAdjustModal();
  render();
}

function editAccount(id){
  const account = accounts.find(a => a.id === id);
  if (!account) return;

  editingAccountId = id;
  accountName.value = account.name;
  accountType.value = account.type;
  accountInitial.value = account.initial;
  accountColor.value = account.color;

  document.getElementById('accountModalTitle').textContent = 'Edit account';
  document.getElementById('accountSubmitBtn').textContent = 'Update Account';
  document.getElementById('accountModalBackdrop').classList.add('open');
}
document.getElementById('accountForm').addEventListener('submit', e => {
  e.preventDefault();
const accountData = {
  name: accountName.value.trim(),
  type: accountType.value,
  initial: Number(accountInitial.value || 0),
  color: accountColor.value
};

if (!accountData.name) return;

if (editingAccountId) {
  accounts = accounts.map(a => a.id === editingAccountId ? { ...a, ...accountData } : a);
} else {
  const account = { id: uid('acct'), ...accountData };
  accounts.push(account);
  selectedAccountId = account.id;
}

saveAccounts();
closeAccountModal();
render();
});

function toggleQuick(force){
  if (!accounts.length) { openAccountModal(); return; }
  const open = typeof force === 'boolean' ? force : !document.getElementById('quickMenu').classList.contains('open');
  document.getElementById('quickMenu').classList.toggle('open', open);
  document.getElementById('quickOverlay').classList.toggle('open', open);
  document.getElementById('quickAddBtn').classList.toggle('open', open);
}
function openRecordModal(){
  editingRecordId = null;
  toggleQuick(false);
  amountBuffer = '';
  setRecordType('expense');
  updateAmountPreview();
  recordDate.value = nowDate();
  recordTime.value = nowTime();
  recordDescription.value = '';
  if (document.getElementById('recordNotes')) recordNotes.value = '';
  document.getElementById('recordModalBackdrop').classList.add('open');
}

function closeRecordModal(){
  editingRecordId = null;
  document.getElementById('recordModalBackdrop').classList.remove('open');
}

function setRecordType(type){
  recordType = type;

  document.getElementById('incomeTypeBtn').classList.toggle('active', type === 'income');
  document.getElementById('expenseTypeBtn').classList.toggle('active', type === 'expense');
  document.getElementById('transferTypeBtn').classList.toggle('active', type === 'transfer');

  document.getElementById('recordForm').classList.toggle('transfer-mode', type === 'transfer');
if (type === 'income') {
  recordCategory.value = 'Income|';
updateCategoryPickerButton();
}

  updateAmountPreview();
}

function safeCalculate(expression) {
  if (!/^[0-9+\-*/.() ]+$/.test(expression)) return 0;

  try {
    const result = Function(`"use strict"; return (${expression})`)();
    return Number.isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

function updateAmountPreview(){
  let prefix = '+';

  if (recordType === 'expense') prefix = '-';
  if (recordType === 'transfer') prefix = '⇄';

  recordAmount.value = amountBuffer || '0';
  amountPreview.innerHTML = `<span class="amount-prefix">${prefix}</span>${amountBuffer || '0'}`;
}

function calculateAmount(){
  const result = safeCalculate(amountBuffer);
  amountBuffer = result ? String(Number(result.toFixed(2))) : '';
  recordAmount.value = amountBuffer || '0';
  updateAmountPreview();
}

function buildNumpad(){
  const keys = ['7','8','9','4','5','6','1','2','3','.','0','⌫'];
  document.getElementById('numpad').innerHTML = keys
    .map(k => `<button type="button" onclick="pressNum('${k}')">${k}</button>`)
    .join('');
}

function pressNum(key){
  if (key === '⌫') {
    amountBuffer = amountBuffer.slice(0, -1);
  } else if (key === '.') {
    const parts = amountBuffer.split(/[+\-*/]/);
    const currentNumber = parts[parts.length - 1];
    if (currentNumber.includes('.')) return;
    amountBuffer += amountBuffer ? '.' : '0.';
  } else {
    amountBuffer += key;
  }

  updateAmountPreview();
}

function clearNum(){
  amountBuffer = '';
  updateAmountPreview();
}

document.getElementById('recordForm').addEventListener('submit', e => {
  e.preventDefault();

  calculateAmount();

  const amount = Number(recordAmount.value || 0);

  if (!amount) {
    return alert('Enter an amount first.');
  }

let recordData;

if (recordType === 'transfer') {
  if (recordFromAccount.value === recordToAccount.value) {
    return alert('Choose two different accounts.');
  }

  recordData = {
    type: 'transfer',
    amount,
    fromId: recordFromAccount.value,
    toId: recordToAccount.value,
    category: 'Transfer',
    description: recordDescription.value.trim() || recordNotes.value.trim(),
    date: recordDate.value,
    time: recordTime.value
  };
} else {
  recordData = {
    type: recordType,
    amount,
    accountId: recordAccount.value,
    category: recordCategory.value.split('|')[0],
    subcategory: recordCategory.value.split('|')[1] || '',
    description: recordDescription.value.trim() || recordNotes.value.trim(),
    date: recordDate.value,
    time: recordTime.value
  };
}

  if (editingRecordId) {
    records = records.map(r => {
      if (r.id !== editingRecordId) return r;
      return { ...r, ...recordData, updatedAt: Date.now() };
    });
  } else {
records.unshift({
  id: uid('rec'),
  createdAt: Date.now(),
  ...recordData
});
  }

  saveRecords();
  closeRecordModal();
  render();
});
function editRecord(id){
  const record = records.find(r => r.id === id);
  if (!record || record.type === 'transfer') return;

  editingRecordId = id;
  amountBuffer = String(record.amount || '');

  setRecordType(record.type);
  updateAmountPreview();

  document.getElementById('recordAccount').value = record.accountId;
  document.getElementById('recordCategory').value = `${record.category}|${record.subcategory || ''}`;
  updateCategoryPickerButton();
  document.getElementById('recordDescription').value = record.description || '';
  document.getElementById('recordDate').value = record.date || nowDate();
  document.getElementById('recordTime').value = record.time || nowTime();

  syncSelectedCategory();

  document.getElementById('recordModalBackdrop').classList.add('open');
}

function deleteRecord(id){
  const record = records.find(r => r.id === id);
  if (!record) return;

  openDeleteModal(
    'Delete this record?',
    'This record will be permanently removed.',
    () => {
      records = records.filter(r => r.id !== id);
      saveRecords();
      render();
    }
  );
}

function editTransfer(id){
  const transfer = records.find(r => r.id === id && r.type === 'transfer');
  if (!transfer) return;

  editingRecordId = id;
  amountBuffer = String(transfer.amount || '');

  setRecordType('transfer');
  updateAmountPreview();

  document.getElementById('recordFromAccount').value = transfer.fromId;
  document.getElementById('recordToAccount').value = transfer.toId;
  document.getElementById('recordDescription').value = transfer.description || '';
  document.getElementById('recordDate').value = transfer.date || nowDate();
  document.getElementById('recordTime').value = transfer.time || nowTime();

  document.getElementById('recordModalBackdrop').classList.add('open');
}

function escapeHtml(value){ return String(value || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

if (!accounts.length) {
  accounts = [
    { id: uid('acct'), name:'Cash Wallet', type:'cash', initial:0, color:'#24e384' },
    { id: uid('acct'), name:'Savings', type:'savings account', initial:0, color:'#12c2a3' }
  ];
  selectedAccountId = accounts[0].id;
  saveAccounts();
}
buildNumpad();
setPage(currentPageId);
render();

