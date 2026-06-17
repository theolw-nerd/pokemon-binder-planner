import { useMemo } from 'react'
import { BINDER_TYPES } from '../utils/layoutEngine.js'
import { getSeriesColor } from '../utils/colors.js'

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcStats(binders, sets, mode) {
  if (mode === 'separated') return null  // handled separately
  return {
    bindersNeeded: binders.length,
    setsPlanned:   sets.filter(s => s.intent && s.intent !== 'skip').length,
    totalCards:    binders.reduce((sum, b) => sum + b.usedSlots, 0),
  }
}

function calcSeparatedStats(baseBinders, secretBinders, sets) {
  return {
    baseBindersNeeded:   baseBinders.length,
    secretBindersNeeded: secretBinders.length,
    baseCards:   baseBinders.reduce((s, b) => s + b.usedSlots, 0),
    secretCards: secretBinders.reduce((s, b) => s + b.usedSlots, 0),
    setsPlanned: sets.filter(s => s.baseIntent === 'collect' || s.secretIntent === 'collect').length,
  }
}

function DiffChip({ label, before, after, lowerIsBetter = true }) {
  const diff = after - before
  const unchanged = diff === 0
  const improved  = lowerIsBetter ? diff < 0 : diff > 0
  const worsened  = lowerIsBetter ? diff > 0 : diff < 0

  return (
    <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 min-w-[80px]">
      <div className="flex items-baseline gap-1.5">
        <span className="text-base font-bold tabular-nums text-gray-400 line-through">{before}</span>
        <span className="text-xs text-gray-300">→</span>
        <span className={`text-base font-bold tabular-nums ${
          unchanged ? 'text-gray-700' :
          improved  ? 'text-green-600' :
                      'text-red-500'
        }`}>
          {after}
        </span>
        {!unchanged && (
          <span className={`text-xs font-semibold ${improved ? 'text-green-600' : 'text-red-500'}`}>
            {diff > 0 ? '+' : ''}{diff}
          </span>
        )}
      </div>
      <span className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  )
}

