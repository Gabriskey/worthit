const assert = require("node:assert/strict")
require("../public/js/networth-history.js")
const {
  formatHistoricalCurrency,
  prepareHistoryPresentation,
  buildGraphModel
} = require("../public/js/networth-history-view.js")

function snapshot(date, netWorth, balances = 0, liabilities = 0) {
  return {
    date,
    netWorth,
    totalAccountBalances: balances,
    remainingLiabilities: liabilities
  }
}

function hasOnlyFiniteGraphValues(model) {
  return [
    model.min,
    model.max,
    model.range,
    ...model.ticks,
    ...model.points.flatMap(point => [point.x, point.y])
  ].every(Number.isFinite)
}

let presentation = prepareHistoryPresentation([])
assert.equal(presentation.snapshotCount, 0)
assert.equal(presentation.latest, null)
assert.equal(buildGraphModel(presentation.points).points.length, 0)

presentation = prepareHistoryPresentation([
  snapshot("2026-09-15", -8170.81, 446.19, 8617)
])
assert.equal(presentation.snapshotCount, 1)
assert.equal(presentation.change, null)
assert.equal(presentation.changePercent, null)
assert.equal(buildGraphModel(presentation.points).points[0].x, 477)

const refreshedToday = prepareHistoryPresentation([
  snapshot("2026-09-15", -7500, 1000, 8500)
])
assert.equal(refreshedToday.snapshotCount, 1)
assert.equal(refreshedToday.latest.netWorth, -7500)
assert.equal(buildGraphModel(refreshedToday.points).points.length, 1)

presentation = prepareHistoryPresentation([
  snapshot("2026-10-15", 120),
  snapshot("2026-09-15", 100),
  snapshot("2026-10-01", 110)
])
assert.deepEqual(
  presentation.points.map(point => point.date),
  ["2026-09-15", "2026-10-01", "2026-10-15"]
)
assert.equal(presentation.change, 20)
assert.equal(presentation.changePercent, 20)

presentation = prepareHistoryPresentation([
  snapshot("2026-09-15", 100),
  snapshot("2026-10-15", 80)
])
assert.equal(presentation.change, -20)
assert.equal(presentation.changePercent, -20)

presentation = prepareHistoryPresentation([
  snapshot("2026-09-15", 100),
  snapshot("2026-10-15", 100)
])
assert.equal(presentation.change, 0)
assert.equal(presentation.changePercent, 0)
assert.equal(hasOnlyFiniteGraphValues(buildGraphModel(presentation.points)), true)

presentation = prepareHistoryPresentation([
  snapshot("2026-09-15", -100),
  snapshot("2026-10-15", 200)
])
let graph = buildGraphModel(presentation.points)
assert.ok(graph.zeroY > graph.top && graph.zeroY < graph.height - graph.bottom)
assert.equal(hasOnlyFiniteGraphValues(graph), true)

presentation = prepareHistoryPresentation([
  snapshot("2026-09-15", 0),
  snapshot("2026-10-15", 25)
])
assert.equal(presentation.change, 25)
assert.equal(presentation.changePercent, null)

presentation = prepareHistoryPresentation([
  snapshot("2026-09-15", -50),
  snapshot("2026-10-15", -50)
])
graph = buildGraphModel(presentation.points)
assert.equal(hasOnlyFiniteGraphValues(graph), true)

presentation = prepareHistoryPresentation([
  snapshot("2026-09-15", 100),
  snapshot("2026-10-15", 120)
])
assert.deepEqual(
  presentation.points.map(point => point.date),
  ["2026-09-15", "2026-10-15"]
)

assert.equal(formatHistoricalCurrency(446.18999999999996), "₱446.19")
assert.equal(formatHistoricalCurrency(-446.18999999999996), "-₱446.19")
assert.equal(formatHistoricalCurrency(100), "₱100.00")

console.log("Net Worth history presentation verification passed.")
