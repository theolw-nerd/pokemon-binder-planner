import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import TopBar from './components/TopBar.jsx'
import SetLibrary from './components/SetLibrary.jsx'
import BinderGrid from './components/BinderGrid.jsx'
import IntentPreviewModal from './components/IntentPreviewModal.jsx'
import { fetchAllSets } from './utils/pokemonTCGApi.js'
import { calculateLayout } from './utils/layoutEngine.js'

const DEFAULT_SETTINGS = {
  preferredBinderType: 'xl',
  spacingRule: 'page',
  spacingValue: 0,
  collectionMode: 'combined',
}

function moveItem(arr, fromIdx, toIdx) {
  const next = [...arr]
  const [item] = next.splice(fromIdx, 1)
  next.splice(toIdx, 0, item)
  return next
}

export default function App() {
  const [sets, setSets]               = useState([])
  const [manualSets, setManualSets]   = useState([])
  const [configs, setConfigs]         = useState({})
  const [committedConfigs, setCommittedConfigs] = useState({})
  // manualOrder: array of all set IDs in user-defined sequence; [] = use date sort
  const [manualOrder, setManualOrder]           = useState([])
  const [committedManualOrder, setCommittedManualOrder] = useState([])
  const [groups, setGroups]           = useState({})
  const [settings, setSettings]       = useState(() => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('bp_settings') || '{}') }
    } catch { return DEFAULT_SETTINGS }
  })
  const [syncing, setSyncing]         = useState(false)
  const [error, setError]             = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // ── Persistence ───────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const s   = localStorage.getItem('bp_sets')
      const m   = localStorage.getItem('bp_manual_sets')
      const c   = localStorage.getItem('bp_configs')
      const cc  = localStorage.getItem('bp_configs_committed')
      const mo  = localStorage.getItem('bp_manual_order')
      const moc = localStorage.getItem('bp_manual_order_committed')
      const g   = localStorage.getItem('bp_groups')
      if (s)  setSets(JSON.parse(s))
      if (m)  setManualSets(JSON.parse(m))
      if (c)  {
        const parsed = JSON.parse(c)
        setConfigs(parsed)
        setCommittedConfigs(cc ? JSON.parse(cc) : parsed)
      }
      if (mo)  { const parsed = JSON.parse(mo);  setManualOrder(parsed) }
      if (moc) { const parsed = JSON.parse(moc); setCommittedManualOrder(parsed) }
      if (g)   setGroups(JSON.parse(g))
    } catch {}
  }, [])

  useEffect(() => { localStorage.setItem('bp_settings',    JSON.stringify(settings))    }, [settings])
  useEffect(() => { localStorage.setItem('bp_configs',     JSON.stringify(configs))     }, [configs])
  useEffect(() => { localStorage.setItem('bp_manual_sets', JSON.stringify(manualSets))  }, [manualSets])
  useEffect(() => { localStorage.setItem('bp_groups',      JSON.stringify(groups))      }, [groups])
  useEffect(() => { localStorage.setItem('bp_manual_order', JSON.stringify(manualOrder)) }, [manualOrder])

  // ── API sync ──────────────────────────────────────────────────────────────
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

  // ── Intent handlers ───────────────────────────────────────────────────────
  const updateIntent = (setId, intent) => {
    setConfigs(prev => ({ ...prev, [setId]: { ...prev[setId], intent: intent || null } }))
  }
  const updateBaseIntent = (setId, value) => {
    setConfigs(prev => ({ ...prev, [setId]: { ...prev[setId], baseIntent: value || null } }))
  }
  const updateSecretIntent = (setId, value) => {
    setConfigs(prev => ({ ...prev, [setId]: { ...prev[setId], secretIntent: value || null } }))
  }

  // ── Preview commit / revert ───────────────────────────────────────────────
  const confirmPreview = () => {
    setCommittedConfigs(configs)
    setCommittedManualOrder(manualOrder)
    localStorage.setItem('bp_configs_committed', JSON.stringify(configs))
    localStorage.setItem('bp_manual_order_committed', JSON.stringify(manualOrder))
    setPreviewOpen(false)
  }

  const cancelPreview = () => {
    setConfigs(committedConfigs)
    setManualOrder(committedManualOrder)
    setPreviewOpen(false)
  }

  // Pending change count (intent changes + order change)
  const pendingChangeCount = useMemo(() => {
    const allIds = new Set([...Object.keys(configs), ...Object.keys(committedConfigs)])
    let intentChanges = 0
    for (const id of allIds) {
      const c  = configs[id]
      const cc = committedConfigs[id]
      if ((c?.intent ?? null)       !== (cc?.intent ?? null))       intentChanges++
      else if ((c?.baseIntent ?? null)   !== (cc?.baseIntent ?? null))   intentChanges++
      else if ((c?.secretIntent ?? null) !== (cc?.secretIntent ?? null)) intentChanges++
    }
    const orderChanged = JSON.stringify(manualOrder) !== JSON.stringify(committedManualOrder)
    return intentChanges + (orderChanged ? 1 : 0)
  }, [configs, committedConfigs, manualOrder, committedManualOrder])

  // ── Group handlers ────────────────────────────────────────────────────────
  const createGroup = (name) => {
    const id = `group-${Date.now()}`
    setGroups(prev => ({ ...prev, [id]: { id, name } }))
    return id
  }
  const renameGroup = (id, name) => {
    setGroups(prev => ({ ...prev, [id]: { ...prev[id], name } }))
  }
  const deleteGroup = (id) => {
    setGroups(prev => { const next = { ...prev }; delete next[id]; return next })
    setConfigs(prev => {
      const next = { ...prev }
      for (const setId of Object.keys(next)) {
        if (next[setId]?.groupId === id) next[setId] = { ...next[setId], groupId: null }
      }
      return next
    })
  }
  const updateGroupMembership = (setId, groupId) => {
    setConfigs(prev => ({ ...prev, [setId]: { ...prev[setId], groupId: groupId || null } }))
  }

  // ── Manual set handlers ───────────────────────────────────────────────────
  const addManualSet = (formData) => {
    setManualSets(prev => [...prev, {
      ...formData,
      id: `manual-${Date.now()}`,
      total: formData.printedTotal + formData.secretCount,
      isManual: true,
    }])
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
    setConfigs(prev => { const next = { ...prev }; delete next[id]; return next })
    setManualOrder(prev => prev.filter(sid => sid !== id))
  }

  // ── sortedSets: date-based or manual order ────────────────────────────────
  const sortedSets = useMemo(() => {
    const combined = [...sets, ...manualSets]

    if (manualOrder.length > 0) {
      // Manual order: use the stored sequence; new/unknown sets fall to the end
      const posMap = Object.fromEntries(manualOrder.map((id, i) => [id, i]))
      combined.sort((a, b) => {
        const posA = posMap[a.id] ?? Infinity
        const posB = posMap[b.id] ?? Infinity
        if (posA !== posB) return posA - posB
        return (a.releaseDate ?? '').localeCompare(b.releaseDate ?? '')
      })
    } else {
      // Date sort with group anchors
      const anchorDates = {}
      for (const s of combined) {
        const gid = configs[s.id]?.groupId
        if (gid && s.releaseDate) {
          if (!anchorDates[gid] || s.releaseDate < anchorDates[gid]) anchorDates[gid] = s.releaseDate
        }
      }
      combined.sort((a, b) => {
        const aGid  = configs[a.id]?.groupId
        const bGid  = configs[b.id]?.groupId
        const aDate = (aGid && anchorDates[aGid]) ? anchorDates[aGid] : (a.releaseDate ?? '')
        const bDate = (bGid && anchorDates[bGid]) ? anchorDates[bGid] : (b.releaseDate ?? '')
        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1
        if (aDate !== bDate) return aDate.localeCompare(bDate)
        return (a.releaseDate ?? '').localeCompare(b.releaseDate ?? '')
      })
    }

    return combined
  }, [sets, manualSets, configs, manualOrder])

  // Ref so handleReorder always sees the latest sortedSets without stale closure
  const sortedSetsRef = useRef(sortedSets)
  useEffect(() => { sortedSetsRef.current = sortedSets }, [sortedSets])

  // ── Drag-and-drop reorder ─────────────────────────────────────────────────
  const handleReorder = useCallback((activeId, overId) => {
    setManualOrder(prev => {
      // Initialize from date sort if no manual order yet
      const currentOrder = prev.length > 0
        ? prev
        : sortedSetsRef.current.map(s => s.id)

      const oldIdx = currentOrder.indexOf(activeId)
      const newIdx = currentOrder.indexOf(overId)
      if (oldIdx === -1 || newIdx === -1) return prev

      return moveItem(currentOrder, oldIdx, newIdx)
    })
  }, [])

  const handleResetOrder = useCallback(() => {
    setManualOrder([])
  }, [])

  // ── setsWithConfig (pending and committed) ────────────────────────────────
  const setsWithConfig = useMemo(() =>
    sortedSets.map(s => ({
      ...s,
      intent:       configs[s.id]?.intent       ?? null,
      baseIntent:   configs[s.id]?.baseIntent   ?? null,
      secretIntent: configs[s.id]?.secretIntent ?? null,
      groupId:      configs[s.id]?.groupId      ?? null,
    })),
    [sortedSets, configs]
  )

  // Committed sets — same sort order, committed intents
  const committedSortedSets = useMemo(() => {
    const combined = [...sets, ...manualSets]
    if (committedManualOrder.length > 0) {
      const posMap = Object.fromEntries(committedManualOrder.map((id, i) => [id, i]))
      combined.sort((a, b) => {
        const posA = posMap[a.id] ?? Infinity
        const posB = posMap[b.id] ?? Infinity
        if (posA !== posB) return posA - posB
        return (a.releaseDate ?? '').localeCompare(b.releaseDate ?? '')
      })
    } else {
      const anchorDates = {}
      for (const s of combined) {
        const gid = committedConfigs[s.id]?.groupId
        if (gid && s.releaseDate) {
          if (!anchorDates[gid] || s.releaseDate < anchorDates[gid]) anchorDates[gid] = s.releaseDate
        }
      }
      combined.sort((a, b) => {
        const aGid  = committedConfigs[a.id]?.groupId
        const bGid  = committedConfigs[b.id]?.groupId
        const aDate = (aGid && anchorDates[aGid]) ? anchorDates[aGid] : (a.releaseDate ?? '')
        const bDate = (bGid && anchorDates[bGid]) ? anchorDates[bGid] : (b.releaseDate ?? '')
        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1
        if (aDate !== bDate) return aDate.localeCompare(bDate)
        return (a.releaseDate ?? '').localeCompare(b.releaseDate ?? '')
      })
    }
    return combined
  }, [sets, manualSets, committedConfigs, committedManualOrder])

  const committedSetsWithConfig = useMemo(() =>
    committedSortedSets.map(s => ({
      ...s,
      intent:       committedConfigs[s.id]?.intent       ?? null,
      baseIntent:   committedConfigs[s.id]?.baseIntent   ?? null,
      secretIntent: committedConfigs[s.id]?.secretIntent ?? null,
      groupId:      committedConfigs[s.id]?.groupId      ?? null,
    })),
    [committedSortedSets, committedConfigs]
  )

  // ── Layout calculations ───────────────────────────────────────────────────
  const isSeparated = settings.collectionMode === 'separated'

  const binders = useMemo(
    () => !isSeparated ? calculateLayout(setsWithConfig, settings) : [],
    [setsWithConfig, settings, isSeparated]
  )
  const baseBinders = useMemo(() => {
    if (!isSeparated) return []
    return calculateLayout(
      setsWithConfig.filter(s => s.baseIntent === 'collect' && s.printedTotal > 0).map(s => ({ ...s, intent: 'base' })),
      settings
    )
  }, [setsWithConfig, settings, isSeparated])
  const secretBinders = useMemo(() => {
    if (!isSeparated) return []
    return calculateLayout(
      setsWithConfig.filter(s => s.secretIntent === 'collect' && s.secretCount > 0).map(s => ({ ...s, intent: 'secret' })),
      settings
    )
  }, [setsWithConfig, settings, isSeparated])

  const committedBinders = useMemo(
    () => !isSeparated ? calculateLayout(committedSetsWithConfig, settings) : [],
    [committedSetsWithConfig, settings, isSeparated]
  )
  const committedBaseBinders = useMemo(() => {
    if (!isSeparated) return []
    return calculateLayout(
      committedSetsWithConfig.filter(s => s.baseIntent === 'collect' && s.printedTotal > 0).map(s => ({ ...s, intent: 'base' })),
      settings
    )
  }, [committedSetsWithConfig, settings, isSeparated])
  const committedSecretBinders = useMemo(() => {
    if (!isSeparated) return []
    return calculateLayout(
      committedSetsWithConfig.filter(s => s.secretIntent === 'collect' && s.secretCount > 0).map(s => ({ ...s, intent: 'secret' })),
      settings
    )
  }, [committedSetsWithConfig, settings, isSeparated])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (isSeparated) {
      return {
        mode: 'separated',
        baseBindersNeeded:   baseBinders.length,
        secretBindersNeeded: secretBinders.length,
        baseCards:   baseBinders.reduce((s, b) => s + b.usedSlots, 0),
        secretCards: secretBinders.reduce((s, b) => s + b.usedSlots, 0),
        setsPlanned: setsWithConfig.filter(s => s.baseIntent === 'collect' || s.secretIntent === 'collect').length,
      }
    }
    return {
      mode: 'combined',
      bindersNeeded: binders.length,
      setsPlanned:   setsWithConfig.filter(s => s.intent && s.intent !== 'skip').length,
      totalCards:    binders.reduce((s, b) => s + b.usedSlots, 0),
    }
  }, [binders, baseBinders, secretBinders, setsWithConfig, isSeparated])

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
        pendingChangeCount={pendingChangeCount}
        onOpenPreview={() => setPreviewOpen(true)}
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
            collectionMode={settings.collectionMode}
            onUpdateIntent={updateIntent}
            onUpdateBaseIntent={updateBaseIntent}
            onUpdateSecretIntent={updateSecretIntent}
            onUpdateGroupMembership={updateGroupMembership}
            onCreateGroup={createGroup}
            onRenameGroup={renameGroup}
            onDeleteGroup={deleteGroup}
            onAddManualSet={addManualSet}
            onEditManualSet={editManualSet}
            onDeleteManualSet={deleteManualSet}
          />
          <BinderGrid
            collectionMode={settings.collectionMode}
            binders={binders}
            baseBinders={baseBinders}
            secretBinders={secretBinders}
            groups={groups}
            hasManualOrder={manualOrder.length > 0}
            onReorder={handleReorder}
            onResetOrder={handleResetOrder}
          />
        </div>
      )}

      {previewOpen && (
        <IntentPreviewModal
          collectionMode={settings.collectionMode}
          beforeBinders={committedBinders}
          beforeBaseBinders={committedBaseBinders}
          beforeSecretBinders={committedSecretBinders}
          beforeSets={committedSetsWithConfig}
          afterBinders={binders}
          afterBaseBinders={baseBinders}
          afterSecretBinders={secretBinders}
          afterSets={setsWithConfig}
          groups={groups}
          onConfirm={confirmPreview}
          onCancel={cancelPreview}
        />
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
