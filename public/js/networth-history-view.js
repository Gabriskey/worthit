/* Read-only SVG presentation for stored Net Worth snapshots. */

(() => {
  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ]
  const GRAPH = {
    width: 900,
    height: 300,
    left: 82,
    right: 28,
    top: 24,
    bottom: 48
  }

  function roundHistoryMoney(value) {
    const roundMoney = globalThis.WorthItNetWorthHistory?.roundMoney

    if (typeof roundMoney === "function") {
      return roundMoney(value)
    }

    const amount = Number(value)

    if (!Number.isFinite(amount)) return 0

    const rounded = Math.round((Math.abs(amount) + Number.EPSILON) * 100) / 100
    return amount < 0 ? -rounded : rounded
  }

  function numericValue(value) {
    const amount = Number(value)
    return Number.isFinite(amount) ? roundHistoryMoney(amount) : 0
  }

  function normalizeSnapshot(snapshot) {
    const date = String(snapshot?.date || "")

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return null
    }

    const netWorth = Number(snapshot?.netWorth)

    if (!Number.isFinite(netWorth)) {
      return null
    }

    return {
      date,
      netWorth: roundHistoryMoney(netWorth),
      totalAccountBalances: numericValue(snapshot?.totalAccountBalances),
      remainingLiabilities: numericValue(snapshot?.remainingLiabilities)
    }
  }

  function formatHistoricalCurrency(value, signed = false) {
    const amount = roundHistoryMoney(value)
    const sign = amount < 0 ? "-" : signed && amount > 0 ? "+" : ""
    const formatted = Math.abs(amount).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })

    return `${sign}₱${formatted}`
  }

  function formatCompactCurrency(value) {
    const amount = roundHistoryMoney(value)
    const sign = amount < 0 ? "-" : ""
    const absolute = Math.abs(amount)

    if (absolute >= 1000) {
      const compact = (absolute / 1000).toFixed(1).replace(/\.0$/, "")
      return `${sign}₱${compact}k`
    }

    return `${sign}₱${absolute.toLocaleString("en-PH", {
      maximumFractionDigits: 0
    })}`
  }

  function formatSnapshotDate(date, includeYear = false) {
    const [year, month, day] = date.split("-").map(Number)
    const label = `${MONTHS[month - 1]} ${day}`

    return includeYear ? `${label}, ${year}` : label
  }

  function prepareHistoryPresentation(snapshots) {
    const points = (Array.isArray(snapshots) ? snapshots : [])
      .map(normalizeSnapshot)
      .filter(Boolean)
      .sort((left, right) => left.date.localeCompare(right.date))
    const first = points[0] || null
    const latest = points[points.length - 1] || null
    const change = points.length > 1
      ? roundHistoryMoney(latest.netWorth - first.netWorth)
      : null
    const changePercent = change === null || first.netWorth === 0
      ? null
      : roundHistoryMoney((change / Math.abs(first.netWorth)) * 100)

    return {
      points,
      first,
      latest,
      change,
      changePercent,
      snapshotCount: points.length,
      includesMultipleYears: new Set(points.map(point => point.date.slice(0, 4))).size > 1
    }
  }

  function buildGraphModel(points) {
    const cleanPoints = Array.isArray(points) ? points : []
    const plotWidth = GRAPH.width - GRAPH.left - GRAPH.right
    const plotHeight = GRAPH.height - GRAPH.top - GRAPH.bottom

    if (!cleanPoints.length) {
      return {
        ...GRAPH,
        plotWidth,
        plotHeight,
        points: [],
        ticks: [],
        zeroY: null
      }
    }

    const values = cleanPoints.map(point => numericValue(point.netWorth))
    const lowest = Math.min(...values)
    const highest = Math.max(...values)
    const sourceRange = highest - lowest
    const padding = sourceRange === 0
      ? Math.max(Math.abs(highest) * 0.12, 1)
      : Math.max(sourceRange * 0.12, 0.01)
    const min = lowest - padding
    const max = highest + padding
    const range = max - min
    const ticks = Array.from({ length: 4 }, (_unused, index) => {
      return roundHistoryMoney(max - (range * index) / 3)
    })
    const graphPoints = cleanPoints.map((point, index) => {
      const x = cleanPoints.length === 1
        ? GRAPH.left + plotWidth / 2
        : GRAPH.left + (plotWidth * index) / (cleanPoints.length - 1)
      const y = GRAPH.top + ((max - numericValue(point.netWorth)) / range) * plotHeight

      return { ...point, x, y }
    })

    return {
      ...GRAPH,
      plotWidth,
      plotHeight,
      min,
      max,
      range,
      points: graphPoints,
      ticks,
      zeroY: min < 0 && max > 0
        ? GRAPH.top + (max / range) * plotHeight
        : null
    }
  }

  function visibleLabelIndexes(points) {
    if (points.length <= 6) {
      return points.map((_point, index) => index)
    }

    const step = Math.ceil((points.length - 1) / 5)
    const indexes = points.map((_point, index) => index)
      .filter(index => index % step === 0)

    if (indexes[indexes.length - 1] !== points.length - 1) {
      indexes.push(points.length - 1)
    }

    return indexes
  }

  function pointDetail(point, previous, includeYear) {
    const change = previous
      ? formatHistoricalCurrency(point.netWorth - previous.netWorth, true)
      : "First snapshot"

    return `
      <strong>${formatSnapshotDate(point.date, includeYear)}</strong>
      <div class="networth-history-detail-grid">
        <span>Net Worth</span><b>${formatHistoricalCurrency(point.netWorth)}</b>
        <span>Change from previous</span><b>${change}</b>
        <span>Total Account Balances</span><b>${formatHistoricalCurrency(point.totalAccountBalances)}</b>
        <span>Remaining Liabilities</span><b>${formatHistoricalCurrency(point.remainingLiabilities)}</b>
      </div>
    `
  }

  function setSummary(presentation) {
    const latest = document.getElementById("networthHistoryLatest")
    const change = document.getElementById("networthHistoryChange")
    const percentage = document.getElementById("networthHistoryPercent")
    const count = document.getElementById("networthHistoryCount")

    if (!latest || !change || !percentage || !count) return

    latest.textContent = presentation.latest
      ? formatHistoricalCurrency(presentation.latest.netWorth)
      : "—"
    change.textContent = presentation.change === null
      ? "—"
      : formatHistoricalCurrency(presentation.change, true)
    percentage.textContent = presentation.changePercent === null
      ? "—"
      : `${presentation.changePercent > 0 ? "+" : ""}${presentation.changePercent.toFixed(2)}%`
    count.textContent = String(presentation.snapshotCount)
  }

  function renderStatus(message, type = "loading") {
    const content = document.getElementById("networthHistoryContent")

    if (!content) return

    content.innerHTML = `<div class="networth-history-state ${type}">${message}</div>`
  }

  function renderHistory(presentation) {
    setSummary(presentation)

    if (!presentation.points.length) {
      renderStatus(
        "<strong>No Net Worth history yet.</strong><span>WorthIt records a snapshot when you open the app on the 1st or 15th.</span>",
        "empty"
      )
      return
    }

    const content = document.getElementById("networthHistoryContent")
    const graph = buildGraphModel(presentation.points)
    const labelIndexes = visibleLabelIndexes(graph.points)
    const line = graph.points.length > 1
      ? `<path class="networth-history-line" d="${graph.points.map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" ")}" />`
      : ""
    const grids = graph.ticks.map((tick, index) => {
      const y = GRAPH.top + (graph.plotHeight * index) / 3

      return `
        <line class="networth-history-grid-line" x1="${GRAPH.left}" x2="${GRAPH.width - GRAPH.right}" y1="${y}" y2="${y}" />
        <text class="networth-history-y-label" x="${GRAPH.left - 12}" y="${y + 4}" text-anchor="end">${formatCompactCurrency(tick)}</text>
      `
    }).join("")
    const zeroLine = graph.zeroY === null
      ? ""
      : `<line class="networth-history-zero-line" x1="${GRAPH.left}" x2="${GRAPH.width - GRAPH.right}" y1="${graph.zeroY}" y2="${graph.zeroY}" />`
    const labels = labelIndexes.map(index => {
      const point = graph.points[index]

      return `<text class="networth-history-x-label" x="${point.x}" y="${GRAPH.height - 14}" text-anchor="middle">${formatSnapshotDate(point.date, presentation.includesMultipleYears)}</text>`
    }).join("")
    const points = graph.points.map((point, index) => {
      const previous = graph.points[index - 1]
      const label = `${formatSnapshotDate(point.date, true)}. Net Worth ${formatHistoricalCurrency(point.netWorth)}. ${previous ? `Change from previous ${formatHistoricalCurrency(point.netWorth - previous.netWorth, true)}.` : "First snapshot."}`

      return `<circle class="networth-history-point" data-index="${index}" cx="${point.x}" cy="${point.y}" r="6" tabindex="0" role="button" aria-label="${label}" />`
    }).join("")

    content.innerHTML = `
      <div class="networth-history-chart-wrap">
        <svg class="networth-history-chart" viewBox="0 0 ${GRAPH.width} ${GRAPH.height}" role="img" aria-label="Net Worth history chart with ${graph.points.length} stored snapshots" aria-describedby="networthHistoryDetail">
          ${grids}
          ${zeroLine}
          ${line}
          ${points}
          ${labels}
        </svg>
      </div>
      <div class="networth-history-detail" id="networthHistoryDetail" aria-live="polite"></div>
    `

    const detail = document.getElementById("networthHistoryDetail")
    const pointElements = [...content.querySelectorAll(".networth-history-point")]
    const selectPoint = index => {
      const point = graph.points[index]

      if (!point) return

      pointElements.forEach((element, elementIndex) => {
        element.classList.toggle("is-selected", elementIndex === index)
      })
      detail.innerHTML = pointDetail(
        point,
        graph.points[index - 1],
        presentation.includesMultipleYears
      )
    }

    pointElements.forEach((element, index) => {
      element.addEventListener("pointerenter", () => selectPoint(index))
      element.addEventListener("focus", () => selectPoint(index))
      element.addEventListener("click", () => selectPoint(index))
      element.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          selectPoint(index)
        }
      })
    })

    selectPoint(graph.points.length - 1)
  }

  function initializeNetWorthHistoryView() {
    const section = document.getElementById("networthHistory")

    if (!section) return

    Promise.all([
      import("./auth.js"),
      import("./database.js")
    ]).then(([{ watchAuthState }, { loadUserNetWorthSnapshots }]) => {
      let currentUserId = null

      const loadHistory = async userId => {
        renderStatus("Loading Net Worth history...")

        try {
          const snapshots = await loadUserNetWorthSnapshots(userId)

          if (currentUserId !== userId) return

          renderHistory(prepareHistoryPresentation(snapshots))
        } catch (error) {
          if (currentUserId === userId) {
            setSummary(prepareHistoryPresentation([]))
            renderStatus("Could not load Net Worth history.", "error")
          }
        }
      }

      watchAuthState(user => {
        currentUserId = user?.uid || null

        if (!user) {
          setSummary(prepareHistoryPresentation([]))
          renderStatus("Sign in to view your Net Worth history.", "empty")
          return
        }

        loadHistory(user.uid)
      })

      window.addEventListener("worthit:networth-snapshot-refreshed", () => {
        if (currentUserId) {
          loadHistory(currentUserId)
        }
      })
    }).catch(() => {
      renderStatus("Could not load Net Worth history.", "error")
    })
  }

  const api = {
    formatHistoricalCurrency,
    prepareHistoryPresentation,
    buildGraphModel
  }

  if (typeof module === "object" && module.exports) {
    module.exports = api
  }

  globalThis.WorthItNetWorthHistoryView = api

  if (typeof window !== "undefined" && window.document) {
    initializeNetWorthHistoryView()
  }
})()
