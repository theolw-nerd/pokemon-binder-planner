import { useState, useMemo, useRef, useEffect } from 'react'
import { getSeriesColor } from '../utils/colors.js'
import ManualSetForm from './ManualSetForm.jsx'
import GroupForm from './GroupForm.jsx'

const INTENT_OPTIONS = [
  { value: '',       label: '— not set —' },
  { value: 'master', label: 'Master set'  },
  { value: 'base',   label: 'Base only'   },
  { value: 'secret', label: 'Secret only' },
  { value: 'skip',   label: 'Skip'        },
]

// ── Group badge color ─────────────────────────────────────────────────────────
// Deterministic amber/teal/indigo/rose cycle based on group id so colors
// are stable across re-renders but different for each group.
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

export default function SetLibrary({
  sets,
  groups,
  onUpdateIntent,
  onUpdateGroupMembership,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  onAddManualSet,
  onEditManualSet,
  onDeleteManualSet,
}) {
  const [search, setSearch]           = useState('')
  const [seriesFilter, setSeriesFilter] = useState('All')

  // Select mode
  const [selectMode, setSelectMode]   = useState(false)
  const [selected, setSelected]       = useState(new Set())

  // Modals
  const [manualForm, setManualForm]   = useState(null)   // null | 'add' | set object
  const [groupForm, setGroupForm]     = useState(null)   // null | 'create' | { mode:'rename', id, name }

  // Group picker (shown after selecting sets and clicking "Group (N)")
  const [showGroupPicker, setShowGroupPicker] = useState(false)

  const allSeries = useMemo(
    () => ['All', ...Array.from(new Set(sets.map(s => s.series))).sort()],
    [sets]
  )
  const seriesNames = useMemo(
    () => Array.from(new Set(sets.map(s => s.series))).sort(),
    [sets]
  )

  const filtered = useMemo(() =>
    sets
      .filter(s => seriesFilter === 'All' || s.series === seriesFilter)
      .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase())),
    [sets, search, seriesFilter]
  )

  const bySeries = useMemo(() => {
    const map = {}
    for (const s of filtered) {
      if (!map[s.series]) map[s.series] = []
      map[s.series].push(s)
    }
    return map
  }, [filtered])

  const activeCount = sets.filter(s => s.intent && s.intent !== 'skip').length

  // ── Select mode helpers ───────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const exitSelectMode = () => {
    setSelectMode(false)
    setSelected(new Set())
    setShowGroupPicker(false)
  }

  // ── Group assignment from picker ──────────────────────────────────────────
  const assignToGroup = (groupId) => {
    for (const setId of selected) {
      onUpdateGroupMembership(setId, groupId)
    }
    exitSelectMode()
  }

  const removeFromGroup = () => {
    for (const setId of selected) {
      onUpdateGroupMembership(setId, null)
    }
    exitSelectMode()
  }

  // ── Create group + immediately assign selected sets ───────────────────────
  const handleCreateAndAssign = (name) => {
    const id = onCreateGroup(name)
    for (const setId of selected) {
      onUpdateGroupMembership(setId, id)
    }
    setGroupForm(null)
    exitSelectMode()
  }

  // ── Manual set handlers ───────────────────────────────────────────────────
  const handleManualSave = (formData) => {
    if (manualForm === 'add') {
      onAddManualSet(formData)
    } else {
      onEditManualSet(manualForm.id, formData)
    }
    setManualForm(null)
  }

  const handleDelete = (set) => {
    if (window.confirm(`Remove "${set.name}" from your set list?`)) {
      onDeleteManualSet(set.id)
    }
  }

  // ── Footer button area ────────────────────────────────────────────────────
  const renderFooter = () => {
    if (selectMode) {
      const n = selected.size
      return (
        <div className="px-3 py-2 border-t border-gray-100 flex items-center gap-2 flex-wrap">
          <button onClick={exitSelectMode}
            className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600">
            Cancel
          </button>
          <div className="relative flex-1">
            {n > 0 ? (
              <button
                onClick={() => setShowGroupPicker(v => !v)}
                className="w-full text-xs px-2 py-1 rounded border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors font-medium"
              >
                Group ({n})
              </button>
            ) : (
              <span className="text-xs text-gray-400 pl-1">Select sets to group</span>
            )}
            {showGroupPicker && n > 0 && (
              <GroupPicker
                groups={groups}
                onAssign={assignToGroup}
                onRemove={removeFromGroup}
                onCreateNew={() => { setShowGroupPicker(false); setGroupForm('create') }}
                onClose={() => setShowGroupPicker(false)}
              />
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <span className="text-xs text-gray-400">{activeCount} of {sets.length} active</span>
        <div className="flex gap-1.5">
          <button onClick={() => setSelectMode(true)}
            className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
            title="Select sets to group">
            Select
          </button>
          <button onClick={() => setManualForm('add')}
            className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
            title="Add a set that's missing from the API">
            + Set
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="w-64 flex flex-col border-r border-gray-200 bg-white overflow-hidden flex-shrink-0">
        {/* Search and series filter */}
        <div className="p-2 border-b border-gray-100 flex flex-col gap-1.5">
          <input
            type="text"
            placeholder="Search sets…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-gray-50 outline-none focus:border-blue-400"
          />
          <select
            value={seriesFilter}
            onChange={e => setSeriesFilter(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white"
          >
            {allSeries.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Scrollable set list grouped by series */}
        <div className="flex-1 overflow-y-auto">
          {Object.entries(bySeries).map(([series, seriesSets]) => (
            <div key={series}>
              <div
                className="px-3 py-1 text-xs font-semibold sticky top-0 z-10 border-b border-gray-100"
                style={{ color: getSeriesColor(series), background: getSeriesColor(series) + '14' }}
              >
                {series}
              </div>
              {seriesSets.map(set => (
                <SetRow
                  key={set.id}
                  set={set}
                  color={getSeriesColor(set.series)}
                  groups={groups}
                  selectMode={selectMode}
                  isSelected={selected.has(set.id)}
                  onToggleSelect={() => toggleSelect(set.id)}
                  onUpdateIntent={onUpdateIntent}
                  onUpdateGroupMembership={onUpdateGroupMembership}
                  onOpenRenameForm={(data) => setGroupForm(data)}
                  onDeleteGroup={onDeleteGroup}
                  onEdit={() => setManualForm(set)}
                  onDelete={() => handleDelete(set)}
                />
              ))}
            </div>
          ))}
        </div>

        {renderFooter()}
      </div>

      {/* Manual set form modal */}
      {manualForm !== null && (
        <ManualSetForm
          existingSeries={seriesNames}
          initialData={manualForm === 'add' ? null : manualForm}
          onSave={handleManualSave}
          onClose={() => setManualForm(null)}
        />
      )}

      {/* Group form modal */}
      {groupForm === 'create' && (
        <GroupForm
          title={`Create group for ${selected.size} set${selected.size !== 1 ? 's' : ''}`}
          onSave={handleCreateAndAssign}
          onClose={() => setGroupForm(null)}
        />
      )}
      {groupForm?.mode === 'rename' && (
        <GroupForm
          title="Rename group"
          initialName={groupForm.name}
          onSave={(name) => { onRenameGroup(groupForm.id, name); setGroupForm(null) }}
          onClose={() => setGroupForm(null)}
        />
      )}
    </>
  )
}

// ── GroupPicker dropdown ──────────────────────────────────────────────────────
function GroupPicker({ groups, onAssign, onRemove, onCreateNew, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const groupList = Object.values(groups)

  return (
    <div ref={ref}
      className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 text-xs max-h-52 overflow-y-auto">
      {groupList.length > 0 && (
        <>
          <div className="px-2 py-1 text-gray-400 font-medium">Assign to group</div>
          {groupList.map(g => (
            <button key={g.id} onClick={() => onAssign(g.id)}
              className="w-full text-left px-3 py-1.5 hover:bg-gray-50 transition-colors text-gray-700">
              {g.name}
            </button>
          ))}
          <div className="my-1 border-t border-gray-100" />
          <button onClick={onRemove}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-500 transition-colors">
            Remove from group
          </button>
          <div className="my-1 border-t border-gray-100" />
        </>
      )}
      <button onClick={onCreateNew}
        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-blue-600 font-medium transition-colors">
        + Create new group
      </button>
    </div>
  )
}

// ── SetRow ────────────────────────────────────────────────────────────────────
function SetRow({
  set, color, groups,
  selectMode, isSelected, onToggleSelect,
  onUpdateIntent, onUpdateGroupMembership,
  onOpenRenameForm, onDeleteGroup,
  onEdit, onDelete,
}) {
  const [showGroupMenu, setShowGroupMenu] = useState(false)
  const groupMenuRef = useRef(null)

  useEffect(() => {
    if (!showGroupMenu) return
    const handler = (e) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(e.target)) {
        setShowGroupMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showGroupMenu])

  const cardCount =
    set.intent === 'master' ? set.total :
    set.intent === 'base'   ? set.printedTotal :
    set.intent === 'secret' ? set.secretCount :
    null

  const group = set.groupId ? groups[set.groupId] : null
  const gc    = group ? groupColor(set.groupId) : null

  return (
    <div
      className={`px-2 py-1.5 border-b border-gray-50 transition-colors group cursor-pointer ${
        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
      } ${set.intent === 'skip' ? 'opacity-40' : ''}`}
      onClick={selectMode ? onToggleSelect : undefined}
    >
      {/* Row 1: checkbox (select mode) | color dot | name | edit/delete */}
      <div className="flex items-center gap-1.5 mb-1">
        {selectMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={e => e.stopPropagation()}
            className="flex-shrink-0 accent-blue-500"
          />
        )}
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-xs font-medium leading-tight truncate flex-1" title={set.name}>
          {set.name}
        </span>
        {!selectMode && set.isManual && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit}
              className="text-gray-400 hover:text-blue-500 text-xs leading-none" title="Edit set">✎</button>
            <button onClick={onDelete}
              className="text-gray-400 hover:text-red-500 text-xs leading-none" title="Delete set">×</button>
          </div>
        )}
      </div>

      {/* Row 2: intent selector + card count */}
      {!selectMode && (
        <div className="flex items-center gap-1.5 pl-3.5">
          <select
            value={set.intent || ''}
            onChange={e => onUpdateIntent(set.id, e.target.value)}
            onClick={e => e.stopPropagation()}
            className="flex-1 text-xs border border-gray-200 rounded px-1 py-0.5 bg-white"
          >
            {INTENT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {cardCount !== null && (
            <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">{cardCount}</span>
          )}
        </div>
      )}

      {/* Row 3: group badge + manual label */}
      {!selectMode && (group || set.isManual) && (
        <div className="pl-3.5 mt-0.5 flex items-center gap-1.5">
          {group && (
            <div className="relative" ref={groupMenuRef}>
              <button
                onClick={e => { e.stopPropagation(); setShowGroupMenu(v => !v) }}
                className="text-xs font-medium px-1.5 py-0.5 rounded border leading-none"
                style={{ background: gc.bg, borderColor: gc.border, color: gc.text }}
                title="Group options"
              >
                {group.name}
              </button>
              {showGroupMenu && (
                <GroupBadgeMenu
                  set={set}
                  group={group}
                  groups={groups}
                  onAssign={(gid) => { onUpdateGroupMembership(set.id, gid); setShowGroupMenu(false) }}
                  onRemove={() => { onUpdateGroupMembership(set.id, null); setShowGroupMenu(false) }}
                  onRename={() => {
                    setShowGroupMenu(false)
                    onOpenRenameForm({ mode: 'rename', id: group.id, name: group.name })
                  }}
                  onDelete={() => {
                    if (window.confirm(`Delete group "${group.name}"? Sets will be ungrouped.`)) {
                      onDeleteGroup(group.id)
                    }
                    setShowGroupMenu(false)
                  }}
                />
              )}
            </div>
          )}
          {set.isManual && (
            <span className="text-xs text-amber-500">manual</span>
          )}
        </div>
      )}
    </div>
  )
}

// ── GroupBadgeMenu ────────────────────────────────────────────────────────────
function GroupBadgeMenu({ set, group, groups, onAssign, onRemove, onRename, onDelete }) {
  const others = Object.values(groups).filter(g => g.id !== group.id)

  return (
    <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 text-xs min-w-[160px]">
      <div className="px-2 py-1 text-gray-400 font-medium border-b border-gray-100 mb-1">
        {group.name}
      </div>
      <button onClick={onRename}
        className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700 transition-colors">
        Rename group
      </button>
      <button onClick={onRemove}
        className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-500 transition-colors">
        Remove from group
      </button>
      {others.length > 0 && (
        <>
          <div className="my-1 border-t border-gray-100" />
          <div className="px-2 py-1 text-gray-400">Move to</div>
          {others.map(g => (
            <button key={g.id} onClick={() => onAssign(g.id)}
              className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700 transition-colors">
              {g.name}
            </button>
          ))}
        </>
      )}
      <div className="my-1 border-t border-gray-100" />
      <button onClick={onDelete}
        className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-500 transition-colors">
        Delete group
      </button>
    </div>
  )
}
