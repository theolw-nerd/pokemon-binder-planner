import { useState, useEffect, useRef } from 'react'

export default function GroupForm({ title, initialName = '', onSave, onClose }) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('Please enter a group name'); return }
    onSave(trimmed)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-72 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Group name</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="e.g. Crown Zenith collection"
            className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400"
          />
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 text-xs px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave}
            className="flex-1 text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors">
            {initialName ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
