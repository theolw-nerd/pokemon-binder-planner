import { BINDER_TYPES } from '../utils/layoutEngine.js'
import { getSeriesColor } from '../utils/colors.js'

export default function BinderCard({ binder }) {
  const config = BINDER_TYPES[binder.type]
  const fillPct = Math.round((binder.usedSlots / config.capacity) * 100)

  const barColor =
    fillPct > 90 ? '#EF4444' :
    fillPct > 75 ? '#F59E0B' :
    '#10B981'

  return (
    <div className="w-56 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="font-semibold text-sm">Binder {binder.id}</div>
          <div className="text-xs text-gray-400">{config.label}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums">
            {binder.usedSlots}
            <span className="text-xs text-gray-400 font-normal">/{config.capacity}</span>
          </div>
          <div className="text-xs text-gray-400">{fillPct}% full</div>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="mx-3 mt-2 mb-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${fillPct}%`, background: barColor }}
        />
      </div>

      {/* Set list */}
      <div className="px-3 py-2 flex flex-col gap-1.5">
        {binder.sets.map(set => {
          const color = getSeriesColor(set.series)
          const startPage = Math.floor(set.startSlot / config.pageFaceSize) + 1
          const endPage   = Math.floor(set.endSlot   / config.pageFaceSize) + 1
          const pageRange = startPage === endPage ? `p${startPage}` : `p${startPage}–${endPage}`

          return (
            <div key={set.id} className="flex items-start gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm mt-0.5 flex-shrink-0"
                style={{ background: color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium leading-tight truncate" title={set.name}>
                  {set.name}
                </div>
                <div className="text-xs text-gray-400 tabular-nums">
                  {set.cardCount} cards · {pageRange}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Visual slot map — shows every page face as a row of colored slots */}
      <SlotMap binder={binder} config={config} />
    </div>
  )
}

function SlotMap({ binder, config }) {
  // Build a flat array of colors, one entry per slot
  const slots = new Array(config.capacity).fill(null)
  for (const set of binder.sets) {
    const color = getSeriesColor(set.series)
    for (let i = set.startSlot; i <= set.endSlot; i++) {
      if (i < config.capacity) slots[i] = color
    }
  }

  // Split into page faces (each page face = config.pageFaceSize slots)
  const totalFaces = config.capacity / config.pageFaceSize
  const pageFaces = Array.from({ length: totalFaces }, (_, p) =>
    slots.slice(p * config.pageFaceSize, (p + 1) * config.pageFaceSize)
  )

  return (
    <div className="border-t border-gray-100 p-2 bg-gray-50 mt-auto">
      <div className="flex flex-col gap-px">
        {pageFaces.map((face, pi) => (
          <div key={pi} className="flex gap-px">
            {face.map((color, si) => (
              <div
                key={si}
                className="flex-1 h-2 rounded-sm"
                style={{ background: color ?? '#E5E7EB' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
