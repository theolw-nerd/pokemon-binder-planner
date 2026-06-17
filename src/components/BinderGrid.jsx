import BinderCard from './BinderCard.jsx'

export default function BinderGrid({ binders, groups, settings }) {
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