// ── Mini binder card (read-only, compact) ─────────────────────────────────────
function MiniBinderCard({ binder }) {
  const config  = BINDER_TYPES[binder.type]
  const fillPct = Math.round((binder.usedSlots / config.capacity) * 100)
  const barColor =
    fillPct > 90 ? '#EF4444' :
    fillPct > 75 ? '#F59E0B' :
    '#10B981'

  // Build slot map
  const slots = new Array(config.capacity).fill(null)
  for (const set of binder.sets) {
    const color = getSeriesColor(set.series)
    for (let i = set.startSlot; i <= set.endSlot; i++) {
      if (i < config.capacity) slots[i] = color
    }
  }
  const totalFaces = config.capacity / config.pageFaceSize
  const pageFaces  = Array.from({ length: totalFaces }, (_, p) =>
    slots.slice(p * config.pageFaceSize, (p + 1) * config.pageFaceSize)
  )

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm w-48 flex-shrink-0">
      {/* Header */}
      <div className="px-2.5 py-1.5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="font-semibold text-xs">Binder {binder.id}</div>
          <div className="text-xs text-gray-400">{config.label}</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold tabular-nums">
            {binder.usedSlots}<span className="text-gray-400 font-normal">/{config.capacity}</span>
          </div>
          <div className="text-xs text-gray-400">{fillPct}%</div>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="mx-2.5 mt-1.5 mb-0.5 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${fillPct}%`, background: barColor }} />
      </div>

      {/* Set list */}
      <div className="px-2.5 py-1.5 flex flex-col gap-1">
        {binder.sets.map(set => {
          const color      = getSeriesColor(set.series)
          const startPage  = Math.floor(set.startSlot / config.pageFaceSize) + 1
          const endPage    = Math.floor(set.endSlot   / config.pageFaceSize) + 1
          const pageRange  = startPage === endPage ? `p${startPage}` : `p${startPage}–${endPage}`
          return (
            <div key={set.id} className="flex items-start gap-1.5">
              <div className="w-2 h-2 rounded-sm mt-0.5 flex-shrink-0" style={{ background: color }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs leading-tight truncate" title={set.name}>{set.name}</div>
                <div className="text-xs text-gray-400 tabular-nums">{set.cardCount} · {pageRange}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Slot map */}
      <div className="border-t border-gray-100 p-1.5 bg-gray-50 mt-auto">
        <div className="flex flex-col gap-px">
          {pageFaces.map((face, pi) => (
            <div key={pi} className="flex gap-px">
              {face.map((color, si) => (
                <div key={si} className="flex-1 h-1.5 rounded-sm"
                  style={{ background: color ?? '#E5E7EB' }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Binder pool column ────────────────────────────────────────────────────────
function BinderColumn({ label, color, binders }) {
  if (binders.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-gray-400">
        No binders in this pool
      </div>
    )
  }
  return (
    <div>
      {label && (
        <div className="text-xs font-semibold mb-2" style={{ color }}>
          {label} — {binders.length} binder{binders.length !== 1 ? 's' : ''}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {binders.map(b => <MiniBinderCard key={b.id} binder={b} />)}
      </div>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function IntentPreviewModal({
  collectionMode,
  beforeBinders, beforeBaseBinders, beforeSecretBinders, beforeSets,
  afterBinders,  afterBaseBinders,  afterSecretBinders,  afterSets,
  groups,
  onConfirm, onCancel,
}) {
  const isSeparated = collectionMode === 'separated'

  const beforeStats = useMemo(() =>
    isSeparated
      ? calcSeparatedStats(beforeBaseBinders, beforeSecretBinders, beforeSets)
      : calcStats(beforeBinders, beforeSets, 'combined'),
    [isSeparated, beforeBinders, beforeBaseBinders, beforeSecretBinders, beforeSets]
  )

  const afterStats = useMemo(() =>
    isSeparated
      ? calcSeparatedStats(afterBaseBinders, afterSecretBinders, afterSets)
      : calcStats(afterBinders, afterSets, 'combined'),
    [isSeparated, afterBinders, afterBaseBinders, afterSecretBinders, afterSets]
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-6xl max-h-[90vh] overflow-hidden">

        {/* Modal header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-semibold text-base">Preview changes</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Review how your binder layout will change before confirming.
            </p>
          </div>
          <button onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4">×</button>
        </div>

        {/* Stats diff */}
        <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="text-xs text-gray-500 mb-2 font-medium">Impact</div>
          <div className="flex gap-3 flex-wrap">
            {isSeparated ? (
              <>
                <DiffChip label="Base binders"   before={beforeStats.baseBindersNeeded}   after={afterStats.baseBindersNeeded}   lowerIsBetter />
                <DiffChip label="Base cards"     before={beforeStats.baseCards}           after={afterStats.baseCards}           lowerIsBetter={false} />
                <DiffChip label="Secret binders" before={beforeStats.secretBindersNeeded} after={afterStats.secretBindersNeeded} lowerIsBetter />
                <DiffChip label="Secret cards"   before={beforeStats.secretCards}         after={afterStats.secretCards}         lowerIsBetter={false} />
                <DiffChip label="Sets planned"   before={beforeStats.setsPlanned}         after={afterStats.setsPlanned}         lowerIsBetter={false} />
              </>
            ) : (
              <>
                <DiffChip label="Binders needed" before={beforeStats.bindersNeeded} after={afterStats.bindersNeeded} lowerIsBetter />
                <DiffChip label="Cards"          before={beforeStats.totalCards}    after={afterStats.totalCards}    lowerIsBetter={false} />
                <DiffChip label="Sets planned"   before={beforeStats.setsPlanned}   after={afterStats.setsPlanned}   lowerIsBetter={false} />
              </>
            )}
          </div>
        </div>

        {/* Before / After binder grids */}
        <div className="flex flex-1 overflow-hidden divide-x divide-gray-100">

          {/* BEFORE column */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Before</span>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {isSeparated ? (
                <div className="flex flex-col gap-6">
                  <BinderColumn label="Base" color="#3B82F6" binders={beforeBaseBinders} />
                  <BinderColumn label="Secrets" color="#8B5CF6" binders={beforeSecretBinders} />
                </div>
              ) : (
                <BinderColumn binders={beforeBinders} />
              )}
            </div>
          </div>

          {/* AFTER column */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 flex-shrink-0">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">After</span>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {isSeparated ? (
                <div className="flex flex-col gap-6">
                  <BinderColumn label="Base" color="#3B82F6" binders={afterBaseBinders} />
                  <BinderColumn label="Secrets" color="#8B5CF6" binders={afterSecretBinders} />
                </div>
              ) : (
                <BinderColumn binders={afterBinders} />
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50">
          <p className="text-xs text-gray-400">
            Cancel to undo all pending changes and revert to the previous state.
          </p>
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="text-xs px-4 py-2 rounded-lg border border-gray-200 hover:bg-white transition-colors text-gray-600 font-medium">
              Cancel &amp; revert
            </button>
            <button onClick={onConfirm}
              className="text-xs px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors">
              Confirm changes
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
