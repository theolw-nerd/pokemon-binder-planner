import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import BinderCard from './BinderCard.jsx'
import { getSeriesColor } from '../utils/colors.js'

// ── DragOverlay ghost card ────────────────────────────────────────────────────
function DragGhost({ set }) {
  if (!set) return null
  const color = getSeriesColor(set.series)
  return (
    <div className="bg-white border-2 border-blue-400 rounded-lg px-3 py-2 shadow-xl flex items-center gap-2 w-48 opacity-90">
      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
      <span className="text-xs font-medium truncate">{set.name}</span>
    </div>
  )
}

// ── Single-pool draggable binder grid ─────────────────────────────────────────
function DraggablePool({ label, color, binders, groups, onReorder, emptyText }) {
  const [activeSet, setActiveSet] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const allSetIds = binders.flatMap(b => b.sets.map(s => s.id))

  const handleDragStart = ({ active }) => {
    for (const b of binders) {
      const found = b.sets.find(s => s.id === active.id)
      if (found) { setActiveSet(found); break }
    }
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveSet(null)
    if (!over || active.id === over.id) return
    onReorder(active.id, over.id)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      <div
        className="px-4 py-2 text-xs font-semibold border-b border-gray-200 flex-shrink-0"
        style={{ color, background: color + '10' }}
      >
        {label}
        {binders.length > 0 && (
          <span className="ml-2 font-normal text-gray-400">
            {binders.length} binder{binders.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {binders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
          {emptyText}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={allSetIds} strategy={rectSortingStrategy}>
            <div className="flex-1 overflow-auto p-4">
              <div className="flex gap-4 flex-wrap items-start">
                {binders.map(b => (
                  <BinderCard key={b.id} binder={b} groups={groups} isDraggable />
                ))}
              </div>
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            <DragGhost set={activeSet} />
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}

// ── Main BinderGrid ───────────────────────────────────────────────────────────
export default function BinderGrid({
  collectionMode,
  binders,
  baseBinders,
  secretBinders,
  groups,
  hasManualOrder,
  onReorder,
  onResetOrder,
}) {
  const [activeSet, setActiveSet] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const isSeparated = collectionMode === 'separated'

  if (isSeparated) {
    const hasAny = baseBinders.length > 0 || secretBinders.length > 0
    if (!hasAny) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Set Base and Secrets intents in the library to see your binder layout
        </div>
      )
    }
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex h-full divide-x divide-gray-200">
          <DraggablePool
            label="Base Collection"
            color="#3B82F6"
            binders={baseBinders}
            groups={groups}
            onReorder={onReorder}
            emptyText="No base sets collected yet"
          />
          <DraggablePool
            label="Secret Rare Collection"
            color="#8B5CF6"
            binders={secretBinders}
            groups={groups}
            onReorder={onReorder}
            emptyText="No secret rare sets collected yet"
          />
        </div>
      </div>
    )
  }

  // ── Combined mode ─────────────────────────────────────────────────────────
  if (binders.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Set intents in the library on the left to see your binder layout
      </div>
    )
  }

  const allSetIds = binders.flatMap(b => b.sets.map(s => s.id))

  const handleDragStart = ({ active }) => {
    for (const b of binders) {
      const found = b.sets.find(s => s.id === active.id)
      if (found) { setActiveSet(found); break }
    }
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveSet(null)
    if (!over || active.id === over.id) return
    onReorder(active.id, over.id)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={allSetIds} strategy={rectSortingStrategy}>
        <div className="flex-1 overflow-auto flex flex-col">
          {/* Reset order banner */}
          {hasManualOrder && (
            <div className="px-4 pt-3 pb-0 flex items-center gap-2">
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Custom order active
              </span>
              <button
                onClick={onResetOrder}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Reset to release date order
              </button>
            </div>
          )}
          <div className="p-4">
            <div className="flex gap-4 flex-wrap items-start">
              {binders.map(b => (
                <BinderCard key={b.id} binder={b} groups={groups} isDraggable />
              ))}
            </div>
          </div>
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        <DragGhost set={activeSet} />
      </DragOverlay>
    </DndContext>
  )
}
