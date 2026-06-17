import { BINDER_TYPES } from '../utils/layoutEngine.js'

const SPACING_OPTIONS = [
  { value: 'page',  label: 'New page face' },
  { value: 'row',   label: 'New row' },
  { value: 'slots', label: 'X empty slots' },
]

export default function TopBar({ stats, syncing, onSync, settings, onSettingsChange, hasSets }) {
  const update = (key, value) =>
    onSettingsChange(prev => ({ ...prev, [key]: value }))

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0 flex-wrap">
      <span className="font-semibold text-base select-none">🎴 Binder Planner</span>

      {hasSets && (
        <>
          {/* Stats — combined mode */}
          {stats.mode === 'combined' && (
            <>
              <StatChip label="Binders needed" value={stats.bindersNeeded} />
              <StatChip label="Sets planned"   value={stats.setsPlanned} />
              <StatChip label="Cards"          value={stats.totalCards.toLocaleString()} />
            </>
          )}

          {/* Stats — separated mode */}
          {stats.mode === 'separated' && (
            <>
              <StatChip
                label="Base binders"
                value={stats.baseBindersNeeded}
                sub={stats.baseCards.toLocaleString() + ' cards'}
                color="#3B82F6"
              />
              <StatChip
                label="Secret binders"
                value={stats.secretBindersNeeded}
                sub={stats.secretCards.toLocaleString() + ' cards'}
                color="#8B5CF6"
              />
              <StatChip label="Sets planned" value={stats.setsPlanned} />
            </>
          )}

          <div className="h-5 w-px bg-gray-200 mx-1" />

          {/* Collection mode toggle */}
          <div className="flex text-xs border border-gray-200 rounded overflow-hidden">
            <button
              onClick={() => update('collectionMode', 'combined')}
              className={`px-2.5 py-1 transition-colors ${
                settings.collectionMode === 'combined'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Combined
            </button>
            <button
              onClick={() => update('collectionMode', 'separated')}
              className={`px-2.5 py-1 border-l border-gray-200 transition-colors ${
                settings.collectionMode === 'separated'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Separated
            </button>
          </div>

          <div className="h-5 w-px bg-gray-200 mx-1" />

          {/* Preferred binder type */}
          <label className="text-xs text-gray-500 whitespace-nowrap">Prefer</label>
          <select
            value={settings.preferredBinderType}
            onChange={e => update('preferredBinderType', e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
          >
            {Object.entries(BINDER_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.label} ({v.capacity} cards)</option>
            ))}
          </select>

          {/* Spacing rule */}
          <label className="text-xs text-gray-500 whitespace-nowrap">Spacing</label>
          <select
            value={settings.spacingRule}
            onChange={e => update('spacingRule', e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
          >
            {SPACING_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {settings.spacingRule === 'slots' && (
            <input
              type="number"
              min={0}
              max={100}
              value={settings.spacingValue}
              onChange={e => update('spacingValue', Math.max(0, parseInt(e.target.value) || 0))}
              className="w-14 text-xs border border-gray-200 rounded px-2 py-1"
            />
          )}
        </>
      )}

      <div className="flex-1" />

      <button
        onClick={onSync}
        disabled={syncing}
        className="text-xs px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        <span className={syncing ? 'inline-block animate-spin mr-1' : 'mr-1'}>⟳</span>
        {syncing ? 'Syncing…' : 'Sync sets'}
      </button>
    </div>
  )
}

function StatChip({ label, value, sub, color }) {
  return (
    <div className="flex flex-col items-center px-3 py-1 bg-gray-50 rounded border border-gray-100 min-w-[64px]">
      <span className="text-sm font-semibold leading-tight" style={color ? { color } : {}}>
        {value}
      </span>
      <span className="text-xs text-gray-400 leading-tight whitespace-nowrap">{label}</span>
      {sub && <span className="text-xs text-gray-300 leading-tight whitespace-nowrap">{sub}</span>}
    </div>
  )
}
