    const STORAGE_KEY = 'salary-growth-tracker-v1';
    const PAGE_STORAGE_KEY = 'salary-growth-tracker-active-page';
    const UI_STORAGE_KEY = 'salary-growth-tracker-ui-v1';
    const COMPANY_STORAGE_KEY = 'salary-growth-tracker-companies-v1';
    const form = document.getElementById('entryForm');
    const entriesList = document.getElementById('entriesList');
    const exportBtn = document.getElementById('saveDataBtn');
    const importFile = document.getElementById('importFile');
    const companiesList = document.getElementById('companiesList');

    const chartCanvasOnly = document.getElementById('salaryChartOnly');
    const chartShellOnly = document.getElementById('chartShellOnly');
    const legendOnly = document.getElementById('legendOnly');
    const gapSummaryOnly = document.getElementById('gapSummaryOnly');
    const chartTooltip = document.getElementById('chartTooltip');
    const chartTooltipTitle = document.getElementById('chartTooltipTitle');
    const chartTooltipDate = document.getElementById('chartTooltipDate');
    const chartTooltipAmount = document.getElementById('chartTooltipAmount');
    const chartTooltipNotes = document.getElementById('chartTooltipNotes');
    const chartYAxisLabels = document.getElementById('chartYAxisLabels');

    const jobSelect = document.getElementById('jobSelect');
    const jobInput = document.getElementById('jobInput');
    const editingIdInput = document.getElementById('editingId');
    const submitBtn = document.getElementById('submitBtn');
    const pages = document.querySelectorAll('.page');
    const zoomButtons = document.querySelectorAll('.zoom-btn');
    const rangeSelect = document.getElementById('rangeSelect');
    const toggleValueLabelsBtn = document.getElementById('toggleValueLabelsBtn');
    const graphStyleSwitchBtn = document.getElementById('graphStyleSwitchBtn');
    const graphModeSwitchBtn = document.getElementById('graphModeSwitchBtn');
const graphModeButtons = document.querySelectorAll('[data-graph-mode]');
const graphDateLabel = document.getElementById('graphDateLabel');
const prevRangeBtn = document.getElementById('prevRangeBtn');
const nextRangeBtn = document.getElementById('nextRangeBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
const heroEntries = document.getElementById('heroEntries');
const statAverage = document.getElementById('statAverage');
const heroCompanyCount = document.getElementById('heroCompanyCount');
const heroYearsTracked = document.getElementById('heroYearsTracked');
const heroAverageSalary = document.getElementById('heroAverageSalary');
const heroLatestSalary = document.getElementById('heroLatestSalary');
const heroTotalTracked = document.getElementById('heroTotalTracked');
const companyModalBackdrop = document.getElementById('companyModalBackdrop');
const deleteEntryModalBackdrop =
  document.getElementById(
    'deleteEntryModalBackdrop'
  );

const deleteEntryModalText =
  document.getElementById(
    'deleteEntryModalText'
  );

const deleteSpendItOption =
  document.getElementById(
    'deleteSpendItOption'
  );

const deleteSpendItCheckbox =
  document.getElementById(
    'deleteSpendItCheckbox'
  );

const closeDeleteEntryModalBtn =
  document.getElementById(
    'closeDeleteEntryModalBtn'
  );

const cancelDeleteEntryBtn =
  document.getElementById(
    'cancelDeleteEntryBtn'
  );

const confirmDeleteEntryBtn =
  document.getElementById(
    'confirmDeleteEntryBtn'
  );

  const clearAllEntriesModalBackdrop =
  document.getElementById(
    'clearAllEntriesModalBackdrop'
  );

const clearAllEntriesModalText =
  document.getElementById(
    'clearAllEntriesModalText'
  );

const clearAllSpendItOption =
  document.getElementById(
    'clearAllSpendItOption'
  );

const clearAllSpendItCheckbox =
  document.getElementById(
    'clearAllSpendItCheckbox'
  );

const clearAllSpendItText =
  document.getElementById(
    'clearAllSpendItText'
  );

const closeClearAllEntriesModalBtn =
  document.getElementById(
    'closeClearAllEntriesModalBtn'
  );

const cancelClearAllEntriesBtn =
  document.getElementById(
    'cancelClearAllEntriesBtn'
  );

const confirmClearAllEntriesBtn =
  document.getElementById(
    'confirmClearAllEntriesBtn'
  );

const importChoiceModalBackdrop =
  document.getElementById(
    'importChoiceModalBackdrop'
  );

const importChoiceSummary =
  document.getElementById(
    'importChoiceSummary'
  );

const importAddOption =
  document.getElementById(
    'importAddOption'
  );

const importReplaceOption =
  document.getElementById(
    'importReplaceOption'
  );

const importAddRadio =
  document.getElementById(
    'importAddRadio'
  );

const importReplaceRadio =
  document.getElementById(
    'importReplaceRadio'
  );

const importReplaceConfirmation =
  document.getElementById(
    'importReplaceConfirmation'
  );

const closeImportChoiceModalBtn =
  document.getElementById(
    'closeImportChoiceModalBtn'
  );

const cancelImportChoiceBtn =
  document.getElementById(
    'cancelImportChoiceBtn'
  );

const confirmImportChoiceBtn =
  document.getElementById(
    'confirmImportChoiceBtn'
  );

const importResultMessage =
  document.getElementById(
    'importResultMessage'
  );

let pendingDeleteEntryId = null;
let pendingImportData = null;
let pendingImportReplaceConfirmed = false;
    const closeCompanyModalBtn = document.getElementById('closeCompanyModalBtn');
    const cancelCompanyModalBtn = document.getElementById('cancelCompanyModalBtn');
    const saveCompanyModalBtn = document.getElementById('saveCompanyModalBtn');
    const companyOriginalNameInput = document.getElementById('companyOriginalName');
    const companyEditNameInput = document.getElementById('companyEditName');
    const companyEditColorInput = document.getElementById('companyEditColor');
    const companyEditNotesInput = document.getElementById('companyEditNotes');
    const insightTotalGrowth = document.getElementById('insightTotalGrowth');
const insightCagrAnnual = document.getElementById('insightCagrAnnual');
const insightCagrMonthly = document.getElementById('insightCagrMonthly');
const insightBiggestRaise = document.getElementById('insightBiggestRaise');
const insightLargestDrop = document.getElementById('insightLargestDrop');
const insightGrowth12Months = document.getElementById('insightGrowth12Months');
const insightAvgMonthly12 = document.getElementById('insightAvgMonthly12');
const insightHighestEntry = document.getElementById('insightHighestEntry');
const insightLongestGap = document.getElementById('insightLongestGap');
const insightYearVsLast = document.getElementById('insightYearVsLast');
const insightBestGrowthCompany = document.getElementById('insightBestGrowthCompany');
const insightTopEarningCompany = document.getElementById('insightTopEarningCompany');
const insightJobPerformance = document.getElementById('insightJobPerformance');

    let entries = loadEntries();
    let companySettings = loadCompanySettings();
    let hoveredPointIndex = -1;
    let hoveredPointMeta = null;
    let chartAnimationProgress = 1;

    const uiState = loadUiState();
let zoomMode = uiState.zoomMode || 'month';
let viewStart = uiState.viewStart || new Date().toISOString().slice(0, 7);
let graphMode = uiState.graphMode || 'monthly';
    let graphStyle = uiState.graphStyle || 'bar';
    let showValueLabels = uiState.showValueLabels ?? true;
    let activePage = uiState.activePage || localStorage.getItem(PAGE_STORAGE_KEY) || 'homePage';
    let hiddenCompanies = new Set(Array.isArray(uiState.hiddenCompanies) ? uiState.hiddenCompanies : []);
    function loadEntries() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return seedDemoEntries();
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : seedDemoEntries();
      } catch {
        return seedDemoEntries();
      }
    }

    function loadUiState() {
  try {
    const raw = localStorage.getItem(UI_STORAGE_KEY);
    if (!raw) {
      return {
        zoomMode: 'month',
        graphMode: 'entries',
        graphStyle: 'line',
        showValueLabels: false,
        activePage: localStorage.getItem(PAGE_STORAGE_KEY) || 'homePage',
        chartScrollLeft: 0,
        hiddenCompanies: [],
      };
    }

    const parsed = JSON.parse(raw);

   return {
  zoomMode: parsed.zoomMode || 'month',
  viewStart: parsed.viewStart || new Date().toISOString().slice(0, 7),
  graphMode: parsed?.graphMode || 'monthly',
  graphStyle: parsed?.graphStyle || 'bar',
  showValueLabels: parsed.showValueLabels ?? true,
  activePage: parsed.activePage || localStorage.getItem(PAGE_STORAGE_KEY) || 'homePage',
  chartScrollLeft: Number(parsed.chartScrollLeft || 0),
  hiddenCompanies: Array.isArray(parsed.hiddenCompanies) ? parsed.hiddenCompanies : [],
};
  } catch {
return {
  zoomMode: 'month',
  viewStart: new Date().toISOString().slice(0, 7),
  graphMode: 'monthly',
  graphStyle: 'bar',
  showValueLabels: true,
  activePage: localStorage.getItem(PAGE_STORAGE_KEY) || 'homePage',
  chartScrollLeft: 0,
  hiddenCompanies: [],
};
  }
}

function saveUiState() {
  const raw =
    JSON.stringify({
      zoomMode,
      viewStart,
      graphMode,
      graphStyle,
      showValueLabels,
      activePage,

      chartScrollLeft:
        chartShellOnly?.scrollLeft ||
        0,

      hiddenCompanies:
        [...hiddenCompanies]
    });


  localStorage.setItem(
    UI_STORAGE_KEY,
    raw
  );


  window.saveEarnItKeyToCloud?.(
    UI_STORAGE_KEY,
    raw
  );
}

