const BASE_URL = 'https://api.pokemontcg.io/v2'

export async function fetchAllSets() {
  const response = await fetch(`${BASE_URL}/sets?orderBy=releaseDate&pageSize=250`)
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  const data = await response.json()
  return data.data.map(set => ({
    id: set.id,
    name: set.name,
    series: set.series,
    releaseDate: set.releaseDate,
    printedTotal: set.printedTotal || 0,
    total: set.total || 0,
    secretCount: Math.max(0, (set.total || 0) - (set.printedTotal || 0)),
    logoUrl: set.images?.logo ?? null,
    symbolUrl: set.images?.symbol ?? null,
  }))
}
