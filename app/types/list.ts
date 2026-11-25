import type { NestedPlace } from './place'

export type ChecklistEntry = {
  id: string
  itinerary_list_item_id: string
  label: string
  // null only in the response to creating one; treat it as not ticked.
  is_checked: boolean | null
  sort_order: number
}

export type ListItemPlace = {
  id: string
  itinerary_list_item_id: string
  place_id: string
  place: NestedPlace
  start_time: string | null
  end_time: string | null
  marked_visited: boolean
}

export type ListItem = {
  id: string
  // Plural "lists", as the API spells it.
  itinerary_lists_id: string
  type: 'place' | 'checklist' | 'note'
  // Used by checklists.
  title: string | null
  // Used by notes.
  content: string | null
  sort_order: number
  // Always set once merged: null on a note, a checklist, and a place item whose place was deleted.
  place: ListItemPlace | null
  checklist_items: ChecklistEntry[]
}

export type ItineraryList = {
  id: string
  itinerary_id: string
  name: string
  sort_order: number
  items: ListItem[]
}

export type ListsResponse = {
  data: ItineraryList[]
}

// Create and update responses have no `items`: merge them, don't replace.
export type ListResponse = {
  data: Omit<ItineraryList, 'items'>
}

// Responses for notes and checklists have no `place` or `checklist_items`: merge them too.
export type ListItemResponse = {
  data: Partial<ListItem> & Pick<ListItem, 'id' | 'type'>
}

export type ChecklistEntryResponse = {
  data: ChecklistEntry
}