function loadCompanySettings() {
  try {
    const raw = localStorage.getItem(COMPANY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveCompanySettings() {
  const raw =
    JSON.stringify(
      companySettings
    );

  localStorage.setItem(
    COMPANY_STORAGE_KEY,
    raw
  );

  window.saveEarnItKeyToCloud?.(
    COMPANY_STORAGE_KEY,
    raw
  );
}

function saveEntries() {
  const raw =
    JSON.stringify(entries);

  localStorage.setItem(
    STORAGE_KEY,
    raw
  );

  window.saveEarnItKeyToCloud?.(
    STORAGE_KEY,
    raw
  );
}

    function seedDemoEntries() {
      return [
        {
          id: crypto.randomUUID(),
          job: 'Example Company',
          date: '2025-01-01',
          salary: 25000,
          color: '#7c99ff',
          notes: 'Example entry'
        }
      ];
    }

    function sanitizeEntry(entry) {
      return {
        id: entry.id || crypto.randomUUID(),
        job: String(entry.job || '').trim(),
        date: String(entry.date || '').trim(),
        salary: Number(entry.salary || 0),
        color: /^#[0-9A-Fa-f]{6}$/.test(entry.color || '') ? entry.color : '#7c99ff',
        notes: String(entry.notes || '').trim(),
        paidTime:
               String(
                entry.paidTime || ""
              ).trim(),
        spendItAccountId:
               String(
                entry.spendItAccountId || ""
              ).trim(),
        spendItRecordId:
               String(
                entry.spendItRecordId || ""
              ).trim()
      };
    }

    function sanitizeImportedEntry(entry) {
      return {
        ...sanitizeEntry(entry),
        spendItAccountId: "",
        spendItRecordId: ""
      };
    }

    function getCompanySettings(job, fallbackColor = '#7c99ff') {
      const saved = companySettings[job] || {};
      const safeColor = /^#[0-9A-Fa-f]{6}$/.test(saved.color || '') ? saved.color : fallbackColor;

      return {
        color: safeColor,
        notes: String(saved.notes || '').trim()
      };
    }

    function ensureCompanySetting(job, fallbackColor = '#7c99ff') {
      if (!job) return;
      if (!companySettings[job]) {
        companySettings[job] = {
          color: fallbackColor,
          notes: ''
        };
      } else if (!/^#[0-9A-Fa-f]{6}$/.test(companySettings[job].color || '')) {
        companySettings[job].color = fallbackColor;
      }
    }

    function formatPeso(value) {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 0
      }).format(value || 0);
    }

    function formatMonthYear(dateString) {
      const date = new Date(dateString + 'T00:00:00');
      return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
    }

    function formatFullDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function hexToRgb(hex) {
  const clean = String(hex || '').replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return { r: 124, g: 153, b: 255 };
  }

  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map(value => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

function blendMonthlyColor(entriesForMonth) {
  if (!entriesForMonth.length) return '#7c99ff';

  let totalWeight = 0;
  let r = 0;
  let g = 0;
  let b = 0;

  entriesForMonth.forEach(entry => {
    const weight = Math.max(Number(entry.salary) || 0, 1);
    const color = getCompanySettings(entry.job, entry.color).color || entry.color || '#7c99ff';
    const rgb = hexToRgb(color);

    totalWeight += weight;
    r += rgb.r * weight;
    g += rgb.g * weight;
    b += rgb.b * weight;
  });

  if (!totalWeight) return '#7c99ff';

  let blendedR = r / totalWeight;
  let blendedG = g / totalWeight;
  let blendedB = b / totalWeight;

  blendedR = blendedR + (255 - blendedR) * 0.12;
  blendedG = blendedG + (255 - blendedG) * 0.12;
  blendedB = blendedB + (255 - blendedB) * 0.12;

  return rgbToHex(blendedR, blendedG, blendedB);
}

    function hideChartTooltip() {
      if (!chartTooltip) return;
      chartTooltip.classList.remove('open');
      chartTooltip.setAttribute('aria-hidden', 'true');
    }
    function showChartTooltip(entry, canvasX, canvasY) {
  if (!chartTooltip || !entry) return;

  const entryColor = entry.isMonthlyAggregate
    ? entry.color
    : getCompanySettings(entry.job, entry.color).color;

  chartTooltip.classList.remove('tooltip-left');

  chartTooltipTitle.textContent = entry.isMonthlyAggregate
    ? entry.tooltipDate || formatMonthYear(entry.date)
    : entry.job || 'Untitled';

chartTooltipDate.innerHTML = entry.isMonthlyAggregate
  ? ''
  : `<div class="tooltip-date-row">${formatFullDate(entry.date)}</div>`;

  chartTooltipAmount.innerHTML = `
    <div class="tooltip-pay-row">
      <span class="tooltip-color-box" style="background:${entryColor};"></span>
      <span>${formatPeso(entry.salary)}</span>
    </div>
  `;

  chartTooltipNotes.textContent = '';

  chartTooltip.classList.add('open');
  chartTooltip.setAttribute('aria-hidden', 'false');

  const canvasLeft = chartCanvasOnly.offsetLeft;
  const canvasTop = chartCanvasOnly.offsetTop;

  const dotX = canvasLeft + canvasX;
  const dotY = canvasTop + canvasY;

  const tooltipWidth = chartTooltip.offsetWidth;
  const shellWidth = chartShellOnly.clientWidth;

  let left = dotX + 14;

  if (left + tooltipWidth > shellWidth - 8) {
    left = dotX - tooltipWidth - 14;
    chartTooltip.classList.add('tooltip-left');
  }

  chartTooltip.style.left = `${left}px`;
  chartTooltip.style.top = `${dotY}px`;
}
    function getSortedEntries() {
      return [...entries]
        .map(sanitizeEntry)
        .filter(e => e.job && e.date && Number.isFinite(e.salary))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    function getVisibleSortedEntries() {
      return getSortedEntries().filter(entry => !hiddenCompanies.has(entry.job));
    }

    function monthKeyFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dateFromMonthKey(monthKey) {
  return new Date(`${monthKey}-01T00:00:00`);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getZoomMonths() {
  if (zoomMode === 'month') return 1;
  if (zoomMode === '6months') return 6;
  if (zoomMode === 'year') return 12;
  if (zoomMode === '2years') return 24;
  if (zoomMode === '5years') return 60;
  return 1;
}

function getDataMonthBounds() {
  const sorted = getSortedEntries();

  if (!sorted.length) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return {
      firstMonth: currentMonth,
      lastMonth: currentMonth
    };
  }

  return {
    firstMonth: sorted[0].date.slice(0, 7),
    lastMonth: sorted[sorted.length - 1].date.slice(0, 7)
  };
}

function getAlignedRangeStart(monthKey) {
  const date = dateFromMonthKey(monthKey);
  const year = date.getFullYear();
  const month = date.getMonth();

  if (zoomMode === 'month') {
    return monthKey;
  }

  if (zoomMode === '6months') {
    return `${year}-${month < 6 ? '01' : '07'}`;
  }

  if (zoomMode === 'year') {
    return `${year}-01`;
  }

  const { firstMonth } = getDataMonthBounds();
  const firstYear = dateFromMonthKey(firstMonth).getFullYear();

  if (zoomMode === '2years') {
    const blockStartYear = firstYear + Math.floor((year - firstYear) / 2) * 2;
    return `${blockStartYear}-01`;
  }

  if (zoomMode === '5years') {
    const blockStartYear = firstYear + Math.floor((year - firstYear) / 5) * 5;
    return `${blockStartYear}-01`;
  }

  return monthKey;
}

function getMinViewStart() {
  const { firstMonth } = getDataMonthBounds();
  return getAlignedRangeStart(firstMonth);
}

function getMaxViewStart() {
  const { lastMonth } = getDataMonthBounds();
  return getAlignedRangeStart(lastMonth);
}

function setViewToLatestEntry() {
  viewStart = getMaxViewStart();
  clampViewStart();
}
function formatDropdownRangeLabel(monthKey) {
  const date = dateFromMonthKey(monthKey);
  const year = date.getFullYear();
  const month = date.getMonth();

  if (zoomMode === 'month') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    }).format(date);
  }

  if (zoomMode === '6months') {
    return month < 6
      ? `Jan-Jun ${year}`
      : `Jul-Dec ${year}`;
  }

  if (zoomMode === 'year') {
    return String(year);
  }

  if (zoomMode === '2years') {
    return `${year}-${year + 1}`;
  }

  if (zoomMode === '5years') {
    return `${year}-${year + 4}`;
  }

  return monthKey;
}

function populateGraphMonthDropdown() {
  if (!graphDateLabel) return;

  const minViewStart = getMinViewStart();
  const maxViewStart = getMaxViewStart();

  graphDateLabel.innerHTML = '';

  for (
    let date = dateFromMonthKey(minViewStart);
    monthKeyFromDate(date) <= maxViewStart;
    date = addMonths(date, getZoomMonths())
  ) {
    const rangeKey = monthKeyFromDate(date);
    const option = document.createElement('option');

    option.value = rangeKey;
    option.textContent = formatDropdownRangeLabel(rangeKey);

    graphDateLabel.appendChild(option);
  }
}

function syncGraphDateDropdown() {
  if (!graphDateLabel) return;
  graphDateLabel.value = viewStart;
}

function clampViewStart() {
  const minViewStart = getMinViewStart();
  const maxViewStart = getMaxViewStart();

  if (viewStart < minViewStart) {
    viewStart = minViewStart;
  }

  if (viewStart > maxViewStart) {
    viewStart = maxViewStart;
  }
}

function resetViewToFirstEntry() {
  viewStart = getMinViewStart();
  clampViewStart();
}

function getVisibleRange() {
  const start = dateFromMonthKey(viewStart);
  const end = addMonths(start, getZoomMonths());
  return { start, end };
}

function isEntryInVisibleRange(entry) {
  const date = new Date(entry.date + 'T00:00:00');
  const { start, end } = getVisibleRange();
  return date >= start && date < end;
}

function formatGraphRangeLabel() {
  const { start, end } = getVisibleRange();
  const lastVisibleMonth = addMonths(end, -1);

  const startYear = start.getFullYear();
  const endYear = lastVisibleMonth.getFullYear();

  if (zoomMode === 'month') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    }).format(start);
  }

  if (zoomMode === '6months') {
    const startMonth = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(start);
    const endMonth = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(lastVisibleMonth);
    return `${startMonth} - ${endMonth} ${startYear}`;
  }

  if (zoomMode === 'year') {
    return `${startYear}`;
  }

  return `${startYear} - ${endYear}`;
}

function getGraphEntries() {
  const visibleEntries = getVisibleSortedEntries().filter(isEntryInVisibleRange);

  if (graphMode === 'entries') {
    return visibleEntries.map(entry => ({
      ...entry,
      labelDate: entry.date,
      tooltipDate: formatFullDate(entry.date),
      tooltipNotes: entry.notes || '—',
      isMonthlyAggregate: false
    }));
  }

  const monthlyMap = new Map();

  visibleEntries.forEach(entry => {
    const date = new Date(entry.date + 'T00:00:00');
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        id: `month-${monthKey}`,
        job: 'Monthly income',
        date: monthKey,
        salary: 0,
        color: '#7c99ff',
        notes: '',
        sourceEntries: []
      });
    }

    const bucket = monthlyMap.get(monthKey);
    bucket.salary += entry.salary;
    bucket.sourceEntries.push(entry);
  });

  return Array.from(monthlyMap.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(monthEntry => {
      const noteLines = monthEntry.sourceEntries.map(item => {
        const noteText = item.notes ? ` — ${item.notes}` : '';
        return `${item.job}: ${formatPeso(item.salary)}${noteText}`;
      });

      return {
        ...monthEntry,
        color: blendMonthlyColor(monthEntry.sourceEntries),
        tooltipDate: formatMonthYear(monthEntry.date),
        tooltipNotes: noteLines.join('\n') || '—',
        isMonthlyAggregate: true
      };
    });
}

