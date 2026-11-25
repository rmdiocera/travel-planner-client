import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { injectTripLists, useTripLists } from '~/composables/useTripLists'
import type { ItineraryList, ListsResponse } from '~/types/list'
import { makeList } from '../../utils/tripFixtures'

const { clientMock, lazyFetchMock, toastAddMock, refreshMock } = vi.hoisted(() => ({
  clientMock: vi.fn(),
  lazyFetchMock: vi.fn(),
  toastAddMock: vi.fn(),
  refreshMock: vi.fn(),
}))

const listsRef = ref<ListsResponse>({ data: [] })

mockNuxtImport('useLazySanctumFetch', () => {
  return (url: string, options?: Record<string, unknown>) => {
    lazyFetchMock(url, options)
    return { data: listsRef, pending: ref(false), error: ref(null), refresh: refreshMock }
  }
})
mockNuxtImport('useSanctumClient', () => () => clientMock)
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

const ERROR_TOAST = {
  title: 'Something went wrong',
  icon: 'i-lucide-circle-x',
  description: 'There was a problem with your request',
  color: 'error',
}

const URL = '/api/v1/itineraries/t1/lists'

describe('useTripLists: lists', () => {
  beforeEach(() => {
    for (const mock of [clientMock, lazyFetchMock, toastAddMock, refreshMock]) {
      mock.mockReset()
    }
    listsRef.value = { data: [] }
  })

  it('loads the lists with their items', () => {
    useTripLists('t1')

    expect(lazyFetchMock).toHaveBeenCalledWith(URL, undefined)
  })

  it('counts the lists', () => {
    listsRef.value = { data: [makeList('l1', 'Before we go'), makeList('l2', 'Food')] }
    const { listCount } = useTripLists('t1')

    expect(listCount.value).toBe(2)
  })

  it('creates a list at the end, with no items yet', async () => {
    listsRef.value = { data: [makeList('l1', 'Before we go')] }
    clientMock.mockResolvedValue({ data: { id: 'l2', itinerary_id: 't1', name: 'Food', sort_order: 2 } })
    const { lists, createList } = useTripLists('t1')

    expect(await createList('Food')).toEqual({ ok: true })

    expect(clientMock).toHaveBeenCalledWith(URL, { method: 'POST', body: { name: 'Food' } })
    expect(lists.value.map(list => list.id)).toEqual(['l1', 'l2'])
    expect(lists.value[1]!.items).toEqual([])
  })

  it('renames a list and keeps its items', async () => {
    const item = { id: 'n1', itinerary_lists_id: 'l1', type: 'note' as const, title: null, content: 'Hi', sort_order: 1, place: null, checklist_items: [] }
    listsRef.value = { data: [makeList('l1', 'Before we go', { items: [item] })] }
    clientMock.mockResolvedValue({ data: { id: 'l1', itinerary_id: 't1', name: 'Pack list', sort_order: 1 } })
    const { lists, renameList } = useTripLists('t1')

    expect(await renameList(lists.value[0]!, 'Pack list')).toEqual({ ok: true })

    expect(clientMock).toHaveBeenCalledWith(`${URL}/l1`, { method: 'PATCH', body: { name: 'Pack list' } })
    expect(lists.value[0]!.name).toBe('Pack list')
    expect(lists.value[0]!.items).toHaveLength(1)
  })

  it('returns the API\'s message on a 422, without a toast', async () => {
    clientMock.mockRejectedValue({ statusCode: 422, data: { errors: { name: ['The name field must not be greater than 255 characters.'] } } })
    const { createList } = useTripLists('t1')

    expect(await createList('x'.repeat(300))).toEqual({ ok: false, error: 'The name field must not be greater than 255 characters.' })
    expect(toastAddMock).not.toHaveBeenCalled()
  })

  it('shows the error toast for any other failure', async () => {
    clientMock.mockRejectedValue(new Error('Network Error'))
    const { lists, createList } = useTripLists('t1')

    expect(await createList('Food')).toEqual({ ok: false })
    expect(toastAddMock).toHaveBeenCalledWith(ERROR_TOAST)
    expect(lists.value).toEqual([])
  })

  it('deletes a list after the API confirms', async () => {
    listsRef.value = { data: [makeList('l1', 'Before we go'), makeList('l2', 'Food')] }
    clientMock.mockResolvedValue(undefined)
    const { lists, deleteList } = useTripLists('t1')

    expect(await deleteList(lists.value[0]!)).toBe(true)

    expect(clientMock).toHaveBeenCalledWith(`${URL}/l1`, { method: 'DELETE' })
    expect(lists.value.map(list => list.id)).toEqual(['l2'])
  })

  it('keeps the list and shows the error toast when deleting fails', async () => {
    listsRef.value = { data: [makeList('l1', 'Before we go')] }
    clientMock.mockRejectedValue(new Error('Network Error'))
    const { lists, deleteList } = useTripLists('t1')

    expect(await deleteList(lists.value[0]!)).toBe(false)
    expect(toastAddMock).toHaveBeenCalledWith(ERROR_TOAST)
    expect(lists.value).toHaveLength(1)
  })

  it('reorders the lists at once and sends every list id', async () => {
    listsRef.value = { data: [makeList('l1', 'A'), makeList('l2', 'B')] }
    clientMock.mockResolvedValue(undefined)
    const { lists, reorderLists } = useTripLists('t1')

    const saving = reorderLists(['l2', 'l1'])
    expect(lists.value.map(list => list.id)).toEqual(['l2', 'l1'])
    await saving

    expect(clientMock).toHaveBeenCalledWith(`${URL}/reorder`, { method: 'PATCH', body: { list_ids: ['l2', 'l1'] } })
  })

  it('reloads the lists when reordering fails', async () => {
    listsRef.value = { data: [makeList('l1', 'A'), makeList('l2', 'B')] }
    clientMock.mockRejectedValue(new Error('Network Error'))
    const { reorderLists } = useTripLists('t1')

    await reorderLists(['l2', 'l1'])

    expect(refreshMock).toHaveBeenCalled()
    expect(toastAddMock).toHaveBeenCalledWith(ERROR_TOAST)
  })

  it('moves a list down, and not past the end', async () => {
    listsRef.value = { data: [makeList('l1', 'A'), makeList('l2', 'B')] }
    clientMock.mockResolvedValue(undefined)
    const { lists, moveList } = useTripLists('t1')

    await moveList(lists.value[0]!, 1)
    expect(clientMock).toHaveBeenCalledWith(`${URL}/reorder`, { method: 'PATCH', body: { list_ids: ['l2', 'l1'] } })

    clientMock.mockClear()
    await moveList(lists.value[1]!, 1)
    expect(clientMock).not.toHaveBeenCalled()
  })

  describe('items', () => {
    const ITEMS = `${URL}/l1/items`
    const note = { id: 'n1', itinerary_lists_id: 'l1', type: 'note' as const, title: null, content: 'Existing', sort_order: 1, place: null, checklist_items: [] }
    const placeItem = { ...note, id: 'i2', type: 'place' as const, content: null, sort_order: 2 }

    beforeEach(() => {
      listsRef.value = { data: [makeList('l1', 'Before we go', { items: [note, placeItem] })] }
    })

    it('adds a place item at the end', async () => {
      clientMock.mockResolvedValue({ data: { id: 'i3', itinerary_lists_id: 'l1', type: 'place', title: null, content: null, sort_order: 3, place: { id: 'lp1', place_id: 'p1', place: { id: 'p1', name: 'Tsukiji' }, start_time: null, end_time: null, marked_visited: false } } })
      const { lists, addPlace } = useTripLists('t1')

      const created = await addPlace(lists.value[0]!, 'p1')

      expect(clientMock).toHaveBeenCalledWith(ITEMS, { method: 'POST', body: { type: 'place', place_id: 'p1' } })
      expect(created?.id).toBe('i3')
      expect(lists.value[0]!.items.map(item => item.id)).toEqual(['n1', 'i2', 'i3'])
      expect(lists.value[0]!.items[2]!.checklist_items).toEqual([])
    })

    it('creates a note with two requests', async () => {
      clientMock
        .mockResolvedValueOnce({ data: { id: 'n9', itinerary_lists_id: 'l1', type: 'note', content: null, sort_order: 3 } })
        .mockResolvedValueOnce({ data: { id: 'n9', itinerary_lists_id: 'l1', type: 'note', content: 'Bring an umbrella', sort_order: 3 } })
      const { lists, createNote } = useTripLists('t1')

      expect(await createNote(lists.value[0]!, 'Bring an umbrella')).toEqual({ ok: true })

      expect(clientMock).toHaveBeenNthCalledWith(1, ITEMS, { method: 'POST', body: { type: 'note' } })
      expect(clientMock).toHaveBeenNthCalledWith(2, `${ITEMS}/n9`, { method: 'PATCH', body: { type: 'note', content: 'Bring an umbrella' } })
      const created = lists.value[0]!.items[2]!
      expect(created.content).toBe('Bring an umbrella')
      expect(created.place).toBeNull()
      expect(created.checklist_items).toEqual([])
    })

    it('keeps the created note to retry only its text', async () => {
      clientMock
        .mockResolvedValueOnce({ data: { id: 'n9', itinerary_lists_id: 'l1', type: 'note', content: null, sort_order: 3 } })
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ data: { id: 'n9', itinerary_lists_id: 'l1', type: 'note', content: 'Hello', sort_order: 3 } })
      const { lists, createNote } = useTripLists('t1')

      expect(await createNote(lists.value[0]!, 'Hello')).toEqual({ ok: false })
      expect(lists.value[0]!.items).toHaveLength(2)

      expect(await createNote(lists.value[0]!, 'Hello')).toEqual({ ok: true })
      expect(clientMock).toHaveBeenCalledTimes(3)
      expect(clientMock).toHaveBeenNthCalledWith(3, `${ITEMS}/n9`, { method: 'PATCH', body: { type: 'note', content: 'Hello' } })
      expect(lists.value[0]!.items).toHaveLength(3)
    })

    it('deletes the empty note when a failed new note is cancelled', async () => {
      clientMock
        .mockResolvedValueOnce({ data: { id: 'n9', itinerary_lists_id: 'l1', type: 'note', content: null, sort_order: 3 } })
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce(undefined)
      const { lists, createNote, discardNoteDraft } = useTripLists('t1')
      await createNote(lists.value[0]!, 'Hello')

      await discardNoteDraft(lists.value[0]!)

      expect(clientMock).toHaveBeenNthCalledWith(3, `${ITEMS}/n9`, { method: 'DELETE' })
    })

    it('starts a new note from scratch once the lists were loaded again', async () => {
      clientMock
        .mockResolvedValueOnce({ data: { id: 'n9', itinerary_lists_id: 'l1', type: 'note', content: null, sort_order: 3 } })
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ data: { id: 'n10', itinerary_lists_id: 'l1', type: 'note', content: null, sort_order: 4 } })
        .mockResolvedValueOnce({ data: { id: 'n10', itinerary_lists_id: 'l1', type: 'note', content: 'Hello', sort_order: 4 } })
      const { lists, createNote } = useTripLists('t1')
      await createNote(lists.value[0]!, 'Hello')

      // A reload shows the empty note the server kept, so the saved id must not be reused.
      listsRef.value = { data: [makeList('l1', 'Before we go', { items: [note, placeItem, { ...note, id: 'n9', content: null }] })] }
      await nextTick()
      await createNote(lists.value[0]!, 'Hello')

      expect(clientMock).toHaveBeenNthCalledWith(3, ITEMS, { method: 'POST', body: { type: 'note' } })
      expect(lists.value[0]!.items.filter(item => item.id === 'n10')).toHaveLength(1)
    })

    it('does nothing to discard when no note was started', async () => {
      const { lists, discardNoteDraft } = useTripLists('t1')

      await discardNoteDraft(lists.value[0]!)

      expect(clientMock).not.toHaveBeenCalled()
    })

    it('updates a note and keeps it where it is', async () => {
      clientMock.mockResolvedValue({ data: { id: 'n1', itinerary_lists_id: 'l1', type: 'note', content: 'Changed', sort_order: 1 } })
      const { lists, updateNote } = useTripLists('t1')

      expect(await updateNote(lists.value[0]!, lists.value[0]!.items[0]!, 'Changed')).toEqual({ ok: true })

      expect(clientMock).toHaveBeenCalledWith(`${ITEMS}/n1`, { method: 'PATCH', body: { type: 'note', content: 'Changed' } })
      expect(lists.value[0]!.items[0]!.content).toBe('Changed')
      expect(lists.value[0]!.items.map(item => item.id)).toEqual(['n1', 'i2'])
    })

    it('creates a checklist, then sets its title', async () => {
      clientMock
        .mockResolvedValueOnce({ data: { id: 'c9', itinerary_lists_id: 'l1', type: 'checklist', title: null, sort_order: 3 } })
        .mockResolvedValueOnce({ data: { id: 'c9', itinerary_lists_id: 'l1', type: 'checklist', title: 'Packing', sort_order: 3 } })
      const { lists, createChecklist } = useTripLists('t1')

      const created = await createChecklist(lists.value[0]!, 'Packing')

      expect(clientMock).toHaveBeenNthCalledWith(1, ITEMS, { method: 'POST', body: { type: 'checklist' } })
      expect(clientMock).toHaveBeenNthCalledWith(2, `${ITEMS}/c9`, { method: 'PATCH', body: { type: 'checklist', title: 'Packing' } })
      expect(created?.id).toBe('c9')
      expect(lists.value[0]!.items[2]!.title).toBe('Packing')
      expect(lists.value[0]!.items[2]!.checklist_items).toEqual([])
    })

    it('creates a checklist without a title in one request', async () => {
      clientMock.mockResolvedValue({ data: { id: 'c9', itinerary_lists_id: 'l1', type: 'checklist', title: null, sort_order: 3 } })
      const { lists, createChecklist } = useTripLists('t1')

      await createChecklist(lists.value[0]!, null)

      expect(clientMock).toHaveBeenCalledTimes(1)
    })

    it('clears a checklist title with null', async () => {
      const checklist = { ...note, id: 'c1', type: 'checklist' as const, title: 'Packing', content: null }
      listsRef.value = { data: [makeList('l1', 'Before we go', { items: [checklist] })] }
      clientMock.mockResolvedValue({ data: { id: 'c1', itinerary_lists_id: 'l1', type: 'checklist', title: null, sort_order: 1 } })
      const { lists, setChecklistTitle } = useTripLists('t1')

      await setChecklistTitle(lists.value[0]!, lists.value[0]!.items[0]!, null)

      expect(clientMock).toHaveBeenCalledWith(`${ITEMS}/c1`, { method: 'PATCH', body: { type: 'checklist', title: null } })
      expect(lists.value[0]!.items[0]!.title).toBeNull()
    })

    it('reorders items with list_item_ids', async () => {
      clientMock.mockResolvedValue(undefined)
      const { lists, reorderItems } = useTripLists('t1')

      const saving = reorderItems(lists.value[0]!, ['i2', 'n1'])
      expect(lists.value[0]!.items.map(item => item.id)).toEqual(['i2', 'n1'])
      await saving

      expect(clientMock).toHaveBeenCalledWith(`${ITEMS}/reorder`, { method: 'PATCH', body: { list_item_ids: ['i2', 'n1'] } })
    })

    it('reloads the lists when reordering items fails', async () => {
      clientMock.mockRejectedValue(new Error('Network Error'))
      const { lists, reorderItems } = useTripLists('t1')

      await reorderItems(lists.value[0]!, ['i2', 'n1'])

      expect(refreshMock).toHaveBeenCalled()
      expect(toastAddMock).toHaveBeenCalledWith(ERROR_TOAST)
    })

    it('moves an item up, and not past the start', async () => {
      clientMock.mockResolvedValue(undefined)
      const { lists, moveItem } = useTripLists('t1')

      await moveItem(lists.value[0]!, lists.value[0]!.items[1]!, -1)
      expect(clientMock).toHaveBeenCalledWith(`${ITEMS}/reorder`, { method: 'PATCH', body: { list_item_ids: ['i2', 'n1'] } })

      clientMock.mockClear()
      await moveItem(lists.value[0]!, lists.value[0]!.items[0]!, -1)
      expect(clientMock).not.toHaveBeenCalled()
    })

    it('deletes an item after the API confirms', async () => {
      clientMock.mockResolvedValue(undefined)
      const { lists, deleteItem } = useTripLists('t1')

      expect(await deleteItem(lists.value[0]!, lists.value[0]!.items[0]!)).toBe(true)

      expect(clientMock).toHaveBeenCalledWith(`${ITEMS}/n1`, { method: 'DELETE' })
      expect(lists.value[0]!.items.map(item => item.id)).toEqual(['i2'])
    })
  })

  describe('checklist items', () => {
    const ENTRIES = `${URL}/l1/items/c1/checklist`
    const entry = (id: string, label: string, isChecked: boolean | null, sortOrder: number) =>
      ({ id, itinerary_list_item_id: 'c1', label, is_checked: isChecked, sort_order: sortOrder })
    const checklist = {
      id: 'c1',
      itinerary_lists_id: 'l1',
      type: 'checklist' as const,
      title: 'Packing',
      content: null,
      sort_order: 1,
      place: null,
      checklist_items: [entry('e1', 'Passport', true, 1), entry('e2', 'Adapter', false, 2)],
    }

    function deferred() {
      let resolve: (value: unknown) => void = () => {}
      const promise = new Promise((done) => {
        resolve = done
      })
      return { promise, resolve }
    }

    beforeEach(() => {
      listsRef.value = { data: [makeList('l1', 'Before we go', { items: [checklist] })] }
    })

    const entries = (lists: Ref<ItineraryList[]>) => lists.value[0]!.items[0]!.checklist_items

    it('adds a checklist item that is not ticked', async () => {
      clientMock.mockResolvedValue({ data: entry('e3', 'Tickets', null, 3) })
      const { lists, addEntry } = useTripLists('t1')

      expect(await addEntry(lists.value[0]!, lists.value[0]!.items[0]!, 'Tickets')).toEqual({ ok: true })

      expect(clientMock).toHaveBeenCalledWith(ENTRIES, { method: 'POST', body: { label: 'Tickets' } })
      expect(entries(lists).map(item => item.id)).toEqual(['e1', 'e2', 'e3'])
      expect(entries(lists)[2]!.is_checked).toBe(false)
    })

    it('renames with only the label', async () => {
      clientMock.mockResolvedValue({ data: entry('e1', 'Passport and visa', true, 1) })
      const { lists, renameEntry } = useTripLists('t1')

      await renameEntry(lists.value[0]!, lists.value[0]!.items[0]!, entries(lists)[0]!, 'Passport and visa')

      expect(clientMock).toHaveBeenCalledWith(`${ENTRIES}/e1`, { method: 'PATCH', body: { label: 'Passport and visa' } })
      expect(entries(lists)[0]!.label).toBe('Passport and visa')
    })

    it('ticks at once and sends only is_checked', async () => {
      const request = deferred()
      clientMock.mockReturnValue(request.promise)
      const { lists, toggleEntry } = useTripLists('t1')

      const saving = toggleEntry(lists.value[0]!, lists.value[0]!.items[0]!, entries(lists)[1]!)
      expect(entries(lists)[1]!.is_checked).toBe(true)
      expect(clientMock).toHaveBeenCalledWith(`${ENTRIES}/e2`, { method: 'PATCH', body: { is_checked: true } })

      request.resolve({ data: entry('e2', 'Adapter', true, 2) })
      await saving
    })

    it('unticks and shows the error toast when the tick fails', async () => {
      clientMock.mockRejectedValue(new Error('Network Error'))
      const { lists, toggleEntry } = useTripLists('t1')

      await toggleEntry(lists.value[0]!, lists.value[0]!.items[0]!, entries(lists)[1]!)

      expect(entries(lists)[1]!.is_checked).toBe(false)
      expect(toastAddMock).toHaveBeenCalledWith(ERROR_TOAST)
    })

    it('ignores a second tick while the first is saving', async () => {
      const request = deferred()
      clientMock.mockReturnValue(request.promise)
      const { lists, toggleEntry } = useTripLists('t1')

      const first = toggleEntry(lists.value[0]!, lists.value[0]!.items[0]!, entries(lists)[1]!)
      await toggleEntry(lists.value[0]!, lists.value[0]!.items[0]!, entries(lists)[1]!)
      expect(clientMock).toHaveBeenCalledTimes(1)

      request.resolve({ data: entry('e2', 'Adapter', true, 2) })
      await first
    })

    it('reorders with checklist_item_ids', async () => {
      clientMock.mockResolvedValue(undefined)
      const { lists, reorderEntries } = useTripLists('t1')

      const saving = reorderEntries(lists.value[0]!, lists.value[0]!.items[0]!, ['e2', 'e1'])
      expect(entries(lists).map(item => item.id)).toEqual(['e2', 'e1'])
      await saving

      expect(clientMock).toHaveBeenCalledWith(`${ENTRIES}/reorder`, { method: 'PATCH', body: { checklist_item_ids: ['e2', 'e1'] } })
    })

    it('reloads the lists when reordering checklist items fails', async () => {
      clientMock.mockRejectedValue(new Error('Network Error'))
      const { lists, reorderEntries } = useTripLists('t1')

      await reorderEntries(lists.value[0]!, lists.value[0]!.items[0]!, ['e2', 'e1'])

      expect(refreshMock).toHaveBeenCalled()
      expect(toastAddMock).toHaveBeenCalledWith(ERROR_TOAST)
    })

    it('moves a checklist item down, and not past the end', async () => {
      clientMock.mockResolvedValue(undefined)
      const { lists, moveEntry } = useTripLists('t1')

      await moveEntry(lists.value[0]!, lists.value[0]!.items[0]!, entries(lists)[0]!, 1)
      expect(clientMock).toHaveBeenCalledWith(`${ENTRIES}/reorder`, { method: 'PATCH', body: { checklist_item_ids: ['e2', 'e1'] } })

      clientMock.mockClear()
      await moveEntry(lists.value[0]!, lists.value[0]!.items[0]!, entries(lists)[1]!, 1)
      expect(clientMock).not.toHaveBeenCalled()
    })

    it('deletes a checklist item after the API confirms, and keeps it when that fails', async () => {
      clientMock.mockRejectedValue(new Error('Network Error'))
      const { lists, deleteEntry } = useTripLists('t1')
      expect(await deleteEntry(lists.value[0]!, lists.value[0]!.items[0]!, entries(lists)[0]!)).toBe(false)
      expect(entries(lists)).toHaveLength(2)

      clientMock.mockResolvedValue(undefined)
      expect(await deleteEntry(lists.value[0]!, lists.value[0]!.items[0]!, entries(lists)[0]!)).toBe(true)
      expect(clientMock).toHaveBeenLastCalledWith(`${ENTRIES}/e1`, { method: 'DELETE' })
      expect(entries(lists).map(item => item.id)).toEqual(['e2'])
    })
  })

  it('throws when it was not provided', () => {
    expect(() => injectTripLists()).toThrow('useTripLists was not provided')
  })
})
