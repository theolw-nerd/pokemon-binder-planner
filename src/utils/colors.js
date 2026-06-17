// One color per known series. New/unknown series get a fallback color.
const SERIES_COLORS = {
  'Scarlet & Violet':       '#3B82F6',
  'Sword & Shield':         '#10B981',
  'Sun & Moon':             '#F59E0B',
  'XY':                     '#EC4899',
  'Black & White':          '#8B5CF6',
  'HeartGold & SoulSilver': '#EAB308',
  'Platinum':               '#6366F1',
  'Diamond & Pearl':        '#A855F7',
  'EX':                     '#EF4444',
  'e-Card':                 '#14B8A6',
  'Neo':                    '#059669',
  'Base':                   '#F97316',
}

const FALLBACKS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#A855F7']
const dynamicMap = {}
let fallbackIdx = 0

export function getSeriesColor(series) {
  if (SERIES_COLORS[series]) return SERIES_COLORS[series]
  if (!dynamicMap[series]) {
    dynamicMap[series] = FALLBACKS[fallbackIdx % FALLBACKS.length]
    fallbackIdx++
  }
  return dynamicMap[series]
}

// Returns a very light version of a hex color for use as a background tint
export function lighten(hex) {
  return hex + '22'
}
