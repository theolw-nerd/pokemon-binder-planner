import BinderCard from './BinderCard.jsx'

export default function BinderGrid({ collectionMode, binders, baseBinders, secretBinders, groups }) {
  if (collectionMode === 'separated') {
    const hasBase    = baseBinders.length > 0
    const hasSecrets = secretBinders.length > 0

    if (!hasBase && !hasSecrets) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Set Base and Secrets intents in the library to see your binder layout
        </div>
      )
    }

    return (
      <div className="flex-1 overflow-auto">
        <div className="flex h-full divide-x divide-gray-200">
          {/* Base binders column */}
          <BinderPool
            label="Base Collection"
            color="#3B82F6"
            binders={baseBinders}
            groups={groups}
            emptyText="No base sets collected yet"
          />
          {/* Secrets binders column */}
          <BinderPool
            label="Secret Rare Collection"
            color="#8B5CF6"
            binders={secretBinders}
            groups={groups}
            emptyText="No secret rare sets collected yet"
          />
        </div>
      </div>
    )
  }

  // Combined mode
  if (binders.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Set intents in the library on the left to see your binder layout
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="flex gap-4 flex-wrap items-start">
        {binders.map(binder => (
          <BinderCard key={binder.id} binder={binder} groups={groups} />
        ))}
      </div>
    </div>
  )
}

function BinderPool({ label, color, binders, groups, emptyText }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Pool header */}
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

      {/* Binder cards */}
      {binders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
          {emptyText}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <div className="flex gap-4 flex-wrap items-start">
            {binders.map(binder => (
              <BinderCard key={binder.id} binder={binder} groups={groups} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
