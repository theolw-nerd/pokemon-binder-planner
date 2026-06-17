import { useState, useEffect, useMemo } from 'react'
import TopBar from './components/TopBar.jsx'
import SetLibrary from './components/SetLibrary.jsx'
import BinderGrid from './components/BinderGrid.jsx'
import { fetchAllSets } from './utils/pokemonTCGApi.js'
import { calculateLayout } from './utils/layoutEngine.js'

const DEFAULT_SETTINGS = {
  preferredBinderType: 'xl',
  spacingRule: 'page',
  spacingValue: 0,
  collectionMode: 'combined',
}

export default function App() {
  const [sets, setSets] = useState([])
  const [configs, setConfigs] = useState({}) // { setId: { intent } }
  const [settings, setSettings] = useState(() => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('bp_settings') || '{}') }
    } catch {
      return DEFAULT_SETTINGS
    }
  })
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)

  // Load cached sets and configs on first load
  useEffect(() => {
    try {
      const s = localStorage.getItem('bp_sets')
      const c = localStorage.getItem('bp_configs')
      if (s) setSets(JSON.parse(s))
      if (c) setConfigs(JSON.parse(c))
    } catch {}
  }, [])

  // Persist settings and configs whenever they change
  useEffect(() => {
    localStorage.setItem('bp_settings', JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    localStorage.setItem('bp_configs', JSON.stringify(configs))
  }, [configs])

  const syncSets = async () => {
    setSyncing(true)
    setError(null)
    try {
      const data = await fetchAllSets()
      setSets(data)
      localStorage.setItem('bp_sets', JSON.stringify(data))
    } catch {
      setError('Could not fetch sets — check your connection and try again.')
    } finally {
      setSyncing(false)
    }
  }

  const updateIntent = (setId, intent) => {
    setConfigs(prev => ({
      ...prev,
      [setId]: { ...prev[setId], intent: intent || null },
    }))
  }

  // Merge API set data with user-defined configs
  const setsWithConfig = useMemo(
    () => sets.map(s => ({ ...s, intent: configs[s.id]?.intent ?? null })),
    [sets, configs]
  )

  // Compute binder layout whenever sets or settings change
  const binders = useMemo(
    () => calculateLayout(setsWithConfig, settings),
    [setsWithConfig, settings]
  )

  const stats = useMemo(() => ({
    bindersNeeded: binders.length,
    setsPlanned: setsWithConfig.filter(s => s.intent && s.intent !== 'skip').length,
    totalCards: binders.reduce((sum, b) => sum + b.usedSlots, 0),
  }), [binders, setsWithConfig])

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 text-sm">
      <TopBar
        stats={stats}
        syncing={syncing}
        onSync={syncSets}
        settings={settings}
        onSettingsChange={setSettings}
        hasSets={sets.length > 0}
      />

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-2 text-xs border-b border-red-100">
          {error}
        </div>
      )}

      {sets.length === 0 ? (
        <EmptyState onSync={syncSets} syncing={syncing} />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <SetLibrary
            sets={setsWithConfig}
            onUpdateIntent={updateIntent}
          />
          <BinderGrid
            binders={binders}
            settings={settings}
          />
        </div>
      )}
    </div>
  )
}

function EmptyState({ onSync, syncing }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-500">
      <div className="text-5xl select-none">🎴</div>
      <p className="text-base font-medium text-gray-700">No sets loaded yet</p>
      <p className="text-sm text-gray-400">Sync to pull the latest Pokémon TCG set data</p>
      <button
        onClick={onSync}
        disabled={syncing}
        className="mt-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {syncing ? 'Syncing…' : '⟳  Sync sets now'}
      </button>
    </div>
  )
}
