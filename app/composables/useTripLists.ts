import type { InjectionKey } from 'vue'
import type { ChecklistEntry, ChecklistEntryResponse, ItineraryList, ListItem, ListItemResponse, ListResponse, ListsResponse } from '~/types/list'
import { moveId } from '~/utils/trip/order'

// The result of saving typed text. `error` is the API's first 422 message, for the box that was saving.
export type SaveResult = { ok: true } | { ok: false, error?: string }

// A trip's lists with their items, and every request that changes them.
// The page creates it and shares it with its components through tripListsKey (ADR 0001).
// Responses leave out children (`items`, `place`, `checklist_items`), so they are merged into local state, never swapped in.
export function useTripLists(itineraryId: string) {
  const listsUrl = `/api/v1/itineraries/${itineraryId}/lists`
  const client = useSanctumClient()
  const { showToast } = useAppToast()

  const { data, pending, error, refresh } = useLazySanctumFetch<ListsResponse>(listsUrl)

  // The id of a note that was created but whose text failed to save, by list id.
  const noteDrafts = new Map<string, string>()

  // Local copy, so a change shows at once without touching the fetch's cache. A refresh replaces it.
  const lists = ref<ItineraryList[]>([])
  watch(data, (response) => {
    lists.value = response?.data ?? []
    // A reload shows what the server has, including an empty note a failed save left behind, so a saved id must not be reused.
    noteDrafts.clear()
  }, { immediate: true })

  // The skeleton is for the first load only. A refresh also sets pending, and swapping every list for a skeleton
  // would drop whatever is being typed in them.
  const initialLoading = computed(() => pending.value && !data.value)

  const listCount = computed(() => lists.value.length)

  // Ids with a change in flight.
  const saving = ref(new Set<string>())
  function isSaving(id: string) {
    return saving.value.has(id)
  }
  function setSaving(id: string, on: boolean) {
    const next = new Set(saving.value)
    if (on) {
      next.add(id)
    }
    else {
      next.delete(id)
    }
    saving.value = next
  }

  function showError() {
    showToast('Something went wrong', 'i-lucide-circle-x', 'There was a problem with your request', 'error')
  }

  // A 422 gives its message back for the box that was saving; anything else shows the error toast.
  function failure(caught: unknown): SaveResult {
    const errors = caught as { statusCode?: number, data?: { errors?: Record<string, string[]> } } | null
    const message = errors?.statusCode === 422 ? Object.values(errors.data?.errors ?? {})[0]?.[0] : undefined
    if (message) {
      return { ok: false, error: message }
    }

    showError()
    return { ok: false }
  }

  function updateList(id: string, change: (list: ItineraryList) => ItineraryList) {
    lists.value = lists.value.map(list => list.id === id ? change(list) : list)
  }

  async function createList(name: string): Promise<SaveResult> {
    try {
      const response = await client<ListResponse>(listsUrl, { method: 'POST', body: { name } })
      lists.value = [...lists.value, { ...response.data, items: [] }]
      return { ok: true }
    }
    catch (caught) {
      return failure(caught)
    }
  }

  async function renameList(list: ItineraryList, name: string): Promise<SaveResult> {
    try {
      const response = await client<ListResponse>(`${listsUrl}/${list.id}`, { method: 'PATCH', body: { name } })
      updateList(list.id, current => ({ ...current, ...response.data }))
      return { ok: true }
    }
    catch (caught) {
      return failure(caught)
    }
  }

  async function deleteList(list: ItineraryList): Promise<boolean> {
    try {
      await client<unknown>(`${listsUrl}/${list.id}`, { method: 'DELETE' })
      lists.value = lists.value.filter(other => other.id !== list.id)
      return true
    }
    catch {
      showError()
      return false
    }
  }

  // Shown at once; on failure the lists are loaded again. Always sends every list id (the API doesn't check a partial array).
  async function reorderLists(listIds: string[]): Promise<void> {
    if (isSaving('lists')) {
      return
    }

    setSaving('lists', true)
    lists.value = listIds.map(id => lists.value.find(list => list.id === id)).filter((list): list is ItineraryList => !!list)
    try {
      await client<unknown>(`${listsUrl}/reorder`, { method: 'PATCH', body: { list_ids: listIds } })
    }
    catch {
      await refresh()
      showError()
    }
    finally {
      setSaving('lists', false)
    }
  }

  // Move up or down by one place, for the menu: the keyboard way to do what dragging does.
  async function moveList(list: ItineraryList, offset: -1 | 1): Promise<void> {
    const ids = lists.value.map(other => other.id)
    const from = ids.indexOf(list.id)
    const to = from + offset
    if (from === -1 || to < 0 || to >= ids.length) {
      return
    }
    await reorderLists(moveId(ids, from, to))
  }

  const itemsUrl = (list: ItineraryList) => `${listsUrl}/${list.id}/items`

  function updateItems(listId: string, change: (items: ListItem[]) => ListItem[]) {
    updateList(listId, list => ({ ...list, items: change(list.items) }))
  }

  // An item as it comes back from a create: notes and checklists have no `place` or `checklist_items`.
  function normalizeItem(item: ListItemResponse['data']): ListItem {
    return { itinerary_lists_id: '', title: null, content: null, sort_order: 0, place: null, checklist_items: [], ...item }
  }

  // Merges a response into the item it changes, so its children aren't lost.
  function mergeItem(listId: string, response: ListItemResponse['data']) {
    updateItems(listId, items => items.map(item => item.id === response.id ? { ...item, ...response } : item))
  }

  async function addPlace(list: ItineraryList, placeId: string): Promise<ListItem | null> {
    try {
      const response = await client<ListItemResponse>(itemsUrl(list), { method: 'POST', body: { type: 'place', place_id: placeId } })
      const item = normalizeItem(response.data)
      updateItems(list.id, items => [...items, item])
      return item
    }
    catch {
      showError()
      return null
    }
  }

  // A new note takes two requests: the API creates it empty, and its text needs a second one.
  // If the second fails, the created note's id is kept (one per list, in noteDrafts) so a retry sends only the text.

  async function createNote(list: ItineraryList, content: string): Promise<SaveResult> {
    try {
      let id = noteDrafts.get(list.id)
      let created: ListItemResponse['data'] | undefined
      if (!id) {
        created = (await client<ListItemResponse>(itemsUrl(list), { method: 'POST', body: { type: 'note' } })).data
        id = created.id
        noteDrafts.set(list.id, id)
      }

      const saved = await client<ListItemResponse>(`${itemsUrl(list)}/${id}`, { method: 'PATCH', body: { type: 'note', content } })
      noteDrafts.delete(list.id)
      const item = normalizeItem({ ...created, ...saved.data })
      updateItems(list.id, items => [...items, item])
      return { ok: true }
    }
    catch (caught) {
      return failure(caught)
    }
  }

  // A new note that was cancelled after its text failed to save: the empty note is deleted from the server.
  async function discardNoteDraft(list: ItineraryList): Promise<void> {
    const id = noteDrafts.get(list.id)
    if (!id) {
      return
    }

    noteDrafts.delete(list.id)
    try {
      await client<unknown>(`${itemsUrl(list)}/${id}`, { method: 'DELETE' })
    }
    catch {
      showError()
    }
  }

  async function updateNote(list: ItineraryList, item: ListItem, content: string): Promise<SaveResult> {
    try {
      const response = await client<ListItemResponse>(`${itemsUrl(list)}/${item.id}`, { method: 'PATCH', body: { type: 'note', content } })
      mergeItem(list.id, response.data)
      return { ok: true }
    }
    catch (caught) {
      return failure(caught)
    }
  }

  // The title takes a second request, like a note's text. Without a title there is only one.
  async function createChecklist(list: ItineraryList, title: string | null): Promise<ListItem | null> {
    let item: ListItem
    try {
      const response = await client<ListItemResponse>(itemsUrl(list), { method: 'POST', body: { type: 'checklist' } })
      item = normalizeItem(response.data)
      updateItems(list.id, items => [...items, item])
    }
    catch {
      showError()
      return null
    }

    if (title !== null) {
      await setChecklistTitle(list, item, title)
    }
    return item
  }

  async function setChecklistTitle(list: ItineraryList, item: ListItem, title: string | null): Promise<SaveResult> {
    try {
      const response = await client<ListItemResponse>(`${itemsUrl(list)}/${item.id}`, { method: 'PATCH', body: { type: 'checklist', title } })
      mergeItem(list.id, response.data)
      return { ok: true }
    }
    catch (caught) {
      return failure(caught)
    }
  }

  async function deleteItem(list: ItineraryList, item: ListItem): Promise<boolean> {
    try {
      await client<unknown>(`${itemsUrl(list)}/${item.id}`, { method: 'DELETE' })
      updateItems(list.id, items => items.filter(other => other.id !== item.id))
      return true
    }
    catch {
      showError()
      return false
    }
  }

  // Shown at once; on failure the lists are loaded again. Items can't move to another list, so this is always one list's own.
  async function reorderItems(list: ItineraryList, itemIds: string[]): Promise<void> {
    const key = `items:${list.id}`
    if (isSaving(key)) {
      return
    }

    setSaving(key, true)
    updateItems(list.id, items => itemIds.map(id => items.find(item => item.id === id)).filter((item): item is ListItem => !!item))
    try {
      await client<unknown>(`${itemsUrl(list)}/reorder`, { method: 'PATCH', body: { list_item_ids: itemIds } })
    }
    catch {
      await refresh()
      showError()
    }
    finally {
      setSaving(key, false)
    }
  }

  async function moveItem(list: ItineraryList, item: ListItem, offset: -1 | 1): Promise<void> {
    const ids = list.items.map(other => other.id)
    const from = ids.indexOf(item.id)
    const to = from + offset
    if (from === -1 || to < 0 || to >= ids.length) {
      return
    }
    await reorderItems(list, moveId(ids, from, to))
  }

  const entriesUrl = (list: ItineraryList, item: ListItem) => `${itemsUrl(list)}/${item.id}/checklist`

  function updateEntries(listId: string, itemId: string, change: (entries: ChecklistEntry[]) => ChecklistEntry[]) {
    updateItems(listId, items => items.map(item => item.id === itemId ? { ...item, checklist_items: change(item.checklist_items) } : item))
  }

  // A new entry comes back with is_checked null, which means not ticked.
  const tidyEntry = (entry: ChecklistEntry): ChecklistEntry => ({ ...entry, is_checked: !!entry.is_checked })

  async function addEntry(list: ItineraryList, item: ListItem, label: string): Promise<SaveResult> {
    try {
      const response = await client<ChecklistEntryResponse>(entriesUrl(list, item), { method: 'POST', body: { label } })
      updateEntries(list.id, item.id, entries => [...entries, tidyEntry(response.data)])
      return { ok: true }
    }
    catch (caught) {
      return failure(caught)
    }
  }

  // The API takes exactly one of label and is_checked in a request, so each is sent alone.
  async function renameEntry(list: ItineraryList, item: ListItem, entry: ChecklistEntry, label: string): Promise<SaveResult> {
    try {
      const response = await client<ChecklistEntryResponse>(`${entriesUrl(list, item)}/${entry.id}`, { method: 'PATCH', body: { label } })
      updateEntries(list.id, item.id, entries => entries.map(other => other.id === entry.id ? tidyEntry(response.data) : other))
      return { ok: true }
    }
    catch (caught) {
      return failure(caught)
    }
  }

  // Shown at once, and put back if the request fails. A second tick waits for the first.
  async function toggleEntry(list: ItineraryList, item: ListItem, entry: ChecklistEntry): Promise<void> {
    if (isSaving(entry.id)) {
      return
    }

    const ticked = !entry.is_checked
    const setTicked = (value: boolean) =>
      updateEntries(list.id, item.id, entries => entries.map(other => other.id === entry.id ? { ...other, is_checked: value } : other))

    setSaving(entry.id, true)
    setTicked(ticked)
    try {
      await client<ChecklistEntryResponse>(`${entriesUrl(list, item)}/${entry.id}`, { method: 'PATCH', body: { is_checked: ticked } })
    }
    catch {
      setTicked(!ticked)
      showError()
    }
    finally {
      setSaving(entry.id, false)
    }
  }

  async function deleteEntry(list: ItineraryList, item: ListItem, entry: ChecklistEntry): Promise<boolean> {
    try {
      await client<unknown>(`${entriesUrl(list, item)}/${entry.id}`, { method: 'DELETE' })
      updateEntries(list.id, item.id, entries => entries.filter(other => other.id !== entry.id))
      return true
    }
    catch {
      showError()
      return false
    }
  }

  // Shown at once; on failure the lists are loaded again. Checklist items can't move to another checklist.
  async function reorderEntries(list: ItineraryList, item: ListItem, entryIds: string[]): Promise<void> {
    const key = `entries:${item.id}`
    if (isSaving(key)) {
      return
    }

    setSaving(key, true)
    updateEntries(list.id, item.id, entries => entryIds.map(id => entries.find(entry => entry.id === id)).filter((entry): entry is ChecklistEntry => !!entry))
    try {
      await client<unknown>(`${entriesUrl(list, item)}/reorder`, { method: 'PATCH', body: { checklist_item_ids: entryIds } })
    }
    catch {
      await refresh()
      showError()
    }
    finally {
      setSaving(key, false)
    }
  }

  async function moveEntry(list: ItineraryList, item: ListItem, entry: ChecklistEntry, offset: -1 | 1): Promise<void> {
    const ids = item.checklist_items.map(other => other.id)
    const from = ids.indexOf(entry.id)
    const to = from + offset
    if (from === -1 || to < 0 || to >= ids.length) {
      return
    }
    await reorderEntries(list, item, moveId(ids, from, to))
  }

  return {
    lists,
    pending,
    initialLoading,
    error,
    refresh,
    listCount,
    isSaving,
    createList,
    renameList,
    deleteList,
    reorderLists,
    moveList,
    addPlace,
    createNote,
    discardNoteDraft,
    updateNote,
    createChecklist,
    setChecklistTitle,
    deleteItem,
    reorderItems,
    moveItem,
    addEntry,
    renameEntry,
    toggleEntry,
    deleteEntry,
    reorderEntries,
    moveEntry,
  }
}

export type TripLists = ReturnType<typeof useTripLists>

export const tripListsKey: InjectionKey<TripLists> = Symbol('tripLists')

export function injectTripLists(): TripLists {
  const lists = inject(tripListsKey)
  if (!lists) {
    throw new Error('useTripLists was not provided')
  }
  return lists
}
