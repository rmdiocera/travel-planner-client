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

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

// "a, b and c" for any number of parts.
function joinParts(parts: string[]): string {
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : (parts[0] ?? '')
}

export const NOTE_DELETE_TEXT = { title: 'Delete this note?', body: 'This can\'t be undone.' }

// Delete list's confirmation, naming what goes with the list. Kinds with a zero count are left out.
export function listDeleteText(name: string, counts: { places: number, checklists: number, notes: number }) {
  const parts = [
    counts.places ? plural(counts.places, 'place', 'places') : '',
    counts.checklists ? plural(counts.checklists, 'checklist', 'checklists') : '',
    counts.notes ? plural(counts.notes, 'note', 'notes') : '',
  ].filter(Boolean)

  return {
    title: `Delete "${name}"?`,
    body: parts.length ? `Its ${joinParts(parts)} will be deleted too. This can't be undone.` : 'This can\'t be undone.',
  }
}

export function checklistDeleteText(title: string | null, items: number) {
  return {
    title: title ? `Delete "${title}"?` : 'Delete this checklist?',
    body: items ? `Its ${plural(items, 'item', 'items')} will be deleted too. This can't be undone.` : 'This can\'t be undone.',
  }
}