function getChartMetrics(sorted, shell) {
  const padding = { top: 34, right: 34, bottom: 58, left: 84 };
  const chartHeight = 430;
  const plotHeight = chartHeight - padding.top - padding.bottom;
const maxSalary = Math.max(...sorted.map(item => item.salary), 1);
const tickStep = Math.max(1000, Math.ceil(maxSalary / 8 / 1000) * 1000);
const roundedMax = tickStep * 8;

const width = shell.clientWidth - 28;
const plotLeft = padding.left;
const plotTop = padding.top;
const plotWidth = width - padding.left - padding.right;
const xStep = plotWidth / Math.max(sorted.length, 1);
  const plotBottom = plotTop + plotHeight;

  return {
    padding,
    chartHeight,
    plotHeight,
    roundedMax,
    xStep,
    width,
    plotLeft,
    plotTop,
    plotWidth,
    plotBottom
  };
}

    function monthDiff(from, to) {
      return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    }

    function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function monthsBetweenDates(fromDate, toDate) {
  return Math.max(
    0,
    (toDate.getFullYear() - fromDate.getFullYear()) * 12 +
    (toDate.getMonth() - fromDate.getMonth())
  );
}

function getMonthlyBuckets(entriesList) {
  const map = new Map();

  entriesList.forEach(entry => {
    const date = new Date(entry.date + 'T00:00:00');
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!map.has(monthKey)) {
      map.set(monthKey, 0);
    }

    map.set(monthKey, map.get(monthKey) + entry.salary);
  });

  return Array.from(map.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
function getInsightsData(sorted) {
  if (!sorted.length) {
    return {
      totalGrowth: null,
      cagrAnnual: null,
      cagrMonthly: null,
      growth12Months: null,
      avgMonthly12: null,
      firstEntry: null,
      latestEntry: null,
      totalMonths: 0,
      totalYears: 0,
      firstInLast12: null,
      latestEntryLast12: null,
      monthlyBucketsLast12: [],
      highestMonth12: null,
      lowestMonth12: null,
      biggestRaiseAmount: null,
      biggestRaisePercent: null,
      biggestRaiseFrom: null,
      biggestRaiseTo: null,
      highestEntry: null,
      longestGapMonths: 0,
      longestGap: null,
      yearVsLast: null,
      currentYearTotal: 0,
      lastYearTotal: 0,
      currentYear: new Date().getFullYear(),
      lastYear: new Date().getFullYear() - 1
    };
  }

  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const firstDate = new Date(first.date + 'T00:00:00');
  const latestDate = new Date(latest.date + 'T00:00:00');

  const totalMonths = monthsBetweenDates(firstDate, latestDate);
  const totalYears = totalMonths / 12;

  const totalGrowth =
    sorted.length >= 2 && first.salary > 0
      ? ((latest.salary - first.salary) / first.salary) * 100
      : null;

  const cagrAnnual =
    sorted.length >= 2 && first.salary > 0 && latest.salary > 0 && totalYears > 0
      ? (Math.pow(latest.salary / first.salary, 1 / totalYears) - 1) * 100
      : null;

  const cagrMonthly =
    sorted.length >= 2 && first.salary > 0 && latest.salary > 0 && totalMonths > 0
      ? (Math.pow(latest.salary / first.salary, 1 / totalMonths) - 1) * 100
      : null;

  let biggestRaiseAmount = null;
  let biggestRaisePercent = null;
  let biggestRaiseFrom = null;
  let biggestRaiseTo = null;

  const companyGroups = new Map();

  sorted.forEach(entry => {
    if (!companyGroups.has(entry.job)) companyGroups.set(entry.job, []);
    companyGroups.get(entry.job).push(entry);
  });

  companyGroups.forEach(companyEntries => {
    companyEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

    for (let i = 1; i < companyEntries.length; i++) {
      const prev = companyEntries[i - 1];
      const curr = companyEntries[i];
      const diff = curr.salary - prev.salary;
      const pct = prev.salary > 0 ? (diff / prev.salary) * 100 : null;

      if (diff > 0 && (biggestRaiseAmount === null || diff > biggestRaiseAmount)) {
        biggestRaiseAmount = diff;
        biggestRaisePercent = pct;
        biggestRaiseFrom = prev;
        biggestRaiseTo = curr;
      }
    }
  });

  const twelveMonthsAgo = new Date(latestDate);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const entriesLast12 = sorted.filter(entry => new Date(entry.date + 'T00:00:00') >= twelveMonthsAgo);
  const firstInLast12 = entriesLast12.length ? entriesLast12[0] : null;
  const latestEntryLast12 = entriesLast12.length ? entriesLast12[entriesLast12.length - 1] : null;

  const growth12Months =
    firstInLast12 && latestEntryLast12 && firstInLast12.salary > 0 && entriesLast12.length >= 2
      ? ((latestEntryLast12.salary - firstInLast12.salary) / firstInLast12.salary) * 100
      : null;

  const monthlyBucketsLast12 = getMonthlyBuckets(entriesLast12);

  const avgMonthly12 =
    monthlyBucketsLast12.length
      ? monthlyBucketsLast12.reduce((sum, item) => sum + item.total, 0) / monthlyBucketsLast12.length
      : null;

  const highestMonth12 = monthlyBucketsLast12.length
    ? monthlyBucketsLast12.reduce((max, item) => item.total > max.total ? item : max, monthlyBucketsLast12[0])
    : null;

  const lowestMonth12 = monthlyBucketsLast12.length
    ? monthlyBucketsLast12.reduce((min, item) => item.total < min.total ? item : min, monthlyBucketsLast12[0])
    : null;

  const highestEntry = sorted.reduce((max, entry) => entry.salary > max.salary ? entry : max, sorted[0]);

  const gaps = buildGaps(sorted);
  const longestGap = gaps.length
    ? gaps.reduce((max, gap) => gap.months > max.months ? gap : max, gaps[0])
    : null;

  const longestGapMonths = longestGap ? longestGap.months : 0;

  const currentYear = latestDate.getFullYear();
  const lastYear = currentYear - 1;

  const currentYearTotal = sorted
    .filter(entry => new Date(entry.date + 'T00:00:00').getFullYear() === currentYear)
    .reduce((sum, entry) => sum + entry.salary, 0);

  const lastYearTotal = sorted
    .filter(entry => new Date(entry.date + 'T00:00:00').getFullYear() === lastYear)
    .reduce((sum, entry) => sum + entry.salary, 0);

  const yearVsLast =
    lastYearTotal > 0
      ? ((currentYearTotal - lastYearTotal) / lastYearTotal) * 100
      : null;

  return {
    totalGrowth,
    cagrAnnual,
    cagrMonthly,
    growth12Months,
    avgMonthly12,
    firstEntry: first,
    latestEntry: latest,
    totalMonths,
    totalYears,
    firstInLast12,
    latestEntryLast12,
    monthlyBucketsLast12,
    highestMonth12,
    lowestMonth12,
    biggestRaiseAmount,
    biggestRaisePercent,
    biggestRaiseFrom,
    biggestRaiseTo,
    highestEntry,
    longestGapMonths,
    longestGap,
    yearVsLast,
    currentYearTotal,
    lastYearTotal,
    currentYear,
    lastYear
  };
}
    function buildGaps(sorted) {
      if (sorted.length < 2) return [];
      const gaps = [];

      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].date + 'T00:00:00');
        const curr = new Date(sorted[i].date + 'T00:00:00');
        const diff = monthDiff(prev, curr) - 1;
        if (diff > 0) {
          const missing = [];
          const probe = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
          while (probe < new Date(curr.getFullYear(), curr.getMonth(), 1)) {
            missing.push(new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(probe));
            probe.setMonth(probe.getMonth() + 1);
          }
          gaps.push({
            from: formatMonthYear(sorted[i - 1].date),
            to: formatMonthYear(sorted[i].date),
            months: diff,
            missing
          });
        }
      }
      return gaps;
    }

    function getLegendItems(sorted) {
      const map = new Map();
      sorted.forEach(item => {
        if (!map.has(item.job)) map.set(item.job, item.color);
      });
      return Array.from(map.entries()).map(([job, color]) => ({ job, color }));
    }

    function getSavedCompanies() {
      return [...new Set(
        entries
          .map(entry => sanitizeEntry(entry).job)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
      )];
    }

    function getCompaniesWithCounts() {
      const map = new Map();

      getSortedEntries().forEach(entry => {
        const existing = map.get(entry.job) || {
          count: 0,
          total: 0,
          fallbackColor: entry.color,
          firstDate: entry.date,
          lastDate: entry.date
        };

        existing.count += 1;
        existing.total += entry.salary;

        if (entry.date < existing.firstDate) existing.firstDate = entry.date;
        if (entry.date > existing.lastDate) existing.lastDate = entry.date;

        map.set(entry.job, existing);
        ensureCompanySetting(entry.job, entry.color);
      });

      return Array.from(map.entries())
        .map(([name, info]) => {
          const settings = getCompanySettings(name, info.fallbackColor);
          return {
            name,
            count: info.count,
            total: info.total,
            firstDate: info.firstDate,
            lastDate: info.lastDate,
            color: settings.color,
            notes: settings.notes
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    }

function renderCompanyDropdown() {
    const companies = getSavedCompanies().filter(company => !hiddenCompanies.has(company));
  const currentValue = jobSelect.value;

  jobSelect.innerHTML = '<option value="">Choose saved company</option>' +
    companies.map(company => `<option value="${escapeHtml(company)}">${escapeHtml(company)}</option>`).join('');

  if (companies.includes(currentValue)) {
    jobSelect.value = currentValue;
  }
}
function renderCompaniesList() {
  const companies = getCompaniesWithCounts();

  if (!companies.length) {
    companiesList.innerHTML = '<div class="empty">No saved companies yet.</div>';
    return;
  }

  companiesList.innerHTML = companies.map(company => {
    const isOff = hiddenCompanies.has(company.name);

    return `
      <div class="company-item ${isOff ? 'is-off' : ''}" data-company-name="${encodeURIComponent(company.name)}">
        <div class="company-row">
          <div class="company-main">
            <div class="company-name" style="display:flex; align-items:center; gap:8px;">
              <span class="company-color-preview" style="background:${company.color}"></span>
              <span>${escapeHtml(company.name)}</span>
            </div>

            <div class="company-meta">
              <div class="company-meta-line">${company.count} Entr${company.count === 1 ? 'y' : 'ies'}</div>
              <div class="company-meta-line">${escapeHtml(formatMonthYear(company.firstDate))} to ${escapeHtml(formatMonthYear(company.lastDate))}</div>
              <div class="company-meta-line">${escapeHtml(formatPeso(company.total))}</div>
            </div>

            ${company.notes ? `<div class="hint" style="margin-top:6px;">${escapeHtml(company.notes)}</div>` : ''}
          </div>

          <div class="company-actions">
<button
  class="btn company-toggle-btn ${isOff ? 'is-off' : ''}"
  type="button"
  title="${isOff ? 'Show company' : 'Hide company'}"
  aria-label="${isOff ? 'Show company' : 'Hide company'}"
  onclick="toggleCompanyVisibility('${encodeCompanyNameForClick(company.name)}')"
>
  <img
    src="${isOff ? './assets/eye_closed.png' : './assets/eye_open.png'}"
    alt=""
    class="company-eye-icon"
  >
</button>
            <button class="btn" type="button" onclick="openCompanyModal('${encodeCompanyNameForClick(company.name)}')">Edit</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

    function renderFixedAxisLabels(metrics) {
  if (!chartYAxisLabels) return;

  const tickCount = 5;
  const labels = [];

  for (let i = 0; i <= tickCount; i++) {
    const value = (metrics.roundedMax / tickCount) * i;
    const y = metrics.plotBottom - (value / metrics.roundedMax) * metrics.plotHeight;

    labels.push(`
      <div class="chart-y-label" style="top:${y}px;">
        ${formatPeso(value)}
      </div>
    `);
  }

  chartYAxisLabels.innerHTML = labels.join('');
}

function drawChart(canvas, shell, animationProgress = 1) {
  const sorted = getGraphEntries();
  const gaps = buildGaps(sorted);
  const dpr = window.devicePixelRatio || 1;

  const metrics = getChartMetrics(sorted, shell);
  const {
    padding,
    chartHeight,
    plotHeight,
    roundedMax,
    xStep,
    width,
    plotLeft,
    plotTop,
    plotWidth,
    plotBottom
  } = metrics;

if (chartYAxisLabels) chartYAxisLabels.innerHTML = '';

  canvas.style.width = width + 'px';
  canvas.style.height = chartHeight + 'px';
  canvas.width = width * dpr;
  canvas.height = chartHeight * dpr;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, chartHeight);

  if (!sorted.length) {
    ctx.fillStyle = '#9aa4bf';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText('Add your first salary entry to see the graph.', 24, 40);
    return { gaps, sorted };
  }

  const axisColor = 'rgba(255,255,255,0.16)';
  const gridColor = 'rgba(255,255,255,0.07)';
  const textColor = '#cdd6f4';
  const subtle = '#8e99b4';

  const xForIndex = (index) => plotLeft + index * xStep + xStep / 2;
  const yForSalary = (salary) => plotBottom - (salary / roundedMax) * plotHeight;
  const progress = Math.max(0, Math.min(1, animationProgress));
  const animatedLimit = sorted.length <= 1 ? 0 : (sorted.length - 1) * progress;

  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(plotLeft, plotBottom);
ctx.lineTo(plotLeft + plotWidth, plotBottom);
ctx.stroke();

  const tickCount = 8;
ctx.font = '12px Inter, sans-serif';
ctx.fillStyle = subtle;

for (let i = 0; i <= tickCount; i++) {
  const value = (roundedMax / tickCount) * i;
  const y = yForSalary(value);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plotLeft, y);
  ctx.lineTo(plotLeft + plotWidth, y);
  ctx.stroke();

  ctx.fillStyle = '#9aa4bf';
  ctx.fillText(formatPeso(value), 18, y + 4);
}

sorted.forEach((entry, index) => {
  const x = xForIndex(index);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, plotTop);
  ctx.lineTo(x, plotBottom + 8);
  ctx.stroke();
});

ctx.fillStyle = textColor;
ctx.font = '600 13px Inter, sans-serif';

  sorted.forEach((entry, index) => {
  const x = xForIndex(index);
  const y = yForSalary(entry.salary);
  const pointColor = entry.isMonthlyAggregate
    ? entry.color
    : getCompanySettings(entry.job, entry.color).color;

  if (graphStyle === 'line' && index > 0) {
  if (index - 1 > animatedLimit) return;

  const prev = sorted[index - 1];
  const prevX = xForIndex(index - 1);
  const prevY = yForSalary(prev.salary);

  const segmentProgress = Math.max(0, Math.min(1, animatedLimit - (index - 1)));
  const drawY = prevY + (y - prevY) * segmentProgress;
  const drawX = prevX + (x - prevX) * segmentProgress;

  const lineColor = getCompanySettings(prev.job, prev.color).color || prev.color || pointColor;
ctx.strokeStyle = prev.isMonthlyAggregate ? prev.color : lineColor;
ctx.lineWidth = 3;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(prevX, prevY);
  const controlX = (prevX + drawX) / 2;

ctx.bezierCurveTo(
  controlX,
  prevY,
  controlX,
  drawY,
  drawX,
  drawY
);
  ctx.stroke();

  const monthsBetween = monthDiff(
    new Date(prev.date + 'T00:00:00'),
    new Date(entry.date + 'T00:00:00')
  ) - 1;

  if (monthsBetween > 0 && segmentProgress >= 1) {
    const startX = prevX + xStep / 2;
    const gapWidth = Math.max(12, x - prevX - xStep);

    ctx.fillStyle = 'rgba(255,123,123,0.10)';
    ctx.fillRect(startX, plotTop, gapWidth, plotHeight);

    ctx.fillStyle = '#ffb4b4';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(
      `${monthsBetween} month${monthsBetween > 1 ? 's' : ''} gap`,
      startX + 8,
      plotTop + 18
    );
  }
}

if (graphStyle === 'bar') {
  const isHovered = hoveredPointIndex === index;
  const barWidth = Math.max(6, Math.min(46, xStep * 0.55));
  const barLeft = x - barWidth / 2;
  const barHeight = plotBottom - y;

  if (isHovered) {
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(barLeft - 5, y - 5, barWidth + 10, barHeight + 5);
  }
const radius = 12;

ctx.fillStyle = pointColor;
ctx.beginPath();
ctx.roundRect(barLeft, y, barWidth, barHeight, radius);
ctx.fill();

ctx.strokeStyle = pointColor;
ctx.lineWidth = 1;
ctx.stroke();
}

  const isHovered = hoveredPointIndex === index;
  const pointRadius = isHovered ? 6 : 4;

  if (graphStyle === 'line') {
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(124,153,255,0.18)';
      ctx.fill();
    }

    ctx.fillStyle = pointColor;
    ctx.beginPath();
    ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = pointColor;
ctx.lineWidth = 2;
ctx.stroke();
    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.stroke();
  }

  if (showValueLabels && hoveredPointIndex !== index) {
    ctx.fillStyle = textColor;
    ctx.font = isHovered ? '700 12px Inter, sans-serif' : '600 12px Inter, sans-serif';
    ctx.fillText(formatPeso(entry.salary), x - 28, y - 18);
  }

  const currentDate = new Date(entry.date + 'T00:00:00');
  const previousEntry = index > 0 ? sorted[index - 1] : null;
  const previousDate = previousEntry ? new Date(previousEntry.date + 'T00:00:00') : null;

  const isFirstEntryOfMonth =
    index === 0 ||
    currentDate.getMonth() !== previousDate.getMonth() ||
    currentDate.getFullYear() !== previousDate.getFullYear();

if (isFirstEntryOfMonth) {
  const labelDate = new Date(entry.date + 'T00:00:00');

  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short'
  }).format(labelDate).toUpperCase();

  const yearLabel = String(labelDate.getFullYear());

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = subtle;

  ctx.font = '700 11px Inter, sans-serif';
  ctx.fillText(monthLabel, x, plotBottom + 22);

  ctx.font = '500 10px Inter, sans-serif';
  ctx.fillText(yearLabel, x, plotBottom + 36);

  ctx.restore();
}
});

  return { gaps, sorted };
}

function encodeCompanyNameForClick(companyName) {
  return encodeURIComponent(companyName).replace(/'/g, '%27');
}

function toggleCompanyVisibility(companyName) {
  companyName = decodeURIComponent(companyName || '');
  if (!companyName) return;

  if (hiddenCompanies.has(companyName)) {
    hiddenCompanies.delete(companyName);
  } else {
    hiddenCompanies.add(companyName);
  }

  saveUiState();
  renderAll();
}
function renderLegendOnly(sorted) {
  const allCompanies = getCompaniesWithCounts();

  if (!allCompanies.length) {
    legendOnly.innerHTML = '';
    return;
  }

  legendOnly.innerHTML = allCompanies.map(item => {
    const isHidden = hiddenCompanies.has(item.name);

    return `
      <button
        class="legend-item toggleable ${isHidden ? 'inactive' : ''}"
        type="button"
        onclick="toggleCompanyVisibility('${encodeCompanyNameForClick(item.name)}')"
        title="${isHidden ? 'Show in graph' : 'Hide from graph'}"
      >
        <span class="swatch" style="background:${item.color}; color:${item.color};"></span>
        ${escapeHtml(item.name)}
      </button>
    `;
  }).join('');
}

function renderGapSummaryOnly(gaps) {
  if (!gaps.length) {
    gapSummaryOnly.innerHTML = 'No work gaps detected between your saved entries.';
  } else {
    gapSummaryOnly.innerHTML = gaps
      .map(g => `<span class="fake-link">${escapeHtml(g.from)} → ${escapeHtml(g.to)}</span>: ${g.months} month${g.months > 1 ? 's' : ''} without recorded work (${escapeHtml(g.missing.join(', '))})`)
      .join('<br>');
  }
}
function syncZoomButtons() {
  clampViewStart();

  if (rangeSelect) {
    rangeSelect.value = zoomMode;
  }

  populateGraphMonthDropdown();
  syncGraphDateDropdown();

  zoomButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.zoom === zoomMode);
  });

  if (graphDisplayLabel) {
    graphDisplayLabel.textContent =
      `${graphMode === 'monthly' ? 'Monthly income' : 'Entries'} · ${formatGraphRangeLabel()}`;
  }

  if (prevRangeBtn) {
    prevRangeBtn.disabled = viewStart <= getMinViewStart();
  }

  if (nextRangeBtn) {
    const maxViewStart = getMaxViewStart();
    nextRangeBtn.disabled = viewStart >= maxViewStart;
  }
}

function syncGraphModeButtons() {
  const isMonthly = graphMode === 'monthly';

  if (graphModeSwitchBtn) {
    graphModeSwitchBtn.classList.toggle('is-monthly', isMonthly);
  }

  const text = document.getElementById('graphModeSwitchText');
  if (text) text.textContent = isMonthly ? 'Month' : 'Entry';

  if (graphDisplayLabel) {
    graphDisplayLabel.textContent =
      `${isMonthly ? 'Monthly income' : 'Entry income'} · ${formatGraphRangeLabel()}`;
  }
}

function syncValueToggleButton() {
  if (!toggleValueLabelsBtn) return;

  toggleValueLabelsBtn.classList.toggle('on', showValueLabels);

  const text = document.getElementById('valueSwitchText');
  if (text) text.textContent = showValueLabels ? 'Values On' : 'Values Off';
}

function syncGraphStyleSwitch() {
  if (!graphStyleSwitchBtn) return;

  const isLine = graphStyle === 'line';
  graphStyleSwitchBtn.classList.toggle('line', isLine);

  const text = document.getElementById('chartSwitchText');
  if (text) text.textContent = isLine ? 'Line' : 'Bar';
}
function renderHeroSummary(sorted) {
  const companyCount = getSavedCompanies().length;
  const first = sorted.length ? sorted[0] : null;
  const latest = sorted.length ? sorted[sorted.length - 1] : null;
  const totalTracked = sorted.reduce((sum, entry) => sum + entry.salary, 0);
  const avgSalary = sorted.length ? totalTracked / sorted.length : 0;

  heroEntries.textContent = String(sorted.length);
  heroCompanyCount.textContent = String(companyCount);
  heroTotalTracked.textContent = formatPeso(totalTracked);
  heroAverageSalary.textContent = formatPeso(avgSalary);
  heroLatestSalary.textContent = latest ? formatPeso(latest.salary) : '₱0';

  if (sorted.length >= 2) {
    const firstDate = new Date(first.date + 'T00:00:00');
    const latestDate = new Date(latest.date + 'T00:00:00');
    const years = monthsBetweenDates(firstDate, latestDate) / 12;
    heroYearsTracked.textContent = years.toFixed(1);
  } else {
    heroYearsTracked.textContent = '0.0';
  }
}

function syncActivePage() {

  pages.forEach(page => {
    page.classList.toggle('active', page.id === activePage);
  });

  document.body.classList.toggle('graph-mode', activePage === 'graphPage');
  document.body.classList.toggle('insights-mode', activePage === 'insightsPage');
  
  window.updateWorthItSubNavigation?.(activePage);
}

window.setPage = function(pageId) {
  const validPages = [
    "homePage",
    "graphPage",
    "insightsPage"
  ];

  if (!validPages.includes(pageId)) return;

  activePage = pageId;

localStorage.setItem(
  PAGE_STORAGE_KEY,
  activePage
);

window.saveEarnItKeyToCloud?.(
  PAGE_STORAGE_KEY,
  activePage
);

  saveUiState();
  renderAll();
};

    function renderEntries() {
  const sorted = [...entries]
  .map(sanitizeEntry)
  .filter(entry => entry.job && entry.date && Number.isFinite(entry.salary))
  .reverse();
  if (!sorted.length) {
    entriesList.innerHTML = '<div class="empty">No salary entries yet.</div>';
    return;
  }

    entriesList.innerHTML = sorted.map(entry => {
      const companyMeta = getCompanySettings(entry.job, entry.color);
      return `
    <div class="entry">
      <div class="entry-top">
        <div class="entry-title">
          <span class="swatch" style="background:${companyMeta.color}; width:14px; height:14px;"></span>
          <div>
            <strong>${escapeHtml(entry.job)}</strong>
            <div class="entry-meta">
              <span>${escapeHtml(formatMonthYear(entry.date))}</span>
              <span>${escapeHtml(formatPeso(entry.salary))}</span>
            </div>
          </div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn" type="button" onclick="editEntry('${entry.id}')">Edit</button>
          <button class="btn" type="button" onclick="removeEntry('${entry.id}')">Delete</button>
        </div>
      </div>
      ${entry.notes ? `<div class="hint">${escapeHtml(entry.notes)}</div>` : ''}
    </div>
    `;
}).join('');
}

function renderStats(sorted, gaps) {
  // Home stats row removed. Summary now lives in the hero cards.
}

function buildJobPerformanceComparison(sorted) {
  const companyMap = new Map();

  sorted.forEach(entry => {
    if (!companyMap.has(entry.job)) {
      companyMap.set(entry.job, []);
    }

    companyMap.get(entry.job).push(entry);
  });

  const rows = Array.from(companyMap.entries()).map(([company, companyEntries]) => {
    const ordered = companyEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
    const first = ordered[0];
    const latest = ordered[ordered.length - 1];
    const total = ordered.reduce((sum, entry) => sum + entry.salary, 0);
    const growth =
      ordered.length >= 2 && first.salary > 0
        ? ((latest.salary - first.salary) / first.salary) * 100
        : null;

    const monthsTracked = monthsBetweenDates(
      new Date(first.date + 'T00:00:00'),
      new Date(latest.date + 'T00:00:00')
    );

    return {
      company,
      entries: ordered.length,
      total,
      growth,
      monthsTracked
    };
  });

  if (!rows.length) return '—';

  return `
    <div class="job-performance-row header-row">
      <span>Company</span>
      <span>Growth</span>
      <span>Total</span>
      <span>Entries</span>
      <span>Span</span>
    </div>
    ${rows.map(row => `
      <div class="job-performance-row">
        <span class="job-performance-company">${escapeHtml(row.company)}</span>
        <span class="${row.growth !== null && row.growth < 0 ? 'job-performance-negative' : 'job-performance-positive'}">
          ${row.growth === null ? '—' : formatPercent(row.growth)}
        </span>
        <span>${formatPeso(row.total)}</span>
        <span>${row.entries}</span>
        <span>${row.monthsTracked} mo</span>
      </div>
    `).join('')}
  `;
}

function setInsightDetail(valueElement, html) {
  if (!valueElement) return;

  const card = valueElement.closest('.insight-card');
  if (!card) return;

  let detail = card.querySelector('.insight-detail');

  if (!detail) {
    detail = document.createElement('div');
    detail.className = 'insight-detail';

    const help = card.querySelector('.insight-help');
    if (help) {
      help.insertAdjacentElement('afterend', detail);
    } else {
      valueElement.insertAdjacentElement('afterend', detail);
    }
  }

  detail.innerHTML = html || '';
}

function getCompanyInsightExtras(sorted) {
  let largestDropAmount = null;
  let largestDropPercent = null;
  let largestDropFrom = null;
  let largestDropTo = null;

  const companyMap = new Map();

  sorted.forEach(entry => {
    if (!companyMap.has(entry.job)) companyMap.set(entry.job, []);
    companyMap.get(entry.job).push(entry);
  });

  const companyStats = [];

  companyMap.forEach((companyEntries, companyName) => {
    const ordered = [...companyEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const first = ordered[0];
    const latest = ordered[ordered.length - 1];
    const total = ordered.reduce((sum, entry) => sum + entry.salary, 0);
    const growth = first && latest && first.salary > 0 && ordered.length >= 2
      ? ((latest.salary - first.salary) / first.salary) * 100
      : null;

    companyStats.push({
      companyName,
      entries: ordered,
      first,
      latest,
      total,
      growth
    });

    for (let i = 1; i < ordered.length; i++) {
      const prev = ordered[i - 1];
      const curr = ordered[i];
      const diff = curr.salary - prev.salary;
      const pct = prev.salary > 0 ? (diff / prev.salary) * 100 : null;

      if (diff < 0 && (largestDropAmount === null || diff < largestDropAmount)) {
        largestDropAmount = diff;
        largestDropPercent = pct;
        largestDropFrom = prev;
        largestDropTo = curr;
      }
    }
  });

  const bestGrowthCompany = companyStats
    .filter(item => item.growth !== null)
    .sort((a, b) => b.growth - a.growth)[0] || null;

  const topEarningCompany = companyStats
    .sort((a, b) => b.total - a.total)[0] || null;

  return {
    largestDropAmount,
    largestDropPercent,
    largestDropFrom,
    largestDropTo,
    bestGrowthCompany,
    topEarningCompany
  };
}

function renderInsights(sorted) {
  const insights = getInsightsData(sorted);
  const extraInsights = getCompanyInsightExtras(sorted);

  insightTotalGrowth.textContent = formatPercent(insights.totalGrowth);
  setInsightDetail(
    insightTotalGrowth,
    insights.firstEntry && insights.latestEntry
      ? `
        <strong>First:</strong> ${formatPeso(insights.firstEntry.salary)} — ${escapeHtml(insights.firstEntry.job)} (${formatFullDate(insights.firstEntry.date)})<br>
        <strong>Latest:</strong> ${formatPeso(insights.latestEntry.salary)} — ${escapeHtml(insights.latestEntry.job)} (${formatFullDate(insights.latestEntry.date)})
      `
      : ''
  );

  insightCagrAnnual.textContent = formatPercent(insights.cagrAnnual);
  setInsightDetail(
    insightCagrAnnual,
    insights.firstEntry && insights.latestEntry && insights.totalYears > 0
      ? `
        <strong>From:</strong> ${formatPeso(insights.firstEntry.salary)} — ${escapeHtml(insights.firstEntry.job)}<br>
        <strong>To:</strong> ${formatPeso(insights.latestEntry.salary)} — ${escapeHtml(insights.latestEntry.job)}<br>
        <strong>Period:</strong> ${formatMonthYear(insights.firstEntry.date)} → ${formatMonthYear(insights.latestEntry.date)} (${insights.totalYears.toFixed(1)} years)
      `
      : 'Needs at least 2 entries with different dates.'
  );

  insightCagrMonthly.textContent = formatPercent(insights.cagrMonthly);
  setInsightDetail(
    insightCagrMonthly,
    insights.firstEntry && insights.latestEntry && insights.totalMonths > 0
      ? `
        <strong>Average increase:</strong> ${formatPeso((insights.latestEntry.salary - insights.firstEntry.salary) / insights.totalMonths)} / month<br>
        <strong>Across:</strong> ${insights.totalMonths} month${insights.totalMonths > 1 ? 's' : ''}<br>
        <strong>Start → Latest:</strong> ${formatPeso(insights.firstEntry.salary)} → ${formatPeso(insights.latestEntry.salary)}
      `
      : 'Needs at least 2 entries with different months.'
  );

  insightBiggestRaise.textContent =
    insights.biggestRaiseAmount === null
      ? '—'
      : `${formatPeso(insights.biggestRaiseAmount)} (${formatPercent(insights.biggestRaisePercent)})`;

  setInsightDetail(
    insightBiggestRaise,
    insights.biggestRaiseFrom && insights.biggestRaiseTo
      ? `
        <strong>Company:</strong> ${escapeHtml(insights.biggestRaiseTo.job)}<br>
        <strong>From:</strong> ${formatPeso(insights.biggestRaiseFrom.salary)} (${formatFullDate(insights.biggestRaiseFrom.date)})<br>
        <strong>To:</strong> ${formatPeso(insights.biggestRaiseTo.salary)} (${formatFullDate(insights.biggestRaiseTo.date)})
      `
      : 'No same-company raise found yet.'
  );

    insightLargestDrop.textContent =
    extraInsights.largestDropAmount === null
      ? '—'
      : `${formatPeso(Math.abs(extraInsights.largestDropAmount))} (${formatPercent(extraInsights.largestDropPercent)})`;

  setInsightDetail(
    insightLargestDrop,
    extraInsights.largestDropFrom && extraInsights.largestDropTo
      ? `
        <strong>Company:</strong> ${escapeHtml(extraInsights.largestDropTo.job)}<br>
        <strong>From:</strong> ${formatPeso(extraInsights.largestDropFrom.salary)} (${formatFullDate(extraInsights.largestDropFrom.date)})<br>
        <strong>To:</strong> ${formatPeso(extraInsights.largestDropTo.salary)} (${formatFullDate(extraInsights.largestDropTo.date)})
      `
      : 'No salary drop found yet.'
  );

  insightGrowth12Months.textContent = formatPercent(insights.growth12Months);
  setInsightDetail(
    insightGrowth12Months,
    insights.firstInLast12 && insights.latestEntryLast12 && insights.firstInLast12 !== insights.latestEntryLast12
      ? `
        <strong>12-month start:</strong> ${formatPeso(insights.firstInLast12.salary)} — ${escapeHtml(insights.firstInLast12.job)} (${formatFullDate(insights.firstInLast12.date)})<br>
        <strong>Latest:</strong> ${formatPeso(insights.latestEntryLast12.salary)} — ${escapeHtml(insights.latestEntryLast12.job)} (${formatFullDate(insights.latestEntryLast12.date)})<br>
        <strong>Difference:</strong> ${formatPeso(insights.latestEntryLast12.salary - insights.firstInLast12.salary)}
      `
      : 'Needs at least 2 entries within the latest 12-month period.'
  );

  insightAvgMonthly12.textContent =
    insights.avgMonthly12 === null ? '—' : formatPeso(insights.avgMonthly12);

  setInsightDetail(
    insightAvgMonthly12,
    insights.monthlyBucketsLast12.length
      ? `
        <strong>Months counted:</strong> ${insights.monthlyBucketsLast12.length}<br>
        <strong>Highest month:</strong> ${formatPeso(insights.highestMonth12.total)} (${insights.highestMonth12.label})<br>
        <strong>Lowest month:</strong> ${formatPeso(insights.lowestMonth12.total)} (${insights.lowestMonth12.label})
      `
      : 'No entries found in the latest 12-month period.'
  );

  insightHighestEntry.textContent =
    insights.highestEntry ? formatPeso(insights.highestEntry.salary) : '—';

  setInsightDetail(
    insightHighestEntry,
    insights.highestEntry
      ? `
        <strong>Company:</strong> ${escapeHtml(insights.highestEntry.job)}<br>
        <strong>Date:</strong> ${formatFullDate(insights.highestEntry.date)}
      `
      : ''
  );

  insightLongestGap.textContent =
    insights.longestGapMonths
      ? `${insights.longestGapMonths} month${insights.longestGapMonths > 1 ? 's' : ''}`
      : '0 months';

  setInsightDetail(
    insightLongestGap,
    insights.longestGap
      ? `
        <strong>Gap:</strong> ${insights.longestGap.from} to ${insights.longestGap.to}<br>
        <strong>Months:</strong> ${insights.longestGap.missing.join(', ')}
      `
      : 'No empty month gaps found yet.'
  );

  insightYearVsLast.textContent = formatPercent(insights.yearVsLast);

  setInsightDetail(
    insightYearVsLast,
    `
      <strong>${insights.lastYear}:</strong> ${formatPeso(insights.lastYearTotal)}<br>
      <strong>${insights.currentYear}:</strong> ${formatPeso(insights.currentYearTotal)}
    `
  );

    insightBestGrowthCompany.textContent =
    extraInsights.bestGrowthCompany
      ? formatPercent(extraInsights.bestGrowthCompany.growth)
      : '—';

  setInsightDetail(
    insightBestGrowthCompany,
    extraInsights.bestGrowthCompany
      ? `
        <strong>Company:</strong> ${escapeHtml(extraInsights.bestGrowthCompany.companyName)}<br>
        <strong>From:</strong> ${formatPeso(extraInsights.bestGrowthCompany.first.salary)} (${formatFullDate(extraInsights.bestGrowthCompany.first.date)})<br>
        <strong>To:</strong> ${formatPeso(extraInsights.bestGrowthCompany.latest.salary)} (${formatFullDate(extraInsights.bestGrowthCompany.latest.date)})
      `
      : 'Needs at least 2 entries in the same company.'
  );

  insightTopEarningCompany.textContent =
    extraInsights.topEarningCompany
      ? formatPeso(extraInsights.topEarningCompany.total)
      : '—';

  setInsightDetail(
    insightTopEarningCompany,
    extraInsights.topEarningCompany
      ? `
        <strong>Company:</strong> ${escapeHtml(extraInsights.topEarningCompany.companyName)}<br>
        <strong>Entries:</strong> ${extraInsights.topEarningCompany.entries.length}<br>
        <strong>Average:</strong> ${formatPeso(extraInsights.topEarningCompany.total / extraInsights.topEarningCompany.entries.length)}
      `
      : 'No company data yet.'
  );

  insightJobPerformance.innerHTML = buildJobPerformanceComparison(sorted);
}

function renderAll(shouldAnimateChart = false) {
  saveEntries();
  saveCompanySettings();

  const existingCompanies = new Set(getSavedCompanies());
  hiddenCompanies = new Set([...hiddenCompanies].filter(name => existingCompanies.has(name)));

  syncActivePage();
  renderCompanyDropdown();
  renderCompaniesList();
  renderEntries();
  syncZoomButtons();
  syncGraphModeButtons();
  syncValueToggleButton();
  syncGraphStyleSwitch();

graphDisplayLabel.textContent =
  `${graphMode === 'monthly' ? 'Monthly income' : 'Individual Entries'} · ${formatGraphRangeLabel()}`;
const sorted = getVisibleSortedEntries();
const gaps = buildGaps(sorted);
renderStats(sorted, gaps);
renderHeroSummary(sorted);
renderInsights(sorted);

let graphChart;

if (shouldAnimateChart) {
  chartAnimationProgress = 0;

  const animateChart = () => {
    chartAnimationProgress = Math.min(chartAnimationProgress + 0.035, 1);

    graphChart = drawChart(chartCanvasOnly, chartShellOnly, chartAnimationProgress);
    renderLegendOnly(graphChart.sorted);
    renderGapSummaryOnly(graphChart.gaps);

    if (chartAnimationProgress < 1) {
      requestAnimationFrame(animateChart);
    }
  };

  animateChart();
} else {
  chartAnimationProgress = 1;
  graphChart = drawChart(chartCanvasOnly, chartShellOnly, chartAnimationProgress);
}

  renderLegendOnly(graphChart.sorted);
  renderGapSummaryOnly(graphChart.gaps);
  hideChartTooltip();

  saveUiState();

  requestAnimationFrame(() => {
    const latestUiState = loadUiState();
    chartShellOnly.scrollLeft = Number(latestUiState.chartScrollLeft || 0);
  });
}

function removeEntry(id) {
  const entry =
    entries.find(
      item => item.id === id
    );

  if (!entry) return;

  const clean =
    sanitizeEntry(entry);

  pendingDeleteEntryId =
    clean.id;

  deleteEntryModalText.textContent =
    `Delete "${clean.job}" — ${formatPeso(clean.salary)} from EarnIt?`;

  const hasSpendItLink =
    Boolean(
      clean.spendItRecordId
    );

  deleteSpendItOption.classList.toggle(
    'is-hidden',
    !hasSpendItLink
  );

  deleteSpendItCheckbox.checked =
    hasSpendItLink;

  deleteEntryModalBackdrop.classList.add(
    'open'
  );

  deleteEntryModalBackdrop.setAttribute(
    'aria-hidden',
    'false'
  );
}

function closeDeleteEntryModal() {
  pendingDeleteEntryId = null;

  deleteEntryModalBackdrop.classList.remove(
    'open'
  );

  deleteEntryModalBackdrop.setAttribute(
    'aria-hidden',
    'true'
  );

  deleteSpendItCheckbox.checked =
    true;
}


async function confirmDeleteEntry() {
  if (!pendingDeleteEntryId) {
    return;
  }

  const entry =
    entries.find(
      item =>
        item.id ===
        pendingDeleteEntryId
    );

  if (!entry) {
    closeDeleteEntryModal();
    return;
  }

  const clean =
    sanitizeEntry(entry);

  const shouldDeleteSpendIt =
    Boolean(
      clean.spendItRecordId
    ) &&
    deleteSpendItCheckbox.checked;

  /*
    When the checkbox is checked,
    remove the SpendIt side first.

    If that cloud deletion fails,
    keep the EarnIt entry so the
    two apps cannot accidentally
    fall out of sync.
  */
  if (shouldDeleteSpendIt) {
    try {
      if (
        typeof window
          .deleteEarnItEntryFromSpendIt !==
        "function"
      ) {
        throw new Error(
          "EarnIt → SpendIt delete bridge is unavailable."
        );
      }

      await window
        .deleteEarnItEntryFromSpendIt(
          clean
        );

    } catch (error) {
      console.error(
        "Could not delete linked SpendIt income:",
        error
      );

      alert(
        "The SpendIt income could not be deleted, so the EarnIt entry was kept."
      );

      return;
    }
  }

  entries =
    entries.filter(
      item =>
        item.id !==
        pendingDeleteEntryId
    );

  closeDeleteEntryModal();

  renderAll();
}

function clearAllEntries() {
  if (!entries.length) {
    return;
  }

  const cleanEntries =
    entries.map(
      sanitizeEntry
    );

  const linkedCount =
    cleanEntries.filter(
      entry =>
        Boolean(
          entry.spendItRecordId
        )
    ).length;

  clearAllEntriesModalText.textContent =
    `This will delete all ${entries.length} EarnIt entr${
      entries.length === 1
        ? "y"
        : "ies"
    }.`;

  if (linkedCount > 0) {

    clearAllSpendItOption.classList.remove(
      'is-hidden'
    );

    clearAllSpendItCheckbox.checked =
      true;

    clearAllSpendItText.textContent =
      `Also delete ${linkedCount} linked SpendIt income${
        linkedCount === 1
          ? ""
          : "s"
      }`;

  } else {

    clearAllSpendItOption.classList.add(
      'is-hidden'
    );

    clearAllSpendItCheckbox.checked =
      false;

  }

  clearAllEntriesModalBackdrop.classList.add(
    'open'
  );

  clearAllEntriesModalBackdrop.setAttribute(
    'aria-hidden',
    'false'
  );
}

function closeClearAllEntriesModal() {
  clearAllEntriesModalBackdrop.classList.remove(
    'open'
  );

  clearAllEntriesModalBackdrop.setAttribute(
    'aria-hidden',
    'true'
  );

  clearAllSpendItCheckbox.checked =
    true;

  confirmClearAllEntriesBtn.disabled =
    false;
}


async function confirmClearAllEntries() {
  if (!entries.length) {
    closeClearAllEntriesModal();
    return;
  }

  const entriesToDelete =
    entries.map(
      sanitizeEntry
    );

  const shouldDeleteSpendIt =
    !clearAllSpendItOption
      .classList
      .contains('is-hidden') &&
    clearAllSpendItCheckbox.checked;

  confirmClearAllEntriesBtn.disabled =
    true;

  if (shouldDeleteSpendIt) {

    try {

      if (
        typeof window
          .deleteAllEarnItEntriesFromSpendIt !==
        "function"
      ) {
        throw new Error(
          "EarnIt → SpendIt bulk delete bridge is unavailable."
        );
      }

      await window
        .deleteAllEarnItEntriesFromSpendIt(
          entriesToDelete
        );

    } catch (error) {

      console.error(
        "Could not delete linked SpendIt incomes:",
        error
      );

      alert(
        "The linked SpendIt incomes could not be deleted, so your EarnIt entries were kept."
      );

      confirmClearAllEntriesBtn.disabled =
        false;

      return;
    }

  }

  entries = [];

  hiddenCompanies =
    new Set();

  hoveredPointIndex =
    -1;

  hoveredPointMeta =
    null;

  /*
    Also leave edit mode clean in
    case Clear All was pressed while
    editing an entry.
  */
  form.reset();

  editingIdInput.value =
    "";

  jobSelect.value =
    "";

  document.getElementById(
    'colorInput'
  ).value =
    '#7c99ff';

  submitBtn.textContent =
    'Add entry';

  closeClearAllEntriesModal();

  renderAll();
}

function openCompanyModal(encodedCompanyName) {
  const companyName = decodeURIComponent(encodedCompanyName || '');
  if (!companyName) return;

  const company = getCompaniesWithCounts().find(item => item.name === companyName);
  if (!company) return;

  companyOriginalNameInput.value = company.name;
  companyEditNameInput.value = company.name;
  companyEditColorInput.value = company.color || '#7c99ff';
  companyEditNotesInput.value = company.notes || '';

  companyModalBackdrop.classList.add('open');
  companyModalBackdrop.setAttribute('aria-hidden', 'false');
}

function closeCompanyModal() {
  companyModalBackdrop.classList.remove('open');
  companyModalBackdrop.setAttribute('aria-hidden', 'true');
  companyOriginalNameInput.value = '';
  companyEditNameInput.value = '';
  companyEditColorInput.value = '#7c99ff';
  companyEditNotesInput.value = '';
}

async function saveCompanyEdits() {
  const oldName = companyOriginalNameInput.value.trim();
  const newName = companyEditNameInput.value.trim();
  const newColor = companyEditColorInput.value;
  const newNotes = companyEditNotesInput.value.trim();

  if (!oldName || !newName) return;

  const renamedEntries = entries
    .map(sanitizeEntry)
    .filter(
      entry =>
        entry.job === oldName &&
        entry.spendItRecordId
    );

  if (renamedEntries.length) {
    try {
      if (
        typeof window
          .renameEarnItCompanyInSpendIt !==
        "function"
      ) {
        throw new Error(
          "EarnIt → SpendIt bridge is unavailable."
        );
      }

      await window
        .renameEarnItCompanyInSpendIt(
          renamedEntries,
          newName
        );
    } catch (error) {
      console.error(
        "Could not rename linked SpendIt incomes:",
        error
      );

      alert(
        "The linked SpendIt incomes could not be updated, so the company was not renamed."
      );

      return;
    }
  }

  entries = entries.map(entry => {
    const clean = sanitizeEntry(entry);

    if (clean.job !== oldName) return clean;

    return {
      ...clean,
      job: newName,
      color: newColor
    };
  });

  const oldSettings = getCompanySettings(oldName, newColor);
  delete companySettings[oldName];
  companySettings[newName] = {
    color: newColor,
    notes: newNotes || oldSettings.notes || ''
  };

  if (jobInput.value.trim() === oldName) {
    jobInput.value = newName;
  }

  if (jobSelect.value === oldName) {
    jobSelect.value = newName;
  }

  if (hiddenCompanies.has(oldName)) {
    hiddenCompanies.delete(oldName);
    hiddenCompanies.add(newName);
  }

  saveEntries();
  saveCompanySettings();
  saveUiState();
  closeCompanyModal();
  renderAll();
}

    function editEntry(id) {
  const entry = entries.find(item => item.id === id);
  if (!entry) return;

  const clean = sanitizeEntry(entry);
  editingIdInput.value = clean.id;
  jobInput.value = clean.job;
  jobSelect.value = clean.job;
  document.getElementById('dateInput').value = clean.date;
  document.getElementById('salaryInput').value = clean.salary;
  document.getElementById(
  "paidTimeInput"
).value =
  clean.paidTime || "";

document.getElementById(
  "spendItAccountSelect"
).value =
  clean.spendItAccountId || "";
  document.getElementById('colorInput').value = clean.color;
  document.getElementById('notesInput').value = clean.notes;
  submitBtn.textContent = 'Update entry';

  const entryFormCard = document.getElementById('entryFormCard');

entryFormCard?.scrollIntoView({
  behavior: 'smooth',
  block: 'center'
});

entryFormCard?.classList.remove('editing-glow');

setTimeout(() => {
  entryFormCard?.classList.add('editing-glow');
}, 80);

setTimeout(() => {
  entryFormCard?.classList.remove('editing-glow');
}, 2600);
}

  window.removeEntry = removeEntry;
  window.clearAllEntries = clearAllEntries;
  window.editEntry = editEntry;
  window.openCompanyModal = openCompanyModal;
  window.toggleCompanyVisibility = toggleCompanyVisibility;

    jobSelect.addEventListener('change', () => {
  if (jobSelect.value) {
    jobInput.value = jobSelect.value;
  }
});

  closeCompanyModalBtn?.addEventListener('click', closeCompanyModal);
  cancelCompanyModalBtn?.addEventListener('click', closeCompanyModal);
  closeDeleteEntryModalBtn
  ?.addEventListener(
    'click',
    closeDeleteEntryModal
  );

cancelDeleteEntryBtn
  ?.addEventListener(
    'click',
    closeDeleteEntryModal
  );

confirmDeleteEntryBtn
  ?.addEventListener(
    'click',
    confirmDeleteEntry
  );

closeImportChoiceModalBtn
  ?.addEventListener(
    'click',
    closeImportChoiceModal
  );

cancelImportChoiceBtn
  ?.addEventListener(
    'click',
    closeImportChoiceModal
  );

confirmImportChoiceBtn
  ?.addEventListener(
    'click',
    applyImportChoice
  );

importAddRadio
  ?.addEventListener(
    'change',
    updateImportChoiceModal
  );

importReplaceRadio
  ?.addEventListener(
    'change',
    updateImportChoiceModal
  );

importChoiceModalBackdrop
  ?.addEventListener(
    'click',
    event => {
      if (
        event.target ===
        importChoiceModalBackdrop
      ) {
        closeImportChoiceModal();
      }
    }
  );

deleteEntryModalBackdrop
  ?.addEventListener(
    'click',
    event => {
      if (
        event.target ===
        deleteEntryModalBackdrop
      ) {
        closeDeleteEntryModal();
      }
    }
  );
  saveCompanyModalBtn?.addEventListener('click', saveCompanyEdits);
document.addEventListener(
  'keydown',
  event => {
    if (
      event.key === 'Escape' &&
      deleteEntryModalBackdrop
        ?.classList.contains('open')
    ) {
      closeDeleteEntryModal();
    }

    if (
      event.key === 'Escape' &&
      clearAllEntriesModalBackdrop
        ?.classList.contains('open')
    ) {
      closeClearAllEntriesModal();
    }

    if (
      event.key === 'Escape' &&
      importChoiceModalBackdrop
        ?.classList.contains('open')
    ) {
      closeImportChoiceModal();
    }
  }
);
  companyModalBackdrop?.addEventListener('click', (event) => {
    if (event.target === companyModalBackdrop) {
      closeCompanyModal();
    }
  });

  closeClearAllEntriesModalBtn
  ?.addEventListener(
    'click',
    closeClearAllEntriesModal
  );

cancelClearAllEntriesBtn
  ?.addEventListener(
    'click',
    closeClearAllEntriesModal
  );

confirmClearAllEntriesBtn
  ?.addEventListener(
    'click',
    confirmClearAllEntries
  );

clearAllEntriesModalBackdrop
  ?.addEventListener(
    'click',
    event => {
      if (
        event.target ===
        clearAllEntriesModalBackdrop
      ) {
        closeClearAllEntriesModal();
      }
    }
  );

  clearAllBtn?.addEventListener('click', clearAllEntries);

rangeSelect?.addEventListener('change', () => {
  zoomMode = rangeSelect.value;

  // When switching range, always jump to the latest saved entry.
  setViewToLatestEntry();

  saveUiState();
  renderAll();
});
graphDateLabel?.addEventListener('change', () => {
  viewStart = graphDateLabel.value;
  clampViewStart();

  saveUiState();
  renderAll();
});
prevRangeBtn?.addEventListener('click', () => {
  const current = dateFromMonthKey(viewStart);
  viewStart = monthKeyFromDate(addMonths(current, -getZoomMonths()));
  clampViewStart();

  saveUiState();
  renderAll();
});

nextRangeBtn?.addEventListener('click', () => {
  const current = dateFromMonthKey(viewStart);
  viewStart = monthKeyFromDate(addMonths(current, getZoomMonths()));
  clampViewStart();

  saveUiState();
  renderAll();
});

graphModeButtons.forEach(button => {
  button.addEventListener('click', () => {
    graphMode = button.dataset.graphMode;
    hoveredPointIndex = -1;
    hoveredPointMeta = null;
    saveUiState();
    renderAll();
  });
});

if (toggleValueLabelsBtn) {
  toggleValueLabelsBtn.addEventListener('click', () => {
    showValueLabels = !showValueLabels;
    renderAll();
  });
}

if (graphModeSwitchBtn) {
  graphModeSwitchBtn.addEventListener('click', () => {
    graphMode = graphMode === 'monthly' ? 'entries' : 'monthly';
    hoveredPointIndex = -1;
    hoveredPointMeta = null;
    saveUiState();
    renderAll(true);
  });
}


if (graphStyleSwitchBtn) {
  graphStyleSwitchBtn.addEventListener('click', () => {
    graphStyle = graphStyle === 'line' ? 'bar' : 'line';
    hoveredPointIndex = -1;
    hoveredPointMeta = null;
    saveUiState();
        renderAll(true);
  });
}

chartCanvasOnly.addEventListener('mousemove', (event) => {
  const sorted = getGraphEntries();

  if (!sorted.length) {
    hoveredPointIndex = -1;
    hoveredPointMeta = null;
    hideChartTooltip();
    return;
  }

  const rect = chartCanvasOnly.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  const metrics = getChartMetrics(sorted, chartShellOnly);
  const { xStep, plotBottom, plotHeight, roundedMax, plotLeft, plotTop } = metrics;

  if (mouseY < plotTop || mouseY > plotBottom) {
    hoveredPointIndex = -1;
    hoveredPointMeta = null;
    hideChartTooltip();
    renderAll();
    return;
  }

  const xForIndex = (index) => plotLeft + index * xStep + xStep / 2;
  const yForSalary = (salary) => plotBottom - (salary / roundedMax) * plotHeight;

  let hitIndex = -1;
  let closestDistance = Infinity;

  sorted.forEach((entry, index) => {
    const pointX = xForIndex(index);
    const distance = Math.abs(mouseX - pointX);

    if (distance < closestDistance) {
      closestDistance = distance;
      hitIndex = index;
    }
  });

  if (hitIndex >= 0 && closestDistance <= xStep / 2) {
    const entry = sorted[hitIndex];
    const pointX = xForIndex(hitIndex);
    const pointY = yForSalary(entry.salary);

    if (hoveredPointIndex !== hitIndex) {
      hoveredPointIndex = hitIndex;
      hoveredPointMeta = { x: pointX, y: pointY };
      renderAll();
    }

    showChartTooltip(entry, pointX, pointY);
    return;
  }

  hoveredPointIndex = -1;
  hoveredPointMeta = null;
  hideChartTooltip();
  renderAll();
});

chartCanvasOnly.addEventListener('mouseleave', () => {
  hideChartTooltip();

  if (hoveredPointIndex !== -1) {
    hoveredPointIndex = -1;
    hoveredPointMeta = null;
    renderAll();
  }
});

chartShellOnly.addEventListener('scroll', () => {
  saveUiState();
});

    function escapeHtml(text) {
      return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

form.addEventListener(
  'submit',
  async (event) => {
  event.preventDefault();
  const formData = new FormData(form);

  const chosenJob = String(formData.get('job') || '').trim();
  const selectedJob = String(jobSelect.value || '').trim();
  const finalJob = chosenJob || selectedJob;

  const currentId = editingIdInput.value.trim();
  const existingEntry =
  currentId
    ? entries.find(
        entry =>
          entry.id === currentId
      )
    : null;

const entryId =
  currentId ||
  crypto.randomUUID();

  const selectedColor = String(formData.get('color') || '#7c99ff');
  const existingCompanyMeta = finalJob ? getCompanySettings(finalJob, selectedColor) : { color: selectedColor, notes: '' };

  const newEntry = sanitizeEntry({
    id: entryId,
    job: finalJob,
    date: formData.get('date'),
    salary: Number(formData.get('salary')),
    color: existingCompanyMeta.color || selectedColor,
    notes:
  formData.get('notes'),

paidTime:
  formData.get(
    'paidTime'
  ),

spendItAccountId:
  formData.get(
    'spendItAccountId'
  ),

spendItRecordId:
  existingEntry
    ?.spendItRecordId ||
  `earnit_${entryId}`
  });

  if (!newEntry.job || !newEntry.date || newEntry.salary < 0) return;

  if (currentId) {
    entries = entries.map(entry => entry.id === currentId ? newEntry : entry);
  } else {
    entries.push(newEntry);
  }

  if (newEntry.job) {
  ensureCompanySetting(newEntry.job, newEntry.color);
}

renderAll();

try {

  if (
    typeof window
      .syncEarnItEntryToSpendIt !==
    "function"
  ) {
    throw new Error(
      "EarnIt → SpendIt bridge is unavailable."
    );
  }

  await window
    .syncEarnItEntryToSpendIt(
      newEntry
    );

} catch (error) {

  console.error(
    "Could not sync EarnIt income to SpendIt:",
    error
  );

  alert(
    "The EarnIt entry was saved, but the SpendIt income could not be synced."
  );

}
  form.reset();
  editingIdInput.value = '';
  jobSelect.value = '';
  document.getElementById('colorInput').value = '#7c99ff';
  submitBtn.textContent = 'Add entry';
  renderAll();
});

  exportBtn.addEventListener('click', () => {
    const payload = {
      entries: getSortedEntries(),
      companySettings,
      uiState: {
      zoomMode,
      graphMode,
      graphStyle,
      showValueLabels,
      activePage,
      chartScrollLeft: chartShellOnly?.scrollLeft || 0,
      hiddenCompanies: [...hiddenCompanies],
    }
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary-growth-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

function buildImportedData(parsed) {
  const isLegacyImport =
    Array.isArray(parsed);

  const isStructuredImport =
    parsed &&
    Array.isArray(parsed.entries);

  if (
    !isLegacyImport &&
    !isStructuredImport
  ) {
    throw new Error(
      'Invalid backup format'
    );
  }

  const rawEntries =
    isLegacyImport
      ? parsed
      : parsed.entries;

  return {
    entries: rawEntries
      .map(sanitizeImportedEntry)
      .filter(item => item.job && item.date),

    companySettings:
      isStructuredImport &&
      parsed.companySettings &&
      typeof parsed.companySettings === 'object'
        ? parsed.companySettings
        : {},

    uiState:
      isStructuredImport &&
      parsed.uiState &&
      typeof parsed.uiState === 'object'
        ? parsed.uiState
        : null,

    isStructuredImport
  };
}

function updateImportChoiceModal() {
  const shouldReplace =
    importReplaceRadio.checked;

  if (!shouldReplace) {
    pendingImportReplaceConfirmed = false;
  }

  importAddOption.classList.toggle(
    'is-selected',
    !shouldReplace
  );

  importReplaceOption.classList.toggle(
    'is-selected',
    shouldReplace
  );

  importReplaceConfirmation.classList.toggle(
    'is-hidden',
    !shouldReplace
  );

  confirmImportChoiceBtn.classList.toggle(
    'primary',
    !shouldReplace
  );

  confirmImportChoiceBtn.classList.toggle(
    'ghost-danger',
    shouldReplace
  );

  if (!shouldReplace) {
    confirmImportChoiceBtn.textContent =
      'Add entries';

    return;
  }

  if (pendingImportReplaceConfirmed) {
    importReplaceConfirmation.textContent =
      'Final confirmation: replace your current EarnIt data with this backup?';

    confirmImportChoiceBtn.textContent =
      'Confirm replace current data';

    return;
  }

  importReplaceConfirmation.textContent =
    'This is destructive. Continue to review the final replacement confirmation.';

  confirmImportChoiceBtn.textContent =
    'Continue to replace';
}

function openImportChoiceModal(importedData) {
  pendingImportData = importedData;
  pendingImportReplaceConfirmed = false;

  importResultMessage.hidden =
    true;

  importAddRadio.checked = true;

  const entryCount =
    importedData.entries.length;

  importChoiceSummary.textContent =
    `This backup contains ${entryCount} entr${
      entryCount === 1
        ? 'y'
        : 'ies'
    }.`;

  updateImportChoiceModal();

  importChoiceModalBackdrop.classList.add(
    'open'
  );

  importChoiceModalBackdrop.setAttribute(
    'aria-hidden',
    'false'
  );
}

function closeImportChoiceModal() {
  pendingImportData = null;
  pendingImportReplaceConfirmed = false;

  importChoiceModalBackdrop.classList.remove(
    'open'
  );

  importChoiceModalBackdrop.setAttribute(
    'aria-hidden',
    'true'
  );

  confirmImportChoiceBtn.disabled =
    false;
}

function applyImportedUiState(uiState) {
  if (!uiState) {
    return;
  }

  zoomMode =
    uiState.zoomMode ||
    'month';

  graphMode =
    uiState.graphMode ||
    'entries';

  graphStyle =
    uiState.graphStyle ||
    'line';

  showValueLabels =
    uiState.showValueLabels ??
    false;

  activePage =
    uiState.activePage ||
    'homePage';

  hiddenCompanies =
    new Set(
      Array.isArray(uiState.hiddenCompanies)
        ? uiState.hiddenCompanies
        : []
    );
}

function addImportedCompanySettings(
  importedCompanySettings
) {
  const currentCompanyNames =
    new Set([
      ...getSavedCompanies(),
      ...Object.keys(companySettings)
    ]);

  Object.entries(
    importedCompanySettings
  ).forEach(
    ([companyName, settings]) => {
      if (
        currentCompanyNames.has(
          companyName
        )
      ) {
        return;
      }

      companySettings[companyName] =
        settings;

      currentCompanyNames.add(
        companyName
      );
    }
  );
}

function showImportResult(message) {
  importResultMessage.textContent =
    message;

  importResultMessage.hidden =
    false;
}

function applyImportChoice() {
  if (!pendingImportData) {
    return;
  }

  const shouldReplace =
    importReplaceRadio.checked;

  if (
    shouldReplace &&
    !pendingImportReplaceConfirmed
  ) {
    pendingImportReplaceConfirmed = true;
    updateImportChoiceModal();
    return;
  }

  confirmImportChoiceBtn.disabled =
    true;

  let resultMessage = '';

  if (shouldReplace) {
    entries =
      pendingImportData.entries;

    if (
      pendingImportData.isStructuredImport
    ) {
      companySettings =
        pendingImportData.companySettings;

      applyImportedUiState(
        pendingImportData.uiState
      );
    }

    resultMessage =
      `Replaced current EarnIt data with ${entries.length} entr${
        entries.length === 1
          ? 'y'
          : 'ies'
      }.`;
  } else {
    const existingEntryIds =
      new Set(
        entries.map(entry =>
          String(
            sanitizeEntry(entry).id
          )
        )
      );

    const entriesToAdd = [];
    let skippedDuplicates = 0;

    pendingImportData.entries.forEach(
      entry => {
        const entryId =
          String(entry.id);

        if (
          existingEntryIds.has(entryId)
        ) {
          skippedDuplicates += 1;
          return;
        }

        existingEntryIds.add(entryId);
        entriesToAdd.push(entry);
      }
    );

    entries = [
      ...entries,
      ...entriesToAdd
    ];

    addImportedCompanySettings(
      pendingImportData.companySettings
    );

    resultMessage =
      `Added ${entriesToAdd.length} entr${
        entriesToAdd.length === 1
          ? 'y'
          : 'ies'
      }. ${skippedDuplicates} duplicate${
        skippedDuplicates === 1
          ? ''
          : 's'
      } skipped.`;
  }

  saveEntries();
  saveCompanySettings();
  saveUiState();
  closeImportChoiceModal();
  renderAll();
  showImportResult(resultMessage);
}

importFile.addEventListener(
  'change',
  async event => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text =
        await file.text();

      const parsed =
        JSON.parse(text);

      openImportChoiceModal(
        buildImportedData(parsed)
      );
    } catch (error) {
      alert(
        'Could not import that backup file. Please use a valid JSON export from this app.'
      );
    } finally {
      importFile.value = '';
    }
  }
);

    window.addEventListener('resize', renderAll);
window.reloadEarnItFromStorage =
  function() {

    entries =
      loadEntries();


    companySettings =
      loadCompanySettings();


    const nextUiState =
      loadUiState();


    zoomMode =
      nextUiState.zoomMode ||
      "month";


    viewStart =
      nextUiState.viewStart ||
      new Date()
        .toISOString()
        .slice(0, 7);


    graphMode =
      nextUiState.graphMode ||
      "monthly";


    graphStyle =
      nextUiState.graphStyle ||
      "bar";


    showValueLabels =
      nextUiState.showValueLabels ??
      true;


    activePage =
      nextUiState.activePage ||
      localStorage.getItem(
        PAGE_STORAGE_KEY
      ) ||
      "homePage";


    hiddenCompanies =
      new Set(
        Array.isArray(
          nextUiState.hiddenCompanies
        )
          ? nextUiState.hiddenCompanies
          : []
      );


    renderAll(true);
  };
    renderAll(true);
