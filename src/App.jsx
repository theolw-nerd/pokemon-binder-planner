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
  const [sets, setSets] = useState([])           // sets from the Pokémon TCG API
  const [manualSets, setManualSets] = useState([]) // sets added manually by the user
  const [configs, setConfigs] = useState({})     // user intent per set: { setId: { intent } }
  const [settings, setSettings] = useState(() => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('bp_settings') || '{}') }
    } catch {
      return DEFAULT_SETTINGS
    }
  })
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)

  // Load all cached data on first load
  useEffect(() => {
    try {
      const s = localStorage.getItem('bp_sets')
      const m = localStorage.getItem('bp_manual_sets')
      const c = localStorage.getItem('bp_configs')
      if (s) setSets(JSON.parse(s))
      if (m) setManualSets(JSON.parse(m))
      if (c) setConfigs(JSON.parse(c))
    } catch {}
  }, [])

  // Persist everything whenever it changes
  useEffect(() => { localStorage.setItem('bp_settings', JSON.stringify(settings)) }, [settings])
  useEffect(() => { localStorage.setItem('bp_configs', JSON.stringify(configs)) }, [configs])
  useEffect(() => { localStorage.setItem('bp_manual_sets', JSON.stringify(manualSets)) }, [manualSets])

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

  // --- Manual set handlers ---

  const addManualSet = (formData) => {
    const newSet = {
      ...formData,
      id: `manual-${Date.now()}`,
      total: formData.printedTotal + formData.secretCount,
      isManual: true,
    }
    setManualSets(prev => [...prev, newSet])
  }

  const editManualSet = (id, formData) => {
    setManualSets(prev =>
      prev.map(s => s.id === id
        ? { ...s, ...formData, total: formData.printedTotal + formData.secretCount }
        : s
      )
    )
  }

  const deleteManualSet = (id) => {
    setManualSets(prev => prev.filter(s => s.id !== id))
    // Clean up any saved intent for the deleted set
    setConfigs(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  // --- Intent handler ---

  const updateIntent = (setId, intent) => {
    setConfigs(prev => ({
      ...prev,
      [setId]: { ...prev[setId], intent: intent || null },
    }))
  }

  // Merge API sets + manual sets, sort by release date (no date → end), attach intents
  const setsWithConfig = useMemo(() => {
    const combined = [...sets, ...manualSets]
    combined.sort((a, b) => {
      if (!a.releaseDate && !b.releaseDate) return 0
      if (!a.releaseDate) return 1
      if (!b.releaseDate) return -1
      return a.releaseDate.localeCompare(b.releaseDate)
    })
    return combined.map(s => ({ ...s, intent: configs[s.id]?.intent ?? null }))
  }, [sets, manualSets, configs])

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

  const hasSets = sets.length > 0 || manualSets.length > 0

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 text-sm">
      <TopBar
        stats={stats}
        syncing={syncing}
        onSync={syncSets}
        settings={settings}
        onSettingsChange={setSettings}
        hasSets={hasSets}
      />

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-2 text-xs border-b border-red-100">
          {error}
        </div>
      )}

      {!hasSets ? (
        <EmptyState onSync={syncSets} syncing={syncing} />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <SetLibrary
            sets={setsWithConfig}
            onUpdateIntent={updateIntent}
            onAddManualSet={addManualSet}
            onEditManualSet={editManualSet}
            onDeleteManualSet={deleteManualSet}
          />
          <BinderGrid binders={binders} settings={settings} />
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
