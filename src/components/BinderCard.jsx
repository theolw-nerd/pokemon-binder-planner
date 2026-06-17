import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BINDER_TYPES } from '../utils/layoutEngine.js'
import { getSeriesColor } from '../utils/colors.js'

const GROUP_COLORS = [
  { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
  { bg: '#CCFBF1', border: '#14B8A6', text: '#115E59' },
  { bg: '#EDE9FE', border: '#8B5CF6', text: '#4C1D95' },
  { bg: '#FFE4E6', border: '#F43F5E', text: '#881337' },
  { bg: '#DBEAFE', border: '#3B82F6', text: '#1E3A8A' },
  { bg: '#DCFCE7', border: '#22C55E', text: '#14532D' },
]
function groupColor(groupId) {
  const idx = parseInt(groupId.replace(/\D/g, '') || '0') % GROUP_COLORS.length
  return GROUP_COLORS[idx]
}

// ── Static set item (used when not in DnD context) ────────────────────────────
function StaticSetItem({ set, config, groups }) {
  return <SetItemContent set={set} config={config} groups={groups} />
}

// ── Sortable set item (used inside DndContext) ────────────────────────────────
function SortableSetItem({ set, config, groups }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: set.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      {/* Drag handle */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5 touch-none select-none"
        title="Drag to reorder"
        tabIndex={-1}
      >
        ⠿
      </button>
      <SetItemContent set={set} config={config} groups={groups} />
    </div>
  )
}

// ── Shared set item content ───────────────────────────────────────────────────
function SetItemContent({ set, config, groups }) {
  const color      = getSeriesColor(set.series)
  const startPage  = Math.floor(set.startSlot / config.pageFaceSize) + 1
  const endPage    = Math.floor(set.endSlot   / config.pageFaceSize) + 1
  const pageRange  = startPage === endPage ? `p${startPage}` : `p${startPage}–${endPage}`
  const group      = set.groupId && groups ? groups[set.groupId] : null
  const gc         = group ? groupColor(set.groupId) : null

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-start gap-1.5">
        <div className="w-2.5 h-2.5 rounded-sm mt-0.5 flex-shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium leading-tight truncate" title={set.name}>
            {set.name}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <span className="text-xs text-gray-400 tabular-nums">
              {set.cardCount} cards · {pageRange}
            </span>
            {group && (
              <span
                className="text-xs font-medium px-1 py-px rounded border leading-none"
                style={{ background: gc.bg, borderColor: gc.border, color: gc.text }}
              >
                {group.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── BinderCard ────────────────────────────────────────────────────────────────
export default function BinderCard({ binder, groups, isDraggable = false }) {
  const config  = BINDER_TYPES[binder.type]
  const fillPct = Math.round((binder.usedSlots / config.capacity) * 100)
  const barColor =
    fillPct > 90 ? '#EF4444' :
    fillPct > 75 ? '#F59E0B' :
    '#10B981'

  const SetItem = isDraggable ? SortableSetItem : StaticSetItem

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
        {binder.sets.map(set => (
          <SetItem key={set.id} set={set} config={config} groups={groups} />
        ))}
      </div>

      {/* Slot map */}
      <SlotMap binder={binder} config={config} />
    </div>
  )
}

function SlotMap({ binder, config }) {
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
    <div className="border-t border-gray-100 p-2 bg-gray-50 mt-auto">
      <div className="flex flex-col gap-px">
        {pageFaces.map((face, pi) => (
          <div key={pi} className="flex gap-px">
            {face.map((color, si) => (
              <div key={si} className="flex-1 h-2 rounded-sm"
                style={{ background: color ?? '#E5E7EB' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
