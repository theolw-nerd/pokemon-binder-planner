export const BINDER_TYPES = {
  xl:       { label: '12-pocket XL', capacity: 624, pageFaceSize: 12, cols: 4, rows: 3 },
  standard: { label: '12-pocket',    capacity: 480, pageFaceSize: 12, cols: 4, rows: 3 },
  nine:     { label: '9-pocket',     capacity: 360, pageFaceSize:  9, cols: 3, rows: 3 },
}

function getCardCount(set, intent) {
  switch (intent) {
    case 'master': return set.total
    case 'base':   return set.printedTotal
    case 'secret': return set.secretCount
    default:       return 0
  }
}

function calcSpacing(rule, value, config, currentSlot) {
  if (rule === 'page') {
    const rem = currentSlot % config.pageFaceSize
    return rem === 0 ? 0 : config.pageFaceSize - rem
  }
  if (rule === 'row') {
    const rem = currentSlot % config.cols
    return rem === 0 ? 0 : config.cols - rem
  }
  if (rule === 'slots') {
    return Math.max(0, parseInt(value) || 0)
  }
  return 0
}

export function calculateLayout(sets, settings) {
  const {
    preferredBinderType = 'xl',
    spacingRule = 'page',
    spacingValue = 0,
  } = settings

  const config = BINDER_TYPES[preferredBinderType]

  // Only include sets with an intent that isn't skip
  const activeSets = sets.filter(s => s.intent && s.intent !== 'skip')

  if (activeSets.length === 0) return []

  const binders = []
  let currentBinder = { id: 1, type: preferredBinderType, sets: [], usedSlots: 0 }
  binders.push(currentBinder)
  let slot = 0

  for (const set of activeSets) {
    const count = getCardCount(set, set.intent)
    if (count === 0) continue

    // Spacing only applies between sets (not before the first set in a binder)
    const spacing = currentBinder.sets.length > 0
      ? calcSpacing(spacingRule, spacingValue, config, slot)
      : 0

    // If the set doesn't fit, open a new binder
    if (slot + spacing + count > config.capacity) {
      currentBinder.usedSlots = slot
      currentBinder = { id: binders.length + 1, type: preferredBinderType, sets: [], usedSlots: 0 }
      binders.push(currentBinder)
      slot = 0
    }

    // Recalculate spacing for the (potentially new) binder
    const actualSpacing = currentBinder.sets.length > 0
      ? calcSpacing(spacingRule, spacingValue, config, slot)
      : 0

    const startSlot = slot + actualSpacing
    const endSlot = startSlot + count - 1

    currentBinder.sets.push({ ...set, startSlot, endSlot, cardCount: count })
    slot = endSlot + 1
    currentBinder.usedSlots = slot
  }

  return binders
}
