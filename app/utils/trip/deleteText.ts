// The words after the trip's name in Delete trip's confirmation, naming what goes with it.
// With nothing to count it keeps the Trips page's wording.
export function tripDeleteTail(stops: number, lists: number): string {
  const parts: string[] = []
  if (stops) {
    parts.push(stops === 1 ? 'its 1 place on a day' : `its ${stops} places on days`)
  }
  if (lists) {
    parts.push(lists === 1 ? 'its 1 list' : `its ${lists} lists`)
  }

  return parts.length ? `, ${parts.join(' and ')}` : ' and all its associated data'
}
