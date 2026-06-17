import { useState, useMemo } from 'react'
import { getSeriesColor } from '../utils/colors.js'

const INTENT_OPTIONS = [
  { value: '',       label: '— not set —' },
  { value: 'master', label: 'Master set'  },
  { value: 'base',   label: 'Base only'   },
  { value: 'secret', label: 'Secret only' },
  { value: 'skip',   label: 'Skip'        },
]

export default function SetLibrary({ sets, onUpdateIntent }) {
  const [search, setSearch] = useState('')
  const [seriesFilter, setSeriesFilter] = useState('All')

  const allSeries = useMemo(
    () => ['All', ...Array.from(new Set(sets.map(s => s.series))).sort()],
    [sets]
  )

  const filtered = useMemo(() =>
    sets
      .filter(s => seriesFilter === 'All' || s.series === seriesFilter)
      .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase())),
    [sets, search, seriesFilter]
  )

  // Group filtered sets by series for display
  const grouped = useMemo(() => {
    const groups = {}
    for (const s of filtered) {
      if (!groups[s.series]) groups[s.series] = []
      groups[s.series].push(s)
    }
    return groups
  }, [filtered])

  const activeCount = sets.filter(s => s.intent && s.intent !== 'skip').length

  return (
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
        {Object.entries(grouped).map(([series, seriesSets]) => (
          <div key={series}>
            {/* Series header */}
            <div
              className="px-3 py-1 text-xs font-semibold sticky top-0 bg-gray-50 border-b border-gray-100 z-10"
              style={{ color: getSeriesColor(series) }}
            >
              {series}
            </div>
            {seriesSets.map(set => (
              <SetRow
                key={set.id}
                set={set}
                color={getSeriesColor(set.series)}
                onUpdateIntent={onUpdateIntent}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-400">
        {activeCount} of {sets.length} sets active
      </div>
    </div>
  )
}

function SetRow({ set, color, onUpdateIntent }) {
  // Show card count based on current intent
  const cardCount =
    set.intent === 'master' ? set.total :
    set.intent === 'base'   ? set.printedTotal :
    set.intent === 'secret' ? set.secretCount :
    null

  return (
    <div
      className={`px-2 py-1.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
        set.intent === 'skip' ? 'opacity-40' : ''
      }`}
    >
      {/* Set name with color dot */}
      <div className="flex items-center gap-1.5 mb-1">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: color }}
        />
        <span className="text-xs font-medium leading-tight truncate flex-1" title={set.name}>
          {set.name}
        </span>
      </div>

      {/* Intent selector + card count */}
      <div className="flex items-center gap-1.5 pl-3.5">
        <select
          value={set.intent || ''}
          onChange={e => onUpdateIntent(set.id, e.target.value)}
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
    </div>
  )
}
