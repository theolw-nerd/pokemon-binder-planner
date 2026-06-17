import { useState } from 'react'

export default function ManualSetForm({ existingSeries, initialData, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initialData?.name ?? '',
    series: initialData?.series ?? '',
    printedTotal: initialData?.printedTotal ?? '',
    secretCount: initialData?.secretCount ?? '',
    // API stores dates as YYYY/MM/DD — HTML date input needs YYYY-MM-DD
    releaseDate: initialData?.releaseDate
      ? initialData.releaseDate.replace(/\//g, '-')
      : '',
  })
  const [errors, setErrors] = useState({})

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: null }))
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim())                         errs.name = 'Required'
    if (!form.series.trim())                       errs.series = 'Required'
    if (form.printedTotal === '' || isNaN(parseInt(form.printedTotal)))
                                                   errs.printedTotal = 'Required'
    if (form.secretCount === '' || isNaN(parseInt(form.secretCount)))
                                                   errs.secretCount = 'Required'
    return errs
  }

  const handleSave = () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    onSave({
      name: form.name.trim(),
      series: form.series.trim(),
      printedTotal: parseInt(form.printedTotal),
      secretCount: parseInt(form.secretCount),
      // Convert back to YYYY/MM/DD to match API format, or null if empty
      releaseDate: form.releaseDate
        ? form.releaseDate.replace(/-/g, '/')
        : null,
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-80 p-4 flex flex-col gap-3">
        {/* Title */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">
            {initialData ? 'Edit set' : 'Add set manually'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Set name */}
        <Field label="Set name" error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={e => update('name', e.target.value)}
            placeholder="e.g. Mega Evolutions Promos"
            className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400"
          />
        </Field>

        {/* Series — free text with autocomplete suggestions */}
        <Field label="Series" error={errors.series}>
          <input
            type="text"
            list="series-suggestions"
            value={form.series}
            onChange={e => update('series', e.target.value)}
            placeholder="e.g. XY"
            className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400"
          />
          <datalist id="series-suggestions">
            {existingSeries.map(s => <option key={s} value={s} />)}
          </datalist>
        </Field>

        {/* Card counts — side by side */}
        <div className="flex gap-2">
          <Field label="Base cards" error={errors.printedTotal} flex>
            <input
              type="number"
              min={0}
              value={form.printedTotal}
              onChange={e => update('printedTotal', e.target.value)}
              placeholder="e.g. 83"
              className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400"
            />
          </Field>
          <Field label="Secret rares" error={errors.secretCount} flex>
            <input
              type="number"
              min={0}
              value={form.secretCount}
              onChange={e => update('secretCount', e.target.value)}
              placeholder="0"
              className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400"
            />
          </Field>
        </div>

        {/* Release date — optional */}
        <Field label="Release date (optional)">
          <input
            type="date"
            value={form.releaseDate}
            onChange={e => update('releaseDate', e.target.value)}
            className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400"
          />
        </Field>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 text-xs px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors"
          >
            {initialData ? 'Save changes' : 'Add set'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children, flex }) {
  return (
    <div className={`flex flex-col gap-1 ${flex ? 'flex-1 min-w-0' : ''}`}>
      <label className="text-xs text-gray-500">{label}</label>
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
