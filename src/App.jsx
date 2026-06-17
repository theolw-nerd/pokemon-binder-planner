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
  const [manualSets, setManualSets] = useState([])
  const [configs, setConfigs] = useState({})   // { setId: { intent, groupId } }
  const [groups, setGroups] = useState({})     // { groupId: { id, name } }
  const [settings, setSettings] = useState(() => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('bp_settings') || '{}') }
    } catch { return DEFAULT_SETTINGS }
  })
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)

  // Load all cached data on mount
  useEffect(() => {
    try {
      const s = localStorage.getItem('bp_sets')
      const m = localStorage.getItem('bp_manual_sets')
      const c = localStorage.getItem('bp_configs')
      const g = localStorage.getItem('bp_groups')
      if (s) setSets(JSON.parse(s))
      if (m) setManualSets(JSON.parse(m))
      if (c) setConfigs(JSON.parse(c))
      if (g) setGroups(JSON.parse(g))
    } catch {}
  }, [])

  // Persist everything on change
  useEffect(() => { localStorage.setItem('bp_settings',     JSON.stringify(settings))    }, [settings])
  useEffect(() => { localStorage.setItem('bp_configs',      JSON.stringify(configs))     }, [configs])
  useEffect(() => { localStorage.setItem('bp_manual_sets',  JSON.stringify(manualSets))  }, [manualSets])
  useEffect(() => { localStorage.setItem('bp_groups',       JSON.stringify(groups))      }, [groups])

  // ── API sync ─────────────────────────────────────────────────────────────
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

  // ── Intent ───────────────────────────────────────────────────────────────
  const updateIntent = (setId, intent) => {
    setConfigs(prev => ({
      ...prev,
      [setId]: { ...prev[setId], intent: intent || null },
    }))
  }

  // ── Groups ───────────────────────────────────────────────────────────────
  // Returns the new group's id so callers can immediately assign sets to it
  const createGroup = (name) => {
    const id = `group-${Date.now()}`
    setGroups(prev => ({ ...prev, [id]: { id, name } }))
    return id
  }

  const renameGroup = (id, name) => {
    setGroups(prev => ({ ...prev, [id]: { ...prev[id], name } }))
  }

  const deleteGroup = (id) => {
    setGroups(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    // Clear groupId from all sets that belonged to this group
    setConfigs(prev => {
      const next = { ...prev }
      for (const setId of Object.keys(next)) {
        if (next[setId]?.groupId === id) {
          next[setId] = { ...next[setId], groupId: null }
        }
      }
      return next
    })
  }

  const updateGroupMembership = (setId, groupId) => {
    setConfigs(prev => ({
      ...prev,
      [setId]: { ...prev[setId], groupId: groupId || null },
    }))
  }

  // ── Manual sets ──────────────────────────────────────────────────────────
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
    setConfigs(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  // ── Derived data ─────────────────────────────────────────────────────────
  const setsWithConfig = useMemo(() => {
    const combined = [...sets, ...manualSets]

    // Build group anchor dates: each group's position = earliest release date among its members
    const anchorDates = {}
    for (const s of combined) {
      const gid = configs[s.id]?.groupId
      if (gid && s.releaseDate) {
        if (!anchorDates[gid] || s.releaseDate < anchorDates[gid]) {
          anchorDates[gid] = s.releaseDate
        }
      }
    }

    // Sort: grouped sets use anchor date; ungrouped sets use their own date
    // Sets with no date sort last. Tie-break on own date (keeps group members ordered)
    combined.sort((a, b) => {
      const aGid = configs[a.id]?.groupId
      const bGid = configs[b.id]?.groupId
      const aDate = (aGid && anchorDates[aGid]) ? anchorDates[aGid] : (a.releaseDate ?? '')
      const bDate = (bGid && anchorDates[bGid]) ? anchorDates[bGid] : (b.releaseDate ?? '')

      if (!aDate && !bDate) return 0
      if (!aDate) return 1
      if (!bDate) return -1
      if (aDate !== bDate) return aDate.localeCompare(bDate)
      return (a.releaseDate ?? '').localeCompare(b.releaseDate ?? '')
    })

    return combined.map(s => ({
      ...s,
      intent:  configs[s.id]?.intent  ?? null,
      groupId: configs[s.id]?.groupId ?? null,
    }))
  }, [sets, manualSets, configs])

  const binders = useMemo(
    () => calculateLayout(setsWithConfig, settings),
    [setsWithConfig, settings]
  )

  const stats = useMemo(() => ({
    bindersNeeded: binders.length,
    setsPlanned:   setsWithConfig.filter(s => s.intent && s.intent !== 'skip').length,
    totalCards:    binders.reduce((sum, b) => sum + b.usedSlots, 0),
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
            groups={groups}
            onUpdateIntent={updateIntent}
            onUpdateGroupMembership={updateGroupMembership}
            onCreateGroup={createGroup}
            onRenameGroup={renameGroup}
            onDeleteGroup={deleteGroup}
            onAddManualSet={addManualSet}
            onEditManualSet={editManualSet}
            onDeleteManualSet={deleteManualSet}
          />
          <BinderGrid binders={binders} groups={groups} settings={settings} />
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
      <button onClick={onSync} disabled={syncing}
        className="mt-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {syncing ? 'Syncing…' : '⟳  Sync sets now'}
      </button>
    </div>
  )
}
